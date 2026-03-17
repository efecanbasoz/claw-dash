'use client';

import { useFetch } from '@/hooks/use-fetch';
import { GlassCard } from '@/components/glass-card';
import { AnimatedNumber } from '@/components/animated-number';
import { ClientResponsiveContainer } from '@/components/client-responsive-container';
import { Activity, MessageSquare, Coins, Zap, Cpu, HardDrive, MemoryStick } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { formatDistanceToNow } from 'date-fns';

interface Stats {
  today: { count: number; tokens: number; cost: number; messages: number };
  week: { count: number; tokens: number; cost: number; messages: number };
  lifetime: { count: number; tokens: number; cost: number; messages: number };
  dailyCosts: Array<{ date: string; cost: number; tokens: number }>;
  heatmap: Array<{ date: string; count: number }>;
  activeSessions: Array<{ id: string; agentId: string; model: string; lastActivity: string }>;
}

interface Health {
  cpu: { percent: number };
  memory: { percent: number; total: number; used: number };
  disk: { percent: number; used: string; total: string };
}

export default function Dashboard() {
  const { data: stats } = useFetch<Stats>('/api/stats', 30000);
  const { data: health } = useFetch<Health>('/api/health', 10000);

  const statCards = [
    { label: 'Sessions Today', value: stats?.today.count || 0, icon: Activity, color: 'text-success' },
    { label: 'Messages Today', value: stats?.today.messages || 0, icon: MessageSquare, color: 'text-info' },
    { label: 'Tokens Today', value: stats?.today.tokens || 0, icon: Zap, color: 'text-warning', format: true },
    { label: 'Cost Today', value: stats?.today.cost || 0, icon: Coins, color: 'text-primary', prefix: '$', decimals: 4 },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <GlassCard key={card.label} delay={i * 0.1}>
            <div className="flex items-center gap-3">
              <card.icon className={`h-5 w-5 ${card.color}`} />
              <div>
                <p className="text-xs text-muted-foreground">{card.label}</p>
                <p className="text-xl font-bold">
                  <AnimatedNumber
                    value={card.value}
                    prefix={card.prefix}
                    decimals={card.decimals}
                  />
                </p>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Token Usage Chart */}
        <GlassCard className="lg:col-span-2" delay={0.4}>
          <h3 className="text-sm font-medium mb-4">Token Usage (30 days)</h3>
          <div className="h-48">
            <ClientResponsiveContainer>
              <AreaChart data={stats?.dailyCosts || []}>
                <defs>
                  <linearGradient id="tokenGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.650 0.180 260)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="oklch(0.650 0.180 260)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={v => v.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ background: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="tokens" stroke="oklch(0.650 0.180 260)" fill="url(#tokenGrad)" />
              </AreaChart>
            </ClientResponsiveContainer>
          </div>
        </GlassCard>

        {/* System Health */}
        <GlassCard delay={0.5}>
          <h3 className="text-sm font-medium mb-4">System Health</h3>
          <div className="space-y-4">
            {[
              { label: 'CPU', value: health?.cpu.percent || 0, icon: Cpu, color: 'bg-primary' },
              { label: 'RAM', value: health?.memory.percent || 0, icon: MemoryStick, color: 'bg-success' },
              { label: 'Disk', value: health?.disk.percent || 0, icon: HardDrive, color: 'bg-warning' },
            ].map(item => (
              <div key={item.label} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5"><item.icon className="h-3 w-3" />{item.label}</span>
                  <span>{item.value}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div className={`h-full rounded-full ${item.color} transition-all duration-500`} style={{ width: `${item.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Active Sessions */}
        <GlassCard delay={0.6}>
          <h3 className="text-sm font-medium mb-3">Active Sessions</h3>
          {stats?.activeSessions?.length ? (
            <div className="space-y-2">
              {stats.activeSessions.map(s => (
                <div key={s.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-surface">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
                    <span className="font-medium">{s.agentId}</span>
                  </div>
                  <span className="text-muted-foreground">{s.model}</span>
                  <span className="text-muted-foreground">{formatDistanceToNow(new Date(s.lastActivity), { addSuffix: true })}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No active sessions</p>
          )}
        </GlassCard>

        {/* Activity Heatmap */}
        <GlassCard delay={0.7}>
          <h3 className="text-sm font-medium mb-3">Activity (30 days)</h3>
          <div className="flex flex-wrap gap-1">
            {(stats?.heatmap || []).map(d => {
              const intensity = d.count === 0 ? 'bg-muted' :
                d.count < 3 ? 'bg-primary/20' :
                d.count < 6 ? 'bg-primary/40' :
                d.count < 10 ? 'bg-primary/60' : 'bg-primary/80';
              return (
                <div key={d.date} title={`${d.date}: ${d.count} sessions`}
                  className={`h-4 w-4 rounded-sm ${intensity}`} />
              );
            })}
          </div>
        </GlassCard>
      </div>

      {/* Lifetime Stats */}
      <GlassCard delay={0.8}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold"><AnimatedNumber value={stats?.lifetime.count || 0} /></p>
            <p className="text-xs text-muted-foreground">Total Sessions</p>
          </div>
          <div>
            <p className="text-2xl font-bold"><AnimatedNumber value={stats?.lifetime.messages || 0} /></p>
            <p className="text-xs text-muted-foreground">Total Messages</p>
          </div>
          <div>
            <p className="text-2xl font-bold"><AnimatedNumber value={stats?.lifetime.tokens || 0} /></p>
            <p className="text-xs text-muted-foreground">Total Tokens</p>
          </div>
          <div>
            <p className="text-2xl font-bold"><AnimatedNumber value={stats?.lifetime.cost || 0} prefix="$" decimals={2} /></p>
            <p className="text-xs text-muted-foreground">Total Cost</p>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
