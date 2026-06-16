// ============================================================
// PersonaForge — Rate Limiter
// ============================================================
// Token-bucket rate limiting per IP + per user.
// Backed by Redis in production, in-memory in dev.
// ============================================================

import { cache } from "@/lib/cache/redis";
import { logger } from "@/lib/monitoring/logger";

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyPrefix: string;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfterSec: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 60_000,
  maxRequests: 60,
  keyPrefix: "rl",
};

export async function rateLimit(
  identifier: string,
  config: Partial<RateLimitConfig> = {}
): Promise<RateLimitResult> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const key = `${cfg.keyPrefix}:${identifier}:${Math.floor(Date.now() / cfg.windowMs)}`;

  // Try Redis-based counting
  const redisKey = `ratelimit:${key}`;
  const current = (await cache.get<number>(redisKey)) ?? 0;

  if (current >= cfg.maxRequests) {
    logger.warn("Rate limit exceeded", { identifier, current, max: cfg.maxRequests });
    return {
      allowed: false,
      remaining: 0,
      resetAt: (Math.floor(Date.now() / cfg.windowMs) + 1) * cfg.windowMs,
      retryAfterSec: Math.ceil(cfg.windowMs / 1000),
    };
  }

  await cache.set(redisKey, current + 1, Math.ceil(cfg.windowMs / 1000));

  return {
    allowed: true,
    remaining: cfg.maxRequests - current - 1,
    resetAt: (Math.floor(Date.now() / cfg.windowMs) + 1) * cfg.windowMs,
    retryAfterSec: 0,
  };
}

// Pre-configured limiters per route tier
export const rateLimiters = {
  public: (ip: string) => rateLimit(ip, { windowMs: 60_000, maxRequests: 100, keyPrefix: "rl:public" }),
  api: (ip: string) => rateLimit(ip, { windowMs: 60_000, maxRequests: 60, keyPrefix: "rl:api" }),
  ai: (userId: string) =>
    rateLimit(userId, { windowMs: 60_000, maxRequests: 10, keyPrefix: "rl:ai" }),
  bandit: (userId: string) =>
    rateLimit(userId, { windowMs: 60_000, maxRequests: 30, keyPrefix: "rl:bandit" }),
  events: (ip: string) => rateLimit(ip, { windowMs: 60_000, maxRequests: 200, keyPrefix: "rl:events" }),
};

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}
