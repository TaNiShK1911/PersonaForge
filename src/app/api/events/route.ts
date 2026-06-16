// ============================================================
// /api/events — Ingest events (single or batch)
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { validate, eventSchema, eventBatchSchema, ValidationError } from "@/lib/security/validation";
import { rateLimiters, getClientIp } from "@/lib/security/rate-limit";
import { applySecurityHeaders } from "@/lib/security/headers";
import { metrics } from "@/lib/monitoring/metrics";
import { apiLogger } from "@/lib/monitoring/logger";
import { requirePermission } from "@/lib/auth/session";
import { pipeline } from "@/lib/pipeline/queue";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const start = Date.now();
  try {
    const auth = await requirePermission("events:write");
    if (auth instanceof NextResponse) return auth;

    const ip = getClientIp(req);
    const rl = await rateLimiters.events(ip);
    if (!rl.allowed) {
      return applySecurityHeaders(
        NextResponse.json({ error: "Rate limited" }, { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } })
      );
    }

    const body = await req.json();

    // Support both single event and batch
    let events: any[];
    if (Array.isArray(body?.events)) {
      const validated = validate(eventBatchSchema, body);
      events = validated.events;
    } else {
      const validated = validate(eventSchema, body);
      events = [validated];
    }

    // Enqueue for async processing
    if (events.length === 1) {
      await pipeline.enqueue("ingest-event", events[0]);
    } else {
      await pipeline.enqueue("ingest-batch", { events });
    }

    metrics.increment("http_requests_total");
    metrics.observe("http_request_duration_ms", Date.now() - start);

    return applySecurityHeaders(
      NextResponse.json({
        accepted: events.length,
        queued: pipeline.getQueueLength(),
        message: `Events queued for processing`,
      }, { status: 202 })
    );
  } catch (err) {
    metrics.increment("http_errors_total");
    apiLogger.error("POST /api/events failed", {}, err as Error);
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

// GET /api/events — list recent events (for debugging)
export async function GET(req: NextRequest) {
  try {
    const auth = await requirePermission("events:read");
    if (auth instanceof NextResponse) return auth;

    const url = new URL(req.url);
    const limit = Math.min(100, Number(url.searchParams.get("limit") ?? 50));
    const userId = url.searchParams.get("userId");

    return applySecurityHeaders(
      NextResponse.json({
        message: "Events endpoint. POST to ingest. Use limit & userId query params to filter (DB-backed in production).",
        queueLength: pipeline.getQueueLength(),
        limit,
        userId,
      })
    );
  } catch (err) {
    apiLogger.error("GET /api/events failed", {}, err as Error);
    return applySecurityHeaders(
      NextResponse.json({ error: "Internal server error" }, { status: 500 })
    );
  }
}
