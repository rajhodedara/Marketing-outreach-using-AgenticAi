from __future__ import annotations

import uuid
from datetime import datetime, timezone
from sqlalchemy import String, ForeignKey, Text, DateTime
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from typing import Optional

class Base(DeclarativeBase):
    pass

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

class Account(Base):
    __tablename__ = "accounts"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    company_name: Mapped[str] = mapped_column(String, index=True)
    domain: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    industry: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

class Upload(Base):
    __tablename__ = "uploads"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    account_id: Mapped[str] = mapped_column(ForeignKey("accounts.id"), index=True)
    filename: Mapped[str] = mapped_column(String)
    file_type: Mapped[str] = mapped_column(String) # crm_json/transcript/email
    status: Mapped[str] = mapped_column(String, default="pending") # pending/processed/failed
    raw_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    masked_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

class AnalysisSession(Base):
    __tablename__ = "analysis_sessions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    account_id: Mapped[str] = mapped_column(ForeignKey("accounts.id"), index=True)
    status: Mapped[str] = mapped_column(String, default="pending") # pending/running/completed/failed
    result_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


class Integration(Base):
    __tablename__ = "integrations"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    provider: Mapped[str] = mapped_column(String, index=True)  # google_calendar, gmail, linkedin, salesforce, hubspot, slack, gong, calendly
    status: Mapped[str] = mapped_column(String, default="disconnected")  # connected/disconnected
    credentials_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # encrypted API key/token
    config_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # provider-specific config
    last_synced: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class OutreachSequence(Base):
    __tablename__ = "outreach_sequences"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    account_id: Mapped[str] = mapped_column(ForeignKey("accounts.id"), index=True)
    name: Mapped[str] = mapped_column(String)
    status: Mapped[str] = mapped_column(String, default="draft")  # draft/active/paused/completed
    steps_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON array of sequence steps
    target_persona: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

class IntentSignal(Base):
    __tablename__ = "intent_signals"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    account_id: Mapped[str] = mapped_column(ForeignKey("accounts.id"), index=True)
    signal_type: Mapped[str] = mapped_column(String)  # intent, whitespace, risk
    content: Mapped[str] = mapped_column(Text)
    source_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    score: Mapped[int] = mapped_column(default=50)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

class OutreachCampaign(Base):
    __tablename__ = "outreach_campaigns"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    account_id: Mapped[str] = mapped_column(ForeignKey("accounts.id"), index=True)
    ae_user_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    channel: Mapped[str] = mapped_column(String)  # email, linkedin
    draft_content: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String, default="PENDING")  # PENDING, APPROVED, REJECTED, SENT, FAILED
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)


async def create_tables(engine) -> None:
    """Create all tables in the database."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

