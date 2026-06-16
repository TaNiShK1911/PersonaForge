"""
PersonaForge — Authentication + RBAC (FastAPI)
================================================
JWT-based auth with 3 roles: admin, analyst, viewer.
Mirrors the Next.js RBAC in src/lib/auth/rbac.ts.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import settings

# ---------- RBAC ----------

ROLE_PERMISSIONS = {
    "admin": {
        "users:read", "users:write",
        "personas:read", "personas:write",
        "causal:read", "causal:write",
        "counterfactual:read", "counterfactual:write",
        "personalization:read", "personalization:write",
        "bandit:read", "bandit:write",
        "events:read", "events:write",
        "analytics:read", "analytics:write",
        "admin:read", "admin:write",
    },
    "analyst": {
        "users:read",
        "personas:read", "personas:write",
        "causal:read", "causal:write",
        "counterfactual:read", "counterfactual:write",
        "personalization:read", "personalization:write",
        "bandit:read", "bandit:write",
        "events:read", "events:write",
        "analytics:read",
    },
    "viewer": {
        "users:read",
        "personas:read",
        "causal:read",
        "counterfactual:read",
        "personalization:read",
        "bandit:read",
        "events:read",
        "analytics:read",
    },
}

ROLE_HIERARCHY = ["viewer", "analyst", "admin"]

security = HTTPBearer(auto_error=False)


def create_access_token(
    user_id: str, email: str, role: str, expires_minutes: Optional[int] = None
) -> str:
    """Issue a JWT access token."""
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=expires_minutes or settings.jwt_expiry_minutes
    )
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> dict:
    """Decode + verify JWT."""
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> dict:
    """FastAPI dependency: extract + verify JWT."""
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = decode_token(credentials.credentials)
    return {
        "id": payload["sub"],
        "email": payload.get("email"),
        "role": payload.get("role", "viewer"),
    }


def require_permission(permission: str):
    """Dependency factory: require a specific permission."""
    async def _check(user: dict = Depends(get_current_user)) -> dict:
        role = user.get("role", "viewer")
        allowed = ROLE_PERMISSIONS.get(role, set())
        if permission not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: requires '{permission}'. Role '{role}' insufficient.",
            )
        return user
    return _check


def require_role(min_role: str):
    """Dependency factory: require at least the given role."""
    async def _check(user: dict = Depends(get_current_user)) -> dict:
        role = user.get("role", "viewer")
        if ROLE_HIERARCHY.index(role) < ROLE_HIERARCHY.index(min_role):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{role}' insufficient. Requires at least '{min_role}'.",
            )
        return user
    return _check
