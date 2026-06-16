"""Prometheus metrics endpoint."""
from fastapi import APIRouter, Response

from prometheus_fastapi_instrumentator import Instrumentator

router = APIRouter()


@router.get("")
async def metrics():
    """Prometheus exposition format."""
    # The Instrumentator in main.py exposes /metrics/prometheus;
    # this route is a friendly alias.
    return Response(
        content="# PersonaForge metrics — see /metrics/prometheus\n",
        media_type="text/plain",
    )
