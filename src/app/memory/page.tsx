'use client';

import { useState } from 'react';
import { useFetch } from '@/hooks/use-fetch';
import { GlassCard } from '@/components/glass-card';
import { formatNumber } from '@/lib/format';
import { FileText, Search, Pencil, Save } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { formatDistanceToNow } from 'date-fns';

interface MemFile { name: string; path: string; size: number; modified: string }
interface MemContent { path: string; content: string }

export default function MemoryPage() {
  const { data } = useFetch<{ files: MemFile[] }>('/api/memory');
  const [selected, setSelected] = useState<string | null>(null);
  const { data: content } = useFetch<MemContent>(selected ? `/api/memory/${selected}` : '');
  const [search, setSearch] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const files = (data?.files || []).filter(f => !search || f.name.toLowerCase().includes(search.toLowerCase()));

  const startEdit = () => {
    setDraft(content?.content || '');
    setIsEditing(true);
  };

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await fetch('/api/memory/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: selected, content: draft }),
      });
      if (res.ok) setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Memory Viewer</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <GlassCard className="lg:col-span-1">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search files..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="space-y-1 max-h-[60vh] overflow-y-auto">
            {files.map(f => (
              <button
                key={f.path}
                onClick={() => { setSelected(f.path); setIsEditing(false); }}
                className={`w-full flex items-center gap-2 p-2 rounded-lg text-sm text-left transition-colors ${selected === f.path ? 'bg-primary/20 text-primary' : 'hover:bg-secondary'}`}
              >
                <FileText className="h-4 w-4 shrink-0" />
                <div className="min-w-0">
                  <p className="truncate font-medium">{f.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatNumber(f.size / 1024, 1)}KB · {formatDistanceToNow(new Date(f.modified), { addSuffix: true })}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="lg:col-span-2">
          {content?.content ? (
            <div className="space-y-3">
              <div className="flex justify-end gap-2">
                {!isEditing ? (
                  <button onClick={startEdit} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-sm hover:bg-secondary/80">
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                ) : (
                  <button onClick={save} disabled={saving} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm disabled:opacity-50">
                    <Save className="h-3.5 w-3.5" /> {saving ? 'Saving...' : 'Save'}
                  </button>
                )}
              </div>
              {isEditing ? (
                <textarea value={draft} onChange={e => setDraft(e.target.value)} className="w-full min-h-[65vh] rounded-lg bg-surface border border-border p-3 font-mono text-sm" />
              ) : (
                <pre className="text-sm whitespace-pre-wrap font-mono max-h-[70vh] overflow-y-auto">{content.content}</pre>
              )}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">Select a file to view</p>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
