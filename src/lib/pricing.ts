export interface ModelPricing {
  input: number;
  output: number;
  cacheRead?: number;
  cacheWrite?: number;
}

export const MODEL_PRICING_PER_MILLION: Record<string, ModelPricing> = {
  'claude-opus-4-6': { input: 15, output: 75, cacheRead: 1.5, cacheWrite: 18.75 },
  'claude-sonnet-4-6': { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 },
  'claude-haiku-4-5': { input: 0.8, output: 4, cacheRead: 0.08, cacheWrite: 1 },
  'gpt-5.3-codex': { input: 2, output: 8 },
  'gpt-5.3-codex-spark': { input: 0.5, output: 2 },
  'gemini-3-pro-preview': { input: 1.25, output: 10, cacheRead: 0.3125 },
  'gemini-3-flash-preview': { input: 0.15, output: 0.6, cacheRead: 0.0375 },
  'gemini-2.5-flash-lite': { input: 0.075, output: 0.3, cacheRead: 0.01875 },
};

export interface UsageLike {
  input?: number;
  output?: number;
  cacheRead?: number;
  cacheWrite?: number;
  totalTokens?: number;
  cost?: { total?: number };
}

export function normalizeModelName(model?: string): string {
  if (!model) return 'unknown';
  return model.split('/').pop() || model;
}

export function estimateCost(model: string | undefined, usage: UsageLike): number {
  if (usage?.cost?.total != null && Number.isFinite(usage.cost.total)) return usage.cost.total;

  const normalized = normalizeModelName(model);
  const price = MODEL_PRICING_PER_MILLION[normalized];
  if (!price) return 0;

  const input = usage.input || 0;
  const output = usage.output || 0;
  const cacheRead = usage.cacheRead || 0;
  const cacheWrite = usage.cacheWrite || 0;

  return (
    input * price.input +
    output * price.output +
    cacheRead * (price.cacheRead || 0) +
    cacheWrite * (price.cacheWrite || 0)
  ) / 1_000_000;
}
