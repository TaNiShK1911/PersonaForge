// ============================================================
// PersonaForge — Security Headers + CORS Configuration
// ============================================================
// Helmet-style security headers for all responses.
// Strict CORS for API routes.
// ============================================================

import { NextResponse } from "next/server";

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "X-DNS-Prefetch-Control": "on",
};

const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS ?? "http://localhost:3000")
  .split(",")
  .map((o) => o.trim());

export function applySecurityHeaders(res: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    res.headers.set(key, value);
  }
  return res;
}

export function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-CSRF-Token, X-Request-ID",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
  };
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  } else if (ALLOWED_ORIGINS.includes("*")) {
    headers["Access-Control-Allow-Origin"] = "*";
  }
  return headers;
}

export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  return ALLOWED_ORIGINS.includes(origin) || ALLOWED_ORIGINS.includes("*");
}

// CSRF token generation + validation (double-submit cookie pattern)
const csrfTokens = new Map<string, number>(); // token → expiresAt

export function generateCsrfToken(): string {
  const token = crypto.randomUUID() + crypto.randomUUID();
  csrfTokens.set(token, Date.now() + 3600_000); // 1 hour
  return token;
}

export function validateCsrfToken(token: string): boolean {
  const expiresAt = csrfTokens.get(token);
  if (!expiresAt) return false;
  if (Date.now() > expiresAt) {
    csrfTokens.delete(token);
    return false;
  }
  return true;
}
