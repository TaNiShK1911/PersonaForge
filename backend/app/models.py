"""
PersonaForge — SQLAlchemy Models (Reference)
=============================================
Mirrors the Prisma schema in prisma/schema.prisma.
Used when deploying the FastAPI backend separately.
"""

from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, BigInteger,
    ForeignKey, JSON, Text, Index, UniqueConstraint
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship, declarative_base
from datetime import datetime
import uuid

Base = declarative_base()


class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    external_id = Column(String, unique=True, nullable=True)
    email = Column(String, unique=True, nullable=True)
    name = Column(String, nullable=True)
    persona_kind = Column(String, ForeignKey("personas.kind"), nullable=True)
    features = Column(JSON, nullable=False)
    converted = Column(Boolean, default=False)
    revenue = Column(Float, default=0)
    sessions = Column(Integer, default=0)
    deleted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    persona = relationship("Persona", back_populates="users")
    events = relationship("Event", back_populates="user", cascade="all, delete-orphan")


class Persona(Base):
    __tablename__ = "personas"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    kind = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    tagline = Column(String)
    traits = Column(JSON)
    embedding = Column(JSON)
    confidence = Column(Float, default=0)
    member_count = Column(Integer, default=0)
    avg_conversion = Column(Float, default=0)
    avg_revenue = Column(Float, default=0)
    top_features = Column(JSON)
    color = Column(String)
    emoji = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    users = relationship("User", back_populates="persona")


class Event(Base):
    __tablename__ = "events"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    type = Column(String, nullable=False)
    timestamp = Column(BigInteger, nullable=False)
    page_depth = Column(Integer, default=0)
    product_id = Column(String)
    query = Column(String)
    scroll_pct = Column(Integer)
    dwell_sec = Column(Integer)
    price = Column(Float)
    discount_seen = Column(Boolean, default=False)
    social_proof_seen = Column(Boolean, default=False)
    review_seen = Column(Boolean, default=False)
    urgency_seen = Column(Boolean, default=False)
    properties = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="events")

    __table_args__ = (
        Index("idx_events_user", "user_id"),
        Index("idx_events_type", "type"),
        Index("idx_events_timestamp", "timestamp"),
        Index("idx_events_user_timestamp", "user_id", "timestamp"),
    )
