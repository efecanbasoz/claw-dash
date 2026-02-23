import { NextResponse } from 'next/server';
import { execSync } from 'child_process';
import { readdir, stat } from 'fs/promises';
import path from 'path';
import { REPOS_DIR } from '@/lib/constants';
import { requireDangerousOperationsEnabled } from '@/lib/guards';

export const dynamic = 'force-dynamic';

interface Commit { hash: string; message: string; date: string; author: string }

export async function GET() {
  const guard = requireDangerousOperationsEnabled();
  if (guard) return guard;

  try {
    const repos: Array<{ name: string; commits: Commit[] }> = [];
    const entries = await readdir(REPOS_DIR);

    for (const entry of entries) {
      const repoPath = path.join(REPOS_DIR, entry);
      const s = await stat(repoPath).catch(() => null);
      if (!s?.isDirectory()) continue;
      try {
        const gitLog = execSync(
          `git -C "${repoPath}" log --oneline --format="%H|%s|%aI|%an" -20 2>/dev/null`,
          { encoding: 'utf-8', timeout: 5000 }
        ).trim();
        if (!gitLog) continue;
        const commits = gitLog.split('\n').map(line => {
          const [hash, message, date, author] = line.split('|');
          return { hash: hash?.slice(0, 7) || '', message: message || '', date: date || '', author: author || '' };
        });
        repos.push({ name: entry, commits });
      } catch { /* not a git repo */ }
    }

    return NextResponse.json({ repos });
  } catch (e) {
    return NextResponse.json({ error: String(e), repos: [] });
  }
}
