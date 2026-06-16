// PersonaForge — Synthetic User Behavior Simulator
// Generates 1,000 users and 12,000+ events across 6 hidden persona kinds.
// Uses a seeded PRNG so the entire dashboard is deterministic across reloads.
// ============================================================

import {
  BehaviorEvent,
  PersonaKind,
  PERSONA_KINDS,
  User,
  UserFeatures,
} from "@/lib/types";

// ---------- Seeded PRNG (mulberry32) ----------
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = mulberry32(20240617);
const rand = (min: number, max: number) => min + rng() * (max - min);
const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1));
const pick = <T,>(arr: T[]): T => arr[Math.floor(rng() * arr.length)];
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

// ---------- Persona behavior profiles ----------
interface PersonaProfile {
  priceSensitivity: [number, number];
  brandAffinity: [number, number];
  urgencyResponse: [number, number];
  socialProofResponse: [number, number];
  discountResponse: [number, number];
  reviewReliance: [number, number];
  trendAffinity: [number, number];
  avgSessionLength: [number, number];
  searchesPerSession: [number, number];
  productClicksPerSession: [number, number];
  addToCartRate: [number, number];
  wishlistRate: [number, number];
  scrollDepth: [number, number];
  baseConversionRate: [number, number];
  avgOrderValue: [number, number];
  sessionsPerUser: [number, number];
}

const PROFILES: Record<PersonaKind, PersonaProfile> = {
  price_sensitive: {
    priceSensitivity: [0.85, 0.98],
    brandAffinity: [0.2, 0.4],
    urgencyResponse: [0.45, 0.65],
    socialProofResponse: [0.4, 0.6],
    discountResponse: [0.85, 0.97],
    reviewReliance: [0.7, 0.9],
    trendAffinity: [0.2, 0.4],
    avgSessionLength: [180, 320],
    searchesPerSession: [4, 8],
    productClicksPerSession: [6, 11],
    addToCartRate: [0.18, 0.28],
    wishlistRate: [0.25, 0.4],
    scrollDepth: [0.6, 0.85],
    baseConversionRate: [0.06, 0.12],
    avgOrderValue: [35, 80],
    sessionsPerUser: [6, 12],
  },
  brand_loyal: {
    priceSensitivity: [0.2, 0.4],
    brandAffinity: [0.85, 0.98],
    urgencyResponse: [0.3, 0.5],
    socialProofResponse: [0.35, 0.55],
    discountResponse: [0.3, 0.5],
    reviewReliance: [0.45, 0.65],
    trendAffinity: [0.4, 0.6],
    avgSessionLength: [120, 220],
    searchesPerSession: [1, 3],
    productClicksPerSession: [3, 6],
    addToCartRate: [0.25, 0.4],
    wishlistRate: [0.1, 0.2],
    scrollDepth: [0.45, 0.65],
    baseConversionRate: [0.16, 0.24],
    avgOrderValue: [80, 180],
    sessionsPerUser: [4, 9],
  },
  impulse_buyer: {
    priceSensitivity: [0.4, 0.6],
    brandAffinity: [0.3, 0.5],
    urgencyResponse: [0.85, 0.97],
    socialProofResponse: [0.7, 0.9],
    discountResponse: [0.6, 0.8],
    reviewReliance: [0.2, 0.4],
    trendAffinity: [0.65, 0.85],
    avgSessionLength: [40, 110],
    searchesPerSession: [1, 3],
    productClicksPerSession: [2, 5],
    addToCartRate: [0.4, 0.6],
    wishlistRate: [0.15, 0.3],
    scrollDepth: [0.3, 0.55],
    baseConversionRate: [0.1, 0.18],
    avgOrderValue: [25, 90],
    sessionsPerUser: [3, 7],
  },
  research_oriented: {
    priceSensitivity: [0.55, 0.75],
    brandAffinity: [0.3, 0.5],
    urgencyResponse: [0.2, 0.4],
    socialProofResponse: [0.55, 0.75],
    discountResponse: [0.5, 0.7],
    reviewReliance: [0.88, 0.98],
    trendAffinity: [0.3, 0.5],
    avgSessionLength: [300, 520],
    searchesPerSession: [6, 12],
    productClicksPerSession: [8, 16],
    addToCartRate: [0.1, 0.18],
    wishlistRate: [0.4, 0.55],
    scrollDepth: [0.8, 0.98],
    baseConversionRate: [0.08, 0.14],
    avgOrderValue: [60, 140],
    sessionsPerUser: [8, 14],
  },
  luxury_seeker: {
    priceSensitivity: [0.05, 0.2],
    brandAffinity: [0.75, 0.92],
    urgencyResponse: [0.15, 0.35],
    socialProofResponse: [0.2, 0.4],
    discountResponse: [0.1, 0.25],
    reviewReliance: [0.4, 0.6],
    trendAffinity: [0.55, 0.75],
    avgSessionLength: [160, 280],
    searchesPerSession: [2, 5],
    productClicksPerSession: [4, 9],
    addToCartRate: [0.28, 0.42],
    wishlistRate: [0.18, 0.32],
    scrollDepth: [0.5, 0.75],
    baseConversionRate: [0.2, 0.3],
    avgOrderValue: [220, 600],
    sessionsPerUser: [4, 9],
  },
  trend_follower: {
    priceSensitivity: [0.4, 0.6],
    brandAffinity: [0.5, 0.7],
    urgencyResponse: [0.7, 0.9],
    socialProofResponse: [0.8, 0.95],
    discountResponse: [0.55, 0.75],
    reviewReliance: [0.35, 0.55],
    trendAffinity: [0.88, 0.98],
    avgSessionLength: [100, 200],
    searchesPerSession: [2, 5],
    productClicksPerSession: [4, 9],
    addToCartRate: [0.22, 0.35],
    wishlistRate: [0.25, 0.4],
    scrollDepth: [0.45, 0.7],
    baseConversionRate: [0.12, 0.2],
    avgOrderValue: [40, 120],
    sessionsPerUser: [4, 9],
  },
};

const PRODUCT_POOL = [
  "wireless-headphones",
  "smart-watch",
  "running-shoes",
  "skincare-set",
  "espresso-machine",
  "minimal-wallet",
  "yoga-mat",
  "designer-sunglasses",
  "gaming-keyboard",
  "aromatherapy-diffuser",
  "premium-tea-set",
  "e-reader",
  "standing-desk",
  "vinyl-player",
  "smart-bottle",
  "leather-bag",
];

const SEARCH_POOL = [
  "best headphones under 100",
  "premium coffee machine",
  "trending sneakers 2026",
  "vitamin c serum",
  "minimalist desk setup",
  "wireless gaming gear",
  "luxury gift ideas",
  "eco friendly yoga",
  "smart home gadgets",
  "designer watches sale",
];

const FIRST_NAMES = [
  "Ava", "Liam", "Mia", "Noah", "Zoe", "Ethan", "Aria", "Lucas",
  "Maya", "Kai", "Nora", "Ezra", "Ivy", "Leo", "Sage", "Jude",
  "Wren", "Finn", "Cleo", "Theo", "Juno", "Reed", "Hana", "Mateo",
  "Iris", "Arlo", "Luna", "Owen", "Esme", "Cyrus",
];
const LAST_NAMES = [
  "Chen", "Patel", "Garcia", "Nguyen", "Kim", "Okafor", "Silva", "Haddad",
  "Rossi", "Müller", "Singh", "Tanaka", "Cohen", "Kowalski", "Reyes", "Ali",
  "Ivanov", "Park", "Diallo", "Larsson",
];

function sampleProfile(p: PersonaProfile) {
  const s = <K extends keyof PersonaProfile>(k: K) =>
    rand(p[k][0], p[k][1]);
  return {
    priceSensitivity: s("priceSensitivity"),
    brandAffinity: s("brandAffinity"),
    urgencyResponse: s("urgencyResponse"),
    socialProofResponse: s("socialProofResponse"),
    discountResponse: s("discountResponse"),
    reviewReliance: s("reviewReliance"),
    trendAffinity: s("trendAffinity"),
    avgSessionLength: s("avgSessionLength"),
    searchesPerSession: s("searchesPerSession"),
    productClicksPerSession: s("productClicksPerSession"),
    addToCartRate: s("addToCartRate"),
    wishlistRate: s("wishlistRate"),
    scrollDepth: s("scrollDepth"),
    baseConversionRate: s("baseConversionRate"),
    avgOrderValue: s("avgOrderValue"),
    sessionsPerUser: Math.round(s("sessionsPerUser")),
  };
}

// ---------- Compute aggregate features from raw profile ----------

function buildFeatures(profile: ReturnType<typeof sampleProfile>): UserFeatures {
  return {
    avgSessionLength: profile.avgSessionLength,
    searchCount: profile.searchesPerSession * profile.sessionsPerUser,
    productClicks: profile.productClicksPerSession * profile.sessionsPerUser,
    addToCartCount: Math.round(
      profile.addToCartRate * profile.productClicksPerSession * profile.sessionsPerUser
    ),
    wishlistCount: Math.round(
      profile.wishlistRate * profile.productClicksPerSession * profile.sessionsPerUser
    ),
    scrollDepthAvg: profile.scrollDepth,
    priceSensitivity: profile.priceSensitivity,
    brandAffinity: profile.brandAffinity,
    urgencyResponse: profile.urgencyResponse,
    socialProofResponse: profile.socialProofResponse,
    discountResponse: profile.discountResponse,
    reviewReliance: profile.reviewReliance,
    trendAffinity: profile.trendAffinity,
    embeddingX: 0,
    embeddingY: 0,
  };
}

// Compute 2D embedding from features using a deterministic projection.
// X = price sensitivity (0..1)  → price-driven on right
// Y = urgency + trend response   → impulse-driven on top
function computeEmbedding(f: UserFeatures, persona: PersonaKind) {
  const x = clamp01(f.priceSensitivity * 0.6 + (1 - f.brandAffinity) * 0.4);
  const y = clamp01(
    f.urgencyResponse * 0.4 + f.trendAffinity * 0.3 + (1 - f.reviewReliance) * 0.3
  );
  const jitter = mulberry32(
    persona.charCodeAt(0) * 97 + Math.round(f.priceSensitivity * 1000)
  );
  return {
    embeddingX: clamp01(x + (jitter() - 0.5) * 0.08),
    embeddingY: clamp01(y + (jitter() - 0.5) * 0.08),
  };
}

// ---------- Event generation ----------

function pickEventType(
  features: UserFeatures,
  pos: number,
  total: number,
  willConvert: boolean
): BehaviorEvent["type"] {
  const r = rng();
  const stage = pos / total;

  if (pos === 0) return "page_view";
  if (pos === total - 1) {
    if (willConvert) return "purchase";
    return "exit";
  }

  if (features.reviewReliance > 0.7 && r < 0.25 && stage < 0.7) return "search";

  if (stage < 0.3) {
    if (r < 0.4) return "scroll_depth";
    if (r < 0.7) return "time_on_page";
    if (r < 0.85) return "search";
    return "product_click";
  } else if (stage < 0.7) {
    if (r < 0.4) return "product_click";
    if (r < 0.6) return "scroll_depth";
    if (r < 0.75) return "search";
    if (r < 0.9) return "wishlist";
    return "add_to_cart";
  } else {
    if (r < 0.35) return "add_to_cart";
    if (r < 0.55) return "product_click";
    if (r < 0.75) return "scroll_depth";
    if (r < 0.9) return "time_on_page";
    return "wishlist";
  }
}

function generateEventsForUser(
  user: Pick<User, "id" | "persona" | "features">,
  profile: ReturnType<typeof sampleProfile>,
  startTs: number
): { events: BehaviorEvent[]; converted: boolean; revenue: number; sessions: number } {
  const events: BehaviorEvent[] = [];
  const sessions = profile.sessionsPerUser;
  let eventClock = startTs;
  let converted = false;
  let revenue = 0;

  for (let s = 0; s < sessions; s++) {
    const sessionStart = eventClock + randInt(3600_000, 48 * 3600_000);
    const sessionEvents = randInt(5, 14);
    const sessionEnd = sessionStart + profile.avgSessionLength * 1000;
    let depth = 0;
    let willConvert = false;

    if (s >= Math.floor(sessions * 0.5)) {
      const convProb =
        profile.baseConversionRate *
        (1 + user.features.discountResponse * 0.4 + user.features.urgencyResponse * 0.2);
      willConvert = rng() < convProb;
    }

    for (let e = 0; e < sessionEvents; e++) {
      depth += 1;
      const ts = sessionStart + (e / sessionEvents) * (sessionEnd - sessionStart);
      const eventType = pickEventType(user.features, e, sessionEvents, willConvert);
      const ev: BehaviorEvent = {
        id: `evt_${user.id}_${s}_${e}`,
        userId: user.id,
        type: eventType,
        timestamp: Math.round(ts),
        pageDepth: depth,
      };

      switch (eventType) {
        case "search":
          ev.query = pick(SEARCH_POOL);
          break;
        case "product_click":
          ev.productId = pick(PRODUCT_POOL);
          ev.price = Math.round(rand(15, 500));
          break;
        case "scroll_depth":
          ev.scrollPct = Math.round(
            rand(profile.scrollDepth * 70, profile.scrollDepth * 100)
          );
          break;
        case "time_on_page":
          ev.dwellSec = Math.round(rand(20, profile.avgSessionLength));
          break;
        case "add_to_cart":
          ev.productId = pick(PRODUCT_POOL);
          ev.price = Math.round(rand(15, 500));
          if (rng() < user.features.discountResponse) ev.discountSeen = true;
          if (rng() < user.features.socialProofResponse) ev.socialProofSeen = true;
          if (rng() < user.features.urgencyResponse) ev.urgencySeen = true;
          break;
        case "wishlist":
          ev.productId = pick(PRODUCT_POOL);
          break;
        case "purchase":
          ev.productId = pick(PRODUCT_POOL);
          ev.price = Math.round(
            rand(profile.avgOrderValue * 0.7, profile.avgOrderValue * 1.3)
          );
          if (rng() < user.features.discountResponse) ev.discountSeen = true;
          if (rng() < user.features.socialProofResponse) ev.socialProofSeen = true;
          if (rng() < user.features.reviewReliance) ev.reviewSeen = true;
          if (rng() < user.features.urgencyResponse) ev.urgencySeen = true;
          break;
      }
      events.push(ev);
    }

    if (willConvert) {
      const purchaseTs = sessionEnd - rand(5_000, 60_000);
      events.push({
        id: `evt_${user.id}_${s}_purchase_final`,
        userId: user.id,
        type: "purchase",
        timestamp: Math.round(purchaseTs),
        pageDepth: depth + 1,
        productId: pick(PRODUCT_POOL),
        price: Math.round(
          rand(profile.avgOrderValue * 0.7, profile.avgOrderValue * 1.3)
        ),
        discountSeen: rng() < user.features.discountResponse,
        socialProofSeen: rng() < user.features.socialProofResponse,
        reviewSeen: rng() < user.features.reviewReliance,
        urgencySeen: rng() < user.features.urgencyResponse,
      });
      revenue += events[events.length - 1].price ?? 0;
      converted = true;
    }

    eventClock = sessionEnd;
  }

  events.sort((a, b) => a.timestamp - b.timestamp);
  return { events, converted, revenue, sessions };
}

// ---------- Public API ----------

export interface Dataset {
  users: User[];
  events: BehaviorEvent[];
  productCatalog: { id: string; name: string; price: number; category: string }[];
  generatedAt: number;
}

let cached: Dataset | null = null;

export function generateDataset(userCount = 1000): Dataset {
  if (cached) return cached;

  const users: User[] = [];
  const allEvents: BehaviorEvent[] = [];
  const productCatalog = PRODUCT_POOL.map((id, i) => ({
    id,
    name: id
      .split("-")
      .map((w) => w[0].toUpperCase() + w.slice(1))
      .join(" "),
    price: Math.round(20 + ((i * 37) % 480)),
    category: ["Electronics", "Apparel", "Home", "Beauty", "Lifestyle"][i % 5],
  }));

  const baseTime = Date.now() - 30 * 24 * 3600_000;

  for (let i = 0; i < userCount; i++) {
    const persona = PERSONA_KINDS[i % PERSONA_KINDS.length];
    const profile = sampleProfile(PROFILES[persona]);
    profile.baseConversionRate = clamp01(
      profile.baseConversionRate + (rng() - 0.5) * 0.04
    );

    const userId = `u_${(1000 + i).toString(36)}`;
    const user: User = {
      id: userId,
      name: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
      email: `${userId}@personaforge.dev`,
      persona,
      createdAt: baseTime - randInt(0, 60 * 24 * 3600_000),
      features: buildFeatures(profile),
      events: [],
      converted: false,
      revenue: 0,
      sessions: profile.sessionsPerUser,
    };
    const emb = computeEmbedding(user.features, persona);
    user.features.embeddingX = emb.embeddingX;
    user.features.embeddingY = emb.embeddingY;

    const { events, converted, revenue, sessions } = generateEventsForUser(
      user,
      profile,
      baseTime
    );
    user.events = events;
    user.converted = converted;
    user.revenue = revenue;
    user.sessions = sessions;
    users.push(user);
    allEvents.push(...events);
  }

  for (let i = users.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [users[i], users[j]] = [users[j], users[i]];
  }

  cached = {
    users,
    events: allEvents,
    productCatalog,
    generatedAt: Date.now(),
  };
  return cached;
}

export function datasetStats(ds: Dataset) {
  const total = ds.users.length;
  const converted = ds.users.filter((u) => u.converted).length;
  const conversionRate = converted / total;
  const revenue = ds.users.reduce((s, u) => s + u.revenue, 0);
  const events = ds.events.length;
  const sessions = ds.users.reduce((s, u) => s + u.sessions, 0);
  return { total, converted, conversionRate, revenue, events, sessions };
}
