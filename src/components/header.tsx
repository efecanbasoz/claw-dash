'use client';

import { Moon, Sun, Bell, Shield } from 'lucide-react';
import { useTheme } from './theme-provider';
import { useFetch } from '@/hooks/use-fetch';
import { Badge } from '@/components/ui/badge';

interface SecurityHeaderData {
  overall: {
    status: 'All Secure' | 'Warnings' | 'Critical';
    warnings: number;
    critical: number;
    level: 'ok' | 'warning' | 'critical' | 'unknown';
  };
}

export function Header() {
  const { theme, setTheme } = useTheme();
  const { data } = useFetch<SecurityHeaderData>('/api/security/overview', 30000);

  const statusClass = data?.overall.level === 'critical'
    ? 'border-destructive/30 text-destructive bg-destructive/10'
    : data?.overall.level === 'warning'
      ? 'border-warning/30 text-warning bg-warning/10'
      : 'border-success/30 text-success bg-success/10';

  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-border bg-surface/50 backdrop-blur-xl">
      <h2 className="text-sm font-medium text-muted-foreground">OpenClaw Dashboard</h2>
      <div className="flex items-center gap-2">
        <Badge variant="outline" className={statusClass}>
          <Shield className="h-3 w-3" />
          {data?.overall.level === 'critical'
            ? `${data.overall.critical} Critical`
            : data?.overall.level === 'warning'
              ? `${data.overall.warnings} Warnings`
              : 'All Secure'}
        </Badge>
        <button className="p-2 rounded-lg hover:bg-secondary transition-colors relative">
          <Bell className="h-4 w-4" />
        </button>
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded-lg hover:bg-secondary transition-colors"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>
    </header>
  );
}
