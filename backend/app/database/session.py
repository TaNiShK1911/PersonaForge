"""
PersonaForge — Database Session + Connection Pool
==================================================
SQLAlchemy async engine + session factory with connection pooling.
PostgreSQL is a hard dependency — the service will not start without
a valid DATABASE_URL pointing to a reachable Postgres instance.
"""

import asyncio
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

# Async engine with pool sizing from settings
engine = create_async_engine(
    settings.database_url.replace("postgresql://", "postgresql+asyncpg://"),
    pool_size=settings.db_pool_size,
    max_overflow=settings.db_max_overflow,
    pool_pre_ping=True,
    pool_recycle=3600,
    echo=settings.debug,
)

SessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


async def verify_database_connection() -> None:
    """
    Called at startup. Raises if Postgres is unreachable so the
    service fails fast instead of serving errors.
    """
    logger.info("verifying_database_connection", url=settings.database_url.split("@")[-1])
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        logger.info("database_connection_ok")
    except Exception as e:
        logger.error("database_connection_failed", error=str(e))
        raise RuntimeError(
            f"Cannot connect to PostgreSQL at {settings.database_url.split('@')[-1]}. "
            f"Database is a hard dependency. Error: {e}"
        ) from e


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency that yields a session."""
    async with SessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def close_db() -> None:
    """Called at shutdown."""
    await engine.dispose()
    logger.info("database_engine_disposed")
