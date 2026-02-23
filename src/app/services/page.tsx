'use client';

import { useState } from 'react';
import { useFetch } from '@/hooks/use-fetch';
import { GlassCard } from '@/components/glass-card';
import { Server, RefreshCw } from 'lucide-react';

interface Health { uptime: number }

export default function ServicesPage() {
  const { data } = useFetch<Health>('/api/health', 10000);
  const [restarting, setRestarting] = useState(false);
  const [status, setStatus] = useState('');

  const restart = async (service: string) => {
    setRestarting(true);
    setStatus('');
    try {
      const res = await fetch('/api/services/restart', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service }),
      });
      const json = await res.json();
      setStatus(json.message || json.error || 'Done');
    } catch (e) {
      setStatus(String(e));
    } finally {
      setRestarting(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Services</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <GlassCard>
          <div className="flex items-center gap-3 mb-4">
            <Server className="h-5 w-5 text-primary" />
            <div>
              <h3 className="font-medium">OpenClaw Gateway</h3>
              <p className="text-xs text-success flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-success animate-pulse" /> Running
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            System uptime: {data ? `${Math.floor(data.uptime / 86400)}d ${Math.floor((data.uptime % 86400) / 3600)}h` : '-'}
          </p>
          <button
            onClick={() => restart('openclaw')}
            disabled={restarting}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 transition-colors text-sm disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${restarting ? 'animate-spin' : ''}`} /> Restart Gateway
          </button>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center gap-3 mb-4">
            <Server className="h-5 w-5 text-success" />
            <div>
              <h3 className="font-medium">Dashboard (Next.js)</h3>
              <p className="text-xs text-success flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-success animate-pulse" /> Running on :3100
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Self-hosted monitoring dashboard</p>
        </GlassCard>
      </div>

      {status && (
        <GlassCard>
          <p className="text-sm">{status}</p>
        </GlassCard>
      )}
    </div>
  );
}
