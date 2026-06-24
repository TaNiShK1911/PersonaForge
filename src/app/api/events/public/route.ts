// ============================================================
// /api/events/public — Public Event Ingestion (no auth)
// ============================================================
// Accepts anonymous/semi-anonymous demo user events from the
// Bazaar demo store. Creates/updates users and enqueues events
// for async processing.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pipeline } from "@/lib/pipeline/queue";
import { metrics } from "@/lib/monitoring/metrics";
import { apiLogger } from "@/lib/monitoring/logger";

export const dynamic = "force-dynamic";

// Validate demo store origin
function validateOrigin(req: NextRequest): boolean {
  const allowedOrigin = process.env.DEMO_STORE_ORIGIN;
  if (!allowedOrigin) return true; // Allow all in dev
  const origin = req.headers.get("origin") ?? req.headers.get("referer") ?? "";
  return origin.startsWith(allowedOrigin) || process.env.NODE_ENV !== "production";
}

// Validate API key
function validateApiKey(req: NextRequest): boolean {
  const expectedKey = process.env.DEMO_STORE_API_KEY;
  if (!expectedKey) return true; // No key configured = open in dev
  const providedKey =
    req.headers.get("x-api-key") ??
    req.headers.get("authorization")?.replace("Bearer ", "");
  return providedKey === expectedKey;
}

export async function POST(req: NextRequest) {
  const start = Date.now();

  try {
    // Light validation (public endpoint, but still verify origin + key)
    if (!validateOrigin(req) || !validateApiKey(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // Validate required fields
    const { userId, type, timestamp, properties } = body;
    if (!userId || !type) {
      return NextResponse.json(
        { error: "Missing required fields: userId, type" },
        { status: 400 }
      );
    }

    // Ensure user exists (create if anonymous demo user)
    let user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      // Auto-create demo user
      user = await db.user.create({
        data: {
          id: userId,
          name: body.userName ?? `Demo User ${userId.slice(0, 6)}`,
          email: body.userEmail ?? null,
          personaKind: null,
          features: JSON.stringify({
            avgSessionLength: 0,
            searchCount: 0,
            productClicks: 0,
            addToCartCount: 0,
            wishlistCount: 0,
            scrollDepthAvg: 0,
            priceSensitivity: 0.5,
            brandAffinity: 0.5,
            urgencyResponse: 0.5,
            socialProofResponse: 0.5,
            discountResponse: 0.5,
            reviewReliance: 0.5,
            trendAffinity: 0.5,
            embeddingX: Math.random(),
            embeddingY: Math.random(),
          }),
          converted: false,
          revenue: 0,
          sessions: 0,
          consentLevel: "full",
        },
      });
    }

    // Persist the event
    const event = await db.event.create({
      data: {
        userId: user.id,
        type,
        timestamp: BigInt(timestamp ?? Date.now()),
        pageDepth: body.pageDepth ?? 0,
        productId: body.productId ?? null,
        query: body.query ?? null,
        scrollPct: body.scrollPct ?? null,
        dwellSec: body.dwellSec ?? null,
        price: body.price ?? null,
        discountSeen: body.discountSeen ?? false,
        socialProofSeen: body.socialProofSeen ?? false,
        reviewSeen: body.reviewSeen ?? false,
        urgencySeen: body.urgencySeen ?? false,
        properties: properties ? JSON.stringify(properties) : null,
      },
    });

    // Update user features incrementally
    await updateUserFeatures(user.id, type, body);

    // Enqueue for background processing
    try {
      await pipeline.enqueue("ingest-event", {
        userId: user.id,
        type,
        eventId: event.id,
        ...body,
      });
    } catch {
      // Non-fatal: event is already persisted
    }

    // Trigger persona refresh if enough events
    try {
      await pipeline.enqueue("update-persona", { userId: user.id });
    } catch {
      // Non-fatal
    }

    metrics.increment("public_events_total");
    metrics.observe("http_request_duration_ms", Date.now() - start);

    return NextResponse.json(
      {
        accepted: true,
        eventId: event.id,
        userId: user.id,
        personaKind: user.personaKind,
      },
      {
        status: 202,
        headers: {
          "Access-Control-Allow-Origin": process.env.DEMO_STORE_ORIGIN ?? "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, x-api-key, Authorization",
        },
      }
    );
  } catch (err) {
    metrics.increment("http_errors_total");
    apiLogger.error("POST /api/events/public failed", {}, err as Error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": process.env.DEMO_STORE_ORIGIN ?? "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-api-key, Authorization",
    },
  });
}

/**
 * Incrementally update user behavioral features based on new events.
 */
async function updateUserFeatures(
  userId: string,
  eventType: string,
  eventData: Record<string, unknown>
): Promise<void> {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return;

  const features = typeof user.features === "string"
    ? JSON.parse(user.features)
    : user.features;

  // Update features based on event type
  switch (eventType) {
    case "page_view":
      features.productClicks = (features.productClicks ?? 0) + 1;
      break;
    case "search":
      features.searchCount = (features.searchCount ?? 0) + 1;
      break;
    case "add_to_cart":
      features.addToCartCount = (features.addToCartCount ?? 0) + 1;
      break;
    case "purchase":
      // Mark as converted
      await db.user.update({
        where: { id: userId },
        data: {
          converted: true,
          revenue: { increment: (eventData.price as number) ?? 0 },
        },
      });
      break;
    case "scroll_depth":
      features.scrollDepthAvg =
        (features.scrollDepthAvg + (eventData.scrollPct ?? 0)) / 2;
      break;
  }

  // Update sessions
  await db.user.update({
    where: { id: userId },
    data: {
      features: JSON.stringify(features),
      sessions: { increment: eventType === "page_view" ? 1 : 0 },
    },
  });
}
