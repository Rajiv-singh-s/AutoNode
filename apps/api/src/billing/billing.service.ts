import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  RawBodyRequest,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';
import type { AppConfig } from '../config/configuration';

/** Maps our internal plan names to Stripe price IDs. */
const PLAN_TO_PRICE: Record<string, string | undefined> = {
  pro: undefined,        // resolved at runtime from env
  enterprise: undefined, // resolved at runtime from env
};

export type PlanLimitMetric = 'teamMembers' | 'channels' | 'automations';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private readonly stripe: Stripe | null;
  private readonly webhookSecret: string;
  private readonly proPriceId: string;
  private readonly enterprisePriceId: string;
  private readonly appUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {
    const secretKey = this.config.get('STRIPE_SECRET_KEY', { infer: true });
    this.webhookSecret = this.config.get('STRIPE_WEBHOOK_SECRET', { infer: true });
    this.proPriceId = this.config.get('STRIPE_PRICE_PRO_MONTHLY', { infer: true });
    this.enterprisePriceId = this.config.get('STRIPE_PRICE_ENTERPRISE_MONTHLY', { infer: true });
    this.appUrl = this.config.get('APP_URL', { infer: true });

    this.stripe = secretKey
      ? new Stripe(secretKey, { apiVersion: '2026-06-24.dahlia' })
      : null;

    PLAN_TO_PRICE.pro = this.proPriceId;
    PLAN_TO_PRICE.enterprise = this.enterprisePriceId;
  }

  /** Get subscription status for an organization. */
  async getSubscription(orgId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        id: true,
        plan: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        trialEndsAt: true,
      },
    });
    if (!org) throw new NotFoundException('Organization not found');

    let stripeSubscription: Stripe.Subscription | null = null;
    if (this.stripe && org.stripeSubscriptionId) {
      try {
        stripeSubscription = await this.stripe.subscriptions.retrieve(org.stripeSubscriptionId);
      } catch {
        // Stripe subscription not found — return what we have
      }
    }

    const [teamMembers, channels, contacts, automations, openConversations] = await Promise.all([
      this.prisma.membership.count({ where: { organizationId: orgId } }),
      this.prisma.channel.count({ where: { organizationId: orgId, deletedAt: null } }),
      this.prisma.contact.count({ where: { organizationId: orgId, deletedAt: null } }),
      this.prisma.automation.count({ where: { organizationId: orgId, deletedAt: null } }),
      this.prisma.conversation.count({
        where: { organizationId: orgId, deletedAt: null, status: 'OPEN' },
      }),
    ]);

    const now = new Date();
    const trialDaysLeft = org.trialEndsAt
      ? Math.max(0, Math.ceil((org.trialEndsAt.getTime() - now.getTime()) / 86400000))
      : null;
    const limits = this.planLimits(org.plan);
    const usage = {
      teamMembers,
      channels,
      contacts,
      automations,
      openConversations,
    };

    return {
      plan: org.plan,
      trialEndsAt: org.trialEndsAt,
      trialDaysLeft,
      hasPaymentMethod: Boolean(org.stripeSubscriptionId),
      stripeStatus: stripeSubscription?.status ?? null,
      currentPeriodEnd: stripeSubscription?.items?.data?.[0]?.current_period_end
        ? new Date((stripeSubscription.items.data[0].current_period_end as number) * 1000)
        : null,
      cancelAtPeriodEnd: stripeSubscription?.cancel_at_period_end ?? false,
      limits,
      usage,
    };
  }

  async getHistory(orgId: string) {
    const events = await this.prisma.billingEvent.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return events.map((e) => ({
      ...e,
      amount: e.amount != null ? Number(e.amount) : null,
    }));
  }

  async enforceLimit(orgId: string, metric: PlanLimitMetric, increment = 1): Promise<void> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { id: true, plan: true },
    });
    if (!org) throw new NotFoundException('Organization not found');

    const limits = this.planLimits(org.plan);
    const limit = limits[metric];
    if (limit == null) return;

    const current = await this.currentUsage(orgId, metric);
    if (current + increment > limit) {
      throw new ForbiddenException(
        `Plan limit reached for ${metric}. Your ${org.plan} plan allows up to ${limit}. Please upgrade to continue.`,
      );
    }
  }

  /**
   * Creates a Stripe Checkout session. Redirects to Stripe-hosted payment page.
   * On success, Stripe fires a webhook that upgrades the plan.
   */
  async createCheckoutSession(orgId: string, plan: 'pro' | 'enterprise'): Promise<{ url: string }> {
    if (!this.stripe) throw new BadRequestException('Billing is not configured on this instance');

    const priceId = PLAN_TO_PRICE[plan];
    if (!priceId) throw new BadRequestException(`Price for plan "${plan}" is not configured`);

    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { id: true, name: true, stripeCustomerId: true },
    });
    if (!org) throw new NotFoundException('Organization not found');

    // Create or reuse a Stripe Customer for this org.
    let customerId = org.stripeCustomerId;
    if (!customerId) {
      const customer = await this.stripe.customers.create({
        name: org.name,
        metadata: { organizationId: org.id },
      });
      customerId = customer.id;
      await this.prisma.organization.update({
        where: { id: org.id },
        data: { stripeCustomerId: customerId },
      });
    }

    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${this.appUrl}/settings/organization?billing=success`,
      cancel_url: `${this.appUrl}/settings/organization?billing=cancelled`,
      metadata: { organizationId: org.id, plan },
      subscription_data: { metadata: { organizationId: org.id, plan } },
    });

    return { url: session.url! };
  }

  /** Create a Stripe Billing Portal session for managing the subscription. */
  async createPortalSession(orgId: string): Promise<{ url: string }> {
    if (!this.stripe) throw new BadRequestException('Billing is not configured on this instance');

    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { stripeCustomerId: true },
    });
    if (!org?.stripeCustomerId) {
      throw new BadRequestException('No billing account found for this organization');
    }

    const session = await this.stripe.billingPortal.sessions.create({
      customer: org.stripeCustomerId,
      return_url: `${this.appUrl}/settings/organization`,
    });

    return { url: session.url };
  }

  /**
   * Handles Stripe webhook events. Verifies the signature and processes
   * subscription lifecycle events to keep plan data in sync.
   */
  async handleWebhook(req: RawBodyRequest<Request>): Promise<void> {
    if (!this.stripe) return;

    const sig = req.headers['stripe-signature'] as string;
    if (!sig || !this.webhookSecret) {
      this.logger.warn('Stripe webhook received without signature or secret');
      return;
    }

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(
        req.rawBody ?? Buffer.alloc(0),
        sig,
        this.webhookSecret,
      );
    } catch (err) {
      throw new BadRequestException(`Stripe webhook signature verification failed: ${err}`);
    }

    await this.processEvent(event);
  }

  private async processEvent(event: Stripe.Event): Promise<void> {
    const type = event.type;
    this.logger.debug(`Stripe event: ${type}`);

    switch (type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const orgId = session.metadata?.organizationId;
        const plan = session.metadata?.plan as string | undefined;
        if (orgId && plan && session.subscription) {
          await this.prisma.organization.update({
            where: { id: orgId },
            data: { plan, stripeSubscriptionId: session.subscription as string },
          });
          await this.recordBillingEvent(orgId, event, {
            type: event.type,
            status: session.status ?? 'completed',
            plan,
            stripeCustomerId: typeof session.customer === 'string' ? session.customer : null,
            stripeSubscriptionId:
              typeof session.subscription === 'string' ? session.subscription : null,
            amount:
              typeof session.amount_total === 'number'
                ? session.amount_total / 100
                : null,
            currency: session.currency ?? null,
          });
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const orgId =
          sub.metadata?.organizationId ??
          (await this.resolveOrgIdFromCustomer(
            typeof sub.customer === 'string' ? sub.customer : null,
          ));
        const plan = sub.metadata?.plan as string | undefined;
        if (orgId) {
          const isActive = sub.status === 'active' || sub.status === 'trialing';
          await this.prisma.organization.update({
            where: { id: orgId },
            data: { plan: isActive ? (plan ?? 'pro') : 'free' },
          });
          const item = sub.items.data[0];
          await this.recordBillingEvent(orgId, event, {
            type: event.type,
            status: sub.status,
            plan: isActive ? (plan ?? 'pro') : 'free',
            stripeCustomerId: typeof sub.customer === 'string' ? sub.customer : null,
            stripeSubscriptionId: sub.id,
            periodStart:
              item?.current_period_start != null
                ? new Date(item.current_period_start * 1000)
                : null,
            periodEnd:
              item?.current_period_end != null
                ? new Date(item.current_period_end * 1000)
                : null,
            currency: item?.plan?.currency ?? null,
            amount:
              typeof item?.plan?.amount === 'number' ? item.plan.amount / 100 : null,
          });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const orgId =
          sub.metadata?.organizationId ??
          (await this.resolveOrgIdFromCustomer(
            typeof sub.customer === 'string' ? sub.customer : null,
          ));
        if (orgId) {
          await this.prisma.organization.update({
            where: { id: orgId },
            data: { plan: 'free', stripeSubscriptionId: null },
          });
          await this.recordBillingEvent(orgId, event, {
            type: event.type,
            status: sub.status,
            plan: 'free',
            stripeCustomerId: typeof sub.customer === 'string' ? sub.customer : null,
            stripeSubscriptionId: sub.id,
          });
        }
        break;
      }

      case 'invoice.paid':
      case 'invoice.payment_failed': {
        const invoice = event.data.object as unknown as {
          id: string;
          customer: string | null;
          subscription?: string | null;
          status?: string | null;
          amount_paid?: number | null;
          currency?: string | null;
          period_start?: number | null;
          period_end?: number | null;
        };
        const orgId = await this.resolveOrgIdFromCustomer(
          typeof invoice.customer === 'string' ? invoice.customer : null,
        );
        if (orgId) {
          await this.recordBillingEvent(orgId, event, {
            type: event.type,
            status: invoice.status ?? null,
            stripeCustomerId: typeof invoice.customer === 'string' ? invoice.customer : null,
            stripeSubscriptionId:
              typeof invoice.subscription === 'string' ? invoice.subscription : null,
            stripeInvoiceId: invoice.id,
            amount:
              typeof invoice.amount_paid === 'number' ? invoice.amount_paid / 100 : null,
            currency: invoice.currency ?? null,
            periodStart:
              invoice.period_start != null
                ? new Date(invoice.period_start * 1000)
                : null,
            periodEnd:
              invoice.period_end != null
                ? new Date(invoice.period_end * 1000)
                : null,
          });
        }
        break;
      }

      default:
        // Unhandled event — log and ignore.
        break;
    }
  }

  private async resolveOrgIdFromCustomer(customerId: string | null): Promise<string | null> {
    if (!customerId) return null;
    const org = await this.prisma.organization.findUnique({
      where: { stripeCustomerId: customerId },
      select: { id: true },
    });
    return org?.id ?? null;
  }

  private async recordBillingEvent(
    orgId: string,
    stripeEvent: Stripe.Event,
    data: {
      type: string;
      status: string | null;
      plan?: string | null;
      stripeCustomerId?: string | null;
      stripeSubscriptionId?: string | null;
      stripeInvoiceId?: string | null;
      amount?: number | null;
      currency?: string | null;
      periodStart?: Date | null;
      periodEnd?: Date | null;
    },
  ): Promise<void> {
    await this.prisma.billingEvent.upsert({
      where: { stripeEventId: stripeEvent.id },
      create: {
        organizationId: orgId,
        stripeEventId: stripeEvent.id,
        stripeCustomerId: data.stripeCustomerId ?? null,
        stripeSubscriptionId: data.stripeSubscriptionId ?? null,
        stripeInvoiceId: data.stripeInvoiceId ?? null,
        type: data.type,
        status: data.status ?? null,
        plan: data.plan ?? null,
        amount: data.amount != null ? data.amount : null,
        currency: data.currency ?? null,
        periodStart: data.periodStart ?? null,
        periodEnd: data.periodEnd ?? null,
        payload: stripeEvent.data.object as unknown as object,
      },
      update: {
        stripeCustomerId: data.stripeCustomerId ?? null,
        stripeSubscriptionId: data.stripeSubscriptionId ?? null,
        stripeInvoiceId: data.stripeInvoiceId ?? null,
        status: data.status ?? null,
        plan: data.plan ?? null,
        amount: data.amount != null ? data.amount : null,
        currency: data.currency ?? null,
        periodStart: data.periodStart ?? null,
        periodEnd: data.periodEnd ?? null,
      },
    });
  }

  private planLimits(plan: string): {
    teamMembers: number | null;
    channels: number | null;
    automations: number | null;
  } {
    if (plan === 'enterprise') {
      return { teamMembers: null, channels: null, automations: null };
    }
    if (plan === 'pro') {
      return { teamMembers: 5, channels: 3, automations: 50 };
    }
    return { teamMembers: 2, channels: 1, automations: 5 };
  }

  private async currentUsage(orgId: string, metric: PlanLimitMetric): Promise<number> {
    if (metric === 'teamMembers') {
      return this.prisma.membership.count({ where: { organizationId: orgId } });
    }
    if (metric === 'channels') {
      return this.prisma.channel.count({ where: { organizationId: orgId, deletedAt: null } });
    }
    return this.prisma.automation.count({ where: { organizationId: orgId, deletedAt: null } });
  }
}
