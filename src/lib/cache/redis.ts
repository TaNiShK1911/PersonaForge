// ============================================================
// PersonaForge — Cache Abstraction (Redis mandatory in prod)
// ============================================================
// Production: REQUIRES REDIS_URL + ioredis. If Redis is unreachable
// the cache fails hard and API routes return 503.
//
// Development: Falls back to in-memory cache when REDIS_URL is missing
// (logged as a warning, not fatal).
// ============================================================

interface CacheEntry<T> {
  value: T;
  expiresAt: number; // epoch ms; 0 = never expires
}

class InMemoryCache {
  private store = new Map<string, CacheEntry<unknown>>();
  private maxEntries: number;

  constructor(maxEntries = 1000) {
    this.maxEntries = maxEntries;
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt > 0 && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlSec?: number): Promise<void> {
    if (this.store.size >= this.maxEntries) {
      const firstKey = this.store.keys().next().value;
      if (firstKey) this.store.delete(firstKey);
    }
    this.store.set(key, {
      value,
      expiresAt: ttlSec ? Date.now() + ttlSec * 1000 : 0,
    });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async delPattern(pattern: string): Promise<number> {
    const regex = new RegExp(
      "^" + pattern.replace(/\*/g, ".*").replace(/\?/g, ".") + "$"
    );
    let count = 0;
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.store.delete(key);
        count++;
      }
    }
    return count;
  }

  async flush(): Promise<void> {
    this.store.clear();
  }

  async health(): Promise<boolean> {
    return true;
  }

  size(): number {
    return this.store.size;
  }
}

// ---------- Redis client (mandatory in production) ----------

let redisClient: any = null;
let redisInitAttempted = false;
let redisInitError: Error | null = null;

async function getRedisClient(): Promise<any | null> {
  if (redisClient) return redisClient;
  if (redisInitAttempted && redisInitError) throw redisInitError;
  if (redisInitAttempted) return null;

  redisInitAttempted = true;
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    const err = new Error("REDIS_URL not set");
    redisInitError = err;
    if (process.env.NODE_ENV === "production") {
      // Hard fail in production
      throw err;
    }
    // Dev: warn and fall back
    console.warn("[cache] REDIS_URL not set — using in-memory fallback (dev only)");
    return null;
  }

  try {
    // Dynamic import — obfuscated so webpack doesn't try to resolve at build time
    const moduleName = ["io", "redis"].join("");
    const dynamicImport = new Function("m", "return import(m)") as (m: string) => Promise<any>;
    const mod = await dynamicImport(moduleName);
    const Redis = mod.Redis ?? mod.default;
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 2,
      enableReadyCheck: true,
      lazyConnect: false,
      retryStrategy: (times: number) => Math.min(times * 200, 2000),
    });
    redisClient.on("error", (err: Error) => {
      console.warn("[cache] Redis error:", err.message);
    });
    // Verify connectivity
    await redisClient.ping();
    return redisClient;
  } catch (err) {
    redisInitError = err as Error;
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        `Redis is a hard dependency in production. Connection failed: ${(err as Error).message}`
      );
    }
    console.warn(
      `[cache] Redis unavailable in dev, using in-memory fallback:`,
      (err as Error).message
    );
    return null;
  }
}

// ---------- Unified cache API ----------

class UnifiedCache {
  private memory = new InMemoryCache(
    Number(process.env.CACHE_MAX_ENTRIES ?? 1000)
  );

  async get<T>(key: string): Promise<T | null> {
    try {
      const redis = await getRedisClient();
      if (redis) {
        const raw = await redis.get(key);
        if (raw) return JSON.parse(raw) as T;
      }
    } catch (err) {
      if (process.env.NODE_ENV === "production") throw err;
      // Dev: fall through to memory
    }
    return this.memory.get<T>(key);
  }

  async set<T>(key: string, value: T, ttlSec?: number): Promise<void> {
    try {
      const redis = await getRedisClient();
      if (redis) {
        if (ttlSec) {
          await redis.set(key, JSON.stringify(value), "EX", ttlSec);
        } else {
          await redis.set(key, JSON.stringify(value));
        }
        return;
      }
    } catch (err) {
      if (process.env.NODE_ENV === "production") throw err;
    }
    await this.memory.set(key, value, ttlSec);
  }

  async del(key: string): Promise<void> {
    try {
      const redis = await getRedisClient();
      if (redis) await redis.del(key);
    } catch (err) {
      if (process.env.NODE_ENV === "production") throw err;
    }
    await this.memory.del(key);
  }

  async delPattern(pattern: string): Promise<number> {
    let count = 0;
    try {
      const redis = await getRedisClient();
      if (redis) {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
          await redis.del(...keys);
          count += keys.length;
        }
      }
    } catch (err) {
      if (process.env.NODE_ENV === "production") throw err;
    }
    count += await this.memory.delPattern(pattern);
    return count;
  }

  async flush(): Promise<void> {
    try {
      const redis = await getRedisClient();
      if (redis) await redis.flushdb();
    } catch (err) {
      if (process.env.NODE_ENV === "production") throw err;
    }
    await this.memory.flush();
  }

  async health(): Promise<{
    redis: boolean;
    memory: boolean;
    memorySize: number;
  }> {
    let redisHealthy = false;
    try {
      const redis = await getRedisClient();
      if (redis) {
        const pong = await redis.ping();
        redisHealthy = pong === "PONG";
      }
    } catch {
      redisHealthy = false;
    }
    return {
      redis: redisHealthy,
      memory: await this.memory.health(),
      memorySize: this.memory.size(),
    };
  }
}

const globalForCache = globalThis as unknown as { __personaForgeCache?: UnifiedCache };

export const cache: UnifiedCache =
  globalForCache.__personaForgeCache ?? new UnifiedCache();

if (process.env.NODE_ENV !== "production") {
  globalForCache.__personaForgeCache = cache;
}
