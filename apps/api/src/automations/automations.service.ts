import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { z } from 'zod';
import {
  ActivityType,
  AutomationTrigger,
  ChannelType,
  LeadStage,
  MessageDirection,
  MessageDeliveryStatus,
  MessageType,
  Prisma,
  SenderType,
  WebhookEventStatus,
} from '@autonode/database';
import { PrismaService } from '../prisma/prisma.service';
import { MetaGraphService } from '../integrations/meta/meta-graph.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { BillingService } from '../billing/billing.service';
import type { CreateAutomationDto, UpdateAutomationDto } from './automations.dto';

const conditionsSchema = z.object({
  keywords: z.array(z.string().min(1)).default([]),
  matchType: z.enum(['any', 'all']).default('any'),
});

const actionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('send_dm'), text: z.string().min(1).max(4096) }),
  z.object({ type: z.literal('delay'), seconds: z.number().int().min(0).max(86_400) }),
  z.object({ type: z.literal('add_label'), label: z.string().min(1).max(60) }),
  z.object({ type: z.literal('set_stage'), stage: z.nativeEnum(LeadStage) }),
]);
const actionsSchema = z.array(actionSchema).min(1).max(20);

export type AutomationAction = z.infer<typeof actionSchema>;

/** Context passed when a trigger fires (from the webhook processor). */
export interface TriggerContext {
  conversationId: string;
  contactId: string;
  channelId: string;
  text: string;
  /** Set when the trigger is a comment — enables Instagram private replies. */
  commentId?: string;
}

@Injectable()
export class AutomationsService {
  private readonly logger = new Logger(AutomationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly meta: MetaGraphService,
    private readonly realtime: RealtimeGateway,
    private readonly billing: BillingService,
  ) {}

  list(orgId: string) {
    return this.prisma.automation.findMany({
      where: { organizationId: orgId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        channel: { select: { id: true, type: true, name: true } },
        _count: { select: { runs: true } },
      },
    });
  }

  async getOne(orgId: string, id: string) {
    const a = await this.prisma.automation.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
      include: { channel: { select: { id: true, type: true, name: true } } },
    });
    if (!a) throw new NotFoundException('Automation not found');
    return a;
  }

  async create(orgId: string, dto: CreateAutomationDto) {
    await this.billing.enforceLimit(orgId, 'automations');
    const conditions = this.parseConditions(dto.conditions);
    const actions = this.parseActions(dto.actions);
    return this.prisma.automation.create({
      data: {
        organizationId: orgId,
        name: dto.name,
        trigger: dto.trigger,
        enabled: dto.enabled ?? true,
        channelId: dto.channelId ?? null,
        conditions,
        actions,
      },
    });
  }

  async update(orgId: string, id: string, dto: UpdateAutomationDto) {
    await this.assert(orgId, id);
    return this.prisma.automation.update({
      where: { id },
      data: {
        name: dto.name,
        trigger: dto.trigger,
        enabled: dto.enabled,
        channelId: dto.channelId,
        conditions: dto.conditions ? this.parseConditions(dto.conditions) : undefined,
        actions: dto.actions ? this.parseActions(dto.actions) : undefined,
      },
    });
  }

  async setEnabled(orgId: string, id: string, enabled: boolean) {
    await this.assert(orgId, id);
    return this.prisma.automation.update({ where: { id }, data: { enabled } });
  }

  async remove(orgId: string, id: string) {
    await this.assert(orgId, id);
    await this.prisma.automation.update({ where: { id }, data: { deletedAt: new Date() } });
    return { success: true };
  }

  listRuns(orgId: string, id: string) {
    return this.prisma.automationRun.findMany({
      where: { automation: { id, organizationId: orgId } },
      orderBy: { startedAt: 'desc' },
      take: 50,
    });
  }

  // ──────────────────────── Execution ────────────────────────

  /**
   * Finds enabled automations whose trigger + keyword conditions match the
   * inbound text, and runs each. Called by the webhook processor.
   */
  async handleTrigger(
    orgId: string,
    trigger: AutomationTrigger,
    ctx: TriggerContext,
  ): Promise<void> {
    const automations = await this.prisma.automation.findMany({
      where: {
        organizationId: orgId,
        deletedAt: null,
        enabled: true,
        trigger,
        OR: [{ channelId: null }, { channelId: ctx.channelId }],
      },
    });

    for (const automation of automations) {
      const cond = conditionsSchema.safeParse(automation.conditions);
      if (!cond.success) continue;
      if (!this.matches(cond.data, ctx.text)) continue;
      await this.run(orgId, automation.id, automation.actions, ctx);
    }
  }

  private matches(cond: z.infer<typeof conditionsSchema>, text: string): boolean {
    if (cond.keywords.length === 0) return true; // no keywords ⇒ fire on any
    const haystack = text.toLowerCase();
    const hits = cond.keywords.filter((k) => haystack.includes(k.toLowerCase()));
    return cond.matchType === 'all' ? hits.length === cond.keywords.length : hits.length > 0;
  }

  /** Executes an automation's actions, recording an AutomationRun. */
  async run(
    orgId: string,
    automationId: string,
    rawActions: Prisma.JsonValue,
    ctx: TriggerContext,
  ): Promise<void> {
    const actions = actionsSchema.safeParse(rawActions);
    if (!actions.success) {
      this.logger.warn(`Automation ${automationId} has invalid actions; skipping`);
      return;
    }

    const runLog: { action: string; ok: boolean; detail?: string }[] = [];
    const runRecord = await this.prisma.automationRun.create({
      data: { automationId, conversationId: ctx.conversationId, status: WebhookEventStatus.PROCESSING },
    });

    try {
      for (const action of actions.data) {
        await this.execAction(orgId, action, ctx, runLog);
      }
      await this.prisma.automation.update({
        where: { id: automationId },
        data: { runCount: { increment: 1 } },
      });
      await this.prisma.automationRun.update({
        where: { id: runRecord.id },
        data: { status: WebhookEventStatus.PROCESSED, log: runLog, finishedAt: new Date() },
      });
    } catch (err) {
      await this.prisma.automationRun.update({
        where: { id: runRecord.id },
        data: {
          status: WebhookEventStatus.FAILED,
          log: runLog,
          error: err instanceof Error ? err.message : 'automation failed',
          finishedAt: new Date(),
        },
      });
    }
  }

  private async execAction(
    orgId: string,
    action: AutomationAction,
    ctx: TriggerContext,
    log: { action: string; ok: boolean; detail?: string }[],
  ): Promise<void> {
    switch (action.type) {
      case 'delay':
        await new Promise((r) => setTimeout(r, Math.min(action.seconds, 60) * 1000));
        log.push({ action: 'delay', ok: true, detail: `${action.seconds}s` });
        return;

      case 'send_dm': {
        const conv = await this.prisma.conversation.findUnique({
          where: { id: ctx.conversationId },
          include: { channel: true, contact: true },
        });
        if (!conv) throw new Error('conversation not found for send_dm');
        const message = await this.prisma.message.create({
          data: {
            organizationId: orgId,
            conversationId: ctx.conversationId,
            direction: MessageDirection.OUTBOUND,
            senderType: SenderType.AI,
            type: MessageType.TEXT,
            text: action.text,
            aiGenerated: true,
            deliveryStatus: MessageDeliveryStatus.PENDING,
          },
        });
        try {
          // Comment-triggered automations use Instagram private replies
          // (recipient: comment_id); everything else is a normal DM.
          const extId =
            ctx.commentId && conv.channel.type === ChannelType.INSTAGRAM
              ? await this.meta.sendInstagramCommentReply(conv.channel, ctx.commentId, action.text)
              : await this.meta.sendText(conv.channel, conv.contact.externalId, action.text);
          const updated = await this.prisma.message.update({
            where: { id: message.id },
            data: { externalId: extId || null, deliveryStatus: MessageDeliveryStatus.SENT },
          });
          await this.prisma.activity.create({
            data: {
              organizationId: orgId,
              contactId: ctx.contactId,
              conversationId: ctx.conversationId,
              messageId: updated.id,
              type: ActivityType.AUTOMATION_ACTION,
              title: 'Automation sent message',
              body: action.text.slice(0, 500),
            },
          });
          this.realtime.emitMessageCreated(orgId, { conversationId: ctx.conversationId, message: updated });
          log.push({ action: 'send_dm', ok: true });
        } catch (e) {
          await this.prisma.message.update({
            where: { id: message.id },
            data: {
              deliveryStatus: MessageDeliveryStatus.FAILED,
              error: e instanceof Error ? e.message : 'send failed',
            },
          });
          await this.prisma.activity.create({
            data: {
              organizationId: orgId,
              contactId: ctx.contactId,
              conversationId: ctx.conversationId,
              messageId: message.id,
              type: ActivityType.AUTOMATION_ACTION,
              title: 'Automation message failed',
              body: e instanceof Error ? e.message : 'send failed',
            },
          });
          log.push({ action: 'send_dm', ok: false, detail: e instanceof Error ? e.message : 'failed' });
        }
        return;
      }

      case 'add_label': {
        const label = await this.prisma.label.upsert({
          where: { organizationId_name: { organizationId: orgId, name: action.label } },
          update: {},
          create: { organizationId: orgId, name: action.label },
        });
        await this.prisma.conversationLabel.upsert({
          where: { conversationId_labelId: { conversationId: ctx.conversationId, labelId: label.id } },
          update: {},
          create: { conversationId: ctx.conversationId, labelId: label.id },
        });
        await this.prisma.activity.create({
          data: {
            organizationId: orgId,
            contactId: ctx.contactId,
            conversationId: ctx.conversationId,
            type: ActivityType.TAGS_UPDATED,
            title: 'Automation added label',
            body: action.label,
          },
        });
        log.push({ action: 'add_label', ok: true, detail: action.label });
        return;
      }

      case 'set_stage':
        await this.prisma.contact.update({
          where: { id: ctx.contactId },
          data: { leadStage: action.stage },
        });
        await this.prisma.activity.create({
          data: {
            organizationId: orgId,
            contactId: ctx.contactId,
            conversationId: ctx.conversationId,
            type: ActivityType.STAGE_CHANGED,
            title: 'Automation changed stage',
            body: action.stage,
          },
        });
        log.push({ action: 'set_stage', ok: true, detail: action.stage });
        return;
    }
  }

  // ──────────────────────── helpers ────────────────────────

  private parseConditions(raw: unknown): Prisma.InputJsonValue {
    const parsed = conditionsSchema.safeParse(raw);
    if (!parsed.success) throw new BadRequestException('Invalid conditions: expected { keywords, matchType }');
    return parsed.data;
  }

  private parseActions(raw: unknown): Prisma.InputJsonValue {
    const parsed = actionsSchema.safeParse(raw);
    if (!parsed.success) {
      this.logger.warn(`parseActions rejected raw=${JSON.stringify(raw)} issues=${JSON.stringify(parsed.error.issues)}`);
      throw new BadRequestException('Invalid actions: 1-20 valid steps required');
    }
    return parsed.data as Prisma.InputJsonValue;
  }

  private async assert(orgId: string, id: string): Promise<void> {
    const exists = await this.prisma.automation.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Automation not found');
  }
}
