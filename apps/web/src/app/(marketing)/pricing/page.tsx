'use client';

import Link from 'next/link';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const tiers = [
  {
    name: 'Starter',
    price: '$0',
    period: '/mo',
    desc: 'For solo founders testing the waters.',
    cta: 'Start free',
    features: ['1 connected channel', '500 AI-scored conversations/mo', 'Unified inbox', 'Basic analytics', 'Community support'],
    highlight: false,
  },
  {
    name: 'Growth',
    price: '$79',
    period: '/mo',
    desc: 'For growing teams that live in their DMs.',
    cta: 'Start 14-day trial',
    features: ['All 3 channels (IG, Messenger, WhatsApp)', '10,000 AI-scored conversations/mo', 'Automations & comment-to-DM', 'Full analytics + CSV export', 'Up to 10 team members', 'Priority support'],
    highlight: true,
  },
  {
    name: 'Scale',
    price: 'Custom',
    period: '',
    desc: 'For high-volume operations & agencies.',
    cta: 'Contact sales',
    features: ['Unlimited channels & conversations', 'Meta Ads attribution & ROAS', 'Custom roles & permissions', 'Audit logs & SSO', 'Dedicated success manager', '99.9% uptime SLA'],
    highlight: false,
  },
];

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-4xl font-bold tracking-tight">Simple, transparent pricing</h1>
        <p className="mt-3 text-muted-foreground">
          Start free. Upgrade when AutoNode is closing deals for you. No hidden fees.
        </p>
      </div>

      <div className="mt-14 grid gap-6 lg:grid-cols-3">
        {tiers.map((t) => (
          <div
            key={t.name}
            className={cn(
              'relative flex flex-col rounded-2xl border bg-card p-6',
              t.highlight ? 'border-primary shadow-lg shadow-primary/10' : 'border-border',
            )}
          >
            {t.highlight && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                Most popular
              </span>
            )}
            <h2 className="text-lg font-semibold">{t.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t.desc}</p>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-4xl font-bold tracking-tight">{t.price}</span>
              <span className="text-sm text-muted-foreground">{t.period}</span>
            </div>
            <Link
              href={t.name === 'Scale' ? '/contact' : '/login'}
              className={cn(
                'mt-6 rounded-md px-4 py-2.5 text-center text-sm font-medium transition-colors',
                t.highlight
                  ? 'bg-primary text-primary-foreground hover:opacity-90'
                  : 'border border-border hover:bg-accent',
              )}
            >
              {t.cta}
            </Link>
            <ul className="mt-6 space-y-3">
              {t.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  <span className="text-muted-foreground">{f}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <p className="mt-10 text-center text-sm text-muted-foreground">
        All plans include encryption at rest, official Meta API access, and GDPR-ready data handling.
      </p>
    </div>
  );
}
