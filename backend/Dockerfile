# ============================================================
# PersonaForge — Backend Dockerfile (FastAPI reference)
# ============================================================

FROM python:3.12-slim

WORKDIR /app

# System deps for DoWhy / CausalML / PyTorch
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgomp1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# App code
COPY app/ ./app/
COPY alembic.ini .
COPY alembic/ ./alembic/

# Non-root user
RUN useradd -m -u 1001 backend && chown -R backend:backend /app
USER backend

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
