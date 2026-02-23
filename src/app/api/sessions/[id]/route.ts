import { NextResponse } from 'next/server';
import { getSessionDetail } from '@/lib/sessions';
import { requireDangerousOperationsEnabled } from '@/lib/guards';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = requireDangerousOperationsEnabled();
  if (guard) return guard;

  const { id } = await params;
  try {
    const detail = await getSessionDetail(id);
    if (!detail) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(detail);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
