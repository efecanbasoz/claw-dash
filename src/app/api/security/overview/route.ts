import { NextResponse } from 'next/server';
import { getSecurityOverview } from '@/lib/security';
import { requireDangerousOperationsEnabled } from '@/lib/guards';

export const dynamic = 'force-dynamic';

export async function GET() {
  const guard = requireDangerousOperationsEnabled();
  if (guard) return guard;

  try {
    const data = await getSecurityOverview();
    return NextResponse.json(data);
  } catch (e) {
    console.error('security/overview failed:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
