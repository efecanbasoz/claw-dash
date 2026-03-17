'use client';

import { useFetch } from '@/hooks/use-fetch';
import { GlassCard } from '@/components/glass-card';
import { AnimatedNumber } from '@/components/animated-number';
import { ClientResponsiveContainer } from '@/components/client-responsive-container';
import { formatNumber, formatCurrency } from '@/lib/format';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip
} from 'recharts';

interface Stats {
  today: { cost: number; tokens: number; messages: number };
  week: { cost: number; tokens: number; messages: number };
  month: { cost: number; tokens: number; messages: number };
  lifetime: { cost: number; tokens: number; messages: number };
  byAgent: Record<string, { cost: number; tokens: number }>;
  byModel: Record<string, { cost: number; tokens: number }>;
  dailyCosts: Array<{ date: string; cost: number; tokens: number }>;
}

const COLORS = ['oklch(0.650 0.180 260)', 'oklch(0.600 0.180 290)', 'oklch(0.700 0.150 290)', 'oklch(0.780 0.100 290)', 'oklch(0.550 0.170 155)', 'oklch(0.700 0.180 75)', 'oklch(0.550 0.200 25)', 'oklch(0.600 0.150 240)'];

export default function CostsPage() {
  const { data } = useFetch<Stats>('/api/stats', 30000);

  const agentData = Object.entries(data?.byAgent || {}).map(([name, v]) => ({ name, cost: v.cost }));
  const modelData = Object.entries(data?.byModel || {}).map(([name, v]) => ({ name, cost: v.cost })).filter(m => m.cost > 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Cost Analysis</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Today', value: data?.today.cost || 0 },
          { label: 'This Week', value: data?.week.cost || 0 },
          { label: 'This Month', value: data?.month.cost || 0 },
          { label: 'Lifetime', value: data?.lifetime.cost || 0 },
        ].map((item, i) => (
          <GlassCard key={item.label} delay={i * 0.1}>
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p className="text-2xl font-bold"><AnimatedNumber value={item.value} prefix="$" decimals={4} /></p>
          </GlassCard>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GlassCard delay={0.4}>
          <h3 className="text-sm font-medium mb-4">Daily Cost Trend</h3>
          <div className="h-64">
            <ClientResponsiveContainer>
              <AreaChart data={data?.dailyCosts || []}>
                <defs>
                  <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.650 0.180 260)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="oklch(0.650 0.180 260)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={v => v.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${v}`} />
                <Tooltip contentStyle={{ background: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: 8, color: 'var(--color-foreground)' }} formatter={(v) => [formatCurrency(Number(v)), 'Cost']} />
                <Area type="monotone" dataKey="cost" stroke="oklch(0.650 0.180 260)" fill="url(#costGrad)" />
              </AreaChart>
            </ClientResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard delay={0.5}>
          <h3 className="text-sm font-medium mb-4">Cost by Model</h3>
          <div className="h-48">
            <ClientResponsiveContainer>
              <PieChart>
                <Pie data={modelData} dataKey="cost" nameKey="name" cx="50%" cy="50%" outerRadius={70}>
                  {modelData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(Number(v))} contentStyle={{ background: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: 8, color: 'var(--color-foreground)' }} />
              </PieChart>
            </ClientResponsiveContainer>
          </div>
          <div className="mt-3 space-y-1.5">
            {modelData.map((m, i) => (
              <div key={m.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="text-muted-foreground">{(m.name || '').split('/').pop()}</span>
                </div>
                <span className="font-mono">{formatCurrency(m.cost)} ({formatNumber(modelData.reduce((s, x) => s + x.cost, 0) > 0 ? (m.cost / modelData.reduce((s, x) => s + x.cost, 0)) * 100 : 0)}%)</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      <GlassCard delay={0.6}>
        <h3 className="text-sm font-medium mb-4">Cost by Agent</h3>
        <div className="h-64">
          <ClientResponsiveContainer>
            <BarChart data={agentData}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${v}`} />
              <Tooltip contentStyle={{ background: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: 8, color: 'var(--color-foreground)' }} formatter={(v) => [formatCurrency(Number(v)), 'Cost']} />
              <Bar dataKey="cost" fill="oklch(0.650 0.180 260)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ClientResponsiveContainer>
        </div>
      </GlassCard>

      {/* Token Efficiency */}
      <GlassCard delay={0.7}>
        <h3 className="text-sm font-medium mb-3">Token Efficiency</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-lg font-bold">
              {data?.lifetime.messages ? formatCurrency(data.lifetime.cost / data.lifetime.messages) : '0'}
            </p>
            <p className="text-xs text-muted-foreground">Cost per Message</p>
          </div>
          <div>
            <p className="text-lg font-bold">
              {data?.lifetime.tokens ? formatCurrency(data.lifetime.cost / (data.lifetime.tokens / 1000)) : '0'}
            </p>
            <p className="text-xs text-muted-foreground">Cost per 1K Tokens</p>
          </div>
          <div>
            <p className="text-lg font-bold">
              {data?.lifetime.messages ? formatNumber(Math.round(data.lifetime.tokens / data.lifetime.messages)) : '0'}
            </p>
            <p className="text-xs text-muted-foreground">Avg Tokens/Message</p>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
