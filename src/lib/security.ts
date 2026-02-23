import { execSync } from 'child_process';
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

function run(command: string): string {
  try {
    return execSync(command, {
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
    const healthRaw = run(`${OPENCLAW_BIN} gateway call health`);
    try {
      JSON.parse(healthRaw);
    } catch {
      // Ignore parse failures from health output.
    }

    const statusRaw = run(`${OPENCLAW_BIN} gateway status`);
    const version = run(`${OPENCLAW_BIN} --version`) || 'Unknown';

    const gatewayStatus = /active|running/i.test(statusRaw) ? 'Active' : 'Inactive';
    // Parse from 'gateway status' CLI output
    const bindMatch = statusRaw.match(/bind=(\w+)/);
    const gatewayBind = bindMatch?.[1] || 'Unknown';
    // Token and auth from openclaw.json directly
    const configRaw = run(`cat "${OPENCLAW_CONFIG_FILE}" 2>/dev/null`);
    let config: OpenClawConfig | null = null;
    try {
      config = JSON.parse(configRaw) as OpenClawConfig;
    } catch {
      config = null;
    }
    const tokenVal = config?.auth?.profiles?.['anthropic:default']?.mode || 'Unknown';
    const authMode = tokenVal === 'token' ? 'token' : tokenVal;
    const tokenLenRaw = run('printenv OPENCLAW_GATEWAY_TOKEN 2>/dev/null | tr -d "\\n" | wc -c');
    const tokenLength = toInt(tokenLenRaw, 0) > 0 ? toInt(tokenLenRaw, 0) : 'Unknown';
    // Session count from gateway sessions.list
    const sessionsRaw = run(`${OPENCLAW_BIN} gateway call sessions.list 2>/dev/null`);
    let sessionCount: number | 'Unknown' = 'Unknown';
    try {
      const sessMatch = sessionsRaw.match(/\{[\s\S]*\}/);
      if (sessMatch) {
        const sessData = JSON.parse(sessMatch[0]);
        sessionCount = sessData.count ?? sessData.sessions?.length ?? 'Unknown';
      }
    } catch {}
    // Skills
    const skillsRaw = run(`ls "${WORKSPACE_DIR}/skills/" 2>/dev/null | wc -l`);
    const builtinSkills = OPENCLAW_BUILTIN_SKILLS_DIR
      ? run(`ls "${OPENCLAW_BUILTIN_SKILLS_DIR}" 2>/dev/null | wc -l`)
      : '0';
    const skillsEnabled = (parseInt(skillsRaw) || 0) + (parseInt(builtinSkills) || 0);
    // Check npm registry for latest version vs current
    const latestRaw = run('npm view openclaw version 2>/dev/null');
    const latestVer = latestRaw?.trim() || '';
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
    const tailscale = run('tailscale status --json');
    let tailscaleStatus = 'Disconnected';
    let tailscaleIp = 'Unknown';
    try {
      const t = JSON.parse(tailscale);
      tailscaleStatus = t?.BackendState === 'Running' ? 'Connected' : 'Disconnected';
      tailscaleIp = t?.Self?.TailscaleIPs?.[0] || 'Unknown';
    } catch {
      const ip = run("tailscale ip -4 2>/dev/null | head -1");
      tailscaleStatus = ip ? 'Connected' : 'Disconnected';
      tailscaleIp = ip || 'Unknown';
    }

    const publicPortsRaw = run("ss -tlnH | awk '$4 ~ /0.0.0.0:|\[::\]:/ {print $4}'");
    const publicPorts = publicPortsRaw ? publicPortsRaw.split('\n').filter(Boolean).length : 0;

    const firewallState = run('systemctl is-active nftables');
    const firewallStatus = firewallState === 'active' ? 'Active' : 'Inactive';

    const activeConnections = Math.max(0, toInt(run('ss -tnH | wc -l')));

    return { tailscaleStatus, tailscaleIp, publicPorts, firewallStatus, activeConnections };
  });
}

export function getExposureSecurity(): SecurityExposure {
  return cached('exposure', () => {
    // Truly public = listening on 0.0.0.0 or *: (any interface)
    // Exclude: 127.x (loopback), 100.x (Tailscale), [::1] (IPv6 loopback), fd7a: (Tailscale IPv6)
    const allPortsRaw = run("ss -tlnH | awk '{print $4}'");
    const allPorts = allPortsRaw ? allPortsRaw.split('\n').filter(Boolean) : [];
    const ports = allPorts.filter(p => {
      if (p.startsWith('127.') || p.startsWith('100.') || p.startsWith('[::1]') || p.startsWith('[fd7a:')) return false;
      return p.includes('0.0.0.0:') || p.startsWith('*:');
    });

    const tailscaleActive = !!run('tailscale ip -4 2>/dev/null | head -1');
    const gatewayBinding = run("ss -tlnH | awk '/:18789/ {print $4}' | head -1") || 'Unknown';
    const dashboardBinding = run("ss -tlnH | awk '/:3100/ {print $4}' | head -1") || 'Unknown';

    // Check if firewall is protecting public ports
    const firewallActive = run('systemctl is-active nftables') === 'active';
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
    const updatesRaw = run('apt list --upgradable 2>/dev/null | tail -n +2 | wc -l');
    const uptime = run('uptime -p') || 'Unknown';
    const loadAverage = run("cat /proc/loadavg | awk '{print $1, $2, $3}'") || 'Unknown';
    const failedLogins = run('journalctl --since "24 hours ago" -q 2>/dev/null | grep -ci "authentication failure\\|Failed password" || echo 0');
    const rootProcesses = run('ps -U root --no-headers 2>/dev/null | wc -l');

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
    const sshActive = run('systemctl is-active ssh') === 'active';
    const sshStatus = sshActive ? 'Active' : 'Inactive';

    // If SSH is inactive, these are N/A
    const passwordAuth = sshActive
      ? (/yes$/i.test(run("grep -Ei '^\\s*PasswordAuthentication\\s+' /etc/ssh/sshd_config /etc/ssh/sshd_config.d/*.conf 2>/dev/null | tail -1")) ? 'Enabled' : 'Disabled')
      : 'N/A (SSH off)';

    const fail2banStatus = run('systemctl is-active fail2ban') === 'active' ? 'Active' : 'Inactive';

    const bannedRaw = run("sudo fail2ban-client status 2>/dev/null | grep -Eo 'Total jails:\\s*[0-9]+' | grep -Eo '[0-9]+'");
    const bannedIps = bannedRaw ? toInt(bannedRaw, 0) : 0;

    const activeSessions = toInt(run('who | wc -l'));

    return { sshStatus, passwordAuth, fail2banStatus, bannedIps, activeSessions };
  });
}

export function getTLSSecurity(): SecurityTLS {
  return cached('tls', () => {
    const caddy = run('systemctl is-active caddy');
    const nginx = run('systemctl is-active nginx');

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
  const permissions = run(`stat -c %a "${OPENCLAW_CONFIG_FILE}" 2>/dev/null`) || 'Unknown';
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
