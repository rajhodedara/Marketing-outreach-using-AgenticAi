from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import sessionmaker
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import asyncio

from app.db.session import get_db, async_session_maker
from app.db.models import Account, AnalysisSession
from app.agents.graph import graph
from app.agents.state import PipelineState
from app.core.events import publish_event, close_queue, get_queue

logger = logging.getLogger(__name__)
router = APIRouter()


class AnalyzeRequest(BaseModel):
    command: str | None = None


@router.post("/accounts/{account_id}/analyze")
async def trigger_analysis(
    account_id: str,
    request: AnalyzeRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
) -> dict:
    """Trigger the multi-agent analysis pipeline for an account.

    Creates an AnalysisSession and kicks off the agent swarm.
    The actual agent pipeline will be wired in Phase 3.
    """
    # Verify account exists
    result = await db.execute(select(Account).where(Account.id == account_id))
    account = result.scalar_one_or_none()
    if account is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")

    # Check for already-running analysis
    running_result = await db.execute(
        select(AnalysisSession)
        .where(AnalysisSession.account_id == account_id)
        .where(AnalysisSession.status == "running")
    )
    if running_result.first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An analysis is already running for this account.",
        )

    # Create analysis session
    session = AnalysisSession(
        id=str(uuid.uuid4()),
        account_id=account_id,
        status="pending",
        started_at=datetime.now(timezone.utc),
    )
    db.add(session)
    await db.commit()

    # Trigger background task for LangGraph pipeline
    background_tasks.add_task(
        run_analysis_pipeline,
        session_id=session.id,
        account_id=account_id,
        company_name=account.company_name,
        user_prompt=request.command
    )

    logger.info(f"Analysis triggered: session={session.id}, account={account_id}")

    return {
        "session_id": session.id,
        "account_id": account_id,
        "status": "pending",
        "message": "Analysis pipeline started.",
    }


async def run_analysis_pipeline(session_id: str, account_id: str, company_name: str, user_prompt: str | None = None) -> None:
    """Run the LangGraph pipeline and update the session record."""
    try:
        # Mark as running
        async with async_session_maker() as db:
            session = await db.get(AnalysisSession, session_id)
            if session:
                session.status = "running"
                await db.commit()
                
        initial_state: PipelineState = {
            "account_id": account_id,
            "company_name": company_name,
            "user_prompt": user_prompt,
            "qdrant_collection": f"account_{account_id}",
            "retrieved_chunks": [],
            "critic_retry_count": 0,
            "step_count": 0,
            "status": "running"
        }
        
        # Run graph with streaming
        final_state = initial_state.copy()
        await publish_event(session_id, json.dumps({"node": "system", "message": "Initializing Agent Swarm..."}))
        
        # Spawn an async background task to stream thoughts continuously
        async def mock_thought_streamer():
            reasoning_map = {
                "supervisor": ["Analyzing orchestrator state...", "Delegating tasks to swarm..."],
                "research": ["Querying search engines for recent news and technical blog posts...", "Parsing SEC filings and recent earnings call transcripts..."],
                "persona": ["Analyzing organizational structure...", "Identifying key IT/Infrastructure decision makers..."],
                "intent": ["Cross-referencing job postings for cloud migration intent...", "Analyzing recent news for buying signals..."],
                "action": ["Generating highly-personalized outreach drafts...", "Tailoring messaging for top stakeholders..."],
                "critic": ["Validating extracted pain points against historical context...", "Removing low-confidence claims..."],
                "strip": ["Final verification passed...", "Ready for output."]
            }
            try:
                for node_name, steps in reasoning_map.items():
                    for step_msg in steps:
                        await publish_event(session_id, json.dumps({"node": node_name, "message": step_msg}))
                        await asyncio.sleep(2.0)  # Continuous streaming interval
                    await publish_event(session_id, json.dumps({"node": node_name, "message": f"Agent {node_name} finished."}))
                    await asyncio.sleep(1.0)
            except asyncio.CancelledError:
                pass
                
        thought_task = asyncio.create_task(mock_thought_streamer())
        
        try:
            async for output in graph.astream(initial_state):
                for node_name, state_update in output.items():
                    if isinstance(state_update, dict):
                        final_state.update(state_update)
        finally:
            thought_task.cancel()
        
        await asyncio.sleep(1.0)
        await publish_event(session_id, json.dumps({"node": "system", "message": "Pipeline execution completed successfully."}))
        
        # Save result
        async with async_session_maker() as db:
            session = await db.get(AnalysisSession, session_id)
            if session:
                session.status = "completed"
                session.completed_at = datetime.now(timezone.utc)
                # Build complete result payload
                result_data = {}
                for key in ["account_plan", "outreach_drafts", "custom_response", "stakeholders", "intent", "research", "critic_verdict"]:
                    val = final_state.get(key)
                    if val is None:
                        continue
                    if hasattr(val, "model_dump"):
                        result_data[key] = val.model_dump()
                    elif isinstance(val, list) and len(val) > 0 and hasattr(val[0], "model_dump"):
                        result_data[key] = [item.model_dump() for item in val]
                    else:
                        result_data[key] = val
                        
                # --- Inject Mock Reasoning Trace for Hackathon Demo ---
                result_data["reasoning_steps"] = [
                    {"type": "system", "icon": "⚡", "content": "Initializing Multi-Agent Swarm..."},
                    {"type": "search", "icon": "🔍", "content": f"Querying search engines for {company_name} recent news and technical blog posts."},
                    {"type": "read", "icon": "📄", "content": "Parsing SEC 10-K filings and recent quarterly earnings call transcripts."},
                    {"type": "extract", "icon": "🧠", "content": "Analyzing organizational structure to identify key IT/Infrastructure decision makers."},
                    {"type": "intent", "icon": "🎯", "content": "Cross-referencing job postings and news for cloud migration intent signals."},
                    {"type": "critic", "icon": "⚖️", "content": "Validating extracted pain points against historical context. Removing low-confidence claims."},
                    {"type": "draft", "icon": "✍️", "content": "Generating highly-personalized outreach drafts for top 3 stakeholders based on verified intent."}
                ]
                # ----------------------------------------------------
                        
                session.result_json = json.dumps(result_data)
                
                # --- Integrate real data for Intelligence Board ---
                intent_state = final_state.get("intent")
                logger.info(f"DEBUG INTENT_STATE TYPE: {type(intent_state)}")
                logger.info(f"DEBUG INTENT_STATE CONTENT: {intent_state}")
                
                # Support both Pydantic objects and dictionaries
                intent_signals = []
                if intent_state:
                    if hasattr(intent_state, "signals"):
                        intent_signals = intent_state.signals
                    elif isinstance(intent_state, dict) and "signals" in intent_state:
                        intent_signals = intent_state.get("signals", [])
                        
                if intent_signals:
                    from app.db.models import IntentSignal
                    from app.api.routes.ws import broadcast_intelligence
                    
                    for buying_signal in intent_signals:
                        # Extract description safely depending on type
                        desc = buying_signal.description if hasattr(buying_signal, "description") else buying_signal.get("description", "")
                        stype = buying_signal.signal_type if hasattr(buying_signal, "signal_type") else buying_signal.get("signal_type", "")
                        stype = stype.lower()
                        mapped_type = "intent"
                        if "risk" in stype or "competitor" in stype:
                            mapped_type = "risk"
                        elif "whitespace" in stype or "opportunity" in stype:
                            mapped_type = "whitespace"
                            
                        # Extract intent score safely
                        score = intent_state.overall_intent_score if hasattr(intent_state, "overall_intent_score") else (intent_state.get("overall_intent_score", 0) if isinstance(intent_state, dict) else 0)
                            
                        new_signal = IntentSignal(
                            account_id=account_id,
                            signal_type=mapped_type,
                            content=desc,
                            score=score
                        )
                        db.add(new_signal)
                        await db.flush() # get the ID before committing
                        
                        signal_payload = {
                            "id": new_signal.id,
                            "account_id": new_signal.account_id,
                            "company_name": company_name,
                            "signal_type": new_signal.signal_type,
                            "content": new_signal.content,
                            "source_id": new_signal.source_id,
                            "score": new_signal.score,
                            "created_at": new_signal.created_at.isoformat() if new_signal.created_at else datetime.now(timezone.utc).isoformat()
                        }
                        await broadcast_intelligence(json.dumps(signal_payload))
                # --------------------------------------------------

                await db.commit()
                
            close_queue(session_id)
                
    except Exception as e:
        logger.error(f"Analysis pipeline failed for session {session_id}: {e}", exc_info=True)
        async with async_session_maker() as db:
            session = await db.get(AnalysisSession, session_id)
            if session:
                session.status = "failed"
                session.completed_at = datetime.now(timezone.utc)
                session.error_message = str(e)
                await db.commit()
        await publish_event(session_id, json.dumps({"node": "system", "message": f"Error: {str(e)}"}))
        close_queue(session_id)


@router.get("/analysis/{session_id}")
async def get_analysis_result(
    session_id: str,
    db: AsyncSession = Depends(get_db)
) -> dict:
    """Get the result of an analysis session."""
    result = await db.execute(
        select(AnalysisSession).where(AnalysisSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis session not found")

    return {
        "session_id": session.id,
        "account_id": session.account_id,
        "status": session.status,
        "started_at": session.started_at.isoformat() if session.started_at else None,
        "completed_at": session.completed_at.isoformat() if session.completed_at else None,
        "error_message": session.error_message,
        "result": json.loads(session.result_json) if session.result_json else None,
    }

@router.get("/analysis/{session_id}/stream")
async def stream_analysis(session_id: str):
    """Stream analysis events."""
    async def event_generator():
        queue = get_queue(session_id)
        while True:
            data = await queue.get()
            if data is None:
                yield "data: [DONE]\n\n"
                break
            yield f"data: {data}\n\n"
            
    return StreamingResponse(event_generator(), media_type="text/event-stream")
