// ============================================================
// /api/counterfactual — Run counterfactual scenarios (HARD DB)
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import {
  fetchUserWithEvents,
  fetchUsers,
  DatabaseUnavailableError,
} from "@/lib/db/hard-queries";
import {
  validate,
  counterfactualRequestSchema,
  ValidationError,
} from "@/lib/security/validation";
import { rateLimiters, getClientIp } from "@/lib/security/rate-limit";
import { applySecurityHeaders } from "@/lib/security/headers";
import { metrics } from "@/lib/monitoring/metrics";
import { apiLogger } from "@/lib/monitoring/logger";
import { requirePermission } from "@/lib/auth/session";
import { runCounterfactualV2 } from "@/lib/ml/counterfactual-v2";
import { cache } from "@/lib/cache/redis";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const start = Date.now();
  try {
    const auth = await requirePermission("counterfactual:write");
    if (auth instanceof NextResponse) return auth;

    const ip = getClientIp(req);
    const rl = await rateLimiters.api(auth.session.user.id ?? ip);
    if (!rl.allowed) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "Rate limited" },
          { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
        )
      );
    }

    const body = await req.json();
    const { userId } = validate(counterfactualRequestSchema, body);

    const cacheKey = `counterfactual:${userId}`;
    const cached = await cache.get<any>(cacheKey);
    if (cached) {
      metrics.increment("api_counterfactual_runs_total");
      metrics.increment("http_requests_total");
      metrics.observe("http_request_duration_ms", Date.now() - start);
      return applySecurityHeaders(
        NextResponse.json({ ...cached, cached: true })
      );
    }

    // HARD DB: fetch the target user
    const userData = await fetchUserWithEvents(userId);
    if (!userData) {
      return applySecurityHeaders(
        NextResponse.json({ error: "User not found" }, { status: 404 })
      );
    }

    // Fetch a sample of users for causal estimation (HARD DB)
    const { users: sampleUsers } = await fetchUsers({
      limit: 500,
      offset: 0,
    });

    // Convert DB rows to the shape expected by runCounterfactualV2
    const targetUser = {
      id: userData.user.id,
      name: userData.user.name ?? "",
      email: userData.user.email ?? "",
      persona: (userData.user.personaKind as any) ?? "price_sensitive",
      createdAt: Date.now(),
      features: userData.user.features,
      events: userData.events.map((e: any) => ({
        id: e.id,
        userId: e.userId,
        type: e.type,
        timestamp: Number(e.timestamp),
        pageDepth: e.pageDepth,
        productId: e.productId ?? undefined,
        query: e.query ?? undefined,
        scrollPct: e.scrollPct ?? undefined,
        dwellSec: e.dwellSec ?? undefined,
        price: e.price ?? undefined,
        discountSeen: e.discountSeen,
        socialProofSeen: e.socialProofSeen,
        reviewSeen: e.reviewSeen,
        urgencySeen: e.urgencySeen,
      })),
      converted: userData.user.converted,
      revenue: userData.user.revenue,
      sessions: userData.user.sessions,
    };

    const sampleTyped = sampleUsers.map((u) => ({
      id: u.id,
      name: u.name ?? "",
      email: u.email ?? "",
      persona: (u.personaKind as any) ?? "price_sensitive",
      createdAt: Date.now(),
      features: u.features,
      events: [],
      converted: u.converted,
      revenue: u.revenue,
      sessions: u.sessions,
    }));

    const result = runCounterfactualV2(targetUser, sampleTyped);
    await cache.set(cacheKey, result, 300);

    metrics.increment("api_counterfactual_runs_total");
    metrics.increment("http_requests_total");
    metrics.observe("http_request_duration_ms", Date.now() - start);

    return applySecurityHeaders(NextResponse.json(result));
  } catch (err) {
    metrics.increment("http_errors_total");
    apiLogger.error("POST /api/counterfactual failed", {}, err as Error);
    if (err instanceof ValidationError) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "Validation failed", issues: err.fieldErrors },
          { status: 400 }
        )
      );
    }
    if (err instanceof DatabaseUnavailableError) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "Database unavailable", message: err.message },
          { status: 503 }
        )
      );
    }
    return applySecurityHeaders(
      NextResponse.json({ error: "Internal server error" }, { status: 500 })
    );
  }
}
