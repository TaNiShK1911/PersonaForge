// ============================================================
// /api/personas — List all personas
// ============================================================

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { useForgeStore } from "@/lib/store";
import { applySecurityHeaders } from "@/lib/security/headers";
import { metrics } from "@/lib/monitoring/metrics";
import { apiLogger } from "@/lib/monitoring/logger";
import { requirePermission } from "@/lib/auth/session";
import { cache } from "@/lib/cache/redis";

export const dynamic = "force-dynamic";

export async function GET() {
  const start = Date.now();
  try {
    const auth = await requirePermission("personas:read");
    if (auth instanceof NextResponse) return auth;

    const cacheKey = "personas:all";
    const cached = await cache.get<any>(cacheKey);
    if (cached) {
      metrics.increment("http_requests_total");
      metrics.observe("http_request_duration_ms", Date.now() - start);
      return applySecurityHeaders(NextResponse.json({ personas: cached, cached: true }));
    }

    // Try DB
    let personas: any[] = [];
    try {
      personas = await db.persona.findMany({
        where: { deletedAt: null },
        orderBy: { memberCount: "desc" },
      });
    } catch (dbErr) {
      apiLogger.warn("DB unavailable for personas", { error: (dbErr as Error).message });
    }

    if (personas.length === 0) {
      // Fall back to in-memory store
      const store = useForgeStore.getState();
      personas = store.personas.map((p) => ({
        kind: p.kind,
        name: p.persona_name,
        traits: p.traits,
        embedding: [p.behavior_embedding.x, p.behavior_embedding.y],
        confidence: p.confidence,
        memberCount: p.memberCount,
        avgConversion: p.avgConversion,
        avgRevenue: p.avgRevenue,
        topFeatures: p.topFeatures,
      }));
    }

    await cache.set(cacheKey, personas, 600);

    metrics.increment("http_requests_total");
    metrics.observe("http_request_duration_ms", Date.now() - start);

    return applySecurityHeaders(NextResponse.json({ personas }));
  } catch (err) {
    metrics.increment("http_errors_total");
    apiLogger.error("GET /api/personas failed", {}, err as Error);
    return applySecurityHeaders(
      NextResponse.json({ error: "Internal server error" }, { status: 500 })
    );
  }
}
