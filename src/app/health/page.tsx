'use client';

import { useFetch } from '@/hooks/use-fetch';
import { GlassCard } from '@/components/glass-card';
import { AnimatedNumber } from '@/components/animated-number';
import { ClientResponsiveContainer } from '@/components/client-responsive-container';
import { formatNumber } from '@/lib/format';
import { BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { Cpu, MemoryStick, HardDrive, Thermometer, Clock } from 'lucide-react';

interface Health {
  cpu: { percent: number; cores: number; coreUsage: number[]; model: string };
  memory: { total: number; used: number; free: number; percent: number };
  disk: { total: string; used: string; available: string; percent: number };
  diskMounts?: Array<{ mount: string; total: string; used: string; available: string; percent: number; filesystem: string }>;
  diskIO?: { readKBs: number; writeKBs: number };
  temperature: number | null;
  uptime: number;
  loadAvg: number[];
  topProcesses: Array<{ pid: string; cpu: string; mem: string; command: string }>;
}

function formatBytes(bytes: number) {
  const gb = bytes / (1024 ** 3);
  return gb >= 1 ? `${formatNumber(gb, 1)} GB` : `${formatNumber(bytes / (1024 ** 2))} MB`;
}

function formatUptime(seconds: number) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
}

export default function HealthPage() {
  const { data } = useFetch<Health>('/api/health', 5000);

  const coreData = (data?.cpu.coreUsage || []).map((usage, i) => ({ name: `C${i}`, usage }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">System Health</h1>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'CPU', value: data?.cpu.percent || 0, suffix: '%', icon: Cpu, color: 'text-primary' },
          { label: 'RAM', value: data?.memory.percent || 0, suffix: '%', icon: MemoryStick, color: 'text-success' },
          { label: 'Disk', value: data?.disk.percent || 0, suffix: '%', icon: HardDrive, color: 'text-warning' },
          { label: 'Temp', value: data?.temperature || 0, suffix: '°C', icon: Thermometer, color: 'text-destructive' },
          { label: 'Uptime', value: 0, suffix: '', icon: Clock, color: 'text-info', text: data ? formatUptime(data.uptime) : '-' },
        ].map((item, i) => (
          <GlassCard key={item.label} delay={i * 0.1}>
            <div className="flex items-center gap-2">
              <item.icon className={`h-4 w-4 ${item.color}`} />
              <span className="text-xs text-muted-foreground">{item.label}</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {item.text || <><AnimatedNumber value={item.value} />{item.suffix}</>}
            </p>
          </GlassCard>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GlassCard delay={0.5}>
          <h3 className="text-sm font-medium mb-4">CPU Per Core</h3>
          <div className="h-48">
            <ClientResponsiveContainer>
              <BarChart data={coreData}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ background: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: 8 }} />
                <Bar dataKey="usage" fill="oklch(0.650 0.180 260)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ClientResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard delay={0.6}>
          <h3 className="text-sm font-medium mb-4">Memory Breakdown</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>Used</span>
              <span>{formatBytes(data?.memory.used || 0)}</span>
            </div>
            <div className="h-4 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-success transition-all duration-500" style={{ width: `${data?.memory.percent || 0}%` }} />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Free: {formatBytes(data?.memory.free || 0)}</span>
              <span>Total: {formatBytes(data?.memory.total || 0)}</span>
            </div>
          </div>

          <h3 className="text-sm font-medium mt-6 mb-2">Load Average</h3>
          <div className="flex gap-4 text-sm">
            {['1m', '5m', '15m'].map((label, i) => (
              <div key={label}>
                <span className="text-muted-foreground text-xs">{label}: </span>
                <span className="font-mono">{data?.loadAvg[i] != null ? formatNumber(data.loadAvg[i], 2) : '-'}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      <GlassCard delay={0.7}>
        <h3 className="text-sm font-medium mb-3">Disk Details</h3>
        <div className="space-y-3">
          {(data?.diskMounts || []).map((m) => (
            <div key={m.mount} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-mono">{m.mount}</span>
                <span className="text-muted-foreground">{m.used} / {m.total} ({m.percent}%)</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${m.percent > 90 ? 'bg-destructive' : m.percent > 70 ? 'bg-warning' : 'bg-primary'}`}
                  style={{ width: `${m.percent}%` }}
                />
              </div>
              <div className="text-[10px] text-muted-foreground/60">{m.filesystem} — {m.available} free</div>
            </div>
          ))}
          {data?.diskIO && (data.diskIO.readKBs > 0 || data.diskIO.writeKBs > 0) && (
            <div className="flex gap-4 text-xs pt-2 border-t border-border">
              <span className="text-muted-foreground">I/O:</span>
              <span>↓ {formatNumber(data.diskIO.readKBs / 1024, 1)} MB/s read</span>
              <span>↑ {formatNumber(data.diskIO.writeKBs / 1024, 1)} MB/s write</span>
            </div>
          )}
        </div>
      </GlassCard>

      <GlassCard delay={0.8}>
        <h3 className="text-sm font-medium mb-3">Top Processes</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted-foreground border-b border-border">
                <th className="text-left p-1.5">PID</th>
                <th className="text-right p-1.5">CPU%</th>
                <th className="text-right p-1.5">MEM%</th>
                <th className="text-left p-1.5">Command</th>
              </tr>
            </thead>
            <tbody>
              {(data?.topProcesses || []).map(p => (
                <tr key={p.pid} className="border-b border-border/50">
                  <td className="p-1.5 font-mono">{p.pid}</td>
                  <td className="p-1.5 text-right">{p.cpu}</td>
                  <td className="p-1.5 text-right">{p.mem}</td>
                  <td className="p-1.5 truncate max-w-xs">{p.command}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
