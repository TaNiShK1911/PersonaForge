// ============================================================
// PersonaForge — Content Generator Agent
// ============================================================
// Generates persona-specific campaign content: email copy,
// ad copy, push copy, and headline variants.
// ============================================================

import { BaseAgent } from "./base-agent";
import { AgentState } from "./types";
import { PERSONA_META, PersonaKind } from "@/lib/types";

const CONTENT_TEMPLATES: Record<string, {
  headline: string;
  emailSubject: string;
  emailBody: string;
  adCopy: string;
  pushNotification: string;
  cta: string;
}> = {
  price_sensitive: {
    headline: "🏷️ Exclusive Deal: Save Up to 40% Today",
    emailSubject: "Your personalized savings are waiting — 40% off select items",
    emailBody: "We analyzed your browsing patterns and found the best deals for you. These prices won't last — your personalized discount expires at midnight.\n\nTop picks at the lowest prices this quarter. Free shipping on all orders over $25.",
    adCopy: "Smart shoppers save 40%. Compare prices, then lock in the deal. Limited time only.",
    pushNotification: "💰 Your personalized deal: 40% off — expires tonight",
    cta: "Unlock My Savings",
  },
  brand_loyal: {
    headline: "💖 Welcome Back — New From Your Favorites",
    emailSubject: "First access: New collection from the brands you love",
    emailBody: "As a valued member, you're getting first access to this season's collection from your most-purchased brands. Plus, enjoy complimentary gift wrapping on your next order.",
    adCopy: "Loyalty rewarded. First access to new arrivals from your favorite brands.",
    pushNotification: "💖 New arrivals from brands you love — first access",
    cta: "Shop My Favorites",
  },
  impulse_buyer: {
    headline: "⚡ Almost Gone — Only 3 Left in Stock",
    emailSubject: "⚡ Someone else is looking at your item — act now",
    emailBody: "Quick update: the item you viewed has only 3 left. Order in the next hour and get next-day delivery. We've made checkout instant — just tap below.\n\nFree returns within 30 days, no questions asked.",
    adCopy: "Only 3 left. 1-tap checkout. Delivered tomorrow. Don't miss it.",
    pushNotification: "⚡ Only 3 left — order now for tomorrow delivery",
    cta: "Buy Now — Instant Checkout",
  },
  research_oriented: {
    headline: "🔍 Your Comparison Report Is Ready",
    emailSubject: "In-depth analysis: the product you've been researching",
    emailBody: "We've compiled everything you need to make an informed decision. Inside: 2,400+ verified reviews, detailed spec comparisons, durability tests, and expert ratings.\n\nTake your time — this report is saved to your dashboard.",
    adCopy: "2,400 reviews. Side-by-side specs. Expert ratings. Make the informed choice.",
    pushNotification: "🔍 Your product comparison report is ready",
    cta: "Read Full Analysis",
  },
  luxury_seeker: {
    headline: "💎 By Invitation: The Artisan Collection",
    emailSubject: "Private invitation: Access the Artisan Collection",
    emailBody: "You've been selected for an exclusive preview of our Artisan Collection — hand-selected pieces limited to 150 worldwide. Each item includes a certificate of authenticity.\n\nYour personal curator is available for a private consultation.",
    adCopy: "Limited to 150 pieces. Handcrafted. Certificate of authenticity included.",
    pushNotification: "💎 Exclusive invitation — Artisan Collection preview",
    cta: "Request Private Preview",
  },
  trend_follower: {
    headline: "📈 Trending: 18,000+ Sold This Week",
    emailSubject: "This is going viral — 18,000 ordered this week alone",
    emailBody: "This week's breakout product just hit 18,000 orders. Featured by 12 trending creators and climbing fast. Get it before the next restock delay.\n\nShare your purchase for a chance to be featured on our trending wall.",
    adCopy: "18K sold this week. 12 creator features. The item everyone's talking about.",
    pushNotification: "📈 Going viral: 18K+ sold this week",
    cta: "Get the Trending Drop",
  },
};

export class ContentGeneratorAgent extends BaseAgent {
  readonly name = "ContentGeneratorAgent";
  readonly description = "Generates persona-specific campaign content across channels";

  protected async execute(state: AgentState): Promise<AgentState> {
    const personaKind = state.personaKind ?? "price_sensitive";
    const template = CONTENT_TEMPLATES[personaKind] ?? CONTENT_TEMPLATES.price_sensitive;

    state.generatedContent = {
      headline: template.headline,
      emailSubject: template.emailSubject,
      emailBody: template.emailBody,
      adCopy: template.adCopy,
      pushNotification: template.pushNotification,
      cta: template.cta,
    };

    return state;
  }

  protected summarizeOutput(state: AgentState): string {
    return `Generated content for ${state.personaKind ?? "unknown"}: "${state.generatedContent?.headline ?? ""}"`;
  }
}
