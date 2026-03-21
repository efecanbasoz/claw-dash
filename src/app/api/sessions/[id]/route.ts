import { NextResponse } from 'next/server';
import { getSessionDetail } from '@/lib/sessions';
import { requireDangerousOperationsEnabled } from '@/lib/guards';

export const dynamic = 'force-dynamic';

const SAFE_SESSION_ID = /^[a-zA-Z0-9_-]+$/;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = requireDangerousOperationsEnabled();
  if (guard) return guard;

  const { id } = await params;
  if (!SAFE_SESSION_ID.test(id)) {
    return NextResponse.json({ error: 'Invalid session id' }, { status: 400 });
  }
  try {
    const detail = await getSessionDetail(id);
    if (!detail) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(detail);
  } catch (e) {
    console.error('sessions/[id] failed:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
