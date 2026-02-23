'use client';

import { useState } from 'react';
import { useFetch } from '@/hooks/use-fetch';
import { GlassCard } from '@/components/glass-card';
import { Badge } from '@/components/ui/badge';
import { formatNumber } from '@/lib/format';
import { Switch } from '@/components/ui/switch';
import { Clock, Pencil } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface CronJob {
  id: string; name: string; enabled: boolean;
  schedule: { kind: string; expr?: string; tz?: string };
  payload: { kind: string; message?: string; model?: string };
  state: { nextRunAtMs: number; lastRunAtMs: number; lastStatus: string; lastDurationMs?: number };
  timeoutMs?: number;
}

export default function CronPage() {
  const { data } = useFetch<{ jobs: CronJob[] }>('/api/cron', 30000);
  const [editing, setEditing] = useState<CronJob | null>(null);
  const [form, setForm] = useState({ name: '', schedule: '', message: '', timeout: '' });

  const toggle = async (job: CronJob) => {
    await fetch('/api/cron/toggle', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: job.id, enabled: !job.enabled }),
    });
  };

  const openEdit = (job: CronJob) => {
    setEditing(job);
    setForm({
      name: job.name || '',
      schedule: job.schedule.expr || '',
      message: job.payload.message || '',
      timeout: job.timeoutMs ? String(Math.round(job.timeoutMs / 1000)) : '',
    });
  };

  const saveEdit = async () => {
    if (!editing) return;
    await fetch('/api/cron/edit', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: editing.id,
        name: form.name,
        schedule: form.schedule,
        message: form.message,
        timeout: form.timeout,
      }),
    });
    setEditing(null);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Cron Jobs</h1>

      <div className="space-y-3">
        {(data?.jobs || []).map((job, i) => (
          <GlassCard key={job.id} delay={i * 0.1}>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h3 className="font-medium">{job.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{job.schedule.expr} ({job.schedule.tz || 'UTC'})</p>
                  {job.payload.model && <Badge variant="outline" className="mt-1 text-[10px]">{job.payload.model}</Badge>}
                  {job.payload.message && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{job.payload.message}</p>}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={job.enabled} onCheckedChange={() => toggle(job)} />
                <button onClick={() => openEdit(job)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground">
                  <Pencil className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
              <span>Next: {job.state.nextRunAtMs ? formatDistanceToNow(new Date(job.state.nextRunAtMs), { addSuffix: true }) : 'N/A'}</span>
              <span>Last: {job.state.lastRunAtMs ? formatDistanceToNow(new Date(job.state.lastRunAtMs), { addSuffix: true }) : 'Never'}</span>
              <span>Status: <Badge variant={job.state.lastStatus === 'ok' ? 'outline' : 'destructive'} className="text-[10px]">{job.state.lastStatus || 'N/A'}</Badge></span>
              {job.state.lastDurationMs && <span>Duration: {formatNumber(job.state.lastDurationMs / 1000, 1)}s</span>}
            </div>
          </GlassCard>
        ))}
        {(data?.jobs || []).length === 0 && <p className="text-center text-muted-foreground py-8">No cron jobs configured</p>}
      </div>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Cron Job</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Name" />
            <Input value={form.schedule} onChange={e => setForm({ ...form, schedule: e.target.value })} placeholder="Schedule (cron)" />
            <textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} placeholder="Message" className="w-full min-h-28 rounded-lg bg-surface border border-border p-2 text-sm" />
            <Input value={form.timeout} onChange={e => setForm({ ...form, timeout: e.target.value })} placeholder="Timeout (seconds)" />
          </div>
          <DialogFooter>
            <button onClick={saveEdit} className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm">Save</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
