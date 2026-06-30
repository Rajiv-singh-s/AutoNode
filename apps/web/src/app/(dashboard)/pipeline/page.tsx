'use client';

import { useState } from 'react';
import { usePipeline } from '@/features/crm/use-crm';
import { LeadDrawer } from '@/features/crm/LeadDrawer';
import { Avatar, Spinner } from '@/components/ui';
import { cn, formatCurrency, scoreColor, stageColor } from '@/lib/utils';

const LABELS: Record<string, string> = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  QUALIFIED: 'Qualified',
  PROPOSAL: 'Proposal',
  NEGOTIATION: 'Negotiation',
  WON: 'Won',
  LOST: 'Lost',
};

export default function PipelinePage() {
  const { data, isLoading } = usePipeline();
  const [activeId, setActiveId] = useState<string | null>(null);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-6 py-4">
        <h1 className="text-xl font-semibold tracking-tight">Pipeline</h1>
        <p className="text-sm text-muted-foreground">Drag-free board — click a card to manage the lead.</p>
      </div>

      {isLoading || !data ? (
        <div className="flex flex-1 items-center justify-center">
          <Spinner />
        </div>
      ) : (
        <div className="scroll-thin flex flex-1 gap-3 overflow-x-auto p-6">
          {data.columns.map((col) => (
            <div key={col.stage} className="flex w-72 shrink-0 flex-col rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <span className={cn('h-2.5 w-2.5 rounded-full', stageColor(col.stage))} />
                  <span className="text-sm font-semibold">{LABELS[col.stage] ?? col.stage}</span>
                  <span className="rounded-full bg-muted px-1.5 text-xs text-muted-foreground">
                    {col.contacts.length}
                  </span>
                </div>
                {col.value > 0 && (
                  <span className="text-xs font-medium text-muted-foreground">{formatCurrency(col.value)}</span>
                )}
              </div>

              <div className="scroll-thin flex-1 space-y-2 overflow-y-auto p-2">
                {col.contacts.length === 0 ? (
                  <p className="px-2 py-6 text-center text-xs text-muted-foreground">Empty</p>
                ) : (
                  col.contacts.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setActiveId(c.id)}
                      className="w-full rounded-lg border border-border bg-background p-2.5 text-left transition-colors hover:border-primary"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar name={c.name} src={c.avatarUrl} className="h-7 w-7 text-[10px]" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{c.name ?? 'Unknown'}</p>
                          <p className="truncate text-xs text-muted-foreground">@{c.username}</p>
                        </div>
                        <span className="flex items-center gap-1 text-xs">
                          <span className={cn('h-1.5 w-1.5 rounded-full', scoreColor(c.leadScore))} />
                          {c.leadScore}
                        </span>
                      </div>
                      {c.leadValue != null && (
                        <p className="mt-1.5 text-xs font-medium text-emerald-500">
                          {formatCurrency(c.leadValue)}
                        </p>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <LeadDrawer contactId={activeId} onClose={() => setActiveId(null)} />
    </div>
  );
}
