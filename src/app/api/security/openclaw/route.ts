import { NextResponse } from 'next/server';
import { getOpenClawSecurity } from '@/lib/security';
import { requireDangerousOperationsEnabled } from '@/lib/guards';

export const dynamic = 'force-dynamic';

export async function GET() {
  const guard = requireDangerousOperationsEnabled();
  if (guard) return guard;

  try {
    return NextResponse.json(getOpenClawSecurity());
  } catch (e) {
    console.error('security/openclaw failed:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
