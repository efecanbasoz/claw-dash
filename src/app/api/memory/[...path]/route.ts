import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { WORKSPACE_DIR, SENSITIVE_FILES } from '@/lib/constants';
import { requireDangerousOperationsEnabled } from '@/lib/guards';
import { resolvePathWithinRoot } from '@/lib/paths';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const guard = requireDangerousOperationsEnabled();
  if (guard) return guard;

  const { path: segments } = await params;
  const relPath = segments.join('/');
  const resolved = resolvePathWithinRoot(WORKSPACE_DIR, relPath, {
    allowedExtensions: ['.md'],
    blockedBasenames: SENSITIVE_FILES,
  });
  if (!resolved) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

  try {
    const content = await readFile(resolved.fullPath, 'utf-8');
    return NextResponse.json({ path: resolved.relativePath, content });
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}
