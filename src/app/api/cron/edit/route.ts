import { NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { OPENCLAW_BIN } from '@/lib/constants';
import { requireDangerousOperationsEnabled } from '@/lib/guards';

export const dynamic = 'force-dynamic';
const OPENCLAW = OPENCLAW_BIN;

function run(args: string[]) {
  return new Promise<string>((resolve, reject) => {
    execFile(OPENCLAW, args, { timeout: 15000 }, (err, stdout, stderr) => {
      if (err) reject(new Error(stderr || err.message));
      else resolve(stdout || 'ok');
    });
  });
}

export async function POST(req: Request) {
  const guard = requireDangerousOperationsEnabled();
  if (guard) return guard;

  try {
    const body = await req.json();
    const id = String(body?.id || '');
    const name = String(body?.name || '');
    const cron = String(body?.schedule || '');
    const message = String(body?.message || '');
    const timeout = body?.timeout != null ? String(body.timeout) : '';
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const args = ['cron', 'edit', id];
    if (name) args.push('--name', name);
    if (cron) args.push('--cron', cron);
    if (message) args.push('--message', message);
    if (timeout) args.push('--timeout', timeout);

    const out = await run(args);
    return NextResponse.json({ ok: true, output: out });
  } catch (e) {
    console.error('cron/edit failed:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
