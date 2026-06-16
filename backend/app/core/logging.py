"""
PersonaForge — Structured Logging
==================================
Uses structlog for JSON-formatted logs in production, console in dev.
"""

import logging
import sys

import structlog

from app.config import settings


def setup_logging() -> None:
    """Configure structlog + stdlib logging. Called once at startup."""
    log_level = getattr(logging, settings.log_level.upper(), logging.INFO)

    # Shared timestamper
    shared_processors = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
    ]

    if settings.environment == "production":
        # JSON for log aggregators
        renderer = structlog.processors.JSONRenderer()
        logging.basicConfig(
            format="%(message)s",
            stream=sys.stdout,
            level=log_level,
        )
    else:
        # Colored console in dev
        renderer = structlog.dev.ConsoleRenderer(colors=True)
        logging.basicConfig(
            format="%(message)s",
            stream=sys.stdout,
            level=log_level,
        )

    structlog.configure(
        processors=shared_processors + [renderer],
        wrapper_class=structlog.make_filtering_bound_logger(log_level),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )


def get_logger(name: str) -> structlog.stdlib.BoundLogger:
    """Return a bound logger."""
    return structlog.get_logger(name)
