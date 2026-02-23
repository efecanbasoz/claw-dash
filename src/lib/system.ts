import os from 'os';
import { execSync } from 'child_process';
import { readFile } from 'fs/promises';

export async function getSystemHealth() {
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
        const idle = parts[3] + (parts[4] || 0); // idle + iowait
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

    // Overall CPU
    const dTotal = t2.overall.total - t1.overall.total;
    const dIdle = t2.overall.idle - t1.overall.idle;
    if (dTotal > 0) {
      const raw = ((dTotal - dIdle) / dTotal) * 100;
      cpuPercent = raw > 0 && raw < 1 ? 1 : Math.round(raw);
    } else {
      cpuPercent = 0;
    }

    // Per-core
    coreUsage = t2.cores.map((c2, i) => {
      const c1 = t1.cores[i];
      if (!c1) return 0;
      const dt = c2.total - c1.total;
      const di = c2.idle - c1.idle;
      return dt > 0 ? Math.round(((dt - di) / dt) * 100) : 0;
    });
  } catch {
    // Fallback to load average
    const loadAvg = os.loadavg()[0];
    cpuPercent = Math.min(100, Math.round((loadAvg / cpus.length) * 100));
    coreUsage = cpus.map(() => cpuPercent);
  }

  // Disk usage — primary mount + all physical filesystems
  let disk = { total: '0', used: '0', available: '0', percent: 0 };
  const diskMounts: Array<{ mount: string; total: string; used: string; available: string; percent: number; filesystem: string }> = [];
  try {
    // Primary root partition
    const df = execSync('df -h / --output=size,used,avail,pcent | tail -1', { encoding: 'utf-8' }).trim();
    const parts = df.split(/\s+/);
    disk = { total: parts[0], used: parts[1], available: parts[2], percent: parseInt(parts[3]) || 0 };

    // All real filesystems (ext4, btrfs, xfs, zfs, ntfs)
    const dfAll = execSync('df -h --output=source,fstype,size,used,avail,pcent,target -x tmpfs -x devtmpfs -x squashfs -x overlay -x efivarfs 2>/dev/null | tail -n +2', { encoding: 'utf-8' });
    for (const line of dfAll.trim().split('\n')) {
      if (!line.trim()) continue;
      const p = line.split(/\s+/);
      if (p.length >= 7 && p[0].startsWith('/dev/')) {
        diskMounts.push({
          filesystem: p[0],
          mount: p.slice(6).join(' '),
          total: p[2],
          used: p[3],
          available: p[4],
          percent: parseInt(p[5]) || 0,
        });
      }
    }
  } catch { /* */ }

  // Disk I/O (read/write rates)
  const diskIO = { readKBs: 0, writeKBs: 0 };
  try {
    const iostat = execSync('iostat -d -k 1 2 2>/dev/null | tail -n +7 | head -5', { encoding: 'utf-8' });
    // iostat second sample (actual rate)
    for (const line of iostat.trim().split('\n')) {
      const p = line.split(/\s+/).filter(Boolean);
      if (p.length >= 4 && (p[0].startsWith('nvme') || p[0].startsWith('sd'))) {
        diskIO.readKBs += parseFloat(p[2]) || 0;
        diskIO.writeKBs += parseFloat(p[3]) || 0;
      }
    }
  } catch { /* iostat not available */ }

  // Temperature — try multiple sources
  let temperature: number | null = null;
  try {
    // 1. Try lm-sensors (sensors command)
    const sensors = execSync('sensors 2>/dev/null | grep -i "Package\\|Tctl\\|temp1" | head -1', { encoding: 'utf-8' });
    const match = sensors.match(/\+(\d+\.?\d*)/);
    if (match) temperature = parseFloat(match[1]);
  } catch { /* sensors not installed */ }
  if (temperature === null) {
    try {
      // 2. Try /sys/class/thermal (Linux thermal zones)
      const zones = execSync('cat /sys/class/thermal/thermal_zone*/temp 2>/dev/null', { encoding: 'utf-8' });
      const temps = zones.trim().split('\n')
        .map(t => parseInt(t))
        .filter(t => t > 1000) // filter out bogus readings (like 50 = 0.05°C)
        .map(t => t / 1000);   // millidegrees → degrees
      if (temps.length > 0) {
        temperature = Math.round(Math.max(...temps) * 10) / 10; // highest temp (usually CPU package)
      }
    } catch { /* */ }
  }
  if (temperature === null) {
    try {
      // 3. Try /sys/class/hwmon
      const hwmon = execSync('cat /sys/class/hwmon/hwmon*/temp*_input 2>/dev/null | head -5', { encoding: 'utf-8' });
      const temps = hwmon.trim().split('\n')
        .map(t => parseInt(t))
        .filter(t => t > 1000)
        .map(t => t / 1000);
      if (temps.length > 0) {
        temperature = Math.round(Math.max(...temps) * 10) / 10;
      }
    } catch { /* */ }
  }

  // Top processes
  let topProcesses: Array<{ pid: string; cpu: string; mem: string; command: string }> = [];
  try {
    const ps = execSync('ps aux --sort=-%cpu | head -11 | tail -10', { encoding: 'utf-8' });
    topProcesses = ps.split('\n').filter(Boolean).map(line => {
      const parts = line.split(/\s+/);
      return { pid: parts[1], cpu: parts[2], mem: parts[3], command: parts.slice(10).join(' ').slice(0, 60) };
    });
  } catch { /* */ }

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
