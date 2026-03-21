// SEC-004 + QA-005: Shared config sanitizer — single source of truth for sensitive key masking.
// Expanded regex to cover password, passphrase, privateKey, DSN patterns.
const SENSITIVE_RE = /(credential|token|api[_-]?key|secret|password|passphrase|private[_-]?key|dsn|connection[_-]?string)/i;

export function sanitizeConfig(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeConfig);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_RE.test(k)) continue;
      out[k] = sanitizeConfig(v);
    }
    return out;
  }
  return value;
}

export function mergeWithoutSensitive(base: unknown, incoming: unknown): unknown {
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
