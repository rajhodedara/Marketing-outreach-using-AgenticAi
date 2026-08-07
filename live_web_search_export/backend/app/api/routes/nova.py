from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db, async_session_maker
from app.agents.discovery_graph import discovery_graph
from app.core.events import get_queue, close_queue, publish_event
import asyncio
from app.db.models import Integration, Account, AnalysisSession, OutreachSequence, SearchCampaign

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Schemas ──────────────────────────────────────────────────────────


class SearchRequest(BaseModel):
    query: str

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


# ── Live Web Search Endpoints ────────────────────────────────────────

@router.post("/nova/search")
async def start_search(
    request: SearchRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
) -> dict:
    campaign = SearchCampaign(
        id=str(uuid.uuid4()),
        query=request.query,
        status="pending",
        started_at=datetime.now(timezone.utc)
    )
    db.add(campaign)
    await db.commit()
    
    background_tasks.add_task(run_discovery_pipeline, campaign.id, request.query)
    
    return {
        "session_id": campaign.id,
        "query": request.query,
        "status": "pending",
        "message": "Search campaign started."
    }

async def run_discovery_pipeline(session_id: str, query: str):
    try:
        async with async_session_maker() as db:
            campaign = await db.get(SearchCampaign, session_id)
            if campaign:
                campaign.status = "running"
                await db.commit()
                
        initial_state = {
            "session_id": session_id,
            "user_prompt": query,
            "icp": None,
            "discovered_companies": [],
            "next_step": None,
            "status": "running",
            "step_count": 0
        }
        
        final_state = initial_state.copy()
        try:
            async for output in discovery_graph.astream(initial_state):
                for node_name, state_update in output.items():
                    if isinstance(state_update, dict):
                        final_state.update(state_update)
        except Exception as e:
            logger.error(f"Graph execution failed: {e}")
            raise e
        
        await asyncio.sleep(1.0)
        
        async with async_session_maker() as db:
            campaign = await db.get(SearchCampaign, session_id)
            if campaign:
                campaign.status = "completed"
                campaign.completed_at = datetime.now(timezone.utc)
                
                # Convert DiscoveredCompany objects to dicts
                companies = final_state.get("discovered_companies", [])
                companies_dict = [c.model_dump() for c in companies]
                
                executive_briefing = final_state.get("executive_briefing", {})
                
                campaign.result_json = json.dumps({
                    "discovered_companies": companies_dict,
                    "executive_briefing": executive_briefing
                })
                await db.commit()
                
        close_queue(session_id)
        
    except Exception as e:
        logger.error(f"Discovery pipeline failed: {e}")
        async with async_session_maker() as db:
            campaign = await db.get(SearchCampaign, session_id)
            if campaign:
                campaign.status = "failed"
                campaign.completed_at = datetime.now(timezone.utc)
                await db.commit()
        await publish_event(session_id, json.dumps({"node": "system", "agent": "System", "message": f"Error: {str(e)}"}))
        close_queue(session_id)


@router.get("/nova/search/{session_id}/stream")
async def stream_search(session_id: str):
    async def event_generator():
        queue = get_queue(session_id)
        while True:
            data = await queue.get()
            if data is None:
                yield "data: [DONE]\n\n"
                break
            yield f"data: {data}\n\n"
            
    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.get("/nova/search/{session_id}")
async def get_search_result(
    session_id: str,
    db: AsyncSession = Depends(get_db)
) -> dict:
    result = await db.execute(select(SearchCampaign).where(SearchCampaign.id == session_id))
    campaign = result.scalar_one_or_none()
    
    if not campaign:
        raise HTTPException(status_code=404, detail="Search campaign not found")
        
    return {
        "session_id": campaign.id,
        "query": campaign.query,
        "status": campaign.status,
        "result": json.loads(campaign.result_json) if campaign.result_json else None
    }



class SaveAccountRequest(BaseModel):
    company: dict
    executive_briefing: dict

@router.post("/nova/accounts/save")
async def save_discovered_account(
    request: SaveAccountRequest,
    db: AsyncSession = Depends(get_db)
) -> dict:
    from app.db.models import IntentSignal
    
    company = request.company
    domain = company.get("domain") or f"{company.get('company_name', '').lower().replace(' ', '')}.com"
    
    # Create or update Account
    result = await db.execute(select(Account).where(Account.domain == domain))
    account = result.scalar_one_or_none()
    
    if not account:
        account = Account(
            id=str(uuid.uuid4()),
            company_name=company.get("company_name"),
            domain=domain,
            industry=company.get("industry"),
        )
        db.add(account)
    
    # Store the entire intelligence payload as an AnalysisSession to preserve history
    session = AnalysisSession(
        id=str(uuid.uuid4()),
        account_id=account.id,
        status="completed",
        started_at=datetime.now(timezone.utc),
        completed_at=datetime.now(timezone.utc),
        result_json=json.dumps({
            "discovery_context": {
                "company": company,
                "executive_briefing": request.executive_briefing
            }
        })
    )
    db.add(session)
    
    # Store discrete signals for opportunity calculation
    why_now = company.get("why_now", [])
    for wn in why_now:
        sig = IntentSignal(
            id=str(uuid.uuid4()),
            account_id=account.id,
            signal_type="intent",
            content=json.dumps(wn),
            score=company.get("opportunity_score", 50),
            created_at=datetime.now(timezone.utc)
        )
        db.add(sig)
        
    await db.commit()
    
    return {"message": "Account and intelligence preserved successfully", "account_id": account.id}

@router.get("/nova/campaigns")

async def list_campaigns(db: AsyncSession = Depends(get_db)) -> dict:
    query = select(SearchCampaign).order_by(SearchCampaign.started_at.desc())
    result = await db.execute(query)
    campaigns = result.scalars().all()
    
    return {
        "campaigns": [
            {
                "id": c.id,
                "query": c.query,
                "status": c.status,
                "started_at": c.started_at.isoformat() if c.started_at else None
            }
            for c in campaigns
        ]
    }

class RegenerateOutreachRequest(BaseModel):
    company_name: str
    tone: str

@router.post("/nova/search/{session_id}/regenerate-outreach")
async def regenerate_outreach(
    session_id: str,
    request: RegenerateOutreachRequest,
    db: AsyncSession = Depends(get_db)
) -> dict:
    from app.schemas.discovery import OutreachSequence
    from app.core.llm import get_openrouter_llm
    from langchain_groq import ChatGroq
    from app.config import settings
    
    result = await db.execute(select(SearchCampaign).where(SearchCampaign.id == session_id))
    campaign = result.scalar_one_or_none()
    
    if not campaign or not campaign.result_json:
        raise HTTPException(status_code=404, detail="Campaign not found")
        
    data = json.loads(campaign.result_json)
    companies = data.get("companies", data.get("discovered_companies", []))
    
    target_company = next((c for c in companies if c.get("company_name") == request.company_name), None)
    if not target_company:
        raise HTTPException(status_code=404, detail="Company not found in campaign")
        
    sales_context = target_company.get("sales_context", {})
    
    try:
        llm = get_openrouter_llm(temperature=0.7)
        if not llm:
            llm = ChatGroq(temperature=0.7, api_key=settings.groq_api_key, model_name="llama-3.3-70b-versatile")
            
        structured_llm = llm.with_structured_output(OutreachSequence)
        
        prompt = f"""
        Generate a highly personalized, 3-step cold email sequence (Initial, Follow-up, Breakup) for the company using the provided Sales Context.
        SALES CONTEXT: {json.dumps(sales_context)}
        TONE: {request.tone}
        
        CRITICAL INSTRUCTIONS:
        - Avoid generic phrases. Reference exact details from the Sales Context.
        - Write the emails using the specified TONE: {request.tone}.
        - Email 1: Use the trigger event and business challenge.
        - Email 2: Add additional insight.
        - Email 3: Close the loop respectfully.
        """
        
        new_sequence = await structured_llm.ainvoke(prompt)
        target_company["outreach_sequence"] = new_sequence.model_dump()
        
        campaign.result_json = json.dumps(data)
        await db.commit()
        
        return {"outreach_sequence": target_company["outreach_sequence"]}
    except Exception as e:
        logger.error(f"Failed to regenerate outreach: {e}")
        raise HTTPException(status_code=500, detail="Failed to regenerate outreach")
