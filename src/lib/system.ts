import os from 'os';
import { exec } from 'child_process';
import { readFile } from 'fs/promises';
import { promisify } from 'util';

// QA-001: Fully async system health — no execSync, no event loop blocking.
// Independent commands run in parallel via Promise.allSettled.
// Results cached for 5 seconds to avoid redundant system calls.

const execAsync = promisify(exec);
const EXEC_TIMEOUT = 5000;

async function run(command: string): Promise<string> {
  try {
    const { stdout } = await execAsync(command, { encoding: 'utf-8', timeout: EXEC_TIMEOUT });
    return stdout.trim();
  } catch {
    return '';
  }
}

// Cache to avoid re-running expensive system commands on every poll
let healthCache: { ts: number; data: Awaited<ReturnType<typeof getSystemHealthUncached>> } | null = null;
const CACHE_TTL_MS = 5_000;

export async function getSystemHealth() {
  const now = Date.now();
  if (healthCache && now - healthCache.ts < CACHE_TTL_MS) return healthCache.data;
  const data = await getSystemHealthUncached();
  healthCache = { ts: now, data };
  return data;
}

async function getSystemHealthUncached() {
  const cpus = os.cpus();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const uptime = os.uptime();

  // CPU usage — delta between two /proc/stat reads (250ms apart)
  let cpuPercent = 0;
  let coreUsage: number[] = [];
  try {
    const readCpuStats = async () => {
      const procStat = await readFile('/proc/stat', 'utf-8');
      const lines = procStat.split('\n');
      const parseLine = (line: string) => {
        const parts = line.split(/\s+/).slice(1).map(Number);
        const idle = parts[3] + (parts[4] || 0);
        const total = parts.reduce((a, b) => a + b, 0);
        return { idle, total };
      };
      const overall = parseLine(lines[0]);
      const cores = lines.slice(1).filter(l => l.startsWith('cpu')).map(parseLine);
      return { overall, cores };
    };

    const t1 = await readCpuStats();
    await new Promise(resolve => setTimeout(resolve, 250));
    const t2 = await readCpuStats();

    const dTotal = t2.overall.total - t1.overall.total;
    const dIdle = t2.overall.idle - t1.overall.idle;
    if (dTotal > 0) {
      const raw = ((dTotal - dIdle) / dTotal) * 100;
      cpuPercent = raw > 0 && raw < 1 ? 1 : Math.round(raw);
    }

    coreUsage = t2.cores.map((c2, i) => {
      const c1 = t1.cores[i];
      if (!c1) return 0;
      const dt = c2.total - c1.total;
      const di = c2.idle - c1.idle;
      return dt > 0 ? Math.round(((dt - di) / dt) * 100) : 0;
    });
  } catch {
    const loadAvg = os.loadavg()[0];
    cpuPercent = Math.min(100, Math.round((loadAvg / cpus.length) * 100));
    coreUsage = cpus.map(() => cpuPercent);
  }

  // Run all independent system queries in parallel
  const [diskResult, diskAllResult, iostatResult, sensorsResult, thermalResult, hwmonResult, psResult] = await Promise.allSettled([
    run('df -h / --output=size,used,avail,pcent | tail -1'),
    run('df -h --output=source,fstype,size,used,avail,pcent,target -x tmpfs -x devtmpfs -x squashfs -x overlay -x efivarfs 2>/dev/null | tail -n +2'),
    run('iostat -d -k 1 2 2>/dev/null | tail -n +7 | head -5'),
    run('sensors 2>/dev/null | grep -i "Package\\|Tctl\\|temp1" | head -1'),
    readFile('/sys/class/thermal/thermal_zone0/temp', 'utf-8').catch(() => ''),
    run('cat /sys/class/hwmon/hwmon*/temp*_input 2>/dev/null | head -5'),
    run('ps aux --sort=-%cpu | head -11 | tail -10'),
  ]);

  // Parse disk
  let disk = { total: '0', used: '0', available: '0', percent: 0 };
  const diskMounts: Array<{ mount: string; total: string; used: string; available: string; percent: number; filesystem: string }> = [];
  if (diskResult.status === 'fulfilled' && diskResult.value) {
    const parts = diskResult.value.split(/\s+/);
    disk = { total: parts[0], used: parts[1], available: parts[2], percent: parseInt(parts[3]) || 0 };
  }
  if (diskAllResult.status === 'fulfilled' && diskAllResult.value) {
    for (const line of diskAllResult.value.split('\n')) {
      if (!line.trim()) continue;
      const p = line.split(/\s+/);
      if (p.length >= 7 && p[0].startsWith('/dev/')) {
        diskMounts.push({ filesystem: p[0], mount: p.slice(6).join(' '), total: p[2], used: p[3], available: p[4], percent: parseInt(p[5]) || 0 });
      }
    }
  }

  // Parse disk I/O
  const diskIO = { readKBs: 0, writeKBs: 0 };
  if (iostatResult.status === 'fulfilled' && iostatResult.value) {
    for (const line of iostatResult.value.split('\n')) {
      const p = line.split(/\s+/).filter(Boolean);
      if (p.length >= 4 && (p[0].startsWith('nvme') || p[0].startsWith('sd'))) {
        diskIO.readKBs += parseFloat(p[2]) || 0;
        diskIO.writeKBs += parseFloat(p[3]) || 0;
      }
    }
  }

  // Parse temperature (try sensors → thermal zones → hwmon)
  let temperature: number | null = null;
  if (sensorsResult.status === 'fulfilled' && sensorsResult.value) {
    const match = sensorsResult.value.match(/\+(\d+\.?\d*)/);
    if (match) temperature = parseFloat(match[1]);
  }
  if (temperature === null && thermalResult.status === 'fulfilled' && thermalResult.value) {
    const t = parseInt(thermalResult.value.trim());
    if (t > 1000) temperature = Math.round((t / 1000) * 10) / 10;
  }
  if (temperature === null && hwmonResult.status === 'fulfilled' && hwmonResult.value) {
    const temps = hwmonResult.value.split('\n').map(t => parseInt(t)).filter(t => t > 1000).map(t => t / 1000);
    if (temps.length > 0) temperature = Math.round(Math.max(...temps) * 10) / 10;
  }

  // Parse top processes
  let topProcesses: Array<{ pid: string; cpu: string; mem: string; command: string }> = [];
  if (psResult.status === 'fulfilled' && psResult.value) {
    topProcesses = psResult.value.split('\n').filter(Boolean).map(line => {
      const parts = line.split(/\s+/);
      return { pid: parts[1], cpu: parts[2], mem: parts[3], command: parts.slice(10).join(' ').slice(0, 60) };
    });
  }

  return {
    cpu: { percent: cpuPercent, cores: cpus.length, coreUsage, model: cpus[0]?.model || 'Unknown' },
    memory: { total: totalMem, used: usedMem, free: freeMem, percent: Math.round((usedMem / totalMem) * 100) },
    disk,
    diskMounts,
    diskIO,
    temperature,
    uptime,
    loadAvg: os.loadavg(),
    topProcesses,
  };
}
