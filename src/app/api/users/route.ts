// ============================================================
// /api/users — List users (paginated, filtered)
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { useForgeStore } from "@/lib/store";
import { validate, userListQuerySchema, ValidationError } from "@/lib/security/validation";
import { rateLimiters, getClientIp } from "@/lib/security/rate-limit";
import { applySecurityHeaders } from "@/lib/security/headers";
import { metrics } from "@/lib/monitoring/metrics";
import { apiLogger } from "@/lib/monitoring/logger";
import { requirePermission } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const start = Date.now();
  try {
    // Auth check
    const auth = await requirePermission("users:read");
    if (auth instanceof NextResponse) return auth;

    // Rate limit
    const ip = getClientIp(req);
    const rl = await rateLimiters.api(ip);
    if (!rl.allowed) {
      return applySecurityHeaders(
        NextResponse.json({ error: "Rate limited", retryAfter: rl.retryAfterSec }, { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } })
      );
    }

    // Parse + validate query params
    const url = new URL(req.url);
    const params = Object.fromEntries(url.searchParams);
    const { limit, offset, persona, search, converted } = validate(userListQuerySchema, params);

    // Try DB first; fall back to in-memory store if DB is empty (hackathon mode)
    let users: any[] = [];
    let total = 0;

    try {
      const where: any = { deletedAt: null };
      if (persona) where.personaKind = persona;
      if (converted !== undefined) where.converted = converted === "true";
      if (search) {
        where.OR = [
          { name: { contains: search } },
          { email: { contains: search } },
          { id: { contains: search } },
        ];
      }

      [users, total] = await Promise.all([
        db.user.findMany({
          where,
          take: limit,
          skip: offset,
          orderBy: { createdAt: "desc" },
          include: { _count: { select: { events: true } } },
        }),
        db.user.count({ where }),
      ]);
    } catch (dbErr) {
      apiLogger.warn("DB unavailable, falling back to in-memory store", {
        error: (dbErr as Error).message,
      });
    }

    // If DB empty, fall back to seeded in-memory store
    if (users.length === 0) {
      const store = useForgeStore.getState();
      let allUsers = store.dataset.users;
      if (persona) allUsers = allUsers.filter((u) => u.persona === persona);
      if (converted !== undefined) allUsers = allUsers.filter((u) => u.converted === (converted === "true"));
      if (search) {
        const q = search.toLowerCase();
        allUsers = allUsers.filter(
          (u) => u.name.toLowerCase().includes(q) || u.id.toLowerCase().includes(q)
        );
      }
      total = allUsers.length;
      users = allUsers.slice(offset, offset + limit).map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        personaKind: u.persona,
        converted: u.converted,
        revenue: u.revenue,
        sessions: u.sessions,
        _count: { events: u.events.length },
      }));
    }

    metrics.increment("http_requests_total");
    metrics.observe("http_request_duration_ms", Date.now() - start);

    const res = NextResponse.json({
      users,
      pagination: { limit, offset, total, hasMore: offset + users.length < total },
    });
    return applySecurityHeaders(res);
  } catch (err) {
    metrics.increment("http_errors_total");
    apiLogger.error("GET /api/users failed", {}, err as Error);
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
