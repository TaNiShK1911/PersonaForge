"""
PersonaForge — Pydantic Schemas (User)
=======================================
All API request/response schemas. The Next.js API routes
in src/app/api/** mirror these schemas exactly via Zod.
"""

from pydantic import BaseModel, Field, EmailStr, field_validator
from typing import Optional, List, Literal
from datetime import datetime
from uuid import UUID


class UserFeatures(BaseModel):
    avgSessionLength: float
    searchCount: float
    productClicks: float
    addToCartCount: float
    wishlistCount: float
    scrollDepthAvg: float
    priceSensitivity: float = Field(ge=0, le=1)
    brandAffinity: float = Field(ge=0, le=1)
    urgencyResponse: float = Field(ge=0, le=1)
    socialProofResponse: float = Field(ge=0, le=1)
    discountResponse: float = Field(ge=0, le=1)
    reviewReliance: float = Field(ge=0, le=1)
    trendAffinity: float = Field(ge=0, le=1)
    embeddingX: float = Field(ge=0, le=1)
    embeddingY: float = Field(ge=0, le=1)


class UserBase(BaseModel):
    email: Optional[EmailStr] = None
    name: Optional[str] = None
    persona_kind: Optional[str] = None
    features: Optional[UserFeatures] = None


class UserOut(UserBase):
    id: str
    converted: bool = False
    revenue: float = 0
    sessions: int = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserListResponse(BaseModel):
    users: List[UserOut]
    pagination: dict


class UserListQuery(BaseModel):
    limit: int = Field(default=50, ge=1, le=100)
    offset: int = Field(default=0, ge=0)
    persona: Optional[str] = None
    search: Optional[str] = Field(default=None, max_length=64)
    converted: Optional[Literal["true", "false"]] = None


class EventSchema(BaseModel):
    user_id: str = Field(min_length=3, max_length=64)
    type: Literal[
        "page_view", "scroll_depth", "search", "product_click",
        "add_to_cart", "wishlist", "purchase", "time_on_page", "exit",
    ]
    timestamp: Optional[int] = Field(default=None, gt=0)
    page_depth: Optional[int] = Field(default=None, ge=0)
    product_id: Optional[str] = None
    query: Optional[str] = None
    scroll_pct: Optional[int] = Field(default=None, ge=0, le=100)
    dwell_sec: Optional[int] = Field(default=None, ge=0)
    price: Optional[float] = Field(default=None, ge=0)
    discount_seen: Optional[bool] = False
    social_proof_seen: Optional[bool] = False
    review_seen: Optional[bool] = False
    urgency_seen: Optional[bool] = False


class EventBatch(BaseModel):
    events: List[EventSchema] = Field(min_length=1, max_length=500)


class CounterfactualRequest(BaseModel):
    user_id: str = Field(min_length=3, max_length=64)
    treatments: Optional[dict] = None
    scenarios: Optional[List[dict]] = None


class PersonalizeRequest(BaseModel):
    user_id: str = Field(min_length=3, max_length=64)
    channel: Optional[Literal["email", "ad", "push", "headline"]] = "email"
    tone: Optional[Literal["professional", "casual", "persuasive", "urgent"]] = "professional"
    use_cache: Optional[bool] = True


class BanditUpdateRequest(BaseModel):
    steps: int = Field(default=1, ge=1, le=100)
    reset: Optional[bool] = False


class HealthResponse(BaseModel):
    status: Literal["healthy", "degraded", "unhealthy"]
    timestamp: str
    version: str
    uptime: int
    services: dict
