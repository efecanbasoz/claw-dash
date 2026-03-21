import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { OPENCLAW_CONFIG_FILE } from '@/lib/constants';
import { requireDangerousOperationsEnabled } from '@/lib/guards';
import { sanitizeConfig } from '@/lib/config-sanitizer';

export const dynamic = 'force-dynamic';

export async function GET() {
  const guard = requireDangerousOperationsEnabled();
  if (guard) return guard;

  try {
    const raw = await readFile(OPENCLAW_CONFIG_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return NextResponse.json({ config: sanitizeConfig(parsed) });
  } catch (e) {
    console.error('config failed:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
