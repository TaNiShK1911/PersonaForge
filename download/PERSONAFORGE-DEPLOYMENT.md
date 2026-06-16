# PersonaForge — Deployment Guide

> Production deployment guide for the full PersonaForge stack (target architecture)
> The hackathon MVP runs entirely in Next.js without external services — this guide covers the production target stack.

---

## Architecture Overview

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Vercel     │     │   Railway    │     │   Railway    │
│  (Frontend)  │ ←→  │  (FastAPI)   │ ←→  │  (Postgres)  │
│  Next.js 16  │     │  Python 3.12 │     │              │
└──────────────┘     └──────┬───────┘     └──────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │   Railway    │
                     │   (Redis)    │
                     └──────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │  External    │
                     │  Claude API  │
                     └──────────────┘
```

---

## 1. Frontend Deployment (Vercel)

### Prerequisites
- GitHub repo with the Next.js project
- Vercel account

### Steps

```bash
# 1. Push to GitHub
git push origin main

# 2. Import in Vercel dashboard
#    https://vercel.com/new

# 3. Configure environment variables in Vercel:
NEXT_PUBLIC_API_URL=https://api.personaforge.railway.app
NEXT_PUBLIC_CLAUDE_API_KEY=sk-...  # Optional: only for direct LLM calls from client
NEXTAUTH_SECRET=...                  # For auth
NEXTAUTH_URL=https://app.personaforge.dev

# 4. Build settings (auto-detected):
#    Framework: Next.js
#    Build command: bun run build
#    Output directory: .next

# 5. Deploy
```

### Custom Domain
1. Vercel dashboard → Project → Settings → Domains
2. Add `app.personaforge.dev`
3. Configure DNS: `CNAME app → cname.vercel-dns.com`

---

## 2. Backend Deployment (Railway)

### Prerequisites
- GitHub repo with FastAPI project
- Railway account
- Python 3.12+

### Project Structure
```
backend/
├── app/
│   ├── main.py            # FastAPI entry
│   ├── api/
│   │   ├── intent.py
│   │   ├── persona.py
│   │   ├── causal.py
│   │   ├── counterfactual.py
│   │   ├── personalization.py
│   │   ├── explainability.py
│   │   └── bandit.py
│   ├── ml/
│   │   ├── intent.py      # PyTorch LSTM
│   │   ├── persona.py     # scikit-learn k-means
│   │   ├── causal.py      # DoWhy
│   │   ├── counterfactual.py
│   │   └── bandit.py      # Thompson Sampling
│   ├── ai/
│   │   └── content.py     # LangChain + Claude
│   ├── db/
│   │   └── session.py     # SQLAlchemy
│   └── cache/
│       └── redis.py
├── requirements.txt
├── Dockerfile
└── railway.json
```

### `Dockerfile`
```dockerfile
FROM python:3.12-slim

WORKDIR /app

# System deps for DoWhy / CausalML
RUN apt-get update && apt-get install -y \
    build-essential \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# App code
COPY app/ ./app/

# Migrations
COPY alembic.ini .
COPY alembic/ ./alembic/

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### `requirements.txt`
```
fastapi==0.115.0
uvicorn[standard]==0.32.0
pydantic==2.9.0
sqlalchemy==2.0.35
alembic==1.13.3
asyncpg==0.29.0
redis==5.1.1
torch==2.4.1
scikit-learn==1.5.2
xgboost==2.1.1
dowhy==0.11.1
causalml==0.15.3
langchain==0.3.4
langchain-anthropic==0.2.3
anthropic==0.34.2
numpy==1.26.4
pandas==2.2.3
pgvector==0.3.6
```

### `railway.json`
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "./Dockerfile"
  },
  "deploy": {
    "startCommand": "uvicorn app.main:app --host 0.0.0.0 --port $PORT",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 30,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

### Environment Variables (Railway)
```bash
DATABASE_URL=postgresql://...@railway.internal:5432/railway
REDIS_URL=redis://...@railway.internal:6379
CLAUDE_API_KEY=sk-ant-...
GEMINI_API_KEY=...              # Fallback LLM
JWT_SECRET=...
CORS_ORIGINS=https://app.personaforge.dev
LOG_LEVEL=INFO
```

### Deploy
```bash
# 1. Push to GitHub
git push origin main

# 2. Railway dashboard → New Project → Deploy from GitHub repo
#    https://railway.app/new

# 3. Add Postgres + Redis add-ons (one click each)

# 4. Configure env vars (above)

# 5. Railway auto-deploys on every push to main
```

---

## 3. Database Setup (PostgreSQL on Railway)

### Initialize Schema
```bash
# After Postgres is provisioned on Railway:
railway run psql $DATABASE_URL -f migrations/001_init.sql
railway run psql $DATABASE_URL -f migrations/002_pgvector.sql
railway run psql $DATABASE_URL -f migrations/003_indexes.sql
```

### `migrations/001_init.sql`
```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_kind VARCHAR(32),
  features JSONB NOT NULL,
  embedding VECTOR(7),
  converted BOOLEAN DEFAULT FALSE,
  revenue DECIMAL(10,2) DEFAULT 0,
  sessions INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(32) NOT NULL,
  timestamp BIGINT NOT NULL,
  page_depth INT,
  properties JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE personas (
  kind VARCHAR(32) PRIMARY KEY,
  name VARCHAR(64) NOT NULL,
  traits JSONB,
  embedding VECTOR(7),
  confidence FLOAT,
  member_count INT,
  avg_conversion FLOAT,
  avg_revenue DECIMAL(10,2),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE causal_effects (
  treatment VARCHAR(32),
  outcome VARCHAR(32),
  ate FLOAT,
  ci_lower FLOAT,
  ci_upper FLOAT,
  p_value FLOAT,
  sample_treated INT,
  sample_control INT,
  conversion_treated FLOAT,
  conversion_control FLOAT,
  updated_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (treatment, outcome)
);

CREATE TABLE bandit_state (
  arm VARCHAR(16) PRIMARY KEY,
  alpha FLOAT DEFAULT 1,
  beta FLOAT DEFAULT 1,
  pulls INT DEFAULT 0,
  rewards INT DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE bandit_history (
  round SERIAL PRIMARY KEY,
  chosen_arm VARCHAR(16),
  reward BOOLEAN,
  cumulative_reward FLOAT,
  cumulative_optimal FLOAT,
  regret FLOAT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### `migrations/003_indexes.sql`
```sql
CREATE INDEX idx_events_user ON events(user_id);
CREATE INDEX idx_events_type ON events(type);
CREATE INDEX idx_events_timestamp ON events(timestamp);
CREATE INDEX idx_users_persona ON users(persona_kind);
CREATE INDEX idx_users_converted ON users(converted);
```

---

## 4. Redis Setup (Caching + Real-time)

### Use Cases
- **Cache**: Persona assignments, intent predictions (5 min TTL)
- **Real-time**: Bandit state live updates (pub/sub)
- **Rate limiting**: Per-user API rate limits

### Connection
```python
# app/cache/redis.py
import redis.asyncio as redis
import os

redis_client = redis.from_url(
    os.getenv("REDIS_URL"),
    encoding="utf-8",
    decode_responses=True,
)
```

---

## 5. Environment Variable Reference

### Frontend (Vercel)
```env
NEXT_PUBLIC_API_URL=https://api.personaforge.dev
NEXT_PUBLIC_CLAUDE_API_KEY=              # Optional
NEXTAUTH_SECRET=<random-32-bytes>
NEXTAUTH_URL=https://app.personaforge.dev
```

### Backend (Railway)
```env
DATABASE_URL=postgresql://user:pass@host:5432/db
REDIS_URL=redis://host:6379
CLAUDE_API_KEY=sk-ant-...
GEMINI_API_KEY=...
JWT_SECRET=<random-32-bytes>
CORS_ORIGINS=https://app.personaforge.dev,https://preview.personaforge.dev
LOG_LEVEL=INFO
BANDIT_TRUE_RATES_DISCOUNT=0.18          # Optional: override demo rates
BANDIT_TRUE_RATES_URGENCY=0.12
BANDIT_TRUE_RATES_SOCIAL_PROOF=0.15
```

---

## 6. CI/CD Pipeline

### `.github/workflows/deploy.yml`
```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run lint
      - run: bun run test

  deploy-frontend:
    needs: lint-and-test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'

  deploy-backend:
    needs: lint-and-test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      # Railway auto-deploys on push to main, no action needed
      - run: echo "Backend will auto-deploy via Railway webhook"
```

---

## 7. Health Checks + Monitoring

### Backend Health Endpoint
```python
# app/main.py
@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "db": await check_db(),
        "redis": await check_redis(),
        "claude": await check_claude(),
    }
```

### Uptime Monitoring
- **UptimeRobot** or **BetterStack** → ping `/health` every 30s
- **Sentry** → error tracking (frontend + backend)
- **Logtail** or **Railway Logs** → structured logs

---

## 8. Local Development Setup

### Frontend
```bash
git clone https://github.com/personaforge/frontend
cd frontend
bun install
cp .env.example .env.local
# Edit .env.local with local API URL
bun run dev
```

### Backend
```bash
git clone https://github.com/personaforge/backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with local Postgres + Redis URLs
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

### Docker Compose (full local stack)
```yaml
# docker-compose.yml
version: '3.9'
services:
  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_DB: personaforge
      POSTGRES_USER: forge
      POSTGRES_PASSWORD: forge
    ports: ['5432:5432']
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports: ['6379:6379']

  backend:
    build: ./backend
    ports: ['8000:8000']
    environment:
      DATABASE_URL: postgresql://forge:forge@postgres:5432/personaforge
      REDIS_URL: redis://redis:6379
    depends_on: [postgres, redis]

  frontend:
    build: ./frontend
    ports: ['3000:3000']
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:8000
    depends_on: [backend]

volumes:
  pgdata:
```

```bash
docker compose up
```

---

## 9. Production Checklist

- [ ] Frontend deployed to Vercel, custom domain configured
- [ ] Backend deployed to Railway, health check passing
- [ ] Postgres provisioned with pgvector extension
- [ ] Redis provisioned and connected
- [ ] Claude API key configured with fallback to Gemini
- [ ] Database migrations applied
- [ ] Seed data loaded (or production ingestion pipeline running)
- [ ] CORS configured to only allow frontend origin
- [ ] Rate limiting enabled on all endpoints
- [ ] Sentry DSN configured (frontend + backend)
- [ ] Uptime monitoring on `/health`
- [ ] SSL/TLS certificates valid (Vercel + Railway handle this)
- [ ] Backups: Postgres daily snapshots enabled (Railway add-on)
- [ ] Log retention: 30 days minimum
- [ ] CI/CD: GitHub Actions workflow green on main

---

## 10. Scaling Considerations

| Component | Bottleneck | Solution |
|-----------|------------|----------|
| Causal ATE estimation | CPU-bound, runs offline | Run nightly batch job; cache results in Postgres |
| Counterfactual predictions | Per-user, on-demand | Cache in Redis (5 min TTL per user) |
| Personalization (LLM) | Latency + cost | Pre-generate for top 1000 users/hour; on-demand for the rest |
| Bandit | High write rate | Buffer pulls in Redis, flush to Postgres every 10s |
| Event ingestion | High throughput | Kafka → Postgres COPY; or direct Postgres with batching |

---

## 11. Rollback Procedure

### Frontend (Vercel)
1. Vercel dashboard → Project → Deployments
2. Find last known-good deployment
3. Click "Promote to Production"

### Backend (Railway)
1. Railway dashboard → Service → Deployments
2. Click "Rollback" on the last good deployment

### Database
1. Railway → Postgres → Backups
2. Restore from latest daily snapshot

---

## 12. Cost Estimates (Production)

| Service | Tier | Monthly Cost |
|---------|------|--------------|
| Vercel (Pro) | Frontend hosting | $20 |
| Railway (Pro) | Backend + Postgres + Redis | $34 |
| Claude API | ~100K tokens/day | $30 |
| Gemini API (fallback) | ~10K tokens/day | $5 |
| Sentry (Team) | Error tracking | $26 |
| Domain (personaforge.dev) | Annual / 12 | $3 |
| **Total** | | **~$118/month** |

Scales linearly with traffic. At 10K MAU, expect ~$300/month.
