'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useContacts, type ContactFilters } from '@/features/crm/use-crm';
import { Avatar, Badge, Button, Spinner } from '@/components/ui';
import { cn, formatCurrency, scoreColor, stageColor } from '@/lib/utils';
import { LeadDrawer } from '@/features/crm/LeadDrawer';

const STAGES = ['', 'NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'] as const;

export default function LeadsPage() {
  const [filters, setFilters] = useState<ContactFilters>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const query = useContacts(filters);
  const rows = useMemo(() => query.data?.pages.flatMap((p) => p.data) ?? [], [query.data]);

  return (
    <div className="scroll-thin h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl space-y-5 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Leads</h1>
            <p className="text-sm text-muted-foreground">{rows.length} contacts</p>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              value={filters.search ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value || undefined }))}
              placeholder="Search name, @handle, email…"
              className="h-9 w-72 rounded-md border border-input bg-background pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {/* Stage filter chips */}
        <div className="flex flex-wrap gap-1.5">
          {STAGES.map((s) => {
            const active = (filters.stage ?? '') === s;
            return (
              <button
                key={s || 'all'}
                onClick={() => setFilters((f) => ({ ...f, stage: s || undefined }))}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                  active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent',
                )}
              >
                {s ? s[0] + s.slice(1).toLowerCase() : 'All'}
              </button>
            );
          })}
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">Contact</th>
                <th className="px-4 py-2.5 font-medium">Stage</th>
                <th className="px-4 py-2.5 font-medium">Score</th>
                <th className="px-4 py-2.5 font-medium">Value</th>
                <th className="px-4 py-2.5 font-medium">Channel</th>
                <th className="px-4 py-2.5 font-medium">Source</th>
              </tr>
            </thead>
            <tbody>
              {query.isLoading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <Spinner />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-muted-foreground">
                    No leads match these filters.
                  </td>
                </tr>
              ) : (
                rows.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => setActiveId(c.id)}
                    className="cursor-pointer border-t border-border transition-colors hover:bg-accent/50"
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={c.name} src={c.avatarUrl} className="h-8 w-8" />
                        <div>
                          <p className="font-medium">{c.name ?? 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">@{c.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center gap-1.5">
                        <span className={cn('h-2 w-2 rounded-full', stageColor(c.leadStage))} />
                        <span className="text-xs">{c.leadStage[0] + c.leadStage.slice(1).toLowerCase()}</span>
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center gap-1.5">
                        <span className={cn('h-1.5 w-1.5 rounded-full', scoreColor(c.leadScore))} />
                        {c.leadScore}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {c.leadValue != null ? formatCurrency(c.leadValue) : '—'}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge className="bg-muted text-xs capitalize">{c.channel?.type.toLowerCase() ?? '—'}</Badge>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{c.source ?? '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {query.hasNextPage && (
          <div className="flex justify-center">
            <Button variant="outline" size="sm" loading={query.isFetchingNextPage} onClick={() => query.fetchNextPage()}>
              Load more
            </Button>
          </div>
        )}
      </div>

      <LeadDrawer contactId={activeId} onClose={() => setActiveId(null)} />
    </div>
  );
}
