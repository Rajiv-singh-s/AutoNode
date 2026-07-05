'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import {
  LayoutDashboard,
  Inbox,
  Users,
  KanbanSquare,
  Workflow,
  Moon,
  Sun,
  LogOut,
  Settings,
} from 'lucide-react';
import { cn, initials } from '@/lib/utils';
import { authStore } from '@/lib/auth';
import { LogoMark } from '@/components/Logo';
import { NotificationBell } from './NotificationBell';

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/inbox', label: 'Inbox', icon: Inbox },
  { href: '/leads', label: 'Leads', icon: Users },
  { href: '/pipeline', label: 'Pipeline', icon: KanbanSquare },
  { href: '/automations', label: 'Automations', icon: Workflow },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const org = authStore.getOrg();
  const isDark = mounted && theme === 'dark';

  const logout = () => {
    authStore.clear();
    router.replace('/login');
  };

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-border bg-card">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-4 py-4">
        <LogoMark className="h-11 w-11" />
        <p className="min-w-0 truncate text-sm text-muted-foreground">{org?.name ?? 'Workspace'}</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-2 py-2">
        {nav.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="space-y-1 border-t border-border p-2">
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {isDark ? 'Light mode' : 'Dark mode'}
        </button>
        <Link
          href="/settings"
          className={cn(
            'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
            pathname.startsWith('/settings')
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground',
          )}
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
        <div className="flex items-center gap-2 px-3 py-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-[10px] font-semibold">
            {initials(org?.name)}
          </div>
          <span className="flex-1 truncate text-xs text-muted-foreground">{org?.role ?? ''}</span>
          <NotificationBell />
          <button onClick={logout} aria-label="Log out" className="text-muted-foreground hover:text-foreground">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
