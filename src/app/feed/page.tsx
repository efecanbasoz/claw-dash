'use client';

import { useState } from 'react';
import { useFetch } from '@/hooks/use-fetch';
import { GlassCard } from '@/components/glass-card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Pause, Play, ChevronDown, ChevronUp } from 'lucide-react';

interface FeedMessage {
  timestamp: string;
  agentId: string;
  role: string;
  content: string;
  sessionId: string;
}

const roleBadge: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  user: 'default',
  assistant: 'secondary',
  tool: 'outline',
};

export default function FeedPage() {
  const [paused, setPaused] = useState(false);
  const [agentFilter, setAgentFilter] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const { data } = useFetch<{ messages: FeedMessage[] }>('/api/feed?limit=100', paused ? 0 : 5000);

  const messages = (data?.messages || []).filter(m => !agentFilter || m.agentId === agentFilter);
  const agents = [...new Set((data?.messages || []).map(m => m.agentId))];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Live Feed</h1>
        <div className="flex gap-2">
          <select
            value={agentFilter}
            onChange={e => setAgentFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-surface border border-border text-sm"
          >
            <option value="">All Agents</option>
            {agents.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <button
            onClick={() => setPaused(!paused)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-sm hover:bg-secondary/80 transition-colors"
          >
            {paused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
            {paused ? 'Resume' : 'Pause'}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {messages.map((m, i) => {
          const key = `${m.sessionId}-${m.timestamp}-${i}`;
          const isTool = m.role === 'tool';
          const isExpanded = expanded[key] ?? false;
          const isCodeLike = m.content.includes('```') || m.content.trim().startsWith('{') || m.content.trim().startsWith('[');
          const role = m.role.toLowerCase();

          return (
            <GlassCard key={key} delay={0}>
              <button
                onClick={() => setExpanded(prev => ({ ...prev, [key]: !isExpanded }))}
                className="w-full text-left"
              >
                <div className="flex items-start gap-3">
                  <Badge variant={roleBadge[role] || 'outline'} className="text-[10px] mt-0.5 shrink-0">
                    {role === 'user' ? 'User' : role === 'assistant' ? 'Assistant' : role === 'tool' ? 'Tool' : m.role}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 text-xs">
                      <span className="font-medium text-primary">{m.agentId}</span>
                      <span className="text-muted-foreground">{m.timestamp ? format(new Date(m.timestamp), 'HH:mm:ss') : ''}</span>
                      <span className="text-muted-foreground font-mono">{m.sessionId.slice(0, 8)}</span>
                    </div>
                    <p className={`text-sm text-muted-foreground ${isExpanded ? 'whitespace-pre-wrap' : 'line-clamp-3'} ${isCodeLike ? 'font-mono text-xs' : ''}`}>
                      {m.content}
                    </p>
                  </div>
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
                {isTool && !isExpanded && <p className="text-[10px] text-muted-foreground mt-2">Tool output collapsed — click to expand</p>}
              </button>
            </GlassCard>
          );
        })}
        {messages.length === 0 && <p className="text-center text-muted-foreground py-8">No messages yet</p>}
      </div>
    </div>
  );
}
