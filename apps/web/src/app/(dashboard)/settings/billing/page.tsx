'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CreditCard, ExternalLink, CheckCircle, Zap, Building, Check } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button, Spinner } from '@/components/ui';
import { cn, formatCurrency } from '@/lib/utils';

interface SubscriptionStatus {
  plan: string;
  trialEndsAt: string | null;
  trialDaysLeft: number | null;
  hasPaymentMethod: boolean;
  stripeStatus: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  limits: { teamMembers: number | null; channels: number | null; automations: number | null };
  usage: {
    teamMembers: number;
    channels: number;
    contacts: number;
    automations: number;
    openConversations: number;
  };
}

interface BillingEvent {
  id: string;
  type: string;
  status: string | null;
  plan: string | null;
  amount: number | null;
  currency: string | null;
  createdAt: string;
}

const PLANS = [
  {
    id: 'pro' as const,
    name: 'Pro',
    price: 99,
    icon: Zap,
    description: 'For growing sales teams',
    features: [
      '5 team members',
      '3 Meta channels',
      'Unlimited conversations',
      'AI lead scoring & replies',
      'Automations (up to 50)',
      'Email support',
    ],
  },
  {
    id: 'enterprise' as const,
    name: 'Enterprise',
    price: 299,
    icon: Building,
    description: 'For agencies and large teams',
    features: [
      'Unlimited team members',
      'Unlimited channels',
      'Unlimited automations',
      'Priority AI processing',
      'Meta Ads attribution',
      'Dedicated support + SLA',
      'Custom integrations',
    ],
  },
] as const;

export default function BillingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const billingResult = searchParams.get('billing');

  const { data: sub, isLoading } = useQuery({
    queryKey: ['billing', 'subscription'],
    queryFn: () => api.get<SubscriptionStatus>('/billing/subscription'),
  });
  const history = useQuery({
    queryKey: ['billing', 'history'],
    queryFn: () => api.get<BillingEvent[]>('/billing/history'),
  });

  const checkout = useMutation({
    mutationFn: (plan: 'pro' | 'enterprise') =>
      api.post<{ url: string }>('/billing/checkout', { plan }),
    onSuccess: (data) => { window.location.href = data.url; },
  });

  const portal = useMutation({
    mutationFn: () => api.post<{ url: string }>('/billing/portal'),
    onSuccess: (data) => { window.location.href = data.url; },
  });

  if (isLoading) return <div className="flex h-40 items-center justify-center"><Spinner /></div>;

  const currentPlan = sub?.plan ?? 'free';
  const isActive = sub?.stripeStatus === 'active';

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Billing</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your subscription and payment details.</p>
      </div>

      {/* Status messages */}
      {billingResult === 'success' && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3">
          <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
            Payment successful! Your plan has been upgraded.
          </p>
        </div>
      )}
      {billingResult === 'cancelled' && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3">
          <p className="text-sm text-amber-700 dark:text-amber-300">Payment was cancelled. No charges were made.</p>
        </div>
      )}

      {/* Current plan summary */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-3">
        <h2 className="text-sm font-semibold">Current plan</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-semibold capitalize">{currentPlan} plan</p>
            {sub?.trialDaysLeft != null && sub.trialDaysLeft > 0 && (
              <p className="text-sm text-amber-500">{sub.trialDaysLeft} day{sub.trialDaysLeft === 1 ? '' : 's'} left in trial</p>
            )}
            {sub?.currentPeriodEnd && (
              <p className="text-sm text-muted-foreground">
                {sub.cancelAtPeriodEnd ? 'Cancels' : 'Renews'} {new Date(sub.currentPeriodEnd).toLocaleDateString()}
              </p>
            )}
          </div>
          {isActive && (
            <Button
              variant="outline"
              onClick={() => portal.mutate()}
              loading={portal.isPending}
            >
              <CreditCard className="h-4 w-4" />
              Manage billing
              <ExternalLink className="h-3.5 w-3.5 opacity-60" />
            </Button>
          )}
        </div>
      </section>

      {sub && (
        <section className="rounded-xl border border-border bg-card p-5 space-y-3">
          <h2 className="text-sm font-semibold">Usage & limits</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ['Team members', sub.usage.teamMembers, sub.limits.teamMembers],
              ['Channels', sub.usage.channels, sub.limits.channels],
              ['Automations', sub.usage.automations, sub.limits.automations],
              ['Contacts', sub.usage.contacts, null],
              ['Open conversations', sub.usage.openConversations, null],
            ].map(([label, used, limit]) => (
              <div key={String(label)} className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-1 text-sm font-semibold">
                  {used as number}
                  {limit == null ? ' / unlimited' : ` / ${limit as number}`}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-xl border border-border bg-card p-5 space-y-3">
        <h2 className="text-sm font-semibold">Billing history</h2>
        {history.isLoading ? (
          <div className="flex h-20 items-center justify-center"><Spinner /></div>
        ) : !history.data || history.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No billing events yet.</p>
        ) : (
          <div className="space-y-2">
            {history.data.map((e) => (
              <div key={e.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                <div>
                  <p className="font-medium">{e.type}</p>
                  <p className="text-xs text-muted-foreground">
                    {e.status ?? '—'}{e.plan ? ` · ${e.plan}` : ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">
                    {e.amount != null ? formatCurrency(e.amount) : '—'}
                    {e.currency ? ` ${e.currency.toUpperCase()}` : ''}
                  </p>
                  <p className="text-xs text-muted-foreground">{new Date(e.createdAt).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Upgrade plans */}
      {currentPlan === 'free' && (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold">Upgrade your plan</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {PLANS.map((plan) => {
              const Icon = plan.icon;
              return (
                <div
                  key={plan.id}
                  className={cn(
                    'rounded-xl border p-5 space-y-4',
                    plan.id === 'enterprise' ? 'border-primary' : 'border-border',
                  )}
                >
                  {plan.id === 'enterprise' && (
                    <span className="inline-block rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">
                      Most popular
                    </span>
                  )}
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold">{plan.name}</p>
                      <p className="text-xs text-muted-foreground">{plan.description}</p>
                    </div>
                  </div>
                  <p className="text-3xl font-bold">
                    {formatCurrency(plan.price)}
                    <span className="text-sm font-normal text-muted-foreground"> / mo</span>
                  </p>
                  <ul className="space-y-2">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    variant={plan.id === 'enterprise' ? 'primary' : 'outline'}
                    onClick={() => checkout.mutate(plan.id)}
                    loading={checkout.isPending && checkout.variables === plan.id}
                  >
                    Upgrade to {plan.name}
                  </Button>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
