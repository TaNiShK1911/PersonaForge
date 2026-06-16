"""
PersonaForge — FastAPI Backend Entry Point
============================================
Runnable production backend. Hard dependencies:
  - PostgreSQL (verified at startup)
  - Redis (verified at startup)
  - At least one AI provider key (or template fallback is accepted)

Run:
    uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
"""

import os
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from prometheus_fastapi_instrumentator import Instrumentator

from app import __version__
from app.config import settings
from app.core.logging import setup_logging, get_logger
from app.core.monitoring import init_sentry, init_otel
from app.core.security import SecurityHeadersMiddleware, RateLimitMiddleware
from app.database.session import verify_database_connection, close_db
from app.database.redis import init_redis, close_redis

setup_logging()
logger = get_logger(__name__)


async def _verify_production_readiness() -> None:
    """
    Hard dependency check. Called at startup. Fails fast if any required
    service is unreachable so the service never starts in a half-broken state.
    """
    logger.info(
        "production_readiness_check",
        environment=settings.environment,
    )

    # 1. Database
    await verify_database_connection()

    # 2. Redis
    await init_redis()

    # 3. Auth secret
    if not settings.jwt_secret or settings.jwt_secret == "change-me":
        if settings.environment == "production":
            raise RuntimeError(
                "JWT_SECRET must be set to a strong value in production"
            )
        logger.warning("jwt_secret_is_default_set_dev_only")

    # 4. AI providers (template fallback is accepted)
    if not any([settings.anthropic_api_key, settings.gemini_api_key, settings.openai_api_key]):
        logger.warning("no_ai_provider_keys_template_fallback_active")

    logger.info("production_readiness_ok")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup + shutdown hooks."""
    logger.info("startup_begin", version=__version__, env=settings.environment)
    try:
        await _verify_production_readiness()
    except Exception as e:
        logger.error("startup_failed", error=str(e))
        # Hard fail — exit so the orchestrator (Docker/k8s) restarts us
        sys.exit(1)

    init_sentry()
    init_otel(app)

    from app.services.event_pipeline import start_schedulers
    start_schedulers()

    logger.info("startup_complete")
    yield

    logger.info("shutdown_begin")
    await close_db()
    await close_redis()
    logger.info("shutdown_complete")


app = FastAPI(
    title="PersonaForge API",
    version=__version__,
    description="Causal Micro-Persona Engine — production backend",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# ---------- Middleware ----------
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-CSRF-Token", "X-Request-ID"],
)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RateLimitMiddleware)

# ---------- Routers ----------
from app.api import (
    users, personas, analytics, bandit,
    counterfactual, personalize, events, health, metrics,
)

app.include_router(health.router, prefix="/health", tags=["health"])
app.include_router(users.router, prefix="/users", tags=["users"])
app.include_router(personas.router, prefix="/personas", tags=["personas"])
app.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
app.include_router(bandit.router, prefix="/bandit", tags=["bandit"])
app.include_router(counterfactual.router, prefix="/counterfactual", tags=["counterfactual"])
app.include_router(personalize.router, prefix="/personalize", tags=["personalization"])
app.include_router(events.router, prefix="/events", tags=["events"])
app.include_router(metrics.router, prefix="/metrics", tags=["metrics"])

# Prometheus instrumentation
Instrumentator().instrument(app).expose(app, endpoint="/metrics/prometheus")


@app.get("/", tags=["root"])
async def root():
    return {
        "name": "PersonaForge API",
        "version": __version__,
        "docs": "/docs",
        "health": "/health",
        "metrics": "/metrics/prometheus",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=int(os.environ.get("PORT", "8000")),
        reload=settings.debug,
        workers=1 if settings.debug else 4,
    )
