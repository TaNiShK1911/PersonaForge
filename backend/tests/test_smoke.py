"""
Smoke test: verify all backend modules import without error.
Does NOT require DB or Redis — just checks the code is wired correctly.
"""
import importlib
import sys


def test_imports():
    """All modules listed in __init__ files should import cleanly."""
    modules = [
        "app",
        "app.config",
        "app.main",
        "app.models",
        "app.schemas",
        "app.api",
        "app.api.health",
        "app.api.metrics",
        "app.api.users",
        "app.api.personas",
        "app.api.analytics",
        "app.api.bandit",
        "app.api.counterfactual",
        "app.api.personalize",
        "app.api.events",
        "app.services",
        "app.services.persona_service",
        "app.services.causal_service",
        "app.services.counterfactual_service",
        "app.services.personalization_service",
        "app.services.bandit_service",
        "app.services.event_pipeline",
        "app.core",
        "app.core.logging",
        "app.core.monitoring",
        "app.core.auth",
        "app.core.security",
        "app.database",
        "app.database.session",
        "app.database.redis",
    ]
    failures = []
    for mod in modules:
        try:
            importlib.import_module(mod)
        except Exception as e:
            failures.append(f"{mod}: {e}")
    assert not failures, "Import failures:\n  " + "\n  ".join(failures)


def test_main_app_has_routes():
    """The FastAPI app should expose all 9 documented routes."""
    from app.main import app
    paths = {r.path for r in app.routes}
    expected = {
        "/", "/health", "/docs", "/redoc", "/openapi.json",
        "/users", "/users/{user_id}",
        "/personas", "/analytics",
        "/bandit", "/bandit/update",
        "/counterfactual", "/personalize",
        "/events", "/metrics",
        "/metrics/prometheus",
    }
    missing = expected - paths
    assert not missing, f"Missing routes: {missing}"
