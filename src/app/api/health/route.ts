import { NextResponse } from 'next/server';
import { getSystemHealth } from '@/lib/system';
import { requireDangerousOperationsEnabled } from '@/lib/guards';

export const dynamic = 'force-dynamic';

export async function GET() {
  const guard = requireDangerousOperationsEnabled();
  if (guard) return guard;

  try {
    const health = await getSystemHealth();
    return NextResponse.json(health);
  } catch (e) {
    console.error('health failed:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
