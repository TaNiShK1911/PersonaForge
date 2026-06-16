"""
Test: RBAC + auth.
"""
import pytest
from app.core.auth import create_access_token, decode_token, ROLE_PERMISSIONS


def test_token_round_trip():
    token = create_access_token("u1", "user@test.com", "admin")
    payload = decode_token(token)
    assert payload["sub"] == "u1"
    assert payload["email"] == "user@test.com"
    assert payload["role"] == "admin"


def test_admin_has_all_permissions():
    perms = ROLE_PERMISSIONS["admin"]
    assert "users:read" in perms
    assert "admin:write" in perms
    assert "personalization:write" in perms


def test_viewer_is_read_only():
    perms = ROLE_PERMISSIONS["viewer"]
    assert "users:read" in perms
    assert "personalization:write" not in perms
    assert "users:write" not in perms


def test_analyst_cannot_admin():
    perms = ROLE_PERMISSIONS["analyst"]
    assert "admin:read" not in perms
    assert "personalization:write" in perms
