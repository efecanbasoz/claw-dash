'use client';

import { GlassCard } from '@/components/glass-card';
import { Badge } from '@/components/ui/badge';
import { useFetch } from '@/hooks/use-fetch';
import {
  Shield, Network, Globe, Server, KeyRound, Lock,
  Cpu, CheckCircle2, AlertTriangle, XCircle
} from 'lucide-react';

interface SecurityOverview {
  openclaw: {
    gatewayStatus: string;
    gatewayBind: string;
    tokenLength: number | 'Unknown';
    authMode: string;
    sessionCount: number | 'Unknown';
    skillsEnabled: number | 'Unknown';
    currentVersion: string;
    updates: string;
  };
  network: {
    tailscaleStatus: string;
    tailscaleIp: string;
    publicPorts: number;
    firewallStatus: string;
    activeConnections: number;
  };
  exposure: {
    exposureLevel: 'Minimal' | 'Medium' | 'High';
    publicPorts: string[];
    gatewayBinding: string;
    dashboardBinding: string;
    tailscaleActive: boolean;
  };
  system: {
    updatesAvailable: number | 'Unknown';
    uptime: string;
    loadAverage: string;
    failedLogins24h: number | 'Unknown';
    rootProcesses: number | 'Unknown';
  };
  access: {
    sshStatus: string;
    passwordAuth: string;
    fail2banStatus: string;
    bannedIps: number | 'Unknown';
    activeSessions: number;
  };
  tls: {
    webServerStatus: string;
    publicTls: string;
    tailscaleEncryption: string;
  };
  resource: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    configPermissions: string;
  };
  overall: {
    status: 'All Secure' | 'Warnings' | 'Critical';
    warnings: number;
    critical: number;
    level: 'ok' | 'warning' | 'critical' | 'unknown';
  };
}

function statusStyle(level: 'ok' | 'warning' | 'critical' | 'unknown') {
  if (level === 'critical') return 'text-destructive';
  if (level === 'warning') return 'text-warning';
  if (level === 'ok') return 'text-success';
  return 'text-muted-foreground';
}

function StatusIcon({ level }: { level: 'ok' | 'warning' | 'critical' | 'unknown' }) {
  if (level === 'critical') return <XCircle className="h-3.5 w-3.5" />;
  if (level === 'warning') return <AlertTriangle className="h-3.5 w-3.5" />;
  return <CheckCircle2 className="h-3.5 w-3.5" />;
}

function metricLevel(value: number) {
  if (value >= 80) return 'critical';
  if (value >= 60) return 'warning';
  return 'ok';
}

function Row({ label, value, level = 'ok' }: { label: string; value: string | number; level?: 'ok' | 'warning' | 'critical' | 'unknown' }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium flex items-center gap-1.5 ${statusStyle(level)}`}>
        <StatusIcon level={level} />
        {value}
      </span>
    </div>
  );
}

export default function SecurityPage() {
  const { data } = useFetch<SecurityOverview>('/api/security/overview', 30000);

  const overallClass = data?.overall.level === 'critical'
    ? 'bg-destructive/20 text-destructive border-destructive/20'
    : data?.overall.level === 'warning'
      ? 'bg-warning/20 text-warning border-warning/20'
      : 'bg-success/20 text-success border-success/20';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" /> Security Dashboard
        </h1>
        <Badge variant="outline" className={overallClass}>
          {data?.overall.status || 'Loading...'}
          {data?.overall.critical ? ` · ${data.overall.critical} critical` : ''}
          {data?.overall.warnings ? ` · ${data.overall.warnings} warning` : ''}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard><div className="flex items-center gap-2 mb-3"><Shield className="h-4 w-4 text-primary" /><h3 className="text-sm font-medium">OpenClaw Security</h3></div>
          <div className="space-y-2">
            <Row label="Gateway" value={data?.openclaw.gatewayStatus || '-'} level={data?.openclaw.gatewayStatus === 'Active' ? 'ok' : 'critical'} />
            <Row label="Gateway Bind" value={data?.openclaw.gatewayBind || '-'} level="ok" />
            <Row label="Token Length" value={data?.openclaw.tokenLength ?? '-'} level="ok" />
            <Row label="Auth Mode" value={data?.openclaw.authMode || '-'} level={data?.openclaw.authMode === 'token' ? 'ok' : 'warning'} />
            <Row label="Session Count" value={data?.openclaw.sessionCount ?? '-'} />
            <Row label="Skills Enabled" value={data?.openclaw.skillsEnabled ?? '-'} />
            <Row label="Version" value={data?.openclaw.currentVersion || '-'} />
            <Row label="Updates" value={data?.openclaw.updates || '-'} level={String(data?.openclaw.updates).includes('available') ? 'warning' : 'ok'} />
          </div>
        </GlassCard>

        <GlassCard><div className="flex items-center gap-2 mb-3"><Network className="h-4 w-4 text-primary" /><h3 className="text-sm font-medium">Network Security</h3></div>
          <div className="space-y-2">
            <Row label="Tailscale" value={data?.network.tailscaleStatus || '-'} level={data?.network.tailscaleStatus === 'Connected' ? 'ok' : 'warning'} />
            <Row label="Tailscale IP" value={data?.network.tailscaleIp || '-'} />
            <Row label="Public Ports" value={data?.network.publicPorts ?? '-'} level={(data?.network.publicPorts || 0) > 2 ? 'critical' : (data?.network.publicPorts || 0) > 0 ? 'warning' : 'ok'} />
            <Row label="Firewall" value={data?.network.firewallStatus || '-'} level={data?.network.firewallStatus === 'Active' ? 'ok' : 'warning'} />
            <Row label="Connections" value={data?.network.activeConnections ?? '-'} />
          </div>
        </GlassCard>

        <GlassCard><div className="flex items-center gap-2 mb-3"><Globe className="h-4 w-4 text-primary" /><h3 className="text-sm font-medium">Public Exposure</h3></div>
          <div className="space-y-2">
            <Row label="Exposure" value={data?.exposure.exposureLevel || '-'} level={data?.exposure.exposureLevel === 'High' ? 'critical' : data?.exposure.exposureLevel === 'Medium' ? 'warning' : 'ok'} />
            <Row label="Gateway Binding" value={data?.exposure.gatewayBinding || '-'} />
            <Row label="Dashboard Binding" value={data?.exposure.dashboardBinding || '-'} />
            <Row label="Tailscale Active" value={data?.exposure.tailscaleActive ? 'Yes' : 'No'} level={data?.exposure.tailscaleActive ? 'ok' : 'warning'} />
            <div className="pt-1 text-xs text-muted-foreground">Ports: {(data?.exposure.publicPorts || []).slice(0, 2).join(', ') || '-'}</div>
          </div>
        </GlassCard>

        <GlassCard><div className="flex items-center gap-2 mb-3"><Server className="h-4 w-4 text-primary" /><h3 className="text-sm font-medium">System Security</h3></div>
          <div className="space-y-2">
            <Row label="Updates" value={data?.system.updatesAvailable ?? '-'} level={typeof data?.system.updatesAvailable === 'number' && data.system.updatesAvailable > 25 ? 'warning' : 'ok'} />
            <Row label="Uptime" value={data?.system.uptime || '-'} />
            <Row label="Load Avg" value={data?.system.loadAverage || '-'} />
            <Row label="Failed Login 24h" value={data?.system.failedLogins24h ?? '-'} level={typeof data?.system.failedLogins24h === 'number' && data.system.failedLogins24h > 3 ? 'warning' : 'ok'} />
            <Row label="Root Proc" value={data?.system.rootProcesses ?? '-'} />
          </div>
        </GlassCard>

        <GlassCard><div className="flex items-center gap-2 mb-3"><KeyRound className="h-4 w-4 text-primary" /><h3 className="text-sm font-medium">SSH & Access</h3></div>
          <div className="space-y-2">
            <Row label="SSH" value={data?.access.sshStatus || '-'} level="ok" />
            <Row label="Password Auth" value={data?.access.passwordAuth || '-'} level={data?.access.passwordAuth === 'Enabled' ? 'critical' : 'ok'} />
            <Row label="fail2ban" value={data?.access.fail2banStatus || '-'} level={data?.access.fail2banStatus === 'Active' ? 'ok' : 'warning'} />
            <Row label="Banned IPs" value={data?.access.bannedIps ?? '-'} />
            <Row label="Sessions" value={data?.access.activeSessions ?? '-'} />
          </div>
        </GlassCard>

        <GlassCard><div className="flex items-center gap-2 mb-3"><Lock className="h-4 w-4 text-primary" /><h3 className="text-sm font-medium">Certificates & TLS</h3></div>
          <div className="space-y-2">
            <Row label="Web Server" value={data?.tls.webServerStatus || '-'} />
            <Row label="Public TLS" value={data?.tls.publicTls || '-'} level={data?.tls.publicTls === 'Enabled' ? 'ok' : data?.tls.tailscaleEncryption === 'WireGuard' ? 'ok' : 'warning'} />
            <Row label="Tailscale" value={data?.tls.tailscaleEncryption || '-'} level="ok" />
          </div>
        </GlassCard>

        <GlassCard><div className="flex items-center gap-2 mb-3"><Cpu className="h-4 w-4 text-primary" /><h3 className="text-sm font-medium">Resource Security</h3></div>
          <div className="space-y-2">
            <Row label="CPU" value={`${data?.resource.cpuUsage ?? 0}%`} level={metricLevel(data?.resource.cpuUsage ?? 0)} />
            <Row label="Memory" value={`${data?.resource.memoryUsage ?? 0}%`} level={metricLevel(data?.resource.memoryUsage ?? 0)} />
            <Row label="Disk" value={`${data?.resource.diskUsage ?? 0}%`} level={metricLevel(data?.resource.diskUsage ?? 0)} />
            <Row label="Config Perm" value={data?.resource.configPermissions || '-'} level={data?.resource.configPermissions === '600' ? 'ok' : 'warning'} />
          </div>
        </GlassCard>

        <GlassCard><div className="flex items-center gap-2 mb-3"><Shield className="h-4 w-4 text-primary" /><h3 className="text-sm font-medium">Overall Status</h3></div>
          <div className="space-y-2 text-sm">
            <Row label="Status" value={data?.overall.status || '-'} level={data?.overall.level || 'unknown'} />
            <Row label="Warnings" value={data?.overall.warnings ?? '-'} level={(data?.overall.warnings || 0) > 0 ? 'warning' : 'ok'} />
            <Row label="Critical" value={data?.overall.critical ?? '-'} level={(data?.overall.critical || 0) > 0 ? 'critical' : 'ok'} />
            <div className="text-xs text-muted-foreground pt-1">Auto refresh: 30s</div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
