// ============================================================
// /api/analytics — Aggregated analytics snapshot
// ============================================================

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { useForgeStore } from "@/lib/store";
import { datasetStats } from "@/lib/data/generator";
import { PERSONA_META, PERSONA_KINDS } from "@/lib/types";
import { applySecurityHeaders } from "@/lib/security/headers";
import { metrics } from "@/lib/monitoring/metrics";
import { apiLogger } from "@/lib/monitoring/logger";
import { requirePermission } from "@/lib/auth/session";
import { cache } from "@/lib/cache/redis";

export const dynamic = "force-dynamic";

export async function GET() {
  const start = Date.now();
  try {
    const auth = await requirePermission("analytics:read");
    if (auth instanceof NextResponse) return auth;

    const cacheKey = "analytics:snapshot";
    const cached = await cache.get<any>(cacheKey);
    if (cached) {
      metrics.increment("http_requests_total");
      metrics.observe("http_request_duration_ms", Date.now() - start);
      return applySecurityHeaders(NextResponse.json({ ...cached, cached: true }));
    }

    // Try DB snapshot first
    let snapshot: any = null;
    try {
      const latest = await db.analyticsSnapshot.findFirst({
        orderBy: { date: "desc" },
      });
      if (latest) {
        snapshot = {
          timestamp: latest.date.toISOString(),
          totalUsers: latest.totalUsers,
          activeUsers: latest.activeUsers,
          convertedUsers: latest.convertedUsers,
          conversionRate: latest.conversionRate,
          revenue: latest.revenue,
          avgOrderValue: latest.avgOrderValue,
          events: latest.events,
          banditBestArm: latest.banditBestArm,
          banditRegret: latest.banditRegret,
          banditRounds: latest.banditRounds,
        };
      }
    } catch (dbErr) {
      apiLogger.warn("DB unavailable for analytics", { error: (dbErr as Error).message });
    }

    // Fall back to in-memory computation
    if (!snapshot) {
      const store = useForgeStore.getState();
      const stats = datasetStats(store.dataset);
      const personaDistribution = PERSONA_KINDS.map((k) => ({
        kind: k,
        name: PERSONA_META[k].name,
        count: store.dataset.users.filter((u) => u.persona === k).length,
        color: PERSONA_META[k].color,
      }));

      snapshot = {
        timestamp: new Date().toISOString(),
        totalUsers: stats.total,
        activeUsers: store.dataset.users.filter((u) => u.events.length > 5).length,
        convertedUsers: stats.converted,
        conversionRate: stats.conversionRate,
        revenue: stats.revenue,
        avgOrderValue: stats.converted > 0 ? stats.revenue / stats.converted : 0,
        events: stats.events,
        personaDistribution,
        banditBestArm: store.bandit.bestArm,
        banditRegret: store.bandit.history[store.bandit.history.length - 1]?.regret ?? 0,
        banditRounds: store.bandit.totalRounds,
      };
    }

    await cache.set(cacheKey, snapshot, 300); // cache 5 min

    metrics.increment("http_requests_total");
    metrics.observe("http_request_duration_ms", Date.now() - start);
    metrics.setGauge("api_active_users", snapshot.activeUsers ?? 0);

    return applySecurityHeaders(NextResponse.json(snapshot));
  } catch (err) {
    metrics.increment("http_errors_total");
    apiLogger.error("GET /api/analytics failed", {}, err as Error);
    return applySecurityHeaders(
      NextResponse.json({ error: "Internal server error" }, { status: 500 })
    );
  }
}
