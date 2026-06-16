"""
PersonaForge — Backend Test Config
====================================
"""

import os
import sys
from pathlib import Path

# Add backend/ to sys.path so `import app` works
BACKEND_DIR = Path(__file__).parent.parent
sys.path.insert(0, str(BACKEND_DIR))

# Test env vars
os.environ.setdefault("DATABASE_URL", "postgresql://forge:forge_dev@localhost:5432/personaforge_test")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/15")  # DB 15 for tests
os.environ.setdefault("JWT_SECRET", "test-secret")
os.environ.setdefault("ENVIRONMENT", "test")
os.environ.setdefault("LOG_LEVEL", "warning")
