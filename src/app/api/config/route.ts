import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { OPENCLAW_CONFIG_FILE } from '@/lib/constants';
import { requireDangerousOperationsEnabled } from '@/lib/guards';

export const dynamic = 'force-dynamic';

const SENSITIVE_RE = /(credential|token|api[_-]?key|secret)/i;

function sanitize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitize);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_RE.test(k)) continue;
      out[k] = sanitize(v);
    }
    return out;
  }
  return value;
}

export async function GET() {
  const guard = requireDangerousOperationsEnabled();
  if (guard) return guard;

  try {
    const raw = await readFile(OPENCLAW_CONFIG_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return NextResponse.json({ config: sanitize(parsed) });
  } catch (e) {
    console.error('config failed:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
