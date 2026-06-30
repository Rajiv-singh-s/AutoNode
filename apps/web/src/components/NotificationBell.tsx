'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Flame, Zap, MessageSquareDot, UserCheck, Plug } from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllRead,
  type Notification,
} from '@/features/settings/use-settings';

const TYPE_META: Record<string, { icon: typeof Bell; cls: string }> = {
  NEW_HOT_LEAD: { icon: Flame, cls: 'text-orange-500' },
  AUTOMATION_TRIGGERED: { icon: Zap, cls: 'text-primary' },
  CONVERSATION_ASSIGNED: { icon: UserCheck, cls: 'text-sky-500' },
  NEW_CONVERSATION: { icon: MessageSquareDot, cls: 'text-emerald-500' },
  CHANNEL_ERROR: { icon: Plug, cls: 'text-red-500' },
  TEAM_INVITE: { icon: UserCheck, cls: 'text-violet-500' },
};

function NotificationItem({
  n,
  onRead,
}: {
  n: Notification;
  onRead: (id: string, url: string | null) => void;
}) {
  const meta = TYPE_META[n.type] ?? { icon: Bell, cls: 'text-muted-foreground' };
  const Icon = meta.icon;

  return (
    <button
      onClick={() => onRead(n.id, n.actionUrl)}
      className={cn(
        'w-full flex items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-accent',
        !n.read && 'bg-primary/5',
      )}
    >
      <div className={cn('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-card border border-border', meta.cls)}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn('truncate text-sm', !n.read && 'font-medium')}>{n.title}</p>
        {n.body && <p className="mt-0.5 truncate text-xs text-muted-foreground">{n.body}</p>}
        <p className="mt-0.5 text-[10px] text-muted-foreground">
          {formatDistanceToNowStrict(new Date(n.createdAt), { addSuffix: true })}
        </p>
      </div>
      {!n.read && <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />}
    </button>
  );
}

export function NotificationBell() {
  const router = useRouter();
  const { data } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllRead();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const unread = data?.unreadCount ?? 0;
  const notifications = data?.notifications ?? [];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleRead = (id: string, url: string | null) => {
    markRead.mutate(id);
    if (url) router.push(url);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-1 w-80 rounded-xl border border-border bg-card shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <span className="text-xs font-semibold">Notifications</span>
            {unread > 0 && (
              <button
                onClick={() => markAll.mutate()}
                className="text-xs text-primary hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="p-4 text-center text-sm text-muted-foreground">No notifications yet.</p>
            ) : (
              notifications.map((n) => (
                <NotificationItem key={n.id} n={n} onRead={handleRead} />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
