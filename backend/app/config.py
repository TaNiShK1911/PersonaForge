"""
PersonaForge — App Configuration (Pydantic Settings)
=====================================================
"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # Environment
    debug: bool = False
    environment: str = "development"
    log_level: str = "info"

    # Database
    database_url: str = "postgresql://forge:forge_dev@localhost:5432/personaforge"
    db_pool_size: int = 10
    db_max_overflow: int = 20

    # Redis
    redis_url: str = "redis://localhost:6379"

    # Auth
    jwt_secret: str = "change-me"
    jwt_algorithm: str = "HS256"
    jwt_expiry_minutes: int = 60 * 24

    # AI providers (priority: claude > gemini > openai > template)
    anthropic_api_key: str = ""
    gemini_api_key: str = ""
    openai_api_key: str = ""
    ai_provider_timeout_ms: int = 12000

    # CORS
    cors_origins: List[str] = ["http://localhost:3000"]

    # Monitoring
    sentry_dsn: str = ""
    sentry_traces_sample_rate: float = 0.1
    otel_endpoint: str = ""

    # Rate limits
    rate_limit_public_per_min: int = 100
    rate_limit_api_per_min: int = 60
    rate_limit_ai_per_min: int = 10


settings = Settings()
