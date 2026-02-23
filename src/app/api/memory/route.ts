import { NextResponse } from 'next/server';
import { readdir, stat } from 'fs/promises';
import path from 'path';
import { MEMORY_DIR, WORKSPACE_DIR } from '@/lib/constants';
import { requireDangerousOperationsEnabled } from '@/lib/guards';

export const dynamic = 'force-dynamic';

interface MemFile { name: string; path: string; size: number; modified: string; type: 'file' | 'dir' }

export async function GET() {
  const guard = requireDangerousOperationsEnabled();
  if (guard) return guard;

  try {
    const files: MemFile[] = [];

    // Workspace-level md files
    const wsFiles = ['MEMORY.md', 'HEARTBEAT.md', 'SOUL.md', 'USER.md', 'IDENTITY.md'];
    for (const f of wsFiles) {
      try {
        const s = await stat(path.join(WORKSPACE_DIR, f));
        files.push({ name: f, path: f, size: s.size, modified: s.mtime.toISOString(), type: 'file' });
      } catch { /* */ }
    }

    // Memory dir
    try {
      const memFiles = await readdir(MEMORY_DIR);
      for (const f of memFiles) {
        const s = await stat(path.join(MEMORY_DIR, f));
        files.push({ name: f, path: `memory/${f}`, size: s.size, modified: s.mtime.toISOString(), type: 'file' });
      }
    } catch { /* */ }

    return NextResponse.json({ files });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
