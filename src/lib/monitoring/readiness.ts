// ============================================================
// PersonaForge — Production Readiness Validator
// ============================================================
// Called at server startup (via instrumentation.ts).
// In production: fails hard if required env vars / services missing.
// In development: warns but allows startup with degraded features.
// ============================================================

import { logger } from "./logger";

export interface ReadinessCheck {
  name: string;
  required: boolean;
  passed: boolean;
  message: string;
  severity: "fatal" | "warning" | "info";
}

export interface ReadinessReport {
  environment: string;
  ready: boolean;
  fatalFailures: number;
  warnings: number;
  checks: ReadinessCheck[];
}

/**
 * Validate environment + hard dependencies.
 * In production, fatal failures cause the process to exit.
 */
export async function validateProductionReadiness(): Promise<ReadinessReport> {
  const env = process.env.NODE_ENV ?? "development";
  const isProd = env === "production";
  const checks: ReadinessCheck[] = [];

  // ---------- Required env vars ----------
  const requiredEnvVars = [
    { name: "DATABASE_URL", pattern: /^(postgresql|postgres):\/\//, label: "PostgreSQL connection string" },
    { name: "REDIS_URL", pattern: /^redis(s)?:\/\//, label: "Redis connection string" },
    { name: "NEXTAUTH_SECRET", pattern: /^.{16,}$/, label: "NextAuth secret (min 16 chars)" },
    { name: "NEXTAUTH_URL", pattern: /^https?:\/\//, label: "NextAuth URL" },
  ];

  for (const v of requiredEnvVars) {
    const val = process.env[v.name];
    const present = Boolean(val);
    const valid = present ? v.pattern.test(val!) : false;
    checks.push({
      name: `env:${v.name}`,
      required: true,
      passed: valid,
      message: valid
        ? `${v.label} OK`
        : present
        ? `${v.name} present but invalid (expected ${v.label})`
        : `${v.name} missing — ${v.label} required`,
      severity: valid ? "info" : isProd ? "fatal" : "warning",
    });
  }

  // ---------- CORS ----------
  const cors = process.env.CORS_ORIGINS;
  checks.push({
    name: "env:CORS_ORIGINS",
    required: false,
    passed: Boolean(cors),
    message: cors
      ? `CORS allowlist: ${cors}`
      : "CORS_ORIGINS missing — defaulting to localhost only",
    severity: cors ? "info" : "warning",
  });

  // ---------- AI providers (template fallback allowed) ----------
  const aiKeys = [
    "ANTHROPIC_API_KEY",
    "CLAUDE_API_KEY",
    "GEMINI_API_KEY",
    "OPENAI_API_KEY",
  ];
  const hasAiKey = aiKeys.some((k) => {
    const v = process.env[k];
    return v && v.length > 10;
  });
  checks.push({
    name: "ai:providers",
    required: false,
    passed: hasAiKey,
    message: hasAiKey
      ? "At least one AI provider key configured"
      : "No AI provider keys — template fallback will be used (degraded personalization quality)",
    severity: hasAiKey ? "info" : "warning",
  });

  // ---------- OAuth providers (optional) ----------
  const oauthProviders = [
    { name: "Google", idKey: "GOOGLE_CLIENT_ID", secretKey: "GOOGLE_CLIENT_SECRET" },
    { name: "GitHub", idKey: "GITHUB_CLIENT_ID", secretKey: "GITHUB_CLIENT_SECRET" },
  ];
  for (const p of oauthProviders) {
    const hasId = process.env[p.idKey];
    const hasSecret = process.env[p.secretKey];
    checks.push({
      name: `oauth:${p.name}`,
      required: false,
      passed: Boolean(hasId && hasSecret),
      message:
        hasId && hasSecret
          ? `${p.name} OAuth configured`
          : `${p.name} OAuth not configured — demo credentials still available`,
      severity: hasId && hasSecret ? "info" : "warning",
    });
  }

  // ---------- Compute summary ----------
  const fatalFailures = checks.filter((c) => c.severity === "fatal").length;
  const warnings = checks.filter((c) => c.severity === "warning").length;
  const ready = fatalFailures === 0;

  // ---------- Log results ----------
  logger.info("production_readiness_check_begin", { environment: env });
  for (const c of checks) {
    const status = c.passed ? "✓" : c.severity === "fatal" ? "✗" : "⚠";
    const logFn =
      c.severity === "fatal"
        ? logger.error.bind(logger)
        : c.severity === "warning"
        ? logger.warn.bind(logger)
        : logger.info.bind(logger);
    logFn(`[${status}] ${c.name}: ${c.message}`);
  }
  logger.info("production_readiness_check_complete", {
    ready,
    fatalFailures,
    warnings,
  });

  // ---------- Hard fail in production ----------
  if (isProd && !ready) {
    const failures = checks
      .filter((c) => c.severity === "fatal")
      .map((c) => `  ✗ ${c.name}: ${c.message}`)
      .join("\n");
    logger.error("startup_aborted_production_readiness_failed", {
      fatalFailures,
      failures,
    });
    console.error(
      `\n❌ PRODUCTION READINESS CHECK FAILED (${fatalFailures} fatal errors):\n${failures}\n`
    );
    // Throw — instrumentation.ts catches and re-throws in Node runtime.
    // (We avoid process.exit here because Edge bundler statically detects it.
    //  The instrumentation.ts file runs in Node and handles hard exit there.)
    throw new Error(
      `PRODUCTION READINESS CHECK FAILED (${fatalFailures} fatal errors):\n${failures}`
    );
  }

  return { environment: env, ready, fatalFailures, warnings, checks };
}

let validated: ReadinessReport | null = null;
export async function getReadinessReport(): Promise<ReadinessReport> {
  if (!validated) {
    validated = await validateProductionReadiness();
  }
  return validated;
}
