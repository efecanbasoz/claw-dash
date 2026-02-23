import { readdir, stat } from 'fs/promises';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { execSync } from 'child_process';
import path from 'path';
import { AGENTS_DIR, AGENT_IDS, OPENCLAW_BIN } from './constants';
import { estimateCost, normalizeModelName } from './pricing';

let _gatewayModelsCache: { ts: number; data: Record<string, { model: string; provider: string }> } = { ts: 0, data: {} };
function getGatewayModels(): Record<string, { model: string; provider: string }> {
  if (Date.now() - _gatewayModelsCache.ts < 15000) return _gatewayModelsCache.data;
  try {
    const raw = execSync(`${OPENCLAW_BIN} gateway call sessions.list`, { timeout: 5000, encoding: 'utf-8' });
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const map: Record<string, { model: string; provider: string }> = {};
      for (const s of parsed.sessions || []) {
        const sessionId = s.sessionId || '';
        if (sessionId && s.model) map[sessionId] = { model: s.model, provider: s.modelProvider || '' };
      }
      _gatewayModelsCache = { ts: Date.now(), data: map };
    }
  } catch { /* fallback to JSONL */ }
  return _gatewayModelsCache.data;
}

export interface SessionEntry {
  type: string;
  id?: string;
  timestamp?: string;
  message?: {
    role: string;
    content: unknown[];
    timestamp?: number;
    usage?: {
      input: number;
      output: number;
      cacheRead?: number;
      cacheWrite?: number;
      totalTokens: number;
      cost?: { input: number; output: number; cacheRead?: number; cacheWrite?: number; total: number };
    };
    api?: string;
    provider?: string;
    model?: string;
  };
  usage?: {
    input: number;
    output: number;
    cacheRead?: number;
    cacheWrite?: number;
    totalTokens: number;
    cost?: { input: number; output: number; total: number };
  };
  modelId?: string;
  provider?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface SessionMeta {
  id: string;
  agentId: string;
  timestamp: string;
  model: string;
  provider: string;
  messageCount: number;
  totalTokens: number;
  totalCost: number;
  lastActivity: string;
  isActive: boolean;
  filePath: string;
  tokensByModel: Record<string, { tokens: number; cost: number; provider: string }>;
}

export interface UsagePoint {
  date: string;
  sessions: number;
  messages: number;
  tokens: number;
  cost: number;
  byModel: Record<string, { tokens: number; cost: number; messages: number }>;
}

async function parseSessionFile(filePath: string, metaOnly = true): Promise<{ meta: Partial<SessionMeta>; entries: SessionEntry[] }> {
  const entries: SessionEntry[] = [];
  const meta: Partial<SessionMeta> = { messageCount: 0, totalTokens: 0, totalCost: 0, tokensByModel: {} };
  const modelStats: Record<string, { tokens: number; messages: number; provider: string }> = {};

  try {
    const rl = createInterface({ input: createReadStream(filePath), crlfDelay: Infinity });
    for await (const line of rl) {
      if (!line.trim()) continue;
      try {
        const entry = JSON.parse(line) as SessionEntry;
        if (entry.type === 'session') {
          meta.id = entry.id;
          meta.timestamp = entry.timestamp || '';
          meta.lastActivity = entry.timestamp || '';
        } else if (entry.type === 'model_change') {
          meta.model = entry.modelId || meta.model || '';
          meta.provider = entry.provider || meta.provider || '';
        } else if (entry.type === 'message' && entry.message) {
          meta.messageCount = (meta.messageCount || 0) + 1;
          if (entry.timestamp) meta.lastActivity = entry.timestamp;

          const usage = entry.message.usage ?? entry.usage;
          if (usage) {
            const tokens = usage.totalTokens || 0;
            const modelKey = normalizeModelName(entry.message.model || meta.model || 'unknown');
            const modelProvider = entry.message.provider || meta.provider || 'unknown';
            const cost = estimateCost(modelKey, usage);

            meta.totalTokens = (meta.totalTokens || 0) + tokens;
            meta.totalCost = (meta.totalCost || 0) + cost;

            if (!meta.tokensByModel![modelKey]) {
              meta.tokensByModel![modelKey] = { tokens: 0, cost: 0, provider: modelProvider };
            }
            meta.tokensByModel![modelKey].tokens += tokens;
            meta.tokensByModel![modelKey].cost += cost;

            if (!modelStats[modelKey]) modelStats[modelKey] = { tokens: 0, messages: 0, provider: modelProvider };
            modelStats[modelKey].tokens += tokens;
            modelStats[modelKey].messages += 1;
          }
        }
        if (!metaOnly) entries.push(entry);
      } catch { /* skip malformed */ }
    }
  } catch { /* read error */ }

  if (!meta.model || meta.model === 'unknown') {
    const candidates = Object.entries(modelStats)
      .filter(([m]) => m !== 'delivery-mirror' && !m.includes('heartbeat'))
      .sort((a, b) => b[1].tokens - a[1].tokens);
    if (candidates.length > 0) {
      meta.model = candidates[0][0];
      meta.provider = candidates[0][1].provider;
    }
  }

  return { meta, entries };
}

export async function getAllSessions(): Promise<SessionMeta[]> {
  const sessions: SessionMeta[] = [];
  const gatewayModels = getGatewayModels();

  for (const agentId of AGENT_IDS) {
    const sessDir = path.join(AGENTS_DIR, agentId, 'sessions');
    try {
      const files = await readdir(sessDir);
      for (const f of files) {
        if (!f.endsWith('.jsonl') || f.endsWith('.lock')) continue;
        const filePath = path.join(sessDir, f);
        const fStat = await stat(filePath).catch(() => null);
        if (!fStat) continue;

        const { meta } = await parseSessionFile(filePath, true);
        const isActive = Date.now() - fStat.mtimeMs < 5 * 60 * 1000;

        const sessionId = meta.id || f.replace('.jsonl', '');
        const gw = gatewayModels[sessionId];

        sessions.push({
          id: sessionId,
          agentId,
          timestamp: meta.timestamp || fStat.birthtime.toISOString(),
          model: normalizeModelName(gw?.model || meta.model || 'unknown'),
          provider: gw?.provider || meta.provider || 'unknown',
          messageCount: meta.messageCount || 0,
          totalTokens: meta.totalTokens || 0,
          totalCost: meta.totalCost || 0,
          lastActivity: meta.lastActivity || fStat.mtime.toISOString(),
          isActive,
          filePath,
          tokensByModel: meta.tokensByModel || {},
        });
      }
    } catch { /* agent dir missing */ }
  }

  sessions.sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());
  return sessions;
}

export async function getSessionDetail(sessionId: string): Promise<{ meta: Partial<SessionMeta>; entries: SessionEntry[] } | null> {
  for (const agentId of AGENT_IDS) {
    const filePath = path.join(AGENTS_DIR, agentId, 'sessions', `${sessionId}.jsonl`);
    try {
      await stat(filePath);
      const result = await parseSessionFile(filePath, false);
      result.meta.agentId = agentId;
      return result;
    } catch { /* not found */ }
  }
  return null;
}

export async function getRecentMessages(limit = 50): Promise<Array<{ timestamp: string; agentId: string; role: string; content: string; sessionId: string }>> {
  const messages: Array<{ timestamp: string; agentId: string; role: string; content: string; sessionId: string }> = [];

  for (const agentId of AGENT_IDS) {
    const sessDir = path.join(AGENTS_DIR, agentId, 'sessions');
    try {
      const files = await readdir(sessDir);
      const sorted = files.filter(f => f.endsWith('.jsonl') && !f.endsWith('.lock')).slice(-5);

      for (const f of sorted) {
        const filePath = path.join(sessDir, f);
        const sessionId = f.replace('.jsonl', '');
        const rl = createInterface({ input: createReadStream(filePath), crlfDelay: Infinity });
        for await (const line of rl) {
          try {
            const entry = JSON.parse(line);
            if (entry.type === 'message' && entry.message) {
              const content = Array.isArray(entry.message.content)
                ? entry.message.content.map((c: { type: string; text?: string }) => c.type === 'text' ? c.text : `[${c.type}]`).join(' ')
                : String(entry.message.content || '');
              messages.push({
                timestamp: entry.timestamp || '',
                agentId,
                role: entry.message.role || 'unknown',
                content: content.slice(0, 4000),
                sessionId,
              });
            }
          } catch { /* skip */ }
        }
      }
    } catch { /* skip */ }
  }

  messages.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return messages.slice(0, limit);
}

export async function getUsageTimeline(days = 30): Promise<UsagePoint[]> {
  const map: Record<string, UsagePoint> = {};
  const today = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().split('T')[0];
    map[key] = { date: key, sessions: 0, messages: 0, tokens: 0, cost: 0, byModel: {} };
  }

  for (const agentId of AGENT_IDS) {
    const sessDir = path.join(AGENTS_DIR, agentId, 'sessions');
    try {
      const files = await readdir(sessDir);
      for (const f of files) {
        if (!f.endsWith('.jsonl') || f.endsWith('.lock')) continue;

        const touchedDays = new Set<string>();
        let sessionModel = 'unknown';
        const filePath = path.join(sessDir, f);
        const rl = createInterface({ input: createReadStream(filePath), crlfDelay: Infinity });

        for await (const line of rl) {
          if (!line.trim()) continue;
          try {
            const entry = JSON.parse(line) as SessionEntry;
            if (entry.type === 'model_change' && entry.modelId) sessionModel = normalizeModelName(entry.modelId);
            if (entry.type !== 'message' || !entry.message) continue;

            const ts = entry.timestamp || (entry.message.timestamp ? new Date(entry.message.timestamp).toISOString() : '');
            const day = ts ? ts.slice(0, 10) : '';
            if (!day || !map[day]) continue;

            touchedDays.add(day);
            map[day].messages += 1;

            const usage = entry.message.usage ?? entry.usage;
            if (usage) {
              const model = normalizeModelName(entry.message.model || sessionModel);
              const tokens = usage.totalTokens || 0;
              const cost = estimateCost(model, usage);

              map[day].tokens += tokens;
              map[day].cost += cost;
              if (!map[day].byModel[model]) map[day].byModel[model] = { tokens: 0, cost: 0, messages: 0 };
              map[day].byModel[model].tokens += tokens;
              map[day].byModel[model].cost += cost;
              map[day].byModel[model].messages += 1;
            }
          } catch { /* skip */ }
        }

        touchedDays.forEach(d => { if (map[d]) map[d].sessions += 1; });
      }
    } catch { /* skip */ }
  }

  return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
}
