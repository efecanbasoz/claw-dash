'use client';

import { useState } from 'react';
import { GlassCard } from '@/components/glass-card';
import { useTheme } from '@/components/theme-provider';
import { Moon, Sun, Monitor } from 'lucide-react';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [refreshInterval, setRefreshInterval] = useState(() => {
    if (typeof window === 'undefined') return 10;
    const saved = localStorage.getItem('ocds-refresh-interval');
    return saved ? parseInt(saved) : 10;
  });

  const saveInterval = (val: number) => {
    setRefreshInterval(val);
    localStorage.setItem('ocds-refresh-interval', String(val));
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Settings</h1>

      <GlassCard>
        <h3 className="font-medium mb-4">Theme</h3>
        <div className="flex gap-3">
          {[
            { value: 'dark' as const, icon: Moon, label: 'Dark' },
            { value: 'light' as const, icon: Sun, label: 'Light' },
            { value: 'system' as const, icon: Monitor, label: 'System' },
          ].map(t => (
            <button
              key={t.value}
              onClick={() => setTheme(t.value)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${theme === t.value ? 'bg-primary/20 text-primary' : 'bg-surface hover:bg-secondary'}`}
            >
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
        </div>
      </GlassCard>

      <GlassCard delay={0.1}>
        <h3 className="font-medium mb-4">Auto-Refresh Interval</h3>
        <div className="flex gap-2">
          {[5, 10, 30, 60].map(v => (
            <button
              key={v}
              onClick={() => saveInterval(v)}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${refreshInterval === v ? 'bg-primary/20 text-primary' : 'bg-surface hover:bg-secondary'}`}
            >
              {v}s
            </button>
          ))}
        </div>
      </GlassCard>

      <GlassCard delay={0.2}>
        <h3 className="font-medium mb-4">Dashboard</h3>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span>Port</span>
            <span className="font-mono text-muted-foreground">3100</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Version</span>
            <span className="font-mono text-muted-foreground">1.5.0</span>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
