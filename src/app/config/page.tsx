'use client';

import { useEffect, useState } from 'react';
import { GlassCard } from '@/components/glass-card';
import { useFetch } from '@/hooks/use-fetch';

export default function ConfigPage() {
  const { data } = useFetch<{ config: unknown; error?: string }>('/api/config', 0);
  const [jsonText, setJsonText] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data?.config) setJsonText(JSON.stringify(data.config, null, 2));
  }, [data]);

  const save = async () => {
    setError('');
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      setError('Invalid JSON');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/config/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: parsed }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || 'Save failed');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Config Editor</h1>
      <p className="text-sm text-muted-foreground">Sensitive fields (credentials/tokens/apiKey/secret) are masked and cannot be edited here.</p>
      <GlassCard>
        <div className="space-y-3">
          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            className="w-full min-h-[70vh] rounded-lg bg-surface border border-border p-3 font-mono text-sm"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end">
            <button
              onClick={save}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
