'use client';

import { formatDistanceToNowStrict } from 'date-fns';
import { Instagram, MessageCircle, Phone, Search } from 'lucide-react';
import { cn, intentColor, scoreColor } from '@/lib/utils';
import { Avatar, Spinner } from '@/components/ui';
import type { ConversationListItem } from './types';
import type { InboxFilters } from './use-inbox';

const channelIcon = {
  INSTAGRAM: Instagram,
  MESSENGER: MessageCircle,
  WHATSAPP: Phone,
} as const;

const STATUS_TABS = ['OPEN', 'PENDING', 'RESOLVED', 'SPAM'] as const;

export function ConversationList({
  items,
  activeId,
  onSelect,
  filters,
  onFiltersChange,
  isLoading,
  hasNextPage,
  onLoadMore,
  isFetchingNextPage,
}: {
  items: ConversationListItem[];
  activeId: string | null;
  onSelect: (id: string) => void;
  filters: InboxFilters;
  onFiltersChange: (next: InboxFilters) => void;
  isLoading: boolean;
  hasNextPage: boolean;
  onLoadMore: () => void;
  isFetchingNextPage: boolean;
}) {
  return (
    <div className="flex h-full w-full flex-col border-r border-border bg-card">
      {/* Header + search */}
      <div className="space-y-3 border-b border-border p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-tight">Inbox</h2>
          <span className="text-xs text-muted-foreground">{items.length} shown</span>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            value={filters.search ?? ''}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value || undefined })}
            placeholder="Search conversations…"
            className="h-9 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex gap-1">
          {STATUS_TABS.map((s) => {
            const active = (filters.status ?? 'OPEN') === s;
            return (
              <button
                key={s}
                onClick={() => onFiltersChange({ ...filters, status: s })}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                  active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent',
                )}
              >
                {s[0] + s.slice(1).toLowerCase()}
              </button>
            );
          })}
        </div>
      </div>

      {/* List */}
      <div className="scroll-thin flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Spinner />
          </div>
        ) : items.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">No conversations here yet.</p>
        ) : (
          items.map((c) => {
            const Icon = channelIcon[c.channel.type];
            const active = c.id === activeId;
            return (
              <button
                key={c.id}
                onClick={() => onSelect(c.id)}
                className={cn(
                  'flex w-full gap-3 border-b border-border/60 p-3 text-left transition-colors hover:bg-accent/60',
                  active && 'bg-accent',
                )}
              >
                <Avatar name={c.contact.name} src={c.contact.avatarUrl} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">
                      {c.contact.name ?? c.contact.username ?? 'Unknown'}
                    </span>
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {c.lastMessageAt
                        ? formatDistanceToNowStrict(new Date(c.lastMessageAt), { addSuffix: false })
                        : ''}
                    </span>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {c.lastMessagePreview ?? 'No messages yet'}
                  </p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className={cn('text-[11px] font-medium', intentColor(c.buyingIntent))}>
                      {c.buyingIntent !== 'NONE' ? `${c.buyingIntent} intent` : ''}
                    </span>
                    <span className="ml-auto flex items-center gap-1">
                      <span className={cn('h-1.5 w-1.5 rounded-full', scoreColor(c.contact.leadScore))} />
                      <span className="text-[11px] text-muted-foreground">{c.contact.leadScore}</span>
                    </span>
                    {c.unreadCount > 0 && (
                      <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                        {c.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}

        {hasNextPage && (
          <button
            onClick={onLoadMore}
            disabled={isFetchingNextPage}
            className="w-full py-3 text-xs font-medium text-primary hover:underline disabled:opacity-50"
          >
            {isFetchingNextPage ? 'Loading…' : 'Load more'}
          </button>
        )}
      </div>
    </div>
  );
}
