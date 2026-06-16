// ============================================================
// /api/events — Ingest + list events (HARD DB)
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import {
  fetchEvents,
  persistEvent,
  DatabaseUnavailableError,
} from "@/lib/db/hard-queries";
import {
  validate,
  eventSchema,
  eventBatchSchema,
  ValidationError,
} from "@/lib/security/validation";
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
        NextResponse.json(
          { error: "Rate limited" },
          { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
        )
      );
    }

    const body = await req.json();
    let events: any[];
    if (Array.isArray(body?.events)) {
      const validated = validate(eventBatchSchema, body);
      events = validated.events;
    } else {
      const validated = validate(eventSchema, body);
      events = [validated];
    }

    // Enqueue for async processing (BullMQ-style)
    if (events.length === 1) {
      await pipeline.enqueue("ingest-event", events[0]);
    } else {
      await pipeline.enqueue("ingest-batch", { events });
    }

    metrics.increment("http_requests_total");
    metrics.observe("http_request_duration_ms", Date.now() - start);

    return applySecurityHeaders(
      NextResponse.json(
        {
          accepted: events.length,
          queued: pipeline.getQueueLength(),
          message: `Events queued for processing`,
        },
        { status: 202 }
      )
    );
  } catch (err) {
    metrics.increment("http_errors_total");
    apiLogger.error("POST /api/events failed", {}, err as Error);
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

// GET /api/events — list persisted events with filters
export async function GET(req: NextRequest) {
  const start = Date.now();
  try {
    const auth = await requirePermission("events:read");
    if (auth instanceof NextResponse) return auth;

    const url = new URL(req.url);
    const userId = url.searchParams.get("userId") ?? undefined;
    const type = url.searchParams.get("type") ?? undefined;
    const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") ?? 50)));
    const offset = Math.max(0, Number(url.searchParams.get("offset") ?? 0));

    const { events, total } = await fetchEvents({ userId, type, limit, offset });

    metrics.increment("http_requests_total");
    metrics.observe("http_request_duration_ms", Date.now() - start);

    return applySecurityHeaders(
      NextResponse.json({
        events,
        pagination: {
          limit,
          offset,
          total,
          hasMore: offset + events.length < total,
        },
      })
    );
  } catch (err) {
    metrics.increment("http_errors_total");
    apiLogger.error("GET /api/events failed", {}, err as Error);
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
