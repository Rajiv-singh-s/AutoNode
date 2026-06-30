'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Flame,
  Inbox,
  MessageSquareDot,
  TrendingUp,
  Timer,
  DollarSign,
  UserPlus,
  Target,
} from 'lucide-react';
import { useOverview, useTimeseries } from '@/features/dashboard/use-dashboard';
import { Spinner } from '@/components/ui';
import { cn, formatCurrency, formatNumber, formatPercent, stageColor } from '@/lib/utils';

const PALETTE = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6', '#ef4444'];

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: typeof Flame;
  label: string;
  value: string;
  hint?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <Icon className={cn('h-4 w-4', accent ?? 'text-muted-foreground')} />
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="mb-4 text-sm font-semibold">{title}</h3>
      {children}
    </div>
  );
}

export default function DashboardPage() {
  const overview = useOverview();
  const timeseries = useTimeseries(14);

  if (overview.isLoading || !overview.data) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const m = overview.data;
  const series = timeseries.data ?? [];

  return (
    <div className="scroll-thin h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl space-y-6 p-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Your AI sales operating system at a glance.
          </p>
        </div>

        {/* Headline metrics */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard icon={Flame} label="Hot leads" value={formatNumber(m.hotLeads)} accent="text-orange-500" hint="Lead score ≥ 70" />
          <StatCard icon={Inbox} label="Open conversations" value={formatNumber(m.openConversations)} />
          <StatCard icon={MessageSquareDot} label="Unread" value={formatNumber(m.unreadMessages)} accent="text-primary" />
          <StatCard icon={UserPlus} label="Today's leads" value={formatNumber(m.todayLeads)} />
          <StatCard icon={Target} label="Conversion rate" value={formatPercent(m.conversionRate)} hint={`${m.wonDeals} won / ${m.totalContacts} leads`} accent="text-emerald-500" />
          <StatCard icon={DollarSign} label="Revenue (won)" value={formatCurrency(m.revenue)} accent="text-emerald-500" />
          <StatCard icon={Timer} label="Avg first response" value={m.avgFirstResponseMins != null ? `${m.avgFirstResponseMins}m` : '—'} />
          <StatCard icon={TrendingUp} label="Total contacts" value={formatNumber(m.totalContacts)} />
        </div>

        {/* Trend */}
        <ChartCard title="Conversations & leads (14 days)">
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={series} margin={{ left: -20, right: 8, top: 4 }}>
              <defs>
                <linearGradient id="gConv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gLeads" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tickFormatter={(d) => String(d).slice(5)} fontSize={11} stroke="hsl(var(--muted-foreground))" />
              <YAxis allowDecimals={false} fontSize={11} stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Area type="monotone" dataKey="conversations" stroke="#6366f1" fill="url(#gConv)" strokeWidth={2} />
              <Area type="monotone" dataKey="leads" stroke="#10b981" fill="url(#gLeads)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Leads by stage */}
          <ChartCard title="Pipeline by stage">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={m.leadsByStage} margin={{ left: -20, right: 8 }}>
                <XAxis dataKey="stage" tickFormatter={(s) => String(s).slice(0, 4)} fontSize={11} stroke="hsl(var(--muted-foreground))" />
                <YAxis allowDecimals={false} fontSize={11} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  cursor={{ fill: 'hsl(var(--accent))' }}
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {m.leadsByStage.map((s) => (
                    <Cell key={s.stage} fill={PALETTE[['NEW','CONTACTED','QUALIFIED','PROPOSAL','NEGOTIATION','WON','LOST'].indexOf(s.stage) % PALETTE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Channel distribution */}
          <ChartCard title="Conversations by channel">
            <div className="flex items-center">
              <ResponsiveContainer width="60%" height={220}>
                <PieChart>
                  <Pie data={m.byChannel} dataKey="count" nameKey="type" innerRadius={45} outerRadius={80} paddingAngle={3}>
                    {m.byChannel.map((c, i) => (
                      <Cell key={c.type} fill={PALETTE[i % PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {m.byChannel.map((c, i) => (
                  <div key={c.type} className="flex items-center gap-2 text-sm">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />
                    <span className="capitalize">{c.type.toLowerCase()}</span>
                    <span className="ml-auto font-medium text-muted-foreground">{c.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </ChartCard>
        </div>

        {/* AI insight strip */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold">AI insights</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <Flame className="mt-0.5 h-4 w-4 text-orange-500" />
              {m.hotLeads} hot {m.hotLeads === 1 ? 'lead is' : 'leads are'} waiting — prioritize replies to protect conversion.
            </li>
            <li className="flex items-start gap-2">
              <Timer className="mt-0.5 h-4 w-4 text-primary" />
              {m.avgFirstResponseMins != null
                ? `Average first response is ${m.avgFirstResponseMins} minutes. Faster replies lift close rates.`
                : 'Not enough data yet to compute response time.'}
            </li>
            <li className="flex items-start gap-2">
              <span className={cn('mt-1 h-2.5 w-2.5 rounded-full', stageColor('WON'))} />
              {formatCurrency(m.revenue)} in won revenue from {m.wonDeals} {m.wonDeals === 1 ? 'deal' : 'deals'}.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
