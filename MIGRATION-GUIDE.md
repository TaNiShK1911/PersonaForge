# PersonaForge — Migration Guide

> How to upgrade the PersonaForge hackathon MVP to production v1.0.0
> without breaking any existing feature.

This guide documents every change made during the production upgrade, why it was made, and how to roll back if needed.

---

## Summary

| Area | Before (MVP) | After (v1.0.0) | Backwards-compatible? |
|------|--------------|----------------|----------------------|
| API root | `"Hello, world!"` | Service info JSON | ✅ |
| Database schema | 2 models (User, Post) | 14 models | ✅ — old models removed; dashboard doesn't use them |
| AI content | Template-only | 4-provider chain | ✅ — Template provider unchanged |
| Counterfactual | Single-treatment V1 | V2 (multi-treatment) | ✅ — V1 still exported, V2 is additive |
| Causal engine | Backdoor ATE | + PSM, IPW, DR | ✅ — backdoor unchanged |
| Bandit regret | Buggy calc (overcounted) | Correct formula | ⚠️ — visible metric changed (now correct) |
| Event ingestion | None | BullMQ-style queue | ✅ — new feature |
| Auth | None | NextAuth + RBAC | ✅ — dashboard doesn't require auth |
| Monitoring | console.log | Structured + Prometheus | ✅ — additive |
| Tests | None | 58 tests | ✅ — additive |
| CI/CD | None | 7-job GitHub Actions | ✅ — additive |
| Docker | None | Compose + Dockerfile | ✅ — additive |

**Bottom line**: Every existing UI view, ML module, and store action continues to work identically. The dashboard is fully functional with zero configuration changes.

---

## Step-by-step Migration

### Step 1: Backup

```bash
# Back up your existing dev database
cp db/custom.db db/custom.db.backup

# Back up your env
cp .env .env.backup

# Commit current state
git add -A && git commit -m "pre-production-upgrade-backup"
```

### Step 2: Install dependencies

The upgrade uses only packages already in `package.json` (next-auth, zod, prisma, etc.). No new installs needed for the Next.js app.

If you want to enable Redis caching (optional):
```bash
bun add ioredis
```

If you want to enable email magic-link auth (optional):
```bash
bun add nodemailer
```

### Step 3: Apply the new Prisma schema

The schema replaces the old User/Post models with 14 production entities.

```bash
bun run db:push    # Apply schema to SQLite (or Postgres in prod)
bun run db:seed    # Seed personas, treatments, bandit variants, demo users
```

The seed script is **idempotent** — safe to run multiple times.

### Step 4: Set environment variables

```bash
cp .env.example .env
```

Minimum required for dev:
```env
DATABASE_URL="file:./db/custom.db"
NEXTAUTH_SECRET="<32-char-random-string>"
NEXTAUTH_URL="http://localhost:3000"
```

Optional (enable when ready):
```env
ANTHROPIC_API_KEY=...        # Enable Claude provider
GEMINI_API_KEY=...           # Enable Gemini provider
OPENAI_API_KEY=...           # Enable OpenAI provider
REDIS_URL=...                # Enable Redis caching (falls back to in-memory)
GOOGLE_CLIENT_ID=...         # Enable Google OAuth
GITHUB_CLIENT_ID=...         # Enable GitHub OAuth
SENTRY_DSN=...               # Enable Sentry error tracking
```

### Step 5: Verify the dashboard still works

```bash
bun run dev
```

Open <http://localhost:3000>. Click through all 8 views. The dashboard should look and behave **identically** to before the upgrade.

### Step 6: Verify the new API works

```bash
# Health check
curl http://localhost:3000/api/health
# → { "status": "degraded", ... }  (degraded because no Redis/API keys in dev)

# Prometheus metrics
curl http://localhost:3000/api/metrics

# OpenAPI spec
curl http://localhost:3000/api/docs
```

Protected endpoints require a session. To test them:

1. Open `http://localhost:3000/api/auth/signin`
2. Sign in with `admin@personaforge.dev` (demo credentials)
3. Use the session cookie in subsequent requests:

```bash
# Copy the cookie from your browser dev tools, then:
curl http://localhost:3000/api/personas -H "Cookie: next-auth.session-token=..."
```

### Step 7: Run tests

```bash
bun run lint         # ESLint
bun run typecheck    # TypeScript
bun test src/lib/tests   # 58 tests
```

All tests should pass. If any fail, see "Rollback" below.

---

## What Changed (Detailed)

### Added files

```
src/app/api/health/route.ts
src/app/api/metrics/route.ts
src/app/api/docs/route.ts
src/app/api/users/route.ts
src/app/api/users/[id]/route.ts
src/app/api/personas/route.ts
src/app/api/analytics/route.ts
src/app/api/bandit/route.ts
src/app/api/bandit/update/route.ts
src/app/api/counterfactual/route.ts
src/app/api/personalize/route.ts
src/app/api/events/route.ts
src/app/api/auth/[...nextauth]/route.ts
src/lib/ai/provider.ts
src/lib/ai/factory.ts
src/lib/ai/providers/claude.ts
src/lib/ai/providers/gemini.ts
src/lib/ai/providers/openai.ts
src/lib/ai/providers/template.ts
src/lib/auth/config.ts
src/lib/auth/rbac.ts
src/lib/auth/session.ts
src/lib/cache/redis.ts
src/lib/monitoring/logger.ts
src/lib/monitoring/metrics.ts
src/lib/monitoring/sentry.ts
src/lib/monitoring/health.ts
src/lib/security/rate-limit.ts
src/lib/security/headers.ts
src/lib/security/validation.ts
src/lib/causal/advanced.ts
src/lib/ml/counterfactual-v2.ts
src/lib/pipeline/queue.ts
src/lib/tests/unit/*.test.ts (6 files)
src/lib/tests/integration/*.test.ts (1 file)
prisma/seeds/seed.ts
backend/ (FastAPI reference)
tests/e2e/dashboard.spec.ts
.github/workflows/ci.yml
docker-compose.yml
Dockerfile
.env.example
playwright.config.ts
MIGRATION-GUIDE.md (this file)
```

### Modified files

| File | Change | Why |
|------|--------|-----|
| `src/app/api/route.ts` | Replaced "Hello World" with service info JSON | Stub → real API |
| `prisma/schema.prisma` | Replaced User/Post with 14 entities | Production DB schema |
| `src/lib/db.ts` | Cleaner singleton, prod log levels | Connection pooling |
| `src/lib/ml/bandit.ts` | Fixed `cumulativeOptimal` calculation | Bug fix — regret was overcounted |
| `package.json` | Added scripts: typecheck, test, test:unit, test:integration, test:e2e, db:seed | New tooling |
| `README.md` | Full rewrite for v1.0.0 | New architecture docs |

### Unchanged files (backwards compatibility)

- All 8 dashboard views in `src/components/views/`
- `src/components/personaforge/app-shell.tsx`
- `src/components/personaforge/primitives.tsx`
- `src/lib/store.ts` (Zustand store)
- `src/lib/types.ts`
- `src/lib/data/generator.ts`
- `src/lib/ml/intent.ts`
- `src/lib/ml/persona.ts`
- `src/lib/ml/causal.ts` (backdoor ATE — V1)
- `src/lib/ml/counterfactual.ts` (V1)
- `src/lib/ai/content.ts` (template generators)
- `src/app/layout.tsx`
- `src/app/globals.css`
- `src/app/page.tsx`

---

## Behavioral Changes

### 1. Bandit regret metric (bug fix)

**Before**: `cumulativeOptimal` was incorrectly calculated as `state.history.length + TRUE_RATES[optimalArm]`, producing absurdly large regret values (e.g., 110 after 130 rounds).

**After**: `cumulativeOptimal = (state.history.length + 1) * TRUE_RATES[optimalArm]`, producing realistic regret values (e.g., 6 after 200 rounds).

**Impact**: The regret chart in the Bandit Optimizer view will show much smaller numbers. This is **correct behavior** — the previous values were wrong.

**Rollback**: Not recommended. The new calculation is mathematically correct.

### 2. Counterfactual engine V2 (additive)

V1 (`runCounterfactual` in `lib/ml/counterfactual.ts`) is **unchanged**. The dashboard continues to call V1.

V2 (`runCounterfactualV2` in `lib/ml/counterfactual-v2.ts`) is **new** and only invoked via the `/api/counterfactual` endpoint. It supports multi-treatment scenarios (discount + urgency + social proof + reviews + email sequence + personalized recs) and returns confidence intervals + method comparisons.

### 3. AI provider chain (additive)

The dashboard continues to call `generatePersonalization()` from `lib/ai/content.ts` directly (template-only).

The `/api/personalize` endpoint uses the new provider chain, which tries Claude → Gemini → OpenAI → Template. Without API keys configured, it falls back to the same template engine the dashboard uses — so output is identical.

---

## Rollback Procedure

If something breaks, roll back in this order:

### 1. Roll back the schema

```bash
cp db/custom.db.backup db/custom.db  # Restore old DB
git checkout HEAD~1 -- prisma/schema.prisma
bun run db:push
```

### 2. Roll back the bandit fix

```bash
git checkout HEAD~1 -- src/lib/ml/bandit.ts
```

### 3. Roll back the API root

```bash
git checkout HEAD~1 -- src/app/api/route.ts
```

### 4. Remove new API routes

```bash
rm -rf src/app/api/health src/app/api/metrics src/app/api/docs
rm -rf src/app/api/users src/app/api/personas src/app/api/analytics
rm -rf src/app/api/bandit src/app/api/counterfactual src/app/api/personalize
rm -rf src/app/api/events src/app/api/auth
```

### 5. Remove new lib modules

```bash
rm -rf src/lib/ai/providers src/lib/ai/provider.ts src/lib/ai/factory.ts
rm -rf src/lib/auth src/lib/cache src/lib/monitoring src/lib/security
rm -rf src/lib/causal src/lib/pipeline
rm -f src/lib/ml/counterfactual-v2.ts
```

### 6. Restart dev server

```bash
bun run dev
```

The dashboard should work exactly as it did before the upgrade.

---

## Production Deployment Checklist

After migrating, before going to production:

- [ ] Generate strong `NEXTAUTH_SECRET` (32+ random chars)
- [ ] Set `DATABASE_URL` to managed Postgres (Railway/Supabase/Neon)
- [ ] Set `REDIS_URL` to managed Redis (Upstash)
- [ ] Install `ioredis` and verify Redis connection
- [ ] Set at least one AI provider key (`ANTHROPIC_API_KEY` recommended)
- [ ] Configure Google OAuth (`GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET`)
- [ ] Configure GitHub OAuth (optional)
- [ ] Install `nodemailer` and configure SMTP (optional, for email magic link)
- [ ] Set `SENTRY_DSN` for error tracking
- [ ] Set `CORS_ORIGINS` to your production domain(s)
- [ ] Set `LOG_LEVEL=info` (or `warn` for less verbose)
- [ ] Run `bun run db:seed` to populate personas/treatments/bandit variants
- [ ] Verify `/api/health` returns `status: "healthy"` in production
- [ ] Verify `/api/metrics` is scraped by Prometheus / Datadog
- [ ] Configure uptime monitoring on `/api/health`
- [ ] Set up daily Postgres backups
- [ ] Test the CI pipeline on a feature branch
- [ ] Configure Vercel auto-deploy on `main` push
- [ ] Configure Railway auto-deploy on `main` push (for backend, if used)
- [ ] Smoke test all 8 dashboard views in production
- [ ] Smoke test all 9 protected API endpoints with valid session

---

## FAQ

### Q: Will my existing dashboard break?

**A**: No. All 8 views, the Zustand store, and the ML modules are unchanged. The dashboard continues to work with zero configuration changes.

### Q: Do I need to set up auth?

**A**: No. The dashboard doesn't require auth. Auth is only enforced on the new API routes (`/api/users`, `/api/personas`, etc.). The dashboard calls the Zustand store directly, not the API.

### Q: Do I need Redis?

**A**: No. The cache falls back to in-memory if `REDIS_URL` is not set. For production with multiple instances, Redis is recommended.

### Q: Do I need an AI provider key?

**A**: No. Without keys, the provider chain falls back to the Template provider, which produces the same persona-conditioned copy the MVP used.

### Q: Do I need to run the seed script?

**A**: Optional. The seed script populates the `Persona`, `Treatment`, `BanditVariant`, and `AuthUser` tables in the database. Without it, the API routes fall back to the in-memory Zustand store (which has the same data, just not persisted).

### Q: Can I deploy just the Next.js app without the FastAPI backend?

**A**: Yes. The FastAPI folder (`/backend/`) is a documented reference for when you need horizontal scaling. The Next.js API routes are fully functional and the dashboard works without the FastAPI service.

### Q: What if I want to keep the old bandit regret calculation?

**A**: You can't — it was a bug. The new calculation is mathematically correct. If you need the old (incorrect) values for some legacy reporting, you can recompute them as `state.history.length + TRUE_RATES[optimalArm]` from the new history.

### Q: How do I add a new AI provider?

**A**: Implement the `ContentProvider` interface in `src/lib/ai/providers/your-provider.ts`, then register it in `src/lib/ai/factory.ts` with the appropriate priority.

### Q: How do I add a new RBAC role?

**A**: Add the role to the `Role` type and `ROLE_PERMISSIONS` map in `src/lib/auth/rbac.ts`. The middleware will pick it up automatically.

### Q: How do I add a new API route?

**A**: Create `src/app/api/<route>/route.ts`. Import `requirePermission` from `@/lib/auth/session` to enforce RBAC. Use `validate` from `@/lib/security/validation` to validate input. Apply `applySecurityHeaders` to the response.

---

## Getting Help

- **Architecture questions**: See `README.md` → "Production Architecture"
- **API questions**: See `README.md` → "API Documentation" or `/api/docs`
- **Schema questions**: See `prisma/schema.prisma`
- **Test failures**: See "Rollback Procedure" above
- **Production deployment**: See `download/PERSONAFORGE-DEPLOYMENT.md`
