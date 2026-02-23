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
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
