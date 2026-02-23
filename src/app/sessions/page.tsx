'use client';

import { useState } from 'react';
import { useFetch } from '@/hooks/use-fetch';
import { GlassCard } from '@/components/glass-card';
import { formatNumber, formatCurrency } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { formatDistanceToNow } from 'date-fns';
import { Search, ChevronDown, ChevronUp } from 'lucide-react';

interface Session {
  id: string; agentId: string; timestamp: string; model: string;
  messageCount: number; totalTokens: number; totalCost: number;
  lastActivity: string; isActive: boolean;
}

export default function SessionsPage() {
  const { data } = useFetch<{ sessions: Session[] }>('/api/sessions', 15000);
  const [search, setSearch] = useState('');
  const [agentFilter, setAgentFilter] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const sessions = (data?.sessions || []).filter(s => {
    if (search && !s.id.includes(search) && !s.agentId.includes(search) && !s.model.includes(search)) return false;
    if (agentFilter && s.agentId !== agentFilter) return false;
    return true;
  });

  const agents = [...new Set((data?.sessions || []).map(s => s.agentId))];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Sessions</h1>

      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search sessions..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <select
          value={agentFilter}
          onChange={e => setAgentFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-surface border border-border text-sm"
        >
          <option value="">All Agents</option>
          {agents.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      <GlassCard>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground border-b border-border">
                <th className="text-left p-2">Agent</th>
                <th className="text-left p-2">Session</th>
                <th className="text-left p-2">Status</th>
                <th className="text-left p-2">Model</th>
                <th className="text-right p-2">Msgs</th>
                <th className="text-right p-2">Tokens</th>
                <th className="text-right p-2">Cost</th>
                <th className="text-left p-2">Started</th>
                <th className="p-2" />
              </tr>
            </thead>
            <tbody>
              {sessions.slice(0, 50).map(s => (
                <tr key={s.id} className="border-b border-border/50 hover:bg-surface cursor-pointer" onClick={() => setExpanded(expanded === s.id ? null : s.id)}>
                  <td className="p-2"><Badge variant="outline">{s.agentId}</Badge></td>
                  <td className="p-2 font-mono text-xs">{s.id.slice(0, 8)}</td>
                  <td className="p-2">
                    {s.isActive ? (
                      <span className="flex items-center gap-1 text-success text-xs">
                        <span className="h-2 w-2 rounded-full bg-success animate-pulse" /> Active
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Ended</span>
                    )}
                  </td>
                  <td className="p-2 text-xs">{s.model}</td>
                  <td className="p-2 text-right">{s.messageCount}</td>
                  <td className="p-2 text-right">{formatNumber(s.totalTokens)}</td>
                  <td className="p-2 text-right">{formatCurrency(s.totalCost)}</td>
                  <td className="p-2 text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(s.timestamp), { addSuffix: true })}
                  </td>
                  <td className="p-2">
                    {expanded === s.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {sessions.length === 0 && <p className="text-center text-muted-foreground py-8">No sessions found</p>}
        <p className="text-xs text-muted-foreground mt-2">{sessions.length} sessions total</p>
      </GlassCard>
    </div>
  );
}
