// ============================================================
// /api/identity — Identity Resolution API
// ============================================================
// Returns identity graph for a user: fragmented signals merged
// into unified profile with match confidence scores.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveIdentities, buildIdentityGraph } from "@/lib/identity/resolution";
import { applySecurityHeaders } from "@/lib/security/headers";
import { metrics } from "@/lib/monitoring/metrics";
import { apiLogger } from "@/lib/monitoring/logger";
import { requirePermission } from "@/lib/auth/session";
import { z } from "zod";

export const dynamic = "force-dynamic";

const identityRequestSchema = z.object({
  userId: z.string().min(1),
  useProb: z.boolean().optional().default(true),
});

export async function GET(req: NextRequest) {
  const start = Date.now();
  try {
    // TODO: Re-enable auth after demo
    // const auth = await requirePermission("identity:read");
    // if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return applySecurityHeaders(
        NextResponse.json({ error: "Missing userId parameter" }, { status: 400 })
      );
    }

    // Fetch user
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return applySecurityHeaders(
        NextResponse.json({ error: "User not found" }, { status: 404 })
      );
    }

    // Fetch all identity signals for this user
    const signals = await db.identitySignal.findMany({
      where: { userId },
    });

    if (signals.length === 0) {
      return applySecurityHeaders(
        NextResponse.json({
          userId,
          nodes: [],
          edges: [],
          resolutionConfidence: 0,
          fragmentedCount: 0,
          resolvedCount: 0,
          message: "No identity signals found for this user",
        })
      );
    }

    // Convert DB signals to resolution engine format
    const resolutionSignals = signals.map((s) => ({
      id: s.id,
      userId: s.userId,
      signalType: s.signalType as any,
      signalValue: s.signalValue,
      channel: s.channel as any,
      firstSeenAt: s.firstSeenAt,
      lastSeenAt: s.lastSeenAt,
      confidence: s.confidence,
    }));

    // Run resolution
    const useProb = searchParams.get("useProb") !== "false";
    const matches = resolveIdentities(resolutionSignals, useProb);

    // Persist matches to DB (for caching/audit trail)
    for (const match of matches) {
      await db.identityMatch.upsert({
        where: {
          signalAId_signalBId: {
            signalAId: match.signalAId,
            signalBId: match.signalBId,
          },
        },
        create: {
          signalAId: match.signalAId,
          signalBId: match.signalBId,
          matchScore: match.matchScore,
          method: match.method,
          matchedAt: match.matchedAt,
        },
        update: {
          matchScore: match.matchScore,
          method: match.method,
        },
      });
    }

    // Build graph
    const graph = buildIdentityGraph(userId, resolutionSignals, matches);

    metrics.increment("api_identity_resolutions_total");
    metrics.increment("http_requests_total");
    metrics.observe("http_request_duration_ms", Date.now() - start);

    return applySecurityHeaders(NextResponse.json(graph));
  } catch (err) {
    metrics.increment("http_errors_total");
    apiLogger.error("GET /api/identity failed", {}, err as Error);
    return applySecurityHeaders(
      NextResponse.json({ error: "Internal server error" }, { status: 500 })
    );
  }
}

export async function POST(req: NextRequest) {
  const start = Date.now();
  try {
    // TODO: Re-enable auth after demo
    // const auth = await requirePermission("identity:write");
    // if (auth instanceof NextResponse) return auth;

    const body = await req.json();
    const parsed = identityRequestSchema.safeParse(body);

    if (!parsed.success) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "Validation failed", issues: parsed.error.format() },
          { status: 400 }
        )
      );
    }

    const { userId, useProb } = parsed.data;

    // Fetch all signals across all users for cross-user matching
    // (In production, this would be scoped to relevant user cohorts)
    const allSignals = await db.identitySignal.findMany({
      take: 10000, // reasonable limit
    });

    const resolutionSignals = allSignals.map((s) => ({
      id: s.id,
      userId: s.userId,
      signalType: s.signalType as any,
      signalValue: s.signalValue,
      channel: s.channel as any,
      firstSeenAt: s.firstSeenAt,
      lastSeenAt: s.lastSeenAt,
      confidence: s.confidence,
    }));

    // Run resolution
    const matches = resolveIdentities(resolutionSignals, useProb);

    // Persist all matches
    for (const match of matches) {
      await db.identityMatch.upsert({
        where: {
          signalAId_signalBId: {
            signalAId: match.signalAId,
            signalBId: match.signalBId,
          },
        },
        create: {
          signalAId: match.signalAId,
          signalBId: match.signalBId,
          matchScore: match.matchScore,
          method: match.method,
          matchedAt: match.matchedAt,
        },
        update: {
          matchScore: match.matchScore,
          method: match.method,
        },
      });
    }

    // Build graph for requested user
    const graph = buildIdentityGraph(userId, resolutionSignals, matches);

    metrics.increment("api_identity_batch_resolutions_total");
    metrics.increment("http_requests_total");
    metrics.observe("http_request_duration_ms", Date.now() - start);

    return applySecurityHeaders(
      NextResponse.json({
        ...graph,
        totalMatchesCreated: matches.length,
      })
    );
  } catch (err) {
    metrics.increment("http_errors_total");
    apiLogger.error("POST /api/identity failed", {}, err as Error);
    return applySecurityHeaders(
      NextResponse.json({ error: "Internal server error" }, { status: 500 })
    );
  }
}
