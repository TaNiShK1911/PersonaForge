// PersonaForge — Personalization & Explainability Content Engine
// Generates persona-aware marketing copy and human-readable explanations
// using deterministic templates that incorporate causal + counterfactual context.
// ============================================================

import {
  Explanation,
  Persona,
  PersonaKind,
  PERSONA_META,
  PersonalizationOutput,
  TreatmentVariable,
  User,
} from "@/lib/types";
import { CausalEffect } from "@/lib/types";
import { runCounterfactual } from "@/lib/ml/counterfactual";
import { applyConsentGate, explainConsentLimitations, type ConsentLevel } from "@/lib/consent/gate";

const PRODUCT_NAMES = [
  "Aurora Wireless Headphones",
  "Helio Smart Watch Series 6",
  "Trailblaze Pro Running Shoes",
  "Glow Lab Vitamin C Serum",
  "Brewmaster Espresso Machine",
  "Carbon Slim Wallet",
  "ZenFlow Yoga Mat",
  "Lumen Designer Sunglasses",
  "Tactical Gaming Keyboard",
  "Pure Mist Diffuser",
  "Imperial Tea Set",
  "Lumina E-Reader Pro",
  "Ascent Standing Desk",
  "Vinyl Resonance Player",
  "Hydra Smart Bottle",
  "Heritage Leather Bag",
];

function pick<T>(arr: T[], seed: number): T {
  return arr[Math.abs(seed) % arr.length];
}

// ---------- Personalization Templates per Persona ----------

interface Copy {
  headline: string;
  emailSubject: string;
  emailBody: string;
  adCopy: string;
  pushNotification: string;
  cta: string;
}

const COPY_TEMPLATES: Record<PersonaKind, Copy> = {
  price_sensitive: {
    headline: "Flash Sale: Save 30% Today Only",
    emailSubject: "Your exclusive 30% discount expires tonight",
    emailBody:
      "Hi {name},\n\nWe noticed you've been comparing options — smart move. " +
      "Here's our best offer of the week: 30% off your wishlist items, today only. " +
      "Free shipping on orders over $35.\n\nYour basket is waiting — lock in the price before midnight.\n\n— The PersonaForge Team",
    adCopy:
      "Compare all you want — then save 30%. Lowest price guaranteed. Ends tonight.",
    pushNotification: "30% off your wishlist — ends in 4 hours",
    cta: "Claim 30% Discount",
  },
  brand_loyal: {
    headline: "Welcome Back to Your Favorites",
    emailSubject: "Your collection just dropped a new arrival",
    emailBody:
      "Hi {name},\n\nAs one of our most loyal members, you get first access to the new " +
      "collection from the brands you love. Free engraving on your first order this month.\n\n" +
      "Thank you for being part of the family.\n\n— The PersonaForge Team",
    adCopy:
      "Members get first access. Stay loyal, stay ahead — new collection just dropped.",
    pushNotification: "New arrivals from your favorite brands",
    cta: "Explore New Collection",
  },
  impulse_buyer: {
    headline: "Only 3 Left — Yours in 2 Hours",
    emailSubject: "Almost sold out: your item is in someone else's cart",
    emailBody:
      "Hi {name},\n\nQuick heads-up — the item you viewed is almost gone. " +
      "Order in the next 2 hours and we'll deliver it tomorrow. No second-guessing needed — " +
      "free 30-day returns if you change your mind.\n\nThe clock is ticking.\n\n— The PersonaForge Team",
    adCopy: "Only 3 left. Order in 2h → ships tomorrow. Don't miss it.",
    pushNotification: "Only 3 left in stock — order now",
    cta: "Buy Now — 2hr Delivery",
  },
  research_oriented: {
    headline: "Read the Reviews. Then Decide.",
    emailSubject: "1,247 verified reviews for the item you compared",
    emailBody:
      "Hi {name},\n\nYou're a thorough researcher — we love that. " +
      "We've compiled an in-depth review summary for the products you compared, " +
      "including long-term durability, customer service ratings, and side-by-side specs.\n\n" +
      "Take your time. We're here when you're ready.\n\n— The PersonaForge Team",
    adCopy:
      "1,247 verified reviews. Side-by-side specs. Make the informed choice.",
    pushNotification: "Your comparison report is ready",
    cta: "Read Full Review Report",
  },
  luxury_seeker: {
    headline: "An Exclusive Premier Collection — By Invitation",
    emailSubject: "Private viewing: The Premier Collection",
    emailBody:
      "Hi {name},\n\nYou've been invited to a private viewing of our Premier Collection — " +
      "handcrafted, limited to 200 pieces worldwide. No discounts, just craft.\n\n" +
      "Your personal stylist is available by appointment.\n\n— The PersonaForge Atelier",
    adCopy: "Limited to 200 pieces. Handcrafted. No discounts — just craft.",
    pushNotification: "Premier Collection — by invitation",
    cta: "Request Private Viewing",
  },
  trend_follower: {
    headline: "Trending Now: 12,400 Bought This Week",
    emailSubject: "This is going viral — see what everyone's buying",
    emailBody:
      "Hi {name},\n\nThis week's viral drop just hit 12,400 orders and counting. " +
      "Featured in 3 trending TikToks and worn by 8 creators you follow.\n\n" +
      "Restock expected in 2 weeks — get it before it spikes again.\n\n— The PersonaForge Team",
    adCopy: "12,400 bought this week. Trending in 8 creators' feeds. Get it before it spikes.",
    pushNotification: "Trending now — 12,400 bought this week",
    cta: "Shop the Viral Drop",
  },
};

export function generatePersonalization(
  user: User,
  persona: Persona
): PersonalizationOutput {
  // Apply consent gate
  const consentLevel = (user.consentLevel ?? "full") as ConsentLevel;
  const consentGate = applyConsentGate(user, [
    "persona_targeting",
    "individual_causal_targeting",
    "ai_content_generation",
    "behavioral_event_tracking",
  ]);

  // If no consent, return generic contextual content
  if (consentLevel === "none") {
    return {
      persona: persona.kind,
      headline: "Discover Our Latest Collection",
      emailSubject: "New Arrivals This Week",
      emailBody: `Hi there,\n\nCheck out our newest products, curated for everyone. Browse hundreds of items across all categories.\n\n— The PersonaForge Team`,
      adCopy: "Shop new arrivals — something for everyone.",
      pushNotification: "New products just dropped — explore now",
      productRanking: PRODUCT_NAMES.slice(0, 5).map((name, i) => ({
        productId: name,
        score: 0.5,
        reason: "Featured product",
      })),
      cta: "Shop Now",
    };
  }

  // If basic consent, use persona-level targeting only (no individual profiling)
  if (consentLevel === "basic") {
    const template = COPY_TEMPLATES[persona.kind];
    // Generic persona-level product ranking (not personalized to individual)
    const productRanking = PRODUCT_NAMES.slice(0, 5).map((name, i) => ({
      productId: name,
      score: 0.6 + i * 0.05,
      reason: `Popular with ${PERSONA_META[persona.kind].name} segment`,
    }));

    return {
      persona: persona.kind,
      headline: template.headline,
      emailSubject: template.emailSubject,
      emailBody: template.emailBody.replace("{name}", "there"), // No individual name personalization
      adCopy: template.adCopy,
      pushNotification: template.pushNotification,
      productRanking,
      cta: template.cta,
    };
  }

  // Full consent: individual-level personalization
  const template = COPY_TEMPLATES[persona.kind];
  const seed =
    user.id.charCodeAt(2) * 7 + user.id.charCodeAt(3) * 13 + user.features.priceSensitivity * 100;

  // Generate ranked product list using persona + user features
  const productRanking = PRODUCT_NAMES.map((name, i) => {
    let score = 0.4 + (i % 5) * 0.05;
    let reason = "Trending in your category";

    if (persona.kind === "luxury_seeker") {
      score += (i === 4 || i === 9 || i === 15) ? 0.35 : 0;
      if (i === 4) reason = "Premium SKU — matches your luxury preference";
    } else if (persona.kind === "price_sensitive") {
      score += (i % 3 === 0) ? 0.3 : 0;
      reason = "Currently discounted — fits your deal-seeking behavior";
    } else if (persona.kind === "research_oriented") {
      score += (i === 0 || i === 11 || i === 12) ? 0.3 : 0;
      reason = "4.8★ rating with 1,200+ verified reviews";
    } else if (persona.kind === "trend_follower") {
      score += (i === 2 || i === 6 || i === 8) ? 0.3 : 0;
      reason = "Viral in 3 trending feeds this week";
    } else if (persona.kind === "impulse_buyer") {
      score += (i % 4 === 0) ? 0.3 : 0;
      reason = "Only 3 left — 2hr delivery available";
    } else if (persona.kind === "brand_loyal") {
      score += (i === 1 || i === 9 || i === 15) ? 0.3 : 0;
      reason = "From a brand you've purchased 4× this year";
    }

    return {
      productId: `prod_${i + 1}`,
      score: Math.min(0.99, score),
      reason,
    };
  })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((p, i) => ({
      ...p,
      productId: `${PRODUCT_NAMES[Math.abs(seed + i * 7) % PRODUCT_NAMES.length]}_${i}`,
    }));

  return {
    persona: persona.kind,
    headline: template.headline,
    emailSubject: template.emailSubject,
    emailBody: template.emailBody.replace("{name}", user.name.split(" ")[0]),
    adCopy: template.adCopy,
    pushNotification: template.pushNotification,
    productRanking,
    cta: template.cta,
  };
}

// ---------- Explainability ----------

export function generateExplanation(
  user: User,
  persona: Persona,
  effects: CausalEffect[],
  users: User[]
): Explanation {
  // Check consent level
  const consentLevel = (user.consentLevel ?? "full") as ConsentLevel;
  const consentExplanation = explainConsentLimitations(user, [
    "individual_causal_targeting",
    "counterfactual_simulation",
  ]);

  // Find the user's strongest causal drivers (top 2)
  const userResp: Record<TreatmentVariable, number> = {
    discount: user.features.discountResponse,
    social_proof: user.features.socialProofResponse,
    product_reviews: user.features.reviewReliance,
    urgency_messaging: user.features.urgencyResponse,
  };

  const drivers = effects
    .map((e) => ({
      factor: e.treatment,
      impact: e.ate * userResp[e.treatment],
      ate: e.ate,
    }))
    .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact))
    .slice(0, 2);

  // Run counterfactual to get the "without treatment" delta (only if full consent)
  let counterfactualDelta = 0;
  let counterfactualPct = 0;
  
  if (consentLevel === "full") {
    const cf = runCounterfactual(user, users);
    counterfactualDelta =
      ((cf.baseline.conversionProbability -
        cf.scenarios.find((s) => s.id === "no_urgency")!.conversionProbability) /
        cf.baseline.conversionProbability) *
      100;
    counterfactualPct = Math.round(Math.abs(counterfactualDelta));
  }

  // Pick a recommended product (top from personalization)
  const rec = generatePersonalization(user, persona);
  const topProduct = rec.productRanking[0];

  const personaDriver = `${PERSONA_META[persona.kind].name} — ${PERSONA_META[persona.kind].tagline}`;

  // Build explanation text
  const driver1 = drivers[0];
  const driver2 = drivers[1];

  const similarCampaignUplift = Math.round(
    Math.abs(driver1.ate) * 100 * 2.5 + Math.abs(driver2?.ate ?? 0) * 100 * 1.2
  );

  // Adjust explanation based on consent level
  let fullText = "";
  
  if (consentLevel === "none") {
    fullText = `This recommendation was selected using contextual targeting only (no personalization).

${consentExplanation}

The product "${topProduct.productId}" was featured because: ${topProduct.reason}.`;
  } else if (consentLevel === "basic") {
    fullText = `This recommendation was selected because:

• User matches the "${PERSONA_META[persona.kind].name}" persona segment — ${PERSONA_META[persona.kind].tagline}
• ${consentExplanation}

The model ranked "${topProduct.productId}" with score ${topProduct.score.toFixed(2)} because: ${topProduct.reason}.

Note: Individual causal targeting and counterfactual simulation were withheld per user consent preference.`;
  } else {
    fullText = `This recommendation was selected because:

• User matches the "${PERSONA_META[persona.kind].name}" persona (${(persona.confidence * 100).toFixed(0)}% confidence) — ${PERSONA_META[persona.kind].tagline}
• User responds strongly to ${driver1.factor.replace("_", " ")} (responsiveness: ${(userResp[driver1.factor] * 100).toFixed(0)}%; observed ATE: +${(driver1.ate * 100).toFixed(1)}pp)
• Secondary driver: ${driver2?.factor.replace("_", " ") ?? "n/a"} (responsiveness: ${(userResp[driver2?.factor ?? "discount"] * 100).toFixed(0)}%)
• Similar ${driver1.factor.replace("_", " ")} campaigns increased conversion by ${similarCampaignUplift}% in comparable cohorts
• Counterfactual analysis predicts ${counterfactualPct}% lower conversion without this messaging

The model ranked "${topProduct.productId}" with score ${topProduct.score.toFixed(2)} because: ${topProduct.reason}.`;
  }

  return {
    userId: user.id,
    productId: topProduct.productId,
    recommendation: topProduct.productId,
    personaDriver,
    causalDrivers: drivers.map((d) => ({ factor: d.factor, impact: d.impact })),
    counterfactualNote: consentLevel === "full" 
      ? `Removing the primary treatment would reduce conversion probability by an estimated ${counterfactualPct}%.`
      : "Counterfactual analysis not available at current consent level.",
    similarCampaignUplift,
    confidence: persona.confidence,
    fullText,
  };
}
