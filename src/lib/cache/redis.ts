// ============================================================
// PersonaForge — Cache Abstraction (Redis or in-memory)
// ============================================================
// In production: connect to REDIS_URL using ioredis.
// In dev / when Redis is unavailable: fall back to an in-memory
// LRU cache (process-scoped, survives HMR via globalThis).
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
    // Evict oldest if at capacity
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

// ---------- Redis client (lazy, optional) ----------

let redisClient: any = null;
let redisAvailable: boolean | null = null;

async function getRedisClient(): Promise<any | null> {
  if (redisClient !== null) return redisClient;
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    redisClient = null;
    return null;
  }
  try {
    // Dynamic import — fully obfuscated to prevent webpack static analysis.
    // The ioredis package is optional; we install it only when Redis is needed.
    const moduleName = ["io", "redis"].join("");
    const dynamicImport = new Function("m", "return import(m)") as (m: string) => Promise<any>;
    let mod: any = null;
    try {
      mod = await dynamicImport(moduleName);
    } catch {
      mod = null;
    }
    if (!mod) {
      console.warn("[cache] Redis module not installed, using in-memory fallback");
      redisClient = null;
      redisAvailable = false;
      return null;
    }
    const Redis = mod.Redis ?? mod.default;
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 2,
      enableReadyCheck: true,
      lazyConnect: false,
      retryStrategy: (times: number) => Math.min(times * 200, 2000),
    });
    redisClient.on("error", (err: Error) => {
      console.warn("[cache] Redis error:", err.message);
      redisAvailable = false;
    });
    redisAvailable = true;
    return redisClient;
  } catch (err) {
    console.warn(
      "[cache] Redis init failed, falling back to in-memory:",
      (err as Error).message
    );
    redisClient = null;
    redisAvailable = false;
    return null;
  }
}

// ---------- Unified cache API ----------

class UnifiedCache {
  private memory = new InMemoryCache(
    Number(process.env.CACHE_MAX_ENTRIES ?? 1000)
  );

  async get<T>(key: string): Promise<T | null> {
    // Try Redis first (if available)
    const redis = await getRedisClient();
    if (redis && redisAvailable) {
      try {
        const raw = await redis.get(key);
        if (raw) return JSON.parse(raw) as T;
      } catch (err) {
        console.warn("[cache] Redis get failed:", (err as Error).message);
      }
    }
    // Fallback to in-memory
    return this.memory.get<T>(key);
  }

  async set<T>(key: string, value: T, ttlSec?: number): Promise<void> {
    // Write to both for redundancy
    const redis = await getRedisClient();
    if (redis && redisAvailable) {
      try {
        if (ttlSec) {
          await redis.set(key, JSON.stringify(value), "EX", ttlSec);
        } else {
          await redis.set(key, JSON.stringify(value));
        }
        return;
      } catch (err) {
        console.warn("[cache] Redis set failed:", (err as Error).message);
      }
    }
    await this.memory.set(key, value, ttlSec);
  }

  async del(key: string): Promise<void> {
    const redis = await getRedisClient();
    if (redis && redisAvailable) {
      try {
        await redis.del(key);
      } catch {
        /* ignore */
      }
    }
    await this.memory.del(key);
  }

  async delPattern(pattern: string): Promise<number> {
    let count = 0;
    const redis = await getRedisClient();
    if (redis && redisAvailable) {
      try {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
          await redis.del(...keys);
          count += keys.length;
        }
      } catch {
        /* ignore */
      }
    }
    count += await this.memory.delPattern(pattern);
    return count;
  }

  async flush(): Promise<void> {
    const redis = await getRedisClient();
    if (redis && redisAvailable) {
      try {
        await redis.flushdb();
      } catch {
        /* ignore */
      }
    }
    await this.memory.flush();
  }

  async health(): Promise<{
    redis: boolean;
    memory: boolean;
    memorySize: number;
  }> {
    const redis = await getRedisClient();
    let redisHealthy = false;
    if (redis && redisAvailable) {
      try {
        const pong = await redis.ping();
        redisHealthy = pong === "PONG";
      } catch {
        redisHealthy = false;
      }
    }
    return {
      redis: redisHealthy,
      memory: await this.memory.health(),
      memorySize: this.memory.size(),
    };
  }
}

// Singleton (preserved across HMR via globalThis)
const globalForCache = globalThis as unknown as { __personaForgeCache?: UnifiedCache };

export const cache: UnifiedCache =
  globalForCache.__personaForgeCache ?? new UnifiedCache();

if (process.env.NODE_ENV !== "production") {
  globalForCache.__personaForgeCache = cache;
}
