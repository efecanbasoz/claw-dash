import { NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import { OPENCLAW_CONFIG_FILE } from '@/lib/constants';
import { requireDangerousOperationsEnabled } from '@/lib/guards';

export const dynamic = 'force-dynamic';

const SENSITIVE_RE = /(credential|token|api[_-]?key|secret)/i;

function stripSensitive(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripSensitive);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_RE.test(k)) continue;
      out[k] = stripSensitive(v);
    }
    return out;
  }
  return value;
}

function mergeWithoutSensitive(base: unknown, incoming: unknown): unknown {
  if (Array.isArray(incoming) || Array.isArray(base)) return incoming;
  if (base && typeof base === 'object' && incoming && typeof incoming === 'object') {
    const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
    for (const [k, v] of Object.entries(incoming as Record<string, unknown>)) {
      if (SENSITIVE_RE.test(k)) continue;
      out[k] = mergeWithoutSensitive((out as Record<string, unknown>)[k], v);
    }
    return out;
  }
  return incoming;
}

export async function POST(req: Request) {
  const guard = requireDangerousOperationsEnabled();
  if (guard) return guard;

  try {
    const body = await req.json();
    const incoming = stripSensitive(body?.config || {});

    const file = OPENCLAW_CONFIG_FILE;
    const current = JSON.parse(await readFile(file, 'utf-8'));
    const merged = mergeWithoutSensitive(current, incoming);

    await writeFile(file, `${JSON.stringify(merged, null, 2)}\n`, 'utf-8');
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
