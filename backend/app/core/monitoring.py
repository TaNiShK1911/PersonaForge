"""
PersonaForge — Monitoring (Sentry + OpenTelemetry)
====================================================
"""

from typing import Any

import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.redis import RedisIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

from app.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


def init_sentry() -> None:
    """Initialize Sentry SDK if SENTRY_DSN is configured."""
    if not settings.sentry_dsn:
        logger.info("sentry_disabled_no_dsn")
        return
    try:
        sentry_sdk.init(
            dsn=settings.sentry_dsn,
            environment=settings.environment,
            traces_sample_rate=settings.sentry_traces_sample_rate,
            release=f"personaforge-backend@{settings.app_version}",
            integrations=[
                FastApiIntegration(),
                SqlalchemyIntegration(),
                RedisIntegration(),
            ],
        )
        logger.info("sentry_initialized")
    except Exception as e:
        logger.error("sentry_init_failed", error=str(e))


def init_otel(app: Any) -> None:
    """Initialize OpenTelemetry if OTEL_ENDPOINT is configured."""
    if not settings.otel_endpoint:
        logger.info("otel_disabled_no_endpoint")
        return
    try:
        from opentelemetry import trace
        from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import (
            OTLPSpanExporter,
        )
        from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
        from opentelemetry.instrumentation.redis import RedisInstrumentor
        from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
        from opentelemetry.sdk.resources import Resource
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import BatchSpanProcessor

        resource = Resource.create(
            {"service.name": "personaforge-backend", "service.version": settings.app_version}
        )
        provider = TracerProvider(resource=resource)
        provider.add_span_processor(
            BatchSpanProcessor(OTLPSpanExporter(endpoint=settings.otel_endpoint))
        )
        trace.set_tracer_provider(provider)

        FastAPIInstrumentor.instrument_app(app)
        RedisInstrumentor().instrument()
        # SQLAlchemy instrumentation needs the engine
        from app.database.session import engine
        SQLAlchemyInstrumentor().instrument(engine=engine.sync_engine)
        logger.info("otel_initialized", endpoint=settings.otel_endpoint)
    except ImportError:
        logger.warning("otel_packages_not_installed")
    except Exception as e:
        logger.error("otel_init_failed", error=str(e))
