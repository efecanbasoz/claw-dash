import { NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import { OPENCLAW_CONFIG_FILE } from '@/lib/constants';
import { requireDangerousOperationsEnabled } from '@/lib/guards';
import { sanitizeConfig, mergeWithoutSensitive } from '@/lib/config-sanitizer';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const guard = requireDangerousOperationsEnabled();
  if (guard) return guard;

  try {
    const body = await req.json();
    const incoming = sanitizeConfig(body?.config || {});

    const current = JSON.parse(await readFile(OPENCLAW_CONFIG_FILE, 'utf-8'));
    const merged = mergeWithoutSensitive(current, incoming);

    await writeFile(OPENCLAW_CONFIG_FILE, `${JSON.stringify(merged, null, 2)}\n`, 'utf-8');
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('config/save failed:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
