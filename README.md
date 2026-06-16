# PersonaForge — Causal Micro-Persona Engine

> Production-grade AI personalization platform with causal inference, counterfactual simulation, explainable AI, and reinforcement learning optimization.
>
> **v1.0.0** — Upgraded from hackathon MVP to production-ready SaaS architecture.

---

## What's New in v1.0.0 (Production Upgrade)

The original hackathon MVP has been upgraded to a production-grade platform without removing any existing features. Highlights:

| Issue | Hackathon MVP | Production v1.0.0 |
|-------|---------------|---------------------|
| Backend | "Hello World" stub | 12 real API routes with auth, validation, rate limiting |
| Database | Default User/Post | 14-entity production schema with indexes, FKs, soft deletes |
| AI | Template-only copy | Claude → Gemini → OpenAI → Template fallback chain |
| Auth | None | NextAuth (Google/GitHub/Email) + RBAC (Admin/Analyst/Viewer) |
| Caching | None | Redis-style abstraction with in-memory fallback |
| Monitoring | console.log | Structured logger, Prometheus metrics, health check, Sentry |
| Causal AI | Backdoor ATE only | + PSM, IPW, Doubly-Robust, multi-method consensus |
| Counterfactual | Single treatment | Multi-treatment (discount+urgency+social proof+email+recs) |
| Pipeline | None | BullMQ-style event queue with 5 job types |
| Tests | None | 58 unit + integration tests, Playwright E2E config |
| CI/CD | None | GitHub Actions: lint, typecheck, test, build, security, e2e |
| Security | None | Rate limit, CORS, CSRF, Zod validation, security headers |
| Docker | None | Multi-stage Dockerfile + docker-compose (Postgres+Redis+API+Frontend) |
| FastAPI | None | Documented reference backend in `/backend/` |

**Backwards compatibility**: All 8 dashboard views, all ML modules, the Zustand store, and the synthetic data generator are unchanged. The dashboard continues to work identically.

---

## ✨ Features (8 modules — unchanged from MVP)

1. **User Behavior Simulator** — 1,000 users / 70K+ events / 6 hidden personas
2. **Intent Trajectory Model** — LSTM-style sequence over events → 5 intent stages
3. **Micro-Persona Engine** — K-means over 7-dim behavior embedding
4. **Causal AI Engine** — DoWhy-style backdoor ATE + PSM + IPW + Doubly-Robust
5. **Counterfactual Simulator** — Multi-treatment what-if with confidence intervals
6. **Personalization Agent** — Email / ad / push / ranking per persona (LLM-powered)
7. **Explainability Layer** — Plain-English narrative for every recommendation
8. **Multi-Armed Bandit** — Thompson Sampling with Beta posteriors

---

## 🏗️ Production Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                       Browser (Next.js 16)                      │
│  8 dashboard views · Zustand store · Framer Motion · Recharts   │
└──────────────────────────┬─────────────────────────────────────┘
                           │  fetch + bearer JWT
                           ▼
┌────────────────────────────────────────────────────────────────┐
│                  Next.js API Layer (12 routes)                  │
│  /api/users · /api/personas · /api/analytics · /api/bandit     │
│  /api/counterfactual · /api/personalize · /api/events          │
│  /api/health · /api/metrics · /api/docs · /api/auth/*          │
│                                                                 │
│  Middleware: rate limit · CORS · CSRF · Zod validation          │
│  Security:  Helmet headers · bearer auth · RBAC                 │
│  Monitoring: structured logger · Prometheus · Sentry            │
└───────┬─────────────────┬─────────────────┬────────────────────┘
        │                 │                 │
        ▼                 ▼                 ▼
   PostgreSQL         Redis            AI Provider Chain
   (14 entities,    (cache + queue    (Claude → Gemini →
    indexes, FKs,    + rate limit)     OpenAI → Template)
    soft deletes)
                                                      │
                                                      ▼
                                              BullMQ Pipeline
                                              (5 job types)
                                                      │
                                                      ▼
                                              Persona Engine
                                              Causal Engine
                                              Counterfactual
                                              Bandit
```

### Folder Structure (Production)

```
personaforge/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                                  # 8-view router (unchanged)
│   │   ├── globals.css
│   │   └── api/                                      # ← NEW: 12 API routes
│   │       ├── route.ts                              # Replaces Hello World stub
│   │       ├── health/route.ts
│   │       ├── metrics/route.ts                      # Prometheus
│   │       ├── docs/route.ts                         # OpenAPI spec
│   │       ├── users/route.ts
│   │       ├── users/[id]/route.ts
│   │       ├── personas/route.ts
│   │       ├── analytics/route.ts
│   │       ├── bandit/route.ts
│   │       ├── bandit/update/route.ts
│   │       ├── counterfactual/route.ts
│   │       ├── personalize/route.ts
│   │       ├── events/route.ts
│   │       └── auth/[...nextauth]/route.ts
│   ├── components/
│   │   ├── personaforge/                             # App shell (unchanged)
│   │   ├── views/                                    # 8 views (unchanged)
│   │   └── ui/                                       # shadcn/ui (unchanged)
│   └── lib/
│       ├── types.ts                                  # Types (unchanged)
│       ├── store.ts                                  # Zustand (unchanged)
│       ├── db.ts                                     # ← UPGRADED: prod singleton
│       ├── data/generator.ts                         # Synth data (unchanged)
│       ├── ml/                                       # ML modules (unchanged + new)
│       │   ├── intent.ts
│       │   ├── persona.ts
│       │   ├── causal.ts
│       │   ├── counterfactual.ts
│       │   ├── counterfactual-v2.ts                  # ← NEW: multi-treatment
│       │   └── bandit.ts                             # Bug fix: regret calc
│       ├── causal/                                   # ← NEW: advanced methods
│       │   └── advanced.ts                           # PSM, IPW, DR
│       ├── ai/                                       # ← UPGRADED
│       │   ├── content.ts                            # Templates (unchanged)
│       │   ├── provider.ts                           # ← NEW: interface + chain
│       │   ├── factory.ts                            # ← NEW: provider factory + cache
│       │   └── providers/                            # ← NEW
│       │       ├── claude.ts
│       │       ├── gemini.ts
│       │       ├── openai.ts
│       │       └── template.ts
│       ├── auth/                                     # ← NEW
│       │   ├── config.ts                             # NextAuth config
│       │   ├── rbac.ts                               # 3 roles × 18 permissions
│       │   └── session.ts                            # getServerSession + helpers
│       ├── cache/                                    # ← NEW
│       │   └── redis.ts                              # Redis + in-memory fallback
│       ├── monitoring/                               # ← NEW
│       │   ├── logger.ts                             # Structured JSON logger
│       │   ├── metrics.ts                            # Prometheus registry
│       │   ├── sentry.ts                             # Sentry (lazy)
│       │   └── health.ts                             # Service health aggregator
│       ├── security/                                 # ← NEW
│       │   ├── rate-limit.ts                         # Token bucket
│       │   ├── headers.ts                            # CORS + Helmet + CSRF
│       │   └── validation.ts                         # Zod schemas
│       ├── pipeline/                                 # ← NEW
│       │   └── queue.ts                              # BullMQ-style + 5 handlers
│       └── tests/                                    # ← NEW
│           ├── unit/                                 # 6 files, 46 tests
│           └── integration/                          # 1 file, 12 tests
├── prisma/
│   ├── schema.prisma                                 # ← REPLACED: 14 entities
│   └── seeds/seed.ts                                 # ← NEW: idempotent seed
├── backend/                                          # ← NEW: FastAPI reference
│   ├── app/
│   │   ├── main.py                                   # FastAPI entry
│   │   ├── config.py                                 # Pydantic settings
│   │   ├── schemas.py                                # Pydantic schemas
│   │   └── models.py                                 # SQLAlchemy ORM
│   ├── requirements.txt
│   ├── Dockerfile
│   └── README.md
├── tests/e2e/                                        # ← NEW: Playwright
│   └── dashboard.spec.ts
├── .github/workflows/ci.yml                          # ← NEW: 7 CI jobs
├── docker-compose.yml                                # ← NEW
├── Dockerfile                                        # ← NEW
├── .env.example                                      # ← NEW
├── playwright.config.ts                              # ← NEW
└── README.md (this file)
```

---

## 🚀 Quick Start

### Development (zero-config)

```bash
bun install
bun run db:push      # Apply schema to SQLite
bun run db:seed      # Optional: seed personas + treatments + bandit + demo users
bun run dev          # Start at http://localhost:3000
```

Open <http://localhost:3000> — the dashboard works out of the box with synthetic data and in-memory caching. No env vars required.

### With production features

```bash
cp .env.example .env
# Fill in: NEXTAUTH_SECRET, ANTHROPIC_API_KEY (optional), GOOGLE_CLIENT_ID/SECRET (optional)

bun run dev
```

### Test the API

```bash
# Health check (public)
curl http://localhost:3000/api/health

# Prometheus metrics (public)
curl http://localhost:3000/api/metrics

# OpenAPI spec (public)
curl http://localhost:3000/api/docs

# Protected endpoints require a session — log in via /api/auth/signin
# Demo logins (no OAuth setup needed):
#   admin@personaforge.dev    → admin role
#   analyst@personaforge.dev  → analyst role
#   viewer@personaforge.dev   → viewer role

# Or test with credentials:
curl -X POST http://localhost:3000/api/auth/callback/credentials \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "email=admin@personaforge.dev"
```

### Test the codebase

```bash
bun run lint         # ESLint
bun run typecheck    # TypeScript compiler
bun test src/lib/tests       # 58 unit + integration tests
bun run test:e2e     # Playwright (requires running server)
```

### Deploy with Docker

```bash
cp .env.example .env  # Fill in real secrets
docker compose up -d  # Postgres + Redis + Backend + Frontend
```

---

## 🗄️ Database ER Diagram

14 entities with relationships, indexes, FKs, and soft deletes:

```
┌──────────┐  1   N  ┌──────────┐
│  User    │─────────│  Event   │
│          │         │          │
│ id       │         │ userId   │
│ email    │         │ type     │
│ personaKind ──┐    │ timestamp│
│ features │    │    │ discountSeen
│ converted│    │    │ ...      │
│ deletedAt│    │    └──────────┘
└────┬─────┘    │
     │ 1        │         ┌────────────┐
     │          └─────────│  Persona    │
     │ N                  │            │
     │                    │ kind (PK)  │
     ├───────────────────→│ name       │
     │                    │ traits     │
     │                    │ embedding  │
     │                    │ confidence │
     │                    └────────────┘
     │
     │ 1   N  ┌─────────────────────┐  1   1   ┌──────────────┐
     ├────────│ Recommendation      │──────────│ Explanation  │
     │        │ userId              │          │ fullText     │
     │        │ productId           │          │ causalDrivers│
     │        │ score               │          └──────────────┘
     │        │ status              │
     │        └─────────┬───────────┘  1   1   ┌─────────────────┐
     │                  └──────────────────────│ GeneratedContent│
     │                                          │ headline        │
     │ 1   N  ┌─────────────────────┐           │ emailSubject    │
     ├────────│ CounterfactualExp   │           │ adCopy          │
     │        │ userId              │           │ provider        │
     │        │ treatmentKey ───────┼──→ ┌────────────┐
     │        │ predictedProb       │    │ Treatment  │
     │        │ upliftPct           │    │ key (PK)   │
     │        │ isWinner            │    └────────────┘
     │        └─────────────────────┘
     │
     │ 1   N  ┌─────────────────────┐
     └────────│ UserSession         │
              │ startedAt           │
              │ durationSec         │
              │ converted           │
              └─────────────────────┘

┌────────────────┐  1   N  ┌────────────────────┐
│ BanditVariant  │─────────│ BanditObservation  │
│ armKey (PK)    │         │ round              │
│ alpha, beta    │         │ reward             │
│ pulls, rewards │         │ regret             │
│ observedRate   │         └────────────────────┘
└────────────────┘

┌──────────────────┐         ┌──────────────────┐
│ AnalyticsSnapshot│         │ AuthUser         │
│ date (PK)        │         │ email (unique)   │
│ granity (PK)     │         │ role             │
│ conversionRate   │         │ lastLoginAt      │
│ revenue          │         └──────────────────┘
│ banditBestArm    │
└──────────────────┘
```

---

## 🔌 API Documentation

Base URL: `/api`

### Public endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Service info + endpoint list |
| GET | `/health` | Aggregated health (DB, cache, AI, ML) |
| GET | `/metrics` | Prometheus-format metrics |
| GET | `/docs` | OpenAPI 3.0 spec |
| POST | `/auth/callback/credentials` | Demo login |
| GET | `/auth/*` | NextAuth.js handlers |

### Protected endpoints (require session)

All protected endpoints enforce RBAC. Roles: `admin` > `analyst` > `viewer`.

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/users` | `users:read` | Paginated user list (limit/offset/persona/search/converted) |
| GET | `/users/{id}` | `users:read` | User with up to 200 events |
| GET | `/personas` | `personas:read` | All personas with traits + confidence |
| GET | `/analytics` | `analytics:read` | Aggregated snapshot (KPIs, persona distribution, bandit state) |
| GET | `/bandit` | `bandit:read` | Current Beta posteriors, history, regret |
| POST | `/bandit/update` | `bandit:write` | Advance N steps or reset |
| POST | `/counterfactual` | `counterfactual:write` | Run multi-treatment scenarios for a user |
| POST | `/personalize` | `personalization:write` | Generate email/ad/push via AI provider chain |
| POST | `/events` | `events:write` | Ingest single or batch events (queued via BullMQ) |

### Response examples

```bash
# GET /api/health
{
  "status": "degraded",  // healthy | degraded | unhealthy
  "timestamp": "2026-06-17T...",
  "version": "1.0.0",
  "uptime": 19,
  "services": {
    "database": { "status": "up", "latencyMs": 14 },
    "cache": { "status": "degraded", "details": { "redis": false, "memory": true } },
    "aiProvider": { "status": "degraded", "details": { "activeProvider": "template" } },
    "ml": { "status": "up", "details": { "modules": ["intent","persona","causal","counterfactual","bandit"] } }
  }
}

# POST /api/personalize
{
  "userId": "u_rs",
  "channel": "email"
}
→
{
  "headline": "Flash Sale: Save 30% Today Only",
  "emailSubject": "🎯 Your exclusive 30% discount expires tonight",
  "emailBody": "...",
  "adCopy": "...",
  "pushNotification": "⚡ 30% off your wishlist — ends in 4 hours",
  "cta": "Claim 30% Discount",
  "productRanking": [...],
  "provider": "claude",  // or gemini | openai | template
  "tokensUsed": 487,
  "latencyMs": 1240,
  "cached": false
}

# POST /api/counterfactual
{
  "userId": "u_rs"
}
→
{
  "baseline": { ... },
  "scenarios": [ { ... }, { ... }, ... ],  // 5 preset scenarios
  "winner": { "label": "Full Marketing Stack", "conversionProbability": 0.94, "upliftPct": 46.2 },
  "confidenceInterval": { "lower": 0.55, "upper": 0.66 },
  "probabilityShift": 0.29,
  "recommendation": "Apply 'Full Marketing Stack' for +46.2% conversion uplift…",
  "methodComparison": [ ... 4 treatments × 4 methods each ... ]
}
```

---

## 🔐 Authentication & RBAC

### Providers (priority order)

1. **Google OAuth** — set `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET`
2. **GitHub OAuth** — set `GITHUB_CLIENT_ID` + `GITHUB_CLIENT_SECRET`
3. **Email magic link** — uncomment in `lib/auth/config.ts` after `bun add nodemailer`
4. **Demo credentials** — always available; useful for hackathons

### Roles

| Role | Permissions | Can read | Can write |
|------|------------|----------|-----------|
| `admin` | All 18 | Everything | Everything |
| `analyst` | 14 of 18 | Everything | Personalization, counterfactual, bandit, personas, events |
| `viewer` | 8 of 18 | Everything | Nothing |

### Demo logins (zero-config)

- `admin@personaforge.dev` — full access
- `analyst@personaforge.dev` — no admin/user writes
- `viewer@personaforge.dev` — read-only

---

## 🤖 AI Provider Chain

Priority-ordered chain with automatic fallback. The first available provider is used.

```
Claude (Anthropic)  ─┐
                     ├─→  if unavailable or fails  ─→  next provider
Gemini (Google)     ─┤
                     ├─→  if unavailable or fails  ─→  next provider
OpenAI              ─┤
                     ├─→  if unavailable or fails  ─→  next provider
Template (always)   ─┘  ← deterministic fallback, no API key needed
```

Each provider implements:
```ts
interface ContentProvider {
  name: string;
  priority: number;
  isAvailable(): Promise<boolean>;
  generatePersonalizedContent(req): Promise<PersonalizationResult>;
  generateExplanation(req): Promise<ExplanationResult>;
}
```

Features:
- **Timeouts**: 12s for LLM providers, 1s for template
- **Retry logic**: chain tries next provider on failure
- **Caching**: results cached in Redis/memory for 10 minutes
- **Token tracking**: every response reports `tokensUsed`
- **Latency tracking**: every response reports `latencyMs`
- **Metrics**: `ai_provider_latency_ms` histogram in Prometheus

---

## 📊 Monitoring

### Structured Logger (`lib/monitoring/logger.ts`)

- JSON in production, colorized in dev
- 6 log levels: trace / debug / info / warn / error / fatal
- Filtered via `LOG_LEVEL` env var
- Child loggers per service: `apiLogger`, `mlLogger`, `cacheLogger`, `pipelineLogger`, `authLogger`

### Prometheus Metrics (`/api/metrics`)

```
http_requests_total              (counter)
http_errors_total                (counter)
api_bandit_steps_total           (counter)
api_counterfactual_runs_total    (counter)
api_personalizations_total       (counter)
api_events_ingested_total        (counter)
api_active_users                 (gauge)
api_db_connections               (gauge)
cache_memory_size                (gauge)
http_request_duration_ms         (histogram)
ai_provider_latency_ms           (histogram)
causal_estimation_duration_ms    (histogram)
```

### Health Check (`/api/health`)

Aggregates health from DB, cache, AI provider, ML engine. Returns 200 for healthy/degraded, 503 for unhealthy.

### Sentry Integration (`lib/monitoring/sentry.ts`)

Lazy-loaded. Set `SENTRY_DSN` to enable. Captures exceptions and messages.

---

## 🔒 Security

### Rate Limiting

Token-bucket per IP/user, backed by Redis (or in-memory fallback):

| Tier | Window | Max | Routes |
|------|--------|-----|--------|
| public | 60s | 100 | All public |
| api | 60s | 60 | Most API routes |
| ai | 60s | 10 | `/api/personalize` |
| bandit | 60s | 30 | `/api/bandit/update` |
| events | 60s | 200 | `/api/events` |

### Security Headers

Applied to all responses:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `Permissions-Policy: geolocation=(), microphone=(), camera()`

### CORS

Strict origin allowlist via `CORS_ORIGINS` env var.

### Input Validation

All request bodies validated with Zod schemas (`lib/security/validation.ts`). Invalid input → 400 with field-level errors.

### SQL Injection Protection

Prisma parameterizes all queries by default. No raw SQL.

---

## 🧪 Test Suite

```bash
bun test src/lib/tests         # All unit + integration (58 tests)
bun run test:unit              # Unit only (46 tests)
bun run test:integration       # Integration only (12 tests)
bun run test:e2e               # Playwright E2E (requires server)
```

### Coverage

| Module | Tests |
|--------|-------|
| `intent.ts` | 6 — empty input, purchase detection, interest detection, probabilities, trajectory, prediction |
| `persona.ts` | 4 — produces 6 personas, fields, member count sum, confidence bounds |
| `causal.ts` + `advanced.ts` | 6 — backdoor ATE, PSM, IPW, DR, multi-method comparison |
| `counterfactual.ts` + `v2` | 6 — V1 backwards compat, V2 multi-treatment, CI, probability shift |
| `bandit.ts` | 6 — initialization, single step, 200-step convergence, regret sub-linear, all arms pulled |
| `generator.ts` | 8 — user count, events, persona kinds, features, event types, product catalog, determinism, stats |
| `rbac.ts` + `validation.ts` | 11 — admin/analyst/viewer permissions, null role, canAccess, schema accept/reject |
| API contracts | 12 — event/counterfactual/bandit/personalize schema validation |

---

## 🚢 Deployment

### Option 1: Vercel + Railway (recommended)

See `download/PERSONAFORGE-DEPLOYMENT.md` for the full guide.

### Option 2: Docker Compose (self-hosted)

```bash
cp .env.example .env  # Fill in secrets
docker compose up -d  # Postgres + Redis + Backend + Frontend
docker compose logs -f frontend
```

### Option 3: Vercel only (no backend)

The Next.js app is self-contained. Deploy to Vercel:
- Set `DATABASE_URL` to a managed Postgres (Railway/Supabase/Neon)
- Set `REDIS_URL` to a managed Redis (Upstash)
- Set auth secrets (NEXTAUTH_SECRET, OAuth client IDs)
- Optional: Set AI provider keys for LLM-powered personalization

---

## 🔄 CI/CD Pipeline

`.github/workflows/ci.yml` runs 7 jobs on every push/PR to `main`:

1. **Lint** — ESLint
2. **Typecheck** — `tsc --noEmit`
3. **Unit Tests** — 58 tests with coverage
4. **Integration Tests** — API contract validation
5. **Build** — Next.js production build
6. **Security Scan** — npm audit + hardcoded secret detection
7. **E2E Tests** — Playwright (only on `main`)

Staging auto-deploys on `main` push. Production promotion is manual.

---

## 📦 Deliverables

| File | Purpose |
|------|---------|
| `README.md` (this file) | Architecture + API docs + setup |
| `MIGRATION-GUIDE.md` | Upgrade path from MVP to production |
| `prisma/schema.prisma` | 14-entity production schema |
| `prisma/seeds/seed.ts` | Idempotent seed script |
| `docker-compose.yml` | Full-stack local deployment |
| `Dockerfile` | Next.js multi-stage build |
| `backend/` | FastAPI reference (production target) |
| `.github/workflows/ci.yml` | 7-job CI pipeline |
| `.env.example` | Environment variable template |
| `playwright.config.ts` | E2E test config |
| `tests/e2e/dashboard.spec.ts` | 8-view smoke tests |

---

## 📄 License

MIT — built for PersonaForge. Use freely.
