from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import sessionmaker

from app.db.session import get_db, async_session_maker
from app.db.models import Account, AnalysisSession
from app.agents.graph import graph
from app.agents.state import PipelineState

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/accounts/{account_id}/analyze")
async def trigger_analysis(
    account_id: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
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
    if running_result.scalar_one_or_none():
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
        company_name=account.company_name
    )

    logger.info(f"Analysis triggered: session={session.id}, account={account_id}")

    return {
        "session_id": session.id,
        "account_id": account_id,
        "status": "pending",
        "message": "Analysis pipeline started.",
    }


async def run_analysis_pipeline(session_id: str, account_id: str, company_name: str) -> None:
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
            "qdrant_collection": f"account_{account_id}",
            "retrieved_chunks": [],
            "critic_retry_count": 0,
            "step_count": 0,
            "status": "running"
        }
        
        # Run graph
        final_state = await graph.ainvoke(initial_state)
        
        # Save result
        async with async_session_maker() as db:
            session = await db.get(AnalysisSession, session_id)
            if session:
                session.status = "completed"
                session.completed_at = datetime.now(timezone.utc)
                if final_state.get("account_plan"):
                    # Use model_dump_json for Pydantic models
                    plan = final_state["account_plan"]
                    session.result_json = plan.model_dump_json() if hasattr(plan, "model_dump_json") else json.dumps(plan)
                else:
                    session.result_json = "{}"
                await db.commit()
                
    except Exception as e:
        logger.error(f"Analysis pipeline failed for session {session_id}: {e}", exc_info=True)
        async with async_session_maker() as db:
            session = await db.get(AnalysisSession, session_id)
            if session:
                session.status = "failed"
                session.completed_at = datetime.now(timezone.utc)
                session.error_message = str(e)
                await db.commit()


@router.get("/analysis/{session_id}")
async def get_analysis_result(
    session_id: str,
    db: AsyncSession = Depends(get_db),
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
