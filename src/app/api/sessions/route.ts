import { NextResponse } from 'next/server';
import { getAllSessions } from '@/lib/sessions';
import { requireDangerousOperationsEnabled } from '@/lib/guards';

export const dynamic = 'force-dynamic';

export async function GET() {
  const guard = requireDangerousOperationsEnabled();
  if (guard) return guard;

  try {
    const sessions = await getAllSessions();
    return NextResponse.json({ sessions });
  } catch (e) {
    console.error('sessions failed:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
