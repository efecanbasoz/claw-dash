import { NextResponse } from 'next/server';
import { readFile, readdir } from 'fs/promises';
import { CRON_FILE, CRON_RUNS_DIR } from '@/lib/constants';
import { requireDangerousOperationsEnabled } from '@/lib/guards';

export const dynamic = 'force-dynamic';

export async function GET() {
  const guard = requireDangerousOperationsEnabled();
  if (guard) return guard;

  try {
    const data = JSON.parse(await readFile(CRON_FILE, 'utf-8'));
    // Get recent runs
    const runs: Array<{ id: string; jobId: string; status: string; timestamp: string }> = [];
    try {
      const runFiles = await readdir(CRON_RUNS_DIR);
      for (const f of runFiles.slice(-20)) {
        try {
          const run = JSON.parse(await readFile(`${CRON_RUNS_DIR}/${f}`, 'utf-8'));
          runs.push({ id: f, jobId: run.jobId, status: run.status, timestamp: run.startedAt || run.timestamp || '' });
        } catch { /* */ }
      }
    } catch { /* */ }
    return NextResponse.json({ ...data, runs });
  } catch (e) {
    return NextResponse.json({ jobs: [], runs: [], error: String(e) });
  }
}
