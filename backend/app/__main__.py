"""Run with: python -m app"""
import uvicorn
from app.config import settings

uvicorn.run(
    "app.main:app",
    host="0.0.0.0",
    port=int(__import__("os").environ.get("PORT", "8000")),
    reload=settings.debug,
    workers=1 if settings.debug else 4,
)
