import { NextResponse } from 'next/server';
import { getNetworkSecurity } from '@/lib/security';
import { requireDangerousOperationsEnabled } from '@/lib/guards';

export const dynamic = 'force-dynamic';

export async function GET() {
  const guard = requireDangerousOperationsEnabled();
  if (guard) return guard;

  try {
    return NextResponse.json(getNetworkSecurity());
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
