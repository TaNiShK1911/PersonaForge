"""
PersonaForge — FastAPI Backend Entry Point (Reference)
======================================================
This is the production FastAPI backend target. The current deployment
uses Next.js API routes (in src/app/api/) that mirror this design.
Deploy this FastAPI service when you need horizontal scaling, dedicated
ML workers, or polyglot Python-only libraries (PyTorch, DoWhy, CausalML).
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from prometheus_fastapi_instrumentator import Instrumentator

from app.config import settings
from app.api import (
    users, personas, analytics, bandit,
    counterfactual, personalize, events, health, metrics,
)
from app.core.logging import setup_logging
from app.core.monitoring import init_sentry, init_otel


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup + shutdown hooks."""
    setup_logging()
    init_sentry()
    init_otel(app)
    # Start background schedulers (Celery beat in production)
    from app.services.event_pipeline import start_schedulers
    start_schedulers()
    yield
    # Cleanup
    from app.database.session import close_db
    await close_db()


app = FastAPI(
    title="PersonaForge API",
    version="1.0.0",
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

# Security headers middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response: Response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response

# ---------- Routers ----------
app.include_router(health.router, prefix="/health", tags=["health"])
app.include_router(users.router, prefix="/users", tags=["users"])
app.include_router(personas.router, prefix="/personas", tags=["personas"])
app.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
app.include_router(bandit.router, prefix="/bandit", tags=["bandit"])
app.include_router(counterfactual.router, prefix="/counterfactual", tags=["counterfactual"])
app.include_router(personalize.router, prefix="/personalize", tags=["personalization"])
app.include_router(events.router, prefix="/events", tags=["events"])
app.include_router(metrics.router, prefix="/metrics", tags=["metrics"])

# Prometheus metrics
Instrumentator().instrument(app).expose(app, endpoint="/metrics/prometheus")


@app.get("/", tags=["root"])
async def root():
    return {
        "name": "PersonaForge API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
        "metrics": "/metrics",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug,
        workers=4 if not settings.debug else 1,
    )
