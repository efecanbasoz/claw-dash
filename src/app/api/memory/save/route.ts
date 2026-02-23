import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';
import { WORKSPACE_DIR } from '@/lib/constants';
import { requireDangerousOperationsEnabled } from '@/lib/guards';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const guard = requireDangerousOperationsEnabled();
  if (guard) return guard;

  try {
    const body = await req.json();
    const relPath = String(body?.path || '');
    const content = String(body?.content || '');

    if (!relPath || !relPath.endsWith('.md') || relPath.includes('..')) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    const fullPath = path.resolve(WORKSPACE_DIR, relPath);
    const workspaceRoot = path.resolve(WORKSPACE_DIR) + path.sep;
    if (!fullPath.startsWith(workspaceRoot) && fullPath !== path.resolve(WORKSPACE_DIR, relPath)) {
      return NextResponse.json({ error: 'Forbidden path' }, { status: 403 });
    }

    await writeFile(fullPath, content, 'utf-8');
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
