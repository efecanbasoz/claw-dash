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
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
