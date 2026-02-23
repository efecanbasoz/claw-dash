import { NextResponse } from 'next/server';
import { execFileSync } from 'child_process';
import { OPENCLAW_BIN } from '@/lib/constants';
import { requireDangerousOperationsEnabled } from '@/lib/guards';

export async function POST(req: Request) {
  const guard = requireDangerousOperationsEnabled();
  if (guard) return guard;

  try {
    const { service } = await req.json();
    if (service === 'openclaw') {
      execFileSync(OPENCLAW_BIN, ['gateway', 'restart'], { timeout: 10000, stdio: 'ignore' });
      return NextResponse.json({ ok: true, message: 'OpenClaw gateway restarted' });
    }
    return NextResponse.json({ error: 'Unknown service' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
