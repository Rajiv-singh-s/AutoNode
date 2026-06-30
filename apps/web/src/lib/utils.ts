import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

const intentColors: Record<string, string> = {
  HIGH: 'text-emerald-500',
  MEDIUM: 'text-amber-500',
  LOW: 'text-sky-500',
  NONE: 'text-muted-foreground',
};

export function intentColor(intent: string): string {
  return intentColors[intent] ?? 'text-muted-foreground';
}

export function scoreColor(score: number): string {
  if (score >= 75) return 'bg-emerald-500';
  if (score >= 45) return 'bg-amber-500';
  return 'bg-muted-foreground';
}

export function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-US').format(n);
}

export function formatPercent(fraction: number): string {
  return `${(fraction * 100).toFixed(1)}%`;
}

const stageColors: Record<string, string> = {
  NEW: 'bg-slate-500',
  CONTACTED: 'bg-sky-500',
  QUALIFIED: 'bg-indigo-500',
  PROPOSAL: 'bg-violet-500',
  NEGOTIATION: 'bg-amber-500',
  WON: 'bg-emerald-500',
  LOST: 'bg-rose-500',
};

export function stageColor(stage: string): string {
  return stageColors[stage] ?? 'bg-muted-foreground';
}

export function initials(name: string | null | undefined): string {
  if (!name) return '?';
  return name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}
