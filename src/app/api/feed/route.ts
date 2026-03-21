import { NextResponse } from 'next/server';
import { getRecentMessages } from '@/lib/sessions';
import { requireDangerousOperationsEnabled } from '@/lib/guards';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const guard = requireDangerousOperationsEnabled();
  if (guard) return guard;

  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get('limit') || '50');
  try {
    const messages = await getRecentMessages(limit);
    return NextResponse.json({ messages });
  } catch (e) {
    console.error('feed failed:', e);
    return NextResponse.json({ error: 'Internal server error', messages: [] }, { status: 500 });
  }
}
