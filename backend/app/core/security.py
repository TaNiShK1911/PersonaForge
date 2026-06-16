"""
PersonaForge — Security Middleware (CORS, rate limit, headers)
================================================================
"""

import time
from typing import Optional

from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import settings
from app.core.logging import get_logger
from app.database.redis import get_redis

logger = get_logger(__name__)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add Helmet-style security headers to every response."""

    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Strict-Transport-Security"] = (
            "max-age=31536000; includeSubDomains"
        )
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Token-bucket rate limiter backed by Redis."""

    async def dispatch(self, request: Request, call_next):
        # Skip rate limit on health/metrics
        if request.url.path in ("/health", "/metrics", "/metrics/prometheus", "/docs", "/openapi.json", "/"):
            return await call_next(request)

        client_ip = (
            request.headers.get("x-forwarded-for", "").split(",")[0].strip()
            or request.headers.get("x-real-ip")
            or request.client.host if request.client else "unknown"
        )

        # Tier: AI endpoint gets lower limit
        path = request.url.path
        if path.startswith("/personalize"):
            max_per_min = settings.rate_limit_ai_per_min
        elif path.startswith("/events"):
            max_per_min = 200
        elif path.startswith("/bandit"):
            max_per_min = 30
        else:
            max_per_min = settings.rate_limit_api_per_min

        bucket_key = f"rl:{client_ip}:{path}:{int(time.time() // 60)}"
        try:
            redis = await get_redis()
            count = await redis.incr(bucket_key)
            if count == 1:
                await redis.expire(bucket_key, 60)
            if count > max_per_min:
                logger.warning("rate_limit_exceeded", ip=client_ip, path=path, count=count)
                return JSONResponse(
                    status_code=429,
                    content={"error": "Rate limited", "retry_after_sec": 60},
                    headers={"Retry-After": "60"},
                )
        except Exception as e:
            logger.error("rate_limit_check_failed", error=str(e))
            # Fail open if Redis is down (rare; init would have failed at startup)

        return await call_next(request)
