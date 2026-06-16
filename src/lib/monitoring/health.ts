// ============================================================
// PersonaForge — Health Check Service
// ============================================================
// Aggregates health from: DB, cache, AI providers, ML engine.
// Used by /api/health endpoint and external uptime monitors.
// ============================================================

import { db } from "@/lib/db";
import { cache } from "@/lib/cache/redis";
import { getActiveProviderName } from "@/lib/ai/factory";
import { logger } from "./logger";

export interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  version: string;
  uptime: number;
  services: {
    database: ServiceHealth;
    cache: ServiceHealth;
    aiProvider: ServiceHealth;
    ml: ServiceHealth;
  };
}

interface ServiceHealth {
  status: "up" | "down" | "degraded";
  latencyMs?: number;
  details?: Record<string, unknown>;
  error?: string;
}

const startedAt = Date.now();

export async function checkHealth(): Promise<HealthStatus> {
  const services = await Promise.all([
    checkDatabase(),
    checkCache(),
    checkAIProvider(),
    checkML(),
  ]);

  const [database, cacheHealth, aiProvider, ml] = services;

  const anyDown = services.some((s) => s.status === "down");
  const anyDegraded = services.some((s) => s.status === "degraded");

  const overall: "healthy" | "degraded" | "unhealthy" = anyDown
    ? "unhealthy"
    : anyDegraded
    ? "degraded"
    : "healthy";

  return {
    status: overall,
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION ?? "1.0.0",
    uptime: Date.now() - startedAt,
    services: { database, cache: cacheHealth, aiProvider, ml },
  };
}

async function checkDatabase(): Promise<ServiceHealth> {
  const start = Date.now();
  try {
    // Simple ping query
    await db.$queryRaw`SELECT 1`;
    return {
      status: "up",
      latencyMs: Date.now() - start,
      details: { provider: "postgres" },
    };
  } catch (err) {
    logger.error("DB health check failed", {}, err as Error);
    return {
      status: "down",
      latencyMs: Date.now() - start,
      error: (err as Error).message,
    };
  }
}

async function checkCache(): Promise<ServiceHealth> {
  const start = Date.now();
  try {
    const health = await cache.health();
    return {
      status: health.redis ? "up" : "degraded",
      latencyMs: Date.now() - start,
      details: health,
    };
  } catch (err) {
    return {
      status: "degraded",
      latencyMs: Date.now() - start,
      error: (err as Error).message,
    };
  }
}

async function checkAIProvider(): Promise<ServiceHealth> {
  try {
    const name = await getActiveProviderName();
    return {
      status: name === "template" ? "degraded" : "up",
      details: { activeProvider: name },
    };
  } catch (err) {
    return {
      status: "down",
      error: (err as Error).message,
    };
  }
}

async function checkML(): Promise<ServiceHealth> {
  // ML engine is in-process; always up if we got here
  return {
    status: "up",
    details: { modules: ["intent", "persona", "causal", "counterfactual", "bandit"] },
  };
}
