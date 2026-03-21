import { NextResponse } from 'next/server';
import { getAllSessions, getUsageTimeline } from '@/lib/sessions';
import { requireDangerousOperationsEnabled } from '@/lib/guards';

export const dynamic = 'force-dynamic';

export async function GET() {
  const guard = requireDangerousOperationsEnabled();
  if (guard) return guard;

  try {
    const [sessions, timeline] = await Promise.all([getAllSessions(), getUsageTimeline(30)]);
    const today = new Date().toISOString().slice(0, 10);

    const sumTimeline = (days: number) => {
      const points = timeline.slice(-days);
      return points.reduce((acc, d) => {
        acc.count += d.sessions;
        acc.tokens += d.tokens;
        acc.cost += d.cost;
        acc.messages += d.messages;
        return acc;
      }, { count: 0, tokens: 0, cost: 0, messages: 0 });
    };

    const todayPoint = timeline.find(d => d.date === today) || { sessions: 0, tokens: 0, cost: 0, messages: 0, byModel: {} };

    const byAgent: Record<string, { sessions: number; tokens: number; cost: number }> = {};
    for (const s of sessions) {
      if (!byAgent[s.agentId]) byAgent[s.agentId] = { sessions: 0, tokens: 0, cost: 0 };
      byAgent[s.agentId].sessions++;
      byAgent[s.agentId].tokens += s.totalTokens;
      byAgent[s.agentId].cost += s.totalCost;
    }

    const byModel: Record<string, { sessions: number; tokens: number; cost: number }> = {};
    for (const s of sessions) {
      for (const [model, data] of Object.entries(s.tokensByModel || {})) {
        if (!byModel[model]) byModel[model] = { sessions: 0, tokens: 0, cost: 0 };
        byModel[model].sessions++;
        byModel[model].tokens += data.tokens;
        byModel[model].cost += data.cost;
      }
    }

    const byModelToday: Record<string, { sessions: number; tokens: number; cost: number }> = {};
    for (const [model, data] of Object.entries(todayPoint.byModel || {}) as Array<[string, { tokens: number; cost: number; messages: number }]>) {
      byModelToday[model] = {
        sessions: todayPoint.sessions,
        tokens: data.tokens,
        cost: data.cost,
      };
    }

    const byProvider: Record<string, { sessions: number; tokens: number; cost: number }> = {};
    for (const s of sessions) {
      const key = s.provider || 'unknown';
      if (!byProvider[key]) byProvider[key] = { sessions: 0, tokens: 0, cost: 0 };
      byProvider[key].sessions++;
      byProvider[key].tokens += s.totalTokens;
      byProvider[key].cost += s.totalCost;
    }

    const dailyCosts = timeline.map(d => ({ date: d.date, cost: d.cost, tokens: d.tokens }));
    const heatmap = timeline.map(d => ({ date: d.date, count: d.sessions }));
    const activeSessions = sessions.filter(s => s.isActive).slice(0, 5);

    return NextResponse.json({
      today: { count: todayPoint.sessions, tokens: todayPoint.tokens, cost: todayPoint.cost, messages: todayPoint.messages },
      week: sumTimeline(7),
      month: sumTimeline(30),
      lifetime: {
        count: sessions.length,
        tokens: sessions.reduce((a, s) => a + s.totalTokens, 0),
        cost: sessions.reduce((a, s) => a + s.totalCost, 0),
        messages: sessions.reduce((a, s) => a + s.messageCount, 0),
      },
      byAgent,
      byModel,
      byModelToday,
      byProvider,
      dailyCosts,
      heatmap,
      activeSessions,
    });
  } catch (e) {
    console.error('stats failed:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
