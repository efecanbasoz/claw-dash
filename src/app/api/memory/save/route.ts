import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { MEMORY_DIR } from '@/lib/constants';
import { requireDangerousOperationsEnabled } from '@/lib/guards';
import { resolvePathWithinRoot } from '@/lib/paths';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const guard = requireDangerousOperationsEnabled();
  if (guard) return guard;

  try {
    const body = await req.json();
    const relPath = String(body?.path || '');
    const content = String(body?.content || '');
    const resolved = resolvePathWithinRoot(MEMORY_DIR, relPath, {
      allowedExtensions: ['.md'],
    });
    if (!resolved) return NextResponse.json({ error: 'Invalid path' }, { status: 400 });

    await writeFile(resolved.fullPath, content, 'utf-8');
    return NextResponse.json({ ok: true });
  } catch (e) {
    // SEC-006: Generic error to avoid leaking internal paths
    console.error('memory save failed:', e);
    return NextResponse.json({ error: 'Failed to save file' }, { status: 500 });
  }
}
