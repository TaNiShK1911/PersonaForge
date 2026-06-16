# ============================================================
# PersonaForge — FastAPI Backend (Production Reference)
# ============================================================
# This folder contains the **production FastAPI backend** target architecture.
# In the current deployment, the Next.js app implements the same API in
# `src/app/api/**/route.ts` for simplicity. For horizontal scale, dedicated
# ML workers, or polyglot microservices, deploy this FastAPI service.
# ============================================================

## Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                  # FastAPI entry + middleware
│   ├── config.py                # Pydantic settings
│   ├── api/                     # Route handlers
│   │   ├── __init__.py
│   │   ├── users.py             # GET /users, GET /users/{id}
│   │   ├── personas.py          # GET /personas
│   │   ├── analytics.py         # GET /analytics
│   │   ├── bandit.py            # GET /bandit, POST /bandit/update
│   │   ├── counterfactual.py    # POST /counterfactual
│   │   ├── personalize.py       # POST /personalize
│   │   ├── events.py            # POST /events
│   │   ├── health.py            # GET /health
│   │   └── metrics.py           # GET /metrics (Prometheus)
│   ├── services/                # Business logic
│   │   ├── persona_service.py
│   │   ├── causal_service.py
│   │   ├── counterfactual_service.py
│   │   ├── personalization_service.py
│   │   ├── bandit_service.py
│   │   └── event_pipeline.py    # BullMQ-equivalent (Celery + Redis)
│   ├── models/                  # SQLAlchemy ORM models
│   │   ├── user.py
│   │   ├── persona.py
│   │   ├── event.py
│   │   ├── session.py
│   │   ├── recommendation.py
│   │   ├── treatment.py
│   │   ├── counterfactual_experiment.py
│   │   ├── bandit_variant.py
│   │   ├── bandit_observation.py
│   │   ├── generated_content.py
│   │   ├── explanation.py
│   │   └── analytics_snapshot.py
│   ├── schemas/                 # Pydantic schemas
│   │   ├── user.py
│   │   ├── persona.py
│   │   ├── event.py
│   │   ├── counterfactual.py
│   │   ├── personalization.py
│   │   ├── bandit.py
│   │   └── analytics.py
│   ├── ml/                      # ML implementations
│   │   ├── intent.py            # PyTorch LSTM
│   │   ├── persona.py           # scikit-learn k-means
│   │   ├── causal.py            # DoWhy + CausalML
│   │   ├── counterfactual.py    # Structural causal model
│   │   └── bandit.py            # Thompson Sampling
│   ├── database/                # DB connection + migrations
│   │   ├── __init__.py
│   │   ├── session.py           # SQLAlchemy session + pool
│   │   └── redis.py             # Redis client
│   └── core/                    # Cross-cutting concerns
│       ├── auth.py              # JWT + RBAC
│       ├── security.py          # Rate limit, CORS, CSRF
│       ├── logging.py           # Structured logging
│       └── monitoring.py        # OpenTelemetry + Sentry
├── alembic/                     # DB migrations
├── tests/                       # pytest suite
├── requirements.txt
├── Dockerfile
└── README.md
```

## Quick start

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Configure env
export DATABASE_URL="postgresql://forge:forge_dev@localhost:5432/personaforge"
export REDIS_URL="redis://localhost:6379"
export CLAUDE_API_KEY="sk-ant-..."

# Run migrations
alembic upgrade head

# Start dev server
uvicorn app.main:app --reload --port 8000

# OpenAPI docs at http://localhost:8000/docs
```

## Endpoints (mirrors Next.js API)

| Method | Path                | Description                          |
|--------|---------------------|--------------------------------------|
| GET    | /users              | List users (paginated, filtered)     |
| GET    | /users/{id}         | Get user with events                 |
| GET    | /personas           | List all personas                    |
| GET    | /analytics          | Aggregated analytics snapshot        |
| GET    | /bandit             | Current bandit state                 |
| POST   | /bandit/update      | Advance bandit N steps               |
| POST   | /counterfactual     | Run counterfactual scenarios         |
| POST   | /personalize        | Generate personalized content        |
| POST   | /events             | Ingest events (single or batch)      |
| GET    | /health             | Service health check                 |
| GET    | /metrics            | Prometheus metrics                   |
| GET    | /docs               | OpenAPI Swagger UI                   |

## Why a separate backend?

The Next.js API routes work fine for the MVP. Split out to FastAPI when you need:

1. **Heavy ML workloads** — PyTorch LSTM training, DoWhy estimation with bootstrap CIs take CPU; isolate from web workers
2. **Long-running jobs** — Celery workers for nightly persona re-clustering, hourly analytics snapshots
3. **Polyglot ML** — Python ecosystem (PyTorch, DoWhy, CausalML, XGBoost) has no JS equivalent
4. **Independent scaling** — ML inference endpoint scales separately from frontend

## When NOT to split

- Hackathon demo (use Next.js API routes — they work)
- Small team that doesn't want to maintain two codebases
- Frontend-only features (most analytics dashboards)

The Next.js API layer in `src/app/api/**` is the **source of truth for current behavior**. This FastAPI folder is the **production target** for when the load justifies the split.
