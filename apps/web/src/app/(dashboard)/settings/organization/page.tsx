'use client';

import { useState, useEffect } from 'react';
import { Button, Spinner } from '@/components/ui';
import { useOrgSettings, useUpdateOrgSettings } from '@/features/settings/use-settings';
import { cn } from '@/lib/utils';

const PLAN_BADGE: Record<string, string> = {
  free: 'bg-muted text-muted-foreground',
  pro: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  enterprise: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
};

export default function OrganizationSettingsPage() {
  const { data: org, isLoading } = useOrgSettings();
  const update = useUpdateOrgSettings();
  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (org) {
      setName(org.name);
      setLogoUrl(org.logoUrl ?? '');
    }
  }, [org]);

  const save = async () => {
    setMsg(null);
    try {
      await update.mutateAsync({ name: name.trim() || undefined, logoUrl: logoUrl.trim() || undefined });
      setMsg({ ok: true, text: 'Organization updated.' });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'Failed to update.' });
    }
  };

  if (isLoading || !org) return <div className="flex h-40 items-center justify-center"><Spinner /></div>;

  const daysLeft = org.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(org.trialEndsAt).getTime() - Date.now()) / 86400000))
    : null;

  return (
    <div className="max-w-xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Organization</h1>
        <p className="mt-1 text-sm text-muted-foreground">Workspace settings and subscription details.</p>
      </div>

      {/* Org info */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold">Workspace details</h2>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Organization name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">URL slug</span>
          <input
            value={org.slug}
            disabled
            className="h-10 w-full rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground cursor-not-allowed"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Logo URL</span>
          <input
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://..."
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </label>

        {msg && (
          <p className={`text-sm ${msg.ok ? 'text-emerald-500' : 'text-red-500'}`}>{msg.text}</p>
        )}
        <Button onClick={save} loading={update.isPending}>Save changes</Button>
      </section>

      {/* Plan */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-3">
        <h2 className="text-sm font-semibold">Subscription</h2>
        <div className="flex items-center gap-3">
          <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize', PLAN_BADGE[org.plan] ?? PLAN_BADGE.free)}>
            {org.plan}
          </span>
          {daysLeft !== null && daysLeft > 0 && (
            <span className="text-sm text-amber-500 font-medium">{daysLeft} day{daysLeft === 1 ? '' : 's'} left in trial</span>
          )}
          {daysLeft === 0 && <span className="text-sm text-red-500 font-medium">Trial expired</span>}
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            { label: 'Members', value: org._count.memberships },
            { label: 'Channels', value: org._count.channels },
            { label: 'Contacts', value: org._count.contacts },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border border-border p-3">
              <p className="text-xl font-semibold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
