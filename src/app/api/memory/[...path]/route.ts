import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { WORKSPACE_DIR, SENSITIVE_FILES } from '@/lib/constants';
import { requireDangerousOperationsEnabled } from '@/lib/guards';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const guard = requireDangerousOperationsEnabled();
  if (guard) return guard;

  const { path: segments } = await params;
  const relPath = segments.join('/');

  // Security check
  if (SENSITIVE_FILES.some(f => relPath.includes(f)) || relPath.includes('..')) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  try {
    const fullPath = path.join(WORKSPACE_DIR, relPath);
    const content = await readFile(fullPath, 'utf-8');
    return NextResponse.json({ path: relPath, content });
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}
