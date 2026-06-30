'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { User, Building2, Plug, Users, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';

const settingsNav = [
  { href: '/settings', label: 'Profile', icon: User, exact: true },
  { href: '/settings/organization', label: 'Organization', icon: Building2, exact: true },
  { href: '/settings/channels', label: 'Channels', icon: Plug, exact: false },
  { href: '/settings/team', label: 'Team', icon: Users, exact: false },
  { href: '/settings/billing', label: 'Billing', icon: CreditCard, exact: false },
] as const;

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full overflow-hidden">
      {/* Settings sub-nav */}
      <nav className="w-52 shrink-0 border-r border-border bg-card px-2 py-4 space-y-1">
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Settings
        </p>
        {settingsNav.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
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

      <main className="scroll-thin flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
