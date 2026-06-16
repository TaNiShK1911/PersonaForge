// ============================================================
// /api/users/{id} — Get a single user with events
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { useForgeStore } from "@/lib/store";
import { validate, userIdSchema, ValidationError } from "@/lib/security/validation";
import { rateLimiters, getClientIp } from "@/lib/security/rate-limit";
import { applySecurityHeaders } from "@/lib/security/headers";
import { metrics } from "@/lib/monitoring/metrics";
import { apiLogger } from "@/lib/monitoring/logger";
import { requirePermission } from "@/lib/auth/session";
import { cache } from "@/lib/cache/redis";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const start = Date.now();
  try {
    const auth = await requirePermission("users:read");
    if (auth instanceof NextResponse) return auth;

    const ip = getClientIp(req);
    const rl = await rateLimiters.api(ip);
    if (!rl.allowed) {
      return applySecurityHeaders(
        NextResponse.json({ error: "Rate limited" }, { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } })
      );
    }

    const { id } = await params;
    validate(userIdSchema, { id });

    // Cache lookup
    const cacheKey = `user:${id}`;
    const cached = await cache.get<any>(cacheKey);
    if (cached) {
      metrics.increment("http_requests_total");
      metrics.observe("http_request_duration_ms", Date.now() - start);
      return applySecurityHeaders(NextResponse.json({ ...cached, cached: true }));
    }

    // Try DB
    let user: any = null;
    try {
      user = await db.user.findUnique({
        where: { id },
        include: {
          events: { orderBy: { timestamp: "asc" }, take: 200 },
          persona: true,
        },
      });
    } catch (dbErr) {
      apiLogger.warn("DB unavailable for user lookup", { error: (dbErr as Error).message });
    }

    // Fall back to in-memory store
    if (!user) {
      const store = useForgeStore.getState();
      const u = store.dataset.users.find((x) => x.id === id);
      if (u) {
        user = {
          id: u.id,
          name: u.name,
          email: u.email,
          personaKind: u.persona,
          features: u.features,
          converted: u.converted,
          revenue: u.revenue,
          sessions: u.sessions,
          events: u.events.slice(0, 200),
        };
      }
    }

    if (!user) {
      return applySecurityHeaders(
        NextResponse.json({ error: "User not found" }, { status: 404 })
      );
    }

    // Cache for 5 minutes
    await cache.set(cacheKey, user, 300);

    metrics.increment("http_requests_total");
    metrics.observe("http_request_duration_ms", Date.now() - start);

    return applySecurityHeaders(NextResponse.json(user));
  } catch (err) {
    metrics.increment("http_errors_total");
    apiLogger.error("GET /api/users/{id} failed", {}, err as Error);
    if (err instanceof ValidationError) {
      return applySecurityHeaders(
        NextResponse.json({ error: "Validation failed", issues: err.fieldErrors }, { status: 400 })
      );
    }
    return applySecurityHeaders(
      NextResponse.json({ error: "Internal server error" }, { status: 500 })
    );
  }
}
