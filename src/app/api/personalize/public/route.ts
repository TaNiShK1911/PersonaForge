// ============================================================
// /api/personalize/public — Public Personalization (no auth)
// ============================================================
// Returns persona-specific content for the Bazaar demo store.
// Fast response for homepage and product page personalization.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { PERSONA_META } from "@/lib/types";
import { metrics } from "@/lib/monitoring/metrics";
import { apiLogger } from "@/lib/monitoring/logger";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const start = Date.now();

  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "Missing required query param: userId" },
        { status: 400 }
      );
    }

    // Fetch user with persona
    const user = await db.user.findUnique({
      where: { id: userId },
      include: { persona: true },
    });

    if (!user) {
      // Return generic personalization for unknown users
      return cors(
        NextResponse.json({
          personaKind: null,
          personaLabel: "New Visitor",
          headline: "Welcome — Discover Something You'll Love",
          cta: "Start Exploring",
          summary: "Personalized recommendations will appear as we learn your preferences.",
          variant: null,
        })
      );
    }

    const personaKind = user.personaKind ?? "price_sensitive";
    const meta = PERSONA_META[personaKind as keyof typeof PERSONA_META];

    // Generate persona-specific personalization
    const personalization = getPersonalization(personaKind, user.name ?? "there");

    metrics.increment("public_personalizations_total");
    metrics.observe("http_request_duration_ms", Date.now() - start);

    return cors(
      NextResponse.json({
        personaKind,
        personaLabel: meta?.name ?? personaKind,
        headline: personalization.headline,
        cta: personalization.cta,
        summary: personalization.summary,
        variant: personalization.variant,
        emoji: meta?.emoji ?? "🎯",
        confidence: user.persona?.confidence ?? 0.5,
      })
    );
  } catch (err) {
    metrics.increment("http_errors_total");
    apiLogger.error("GET /api/personalize/public failed", {}, err as Error);
    return cors(
      NextResponse.json({ error: "Internal server error" }, { status: 500 })
    );
  }
}

// Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": process.env.DEMO_STORE_ORIGIN ?? "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-api-key, x-personaforge-key, Authorization",
    },
  });
}

function cors(response: NextResponse): NextResponse {
  response.headers.set(
    "Access-Control-Allow-Origin",
    process.env.DEMO_STORE_ORIGIN ?? "*"
  );
  return response;
}

function getPersonalization(
  personaKind: string,
  userName: string
): {
  headline: string;
  cta: string;
  summary: string;
  variant: string;
} {
  const personalizations: Record<string, { headline: string; cta: string; summary: string; variant: string }> = {
    price_sensitive: {
      headline: `Hey ${userName}, Flash Sale: Save Up to 40% Today`,
      cta: "Claim My Discount",
      summary: "We found the best deals matching your browsing style. Prices drop at midnight.",
      variant: "discount_hero",
    },
    brand_loyal: {
      headline: `Welcome back, ${userName} — New From Your Favorites`,
      cta: "Explore New Arrivals",
      summary: "First access to the latest from brands you love. Members-only early release.",
      variant: "loyalty_hero",
    },
    impulse_buyer: {
      headline: `${userName}, Only 3 Left — Ships in 2 Hours`,
      cta: "Buy Now — Instant Checkout",
      summary: "The item you viewed is almost gone. One-tap checkout, delivered tomorrow.",
      variant: "urgency_hero",
    },
    research_oriented: {
      headline: `${userName}, Your Comparison Report Is Ready`,
      cta: "Read Full Analysis",
      summary: "We compiled 2,400+ verified reviews and detailed specs for your shortlist.",
      variant: "research_hero",
    },
    luxury_seeker: {
      headline: `${userName}, By Invitation: The Artisan Collection`,
      cta: "Request Private Preview",
      summary: "Hand-selected pieces, limited to 150 worldwide. Complimentary curator consultation.",
      variant: "luxury_hero",
    },
    trend_follower: {
      headline: `${userName}, Trending Now: 18K+ Bought This Week`,
      cta: "Get the Viral Drop",
      summary: "This week's breakout product — featured by 12 trending creators.",
      variant: "trending_hero",
    },
  };

  return personalizations[personaKind] ?? personalizations.price_sensitive;
}
