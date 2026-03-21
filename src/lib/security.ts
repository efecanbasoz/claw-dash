import { execFileSync } from 'child_process';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { getSystemHealth } from '@/lib/system';
import { OPENCLAW_BIN, OPENCLAW_BUILTIN_SKILLS_DIR, OPENCLAW_CONFIG_FILE, WORKSPACE_DIR } from '@/lib/constants';

type Level = 'ok' | 'warning' | 'critical' | 'unknown';

interface OpenClawConfig {
  auth?: {
    profiles?: Record<string, { mode?: string }>;
  };
}

export interface SecurityOpenClaw {
  gatewayStatus: string;
  gatewayBind: string;
  tokenLength: number | 'Unknown';
  authMode: string;
  sessionCount: number | 'Unknown';
  skillsEnabled: number | 'Unknown';
  currentVersion: string;
  updates: string;
}

export interface SecurityNetwork {
  tailscaleStatus: string;
  tailscaleIp: string;
  publicPorts: number;
  firewallStatus: string;
  activeConnections: number;
}

export interface SecurityExposure {
  exposureLevel: 'Minimal' | 'Medium' | 'High';
  publicPorts: string[];
  gatewayBinding: string;
  dashboardBinding: string;
  tailscaleActive: boolean;
}

export interface SecuritySystem {
  updatesAvailable: number | 'Unknown';
  uptime: string;
  loadAverage: string;
  failedLogins24h: number | 'Unknown';
  rootProcesses: number | 'Unknown';
}

export interface SecurityAccess {
  sshStatus: string;
  passwordAuth: string;
  fail2banStatus: string;
  bannedIps: number | 'Unknown';
  activeSessions: number;
}

export interface SecurityTLS {
  webServerStatus: string;
  publicTls: string;
  tailscaleEncryption: string;
}

export interface SecurityResource {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  configPermissions: string;
}

export interface SecurityOverview {
  openclaw: SecurityOpenClaw;
  network: SecurityNetwork;
  exposure: SecurityExposure;
  system: SecuritySystem;
  access: SecurityAccess;
  tls: SecurityTLS;
  resource: SecurityResource;
  overall: {
    status: 'All Secure' | 'Warnings' | 'Critical';
    warnings: number;
    critical: number;
    level: Level;
  };
}

const cache = new Map<string, { ts: number; data: unknown }>();
const CACHE_MS = 10_000;

function cached<T>(key: string, getter: () => T): T {
  const now = Date.now();
  const found = cache.get(key);
  if (found && now - found.ts < CACHE_MS) return found.data as T;
  const data = getter();
  cache.set(key, { ts: now, data });
  return data;
}

// SEC-001: Use execFileSync (no shell) to prevent command injection via env vars.
// QA-002: Return structured result to distinguish failure from empty output.
interface CmdResult { ok: boolean; stdout: string }

function runFile(command: string, args: string[]): CmdResult {
  try {
    const stdout = execFileSync(command, args, {
      encoding: 'utf-8',
      timeout: 5000,
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return { ok: true, stdout };
  } catch {
    return { ok: false, stdout: '' };
  }
}

function readJsonFile(path: string): unknown | null {
  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch {
    return null;
  }
}

function countDirEntries(dirPath: string): number {
  try {
    return existsSync(dirPath) ? readdirSync(dirPath).length : 0;
  } catch {
    return 0;
  }
}

// For system commands with pipes — only accepts hardcoded strings, never env vars.
function runShell(command: string): string {
  try {
    return execFileSync('sh', ['-c', command], {
      encoding: 'utf-8',
      timeout: 5000,
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

function toInt(value: string, fallback = 0): number {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

function levelFromValue(value: number): Level {
  if (value >= 80) return 'critical';
  if (value >= 60) return 'warning';
  return 'ok';
}

export function getOpenClawSecurity(): SecurityOpenClaw {
  return cached('openclaw', () => {
    // SEC-001: All CLI calls use execFileSync (no shell interpolation)
    runFile(OPENCLAW_BIN, ['gateway', 'call', 'health']);

    const statusResult = runFile(OPENCLAW_BIN, ['gateway', 'status']);
    const versionResult = runFile(OPENCLAW_BIN, ['--version']);
    const version = versionResult.ok ? versionResult.stdout : 'Unknown';

    const gatewayStatus = /active|running/i.test(statusResult.stdout) ? 'Active' : 'Inactive';
    const bindMatch = statusResult.stdout.match(/bind=(\w+)/);
    const gatewayBind = bindMatch?.[1] || 'Unknown';

    // Read config directly via fs instead of cat shell command
    const config = readJsonFile(OPENCLAW_CONFIG_FILE) as OpenClawConfig | null;
    const tokenVal = config?.auth?.profiles?.['anthropic:default']?.mode || 'Unknown';
    const authMode = tokenVal === 'token' ? 'token' : tokenVal;

    // Read token length from env directly instead of printenv pipe
    const envToken = process.env.OPENCLAW_GATEWAY_TOKEN || '';
    const tokenLength = envToken.length > 0 ? envToken.length : 'Unknown';

    // Session count from gateway
    const sessionsResult = runFile(OPENCLAW_BIN, ['gateway', 'call', 'sessions.list']);
    let sessionCount: number | 'Unknown' = 'Unknown';
    if (sessionsResult.ok) {
      try {
        const sessMatch = sessionsResult.stdout.match(/\{[\s\S]*\}/);
        if (sessMatch) {
          const sessData = JSON.parse(sessMatch[0]);
          sessionCount = sessData.count ?? sessData.sessions?.length ?? 'Unknown';
        }
      } catch { /* parse failure */ }
    }

    // Count skills via fs instead of ls pipe
    const skillsCount = countDirEntries(join(WORKSPACE_DIR, 'skills'));
    const builtinCount = OPENCLAW_BUILTIN_SKILLS_DIR ? countDirEntries(OPENCLAW_BUILTIN_SKILLS_DIR) : 0;
    const skillsEnabled = skillsCount + builtinCount;

    // Check npm registry for latest version
    const latestResult = runFile('npm', ['view', 'openclaw', 'version']);
    const latestVer = latestResult.ok ? latestResult.stdout : '';
    const currentVer = version.trim();
    let updatesStr = 'Up to date';
    if (latestVer && latestVer !== currentVer && !currentVer.includes(latestVer)) {
      updatesStr = `${latestVer} available`;
    }

    return {
      gatewayStatus,
      gatewayBind: String(gatewayBind),
      tokenLength: typeof tokenLength === 'number' ? tokenLength : 'Unknown',
      authMode: String(authMode),
      sessionCount: typeof sessionCount === 'number' ? sessionCount : 'Unknown',
      skillsEnabled: typeof skillsEnabled === 'number' ? skillsEnabled : 'Unknown',
      currentVersion: version,
      updates: updatesStr,
    };
  });
}

export function getNetworkSecurity(): SecurityNetwork {
  return cached('network', () => {
    const tailscale = runShell('tailscale status --json');
    let tailscaleStatus = 'Disconnected';
    let tailscaleIp = 'Unknown';
    try {
      const t = JSON.parse(tailscale);
      tailscaleStatus = t?.BackendState === 'Running' ? 'Connected' : 'Disconnected';
      tailscaleIp = t?.Self?.TailscaleIPs?.[0] || 'Unknown';
    } catch {
      const ip = runShell("tailscale ip -4 2>/dev/null | head -1");
      tailscaleStatus = ip ? 'Connected' : 'Disconnected';
      tailscaleIp = ip || 'Unknown';
    }

    const publicPortsRaw = runShell("ss -tlnH | awk '$4 ~ /0.0.0.0:|\[::\]:/ {print $4}'");
    const publicPorts = publicPortsRaw ? publicPortsRaw.split('\n').filter(Boolean).length : 0;

    const firewallState = runShell('systemctl is-active nftables');
    const firewallStatus = firewallState === 'active' ? 'Active' : 'Inactive';

    const activeConnections = Math.max(0, toInt(runShell('ss -tnH | wc -l')));

    return { tailscaleStatus, tailscaleIp, publicPorts, firewallStatus, activeConnections };
  });
}

export function getExposureSecurity(): SecurityExposure {
  return cached('exposure', () => {
    // Truly public = listening on 0.0.0.0 or *: (any interface)
    // Exclude: 127.x (loopback), 100.x (Tailscale), [::1] (IPv6 loopback), fd7a: (Tailscale IPv6)
    const allPortsRaw = runShell("ss -tlnH | awk '{print $4}'");
    const allPorts = allPortsRaw ? allPortsRaw.split('\n').filter(Boolean) : [];
    const ports = allPorts.filter(p => {
      if (p.startsWith('127.') || p.startsWith('100.') || p.startsWith('[::1]') || p.startsWith('[fd7a:')) return false;
      return p.includes('0.0.0.0:') || p.startsWith('*:');
    });

    const tailscaleActive = !!runShell('tailscale ip -4 2>/dev/null | head -1');
    const gatewayBinding = runShell("ss -tlnH | awk '/:18789/ {print $4}' | head -1") || 'Unknown';
    const dashboardBinding = runShell("ss -tlnH | awk '/:3100/ {print $4}' | head -1") || 'Unknown';

    // Check if firewall is protecting public ports
    const firewallActive = runShell('systemctl is-active nftables') === 'active';
    let exposureLevel: 'Minimal' | 'Medium' | 'High' = 'Minimal';
    if (ports.length >= 3 && !firewallActive) exposureLevel = 'High';
    else if (ports.length >= 1 && !firewallActive) exposureLevel = 'Medium';
    else if (ports.length >= 1 && firewallActive) exposureLevel = 'Minimal'; // Firewalled

    return {
      exposureLevel,
      publicPorts: ports,
      gatewayBinding,
      dashboardBinding,
      tailscaleActive,
    };
  });
}

export function getSystemSecurity(): SecuritySystem {
  return cached('system', () => {
    const updatesRaw = runShell('apt list --upgradable 2>/dev/null | tail -n +2 | wc -l');
    const uptime = runShell('uptime -p') || 'Unknown';
    const loadAverage = runShell("cat /proc/loadavg | awk '{print $1, $2, $3}'") || 'Unknown';
    const failedLogins = runShell('journalctl --since "24 hours ago" -q 2>/dev/null | grep -ci "authentication failure\\|Failed password" || echo 0');
    const rootProcesses = runShell('ps -U root --no-headers 2>/dev/null | wc -l');

    return {
      updatesAvailable: updatesRaw ? toInt(updatesRaw, 0) : 'Unknown',
      uptime,
      loadAverage,
      failedLogins24h: toInt(failedLogins, 0),
      rootProcesses: rootProcesses ? toInt(rootProcesses, 0) : 'Unknown',
    };
  });
}

export function getAccessSecurity(): SecurityAccess {
  return cached('access', () => {
    const sshActive = runShell('systemctl is-active ssh') === 'active';
    const sshStatus = sshActive ? 'Active' : 'Inactive';

    // If SSH is inactive, these are N/A
    const passwordAuth = sshActive
      ? (/yes$/i.test(runShell("grep -Ei '^\\s*PasswordAuthentication\\s+' /etc/ssh/sshd_config /etc/ssh/sshd_config.d/*.conf 2>/dev/null | tail -1")) ? 'Enabled' : 'Disabled')
      : 'N/A (SSH off)';

    const fail2banStatus = runShell('systemctl is-active fail2ban') === 'active' ? 'Active' : 'Inactive';

    const bannedRaw = runShell("sudo fail2ban-client status 2>/dev/null | grep -Eo 'Total jails:\\s*[0-9]+' | grep -Eo '[0-9]+'");
    const bannedIps = bannedRaw ? toInt(bannedRaw, 0) : 0;

    const activeSessions = toInt(runShell('who | wc -l'));

    return { sshStatus, passwordAuth, fail2banStatus, bannedIps, activeSessions };
  });
}

export function getTLSSecurity(): SecurityTLS {
  return cached('tls', () => {
    const caddy = runShell('systemctl is-active caddy');
    const nginx = runShell('systemctl is-active nginx');

    let webServerStatus = 'Not installed';
    if (caddy === 'active') webServerStatus = 'Caddy Active';
    else if (nginx === 'active') webServerStatus = 'Nginx Active';
    else if (caddy || nginx) webServerStatus = 'Stopped';

    const publicTls = webServerStatus.includes('Active') ? 'Enabled' : 'Disabled';

    return {
      webServerStatus,
      publicTls,
      tailscaleEncryption: 'WireGuard',
    };
  });
}

export async function getResourceSecurity(): Promise<SecurityResource> {
  const health = await getSystemHealth();
  // SEC-001: Use runFile instead of shell interpolation for config path
  const permResult = runFile('stat', ['-c', '%a', OPENCLAW_CONFIG_FILE]);
  const permissions = permResult.ok ? permResult.stdout : 'Unknown';
  return {
    cpuUsage: health.cpu.percent,
    memoryUsage: health.memory.percent,
    diskUsage: health.disk.percent,
    configPermissions: permissions,
  };
}

export async function getSecurityOverview(): Promise<SecurityOverview> {
  const [resource] = await Promise.all([getResourceSecurity()]);
  const openclaw = getOpenClawSecurity();
  const network = getNetworkSecurity();
  const exposure = getExposureSecurity();
  const system = getSystemSecurity();
  const access = getAccessSecurity();
  const tls = getTLSSecurity();

  let warnings = 0;
  let critical = 0;

  const mark = (level: Level) => {
    if (level === 'critical') critical += 1;
    else if (level === 'warning') warnings += 1;
  };

  mark(openclaw.gatewayStatus === 'Inactive' ? 'critical' : 'ok');
  mark(access.passwordAuth === 'Enabled' ? 'critical' : 'ok');
  mark(exposure.exposureLevel === 'High' ? 'critical' : exposure.exposureLevel === 'Medium' ? 'warning' : 'ok');
  mark(system.updatesAvailable !== 'Unknown' && system.updatesAvailable > 25 ? 'warning' : 'ok');
  mark(network.firewallStatus === 'Inactive' ? 'warning' : 'ok');
  mark(levelFromValue(resource.cpuUsage));
  mark(levelFromValue(resource.memoryUsage));
  mark(levelFromValue(resource.diskUsage));

  const overallLevel: Level = critical > 0 ? 'critical' : warnings > 0 ? 'warning' : 'ok';
  const status = critical > 0 ? 'Critical' : warnings > 0 ? 'Warnings' : 'All Secure';

  return {
    openclaw,
    network,
    exposure,
    system,
    access,
    tls,
    resource,
    overall: {
      status,
      warnings,
      critical,
      level: overallLevel,
    },
  };
}
