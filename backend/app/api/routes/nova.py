from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.db.models import Integration, Account, AnalysisSession, OutreachSequence

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Schemas ──────────────────────────────────────────────────────────

class ConnectRequest(BaseModel):
    api_key: Optional[str] = None
    webhook_url: Optional[str] = None
    config: Optional[dict] = None

class ComposeRequest(BaseModel):
    account_id: str
    channel: str = "email"  # email | linkedin | slack
    tone: str = "professional"  # professional | friendly | executive | technical
    target_persona: Optional[str] = None
    custom_instructions: Optional[str] = None

class SequenceStep(BaseModel):
    day: int
    channel: str  # email | linkedin | phone | slack
    subject: Optional[str] = None
    content: str
    status: str = "scheduled"  # scheduled | sent | opened | replied

class CreateSequenceRequest(BaseModel):
    account_id: str
    name: str
    target_persona: Optional[str] = None
    steps: list[SequenceStep]


# ── Integration Endpoints ────────────────────────────────────────────

INTEGRATION_CATALOG = [
    {"provider": "google_calendar", "name": "Google Calendar", "description": "Book meetings directly from Nova", "category": "Scheduling", "auth_type": "oauth", "icon": "calendar_month"},
    {"provider": "gmail", "name": "Gmail", "description": "Send AI-drafted outreach emails", "category": "Email", "auth_type": "oauth", "icon": "mail"},
    {"provider": "linkedin", "name": "LinkedIn Sales Navigator", "description": "Prospect research & InMail outreach", "category": "Social Selling", "auth_type": "api_key", "icon": "group"},
    {"provider": "salesforce", "name": "Salesforce", "description": "CRM sync, account & contact updates", "category": "CRM", "auth_type": "oauth", "icon": "cloud_sync"},
    {"provider": "hubspot", "name": "HubSpot", "description": "Marketing automation & CRM connector", "category": "CRM", "auth_type": "api_key", "icon": "hub"},
    {"provider": "slack", "name": "Slack", "description": "Team alerts on high-intent leads", "category": "Notifications", "auth_type": "webhook", "icon": "chat"},
    {"provider": "gong", "name": "Gong", "description": "Import call transcripts & intelligence", "category": "Call Intelligence", "auth_type": "api_key", "icon": "record_voice_over"},
    {"provider": "calendly", "name": "Calendly", "description": "Embed scheduling links in outreach", "category": "Scheduling", "auth_type": "api_key", "icon": "event_available"},
]


@router.get("/nova/integrations")
async def list_integrations(db: AsyncSession = Depends(get_db)) -> dict:
    """List all available integrations with their connection status."""
    result = await db.execute(select(Integration))
    connected = {i.provider: i for i in result.scalars().all()}

    integrations = []
    for cat in INTEGRATION_CATALOG:
        db_record = connected.get(cat["provider"])
        integrations.append({
            **cat,
            "status": db_record.status if db_record else "disconnected",
            "last_synced": db_record.last_synced.isoformat() if db_record and db_record.last_synced else None,
            "connected_at": db_record.created_at.isoformat() if db_record and db_record.status == "connected" else None,
        })

    return {"integrations": integrations}


@router.post("/nova/integrations/{provider}/connect")
async def connect_integration(
    provider: str,
    body: ConnectRequest,
    db: AsyncSession = Depends(get_db)
) -> dict:
    """Connect an integration by storing credentials."""
    valid_providers = [c["provider"] for c in INTEGRATION_CATALOG]
    if provider not in valid_providers:
        raise HTTPException(status_code=400, detail=f"Unknown provider: {provider}")

    result = await db.execute(select(Integration).where(Integration.provider == provider))
    integration = result.scalar_one_or_none()

    creds = {}
    if body.api_key:
        creds["api_key"] = body.api_key
    if body.webhook_url:
        creds["webhook_url"] = body.webhook_url

    if integration:
        integration.status = "connected"
        integration.credentials_json = json.dumps(creds)
        integration.config_json = json.dumps(body.config) if body.config else integration.config_json
        integration.last_synced = datetime.now(timezone.utc)
    else:
        integration = Integration(
            id=str(uuid.uuid4()),
            provider=provider,
            status="connected",
            credentials_json=json.dumps(creds),
            config_json=json.dumps(body.config) if body.config else None,
            last_synced=datetime.now(timezone.utc),
        )
        db.add(integration)

    await db.commit()
    return {"provider": provider, "status": "connected", "message": f"{provider} connected successfully."}


@router.post("/nova/integrations/{provider}/disconnect")
async def disconnect_integration(
    provider: str,
    db: AsyncSession = Depends(get_db)
) -> dict:
    """Disconnect an integration."""
    result = await db.execute(select(Integration).where(Integration.provider == provider))
    integration = result.scalar_one_or_none()
    if not integration:
        raise HTTPException(status_code=404, detail="Integration not found")

    integration.status = "disconnected"
    integration.credentials_json = None
    await db.commit()
    return {"provider": provider, "status": "disconnected", "message": f"{provider} disconnected."}


# ── Compose Endpoint ─────────────────────────────────────────────────

@router.post("/nova/compose")
async def compose_outreach(
    body: ComposeRequest,
    db: AsyncSession = Depends(get_db)
) -> dict:
    """Generate a personalized outreach message using latest analysis data."""
    # Get latest completed analysis for account
    result = await db.execute(
        select(AnalysisSession)
        .where(AnalysisSession.account_id == body.account_id)
        .where(AnalysisSession.status == "completed")
        .order_by(AnalysisSession.completed_at.desc())
        .limit(1)
    )
    session = result.scalar_one_or_none()

    account_result = await db.execute(select(Account).where(Account.id == body.account_id))
    account = account_result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    # Build context from analysis
    analysis_context = {}
    if session and session.result_json:
        analysis_context = json.loads(session.result_json)

    # Extract key info for composing
    stakeholders = analysis_context.get("stakeholders", [])
    account_plan = analysis_context.get("account_plan", {})
    outreach_drafts = analysis_context.get("outreach_drafts", [])
    intent = analysis_context.get("intent", {})
    research = analysis_context.get("research", {})

    target = body.target_persona
    if not target and stakeholders:
        target = f"{stakeholders[0].get('name', 'Unknown')} ({stakeholders[0].get('role', '')})"

    # Use existing outreach drafts if available
    matched_draft = None
    for draft in outreach_drafts:
        if body.channel.lower() in (draft.get("channel", "") or "").lower():
            matched_draft = draft
            break
    if not matched_draft and outreach_drafts:
        matched_draft = outreach_drafts[0]

    # Build compose response
    pain_points = []
    if isinstance(intent, dict):
        for signal in intent.get("signals", []):
            pain_points.append(signal.get("description", ""))

    strategy = account_plan.get("strategy_summary", "") if isinstance(account_plan, dict) else ""

    tone_instruction = {
        "professional": "Use a polished, business-professional tone.",
        "friendly": "Use a warm, approachable, conversational tone.",
        "executive": "Use a concise, high-level executive briefing tone.",
        "technical": "Use a detailed, technical, data-driven tone."
    }.get(body.tone, "Use a professional tone.")

    # Build draft content
    subject = f"Quick question about {account.company_name}'s {pain_points[0][:50] if pain_points else 'growth strategy'}" if body.channel == "email" else None

    content = matched_draft.get("content", "") if matched_draft else ""
    if not content:
        content = f"Hi {target or 'there'},\n\nI've been researching {account.company_name} and noticed some interesting opportunities.\n\n"
        if pain_points:
            content += f"Specifically, I understand you're dealing with: {pain_points[0]}.\n\n"
        if strategy:
            content += f"{strategy}\n\n"
        content += "Would love to discuss how we can help. Are you available for a quick call this week?\n\nBest regards"

    citations = []
    if isinstance(research, dict):
        for finding in research.get("findings", []):
            for citation in finding.get("citations", []):
                citations.append({
                    "source_id": citation.get("source_id", ""),
                    "quote": citation.get("quote", ""),
                    "topic": finding.get("topic", "")
                })

    return {
        "channel": body.channel,
        "tone": body.tone,
        "target_persona": target,
        "subject": subject,
        "content": content,
        "citations": citations[:5],
        "pain_points": pain_points,
        "strategy_summary": strategy,
        "company_name": account.company_name,
    }


# ── Sequence Endpoints ───────────────────────────────────────────────

@router.get("/nova/sequences")
async def list_sequences(
    account_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
) -> dict:
    """List outreach sequences, optionally filtered by account."""
    query = select(OutreachSequence).order_by(OutreachSequence.updated_at.desc())
    if account_id:
        query = query.where(OutreachSequence.account_id == account_id)
    result = await db.execute(query)
    sequences = result.scalars().all()

    return {
        "sequences": [
            {
                "id": s.id,
                "account_id": s.account_id,
                "name": s.name,
                "status": s.status,
                "target_persona": s.target_persona,
                "steps": json.loads(s.steps_json) if s.steps_json else [],
                "created_at": s.created_at.isoformat(),
                "updated_at": s.updated_at.isoformat(),
            }
            for s in sequences
        ]
    }


@router.post("/nova/sequences")
async def create_sequence(
    body: CreateSequenceRequest,
    db: AsyncSession = Depends(get_db)
) -> dict:
    """Create a new outreach sequence."""
    # Verify account exists
    account = await db.execute(select(Account).where(Account.id == body.account_id))
    if not account.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Account not found")

    sequence = OutreachSequence(
        id=str(uuid.uuid4()),
        account_id=body.account_id,
        name=body.name,
        target_persona=body.target_persona,
        steps_json=json.dumps([s.model_dump() for s in body.steps]),
        status="draft",
    )
    db.add(sequence)
    await db.commit()

    return {
        "id": sequence.id,
        "name": sequence.name,
        "status": "draft",
        "message": "Sequence created successfully.",
    }


@router.patch("/nova/sequences/{sequence_id}/activate")
async def activate_sequence(
    sequence_id: str,
    db: AsyncSession = Depends(get_db)
) -> dict:
    """Activate an outreach sequence."""
    result = await db.execute(select(OutreachSequence).where(OutreachSequence.id == sequence_id))
    sequence = result.scalar_one_or_none()
    if not sequence:
        raise HTTPException(status_code=404, detail="Sequence not found")

    sequence.status = "active"
    await db.commit()
    return {"id": sequence.id, "status": "active", "message": "Sequence activated."}
