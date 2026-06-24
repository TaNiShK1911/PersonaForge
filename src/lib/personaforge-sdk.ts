/**
 * PersonaForge SDK — browser-only.
 *
 * Generates a stable anonymous user id in localStorage, batches events to
 * POST {url}/api/events/public with the x-personaforge-key header, and fetches
 * personalization snapshots from GET {url}/api/personalize/public?userId=...
 *
 * When config is missing (no URL/key) it no-ops gracefully so the UI still works.
 */

export type PersonaforgeEvent =
  | "page_view"
  | "category_browse"
  | "search"
  | "product_view"
  | "add_to_cart"
  | "remove_from_cart"
  | "wishlist_add"
  | "checkout_start"
  | "purchase"
  | "review_view"
  | "scroll";

export type Personalization = {
  persona?: string;
  tagline?: string;
  headline?: string;
  ctaText?: string;
  ctaHref?: string;
  recommended_product_ids?: string[];
  [k: string]: unknown;
};

type Config = { url: string | null; key: string | null };

const USER_ID_KEY = "bazaar:user_id";
const QUEUE_KEY = "bazaar:pf_queue";

let config: Config = { url: null, key: null };
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let initialized = false;

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "u_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function getUserId(): string {
  if (typeof window === "undefined") return "ssr";
  let id = localStorage.getItem(USER_ID_KEY);
  if (!id) {
    id = uuid();
    localStorage.setItem(USER_ID_KEY, id);
  }
  return id;
}

export function configurePersonaforge(cfg: Config) {
  config = cfg;
  if (typeof window === "undefined") return;
  if (!initialized) {
    initialized = true;
    window.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") flushNow();
    });
    // Replay any queued events from a previous tab.
    scheduleFlush(50);
  }
}

export function isConfigured() {
  return !!(config.url && config.key);
}

function loadQueue(): Array<Record<string, unknown>> {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveQueue(q: Array<Record<string, unknown>>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q.slice(-200)));
}

function scheduleFlush(delay = 400) {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(flushNow, delay);
}

async function flushNow() {
  if (typeof window === "undefined") return;
  flushTimer = null;
  if (!isConfigured()) return;
  const queue = loadQueue();
  if (!queue.length) return;
  saveQueue([]);
  try {
    await fetch(`${config.url}/api/events/public`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-personaforge-key": config.key!,
      },
      body: JSON.stringify({ events: queue }),
      keepalive: true,
    });
  } catch (e) {
    // restore on failure
    const current = loadQueue();
    saveQueue([...queue, ...current]);
    console.warn("[personaforge] flush failed", e);
  }
}

export function track(event: PersonaforgeEvent, payload: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  const userId = getUserId();
  const entry = {
    userId,
    event,
    payload,
    ts: Date.now(),
    url: window.location.pathname + window.location.search,
    referrer: document.referrer || undefined,
  };
  if (!isConfigured()) {
    if (typeof console !== "undefined") console.debug("[personaforge:noop]", event, payload);
    return;
  }
  const q = loadQueue();
  q.push(entry);
  saveQueue(q);
  scheduleFlush();
}

export async function fetchPersonalization(): Promise<Personalization | null> {
  if (typeof window === "undefined") return null;
  if (!isConfigured()) return null;
  const userId = getUserId();
  try {
    const res = await fetch(
      `${config.url}/api/personalize/public?userId=${encodeURIComponent(userId)}`,
      { headers: { "x-personaforge-key": config.key! } },
    );
    if (!res.ok) return null;
    return (await res.json()) as Personalization;
  } catch (e) {
    console.warn("[personaforge] personalize failed", e);
    return null;
  }
}

/* ----- scroll tracking helper ----- */
export function initScrollTracking() {
  if (typeof window === "undefined") return () => {};
  const buckets = new Set<number>();
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const pct = max > 0 ? Math.round((window.scrollY / max) * 100) : 0;
      const bucket = Math.floor(pct / 25) * 25;
      if (bucket > 0 && !buckets.has(bucket)) {
        buckets.add(bucket);
        track("scroll", { depth_pct: bucket });
      }
      ticking = false;
    });
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  return () => window.removeEventListener("scroll", onScroll);
}
