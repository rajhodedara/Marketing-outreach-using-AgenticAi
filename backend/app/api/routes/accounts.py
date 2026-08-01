from __future__ import annotations

import json
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.db.models import Account, AnalysisSession
from app.core.llm import get_openrouter_llm
from langchain_core.messages import SystemMessage, HumanMessage

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/accounts")
async def list_accounts(
    db: AsyncSession = Depends(get_db)
) -> dict:
    """List all accounts."""
    result = await db.execute(select(Account).order_by(Account.updated_at.desc()))
    accounts = result.scalars().all()
    
    account_list = []
    for a in accounts:
        session_result = await db.execute(
            select(AnalysisSession)
            .where(AnalysisSession.account_id == a.id)
            .order_by(AnalysisSession.started_at.desc())
            .limit(1)
        )
        latest_session = session_result.scalar_one_or_none()
        
        intent_score = "--"
        status_label = "Pending"
        stakeholders_count = 0
        
        if latest_session and latest_session.result_json:
            status_label = "Analyzed"
            import json
            try:
                res_dict = json.loads(latest_session.result_json)
                intent_score = res_dict.get("intent", {}).get("overall_intent_score", "--")
                stakeholders_count = len(res_dict.get("stakeholders", []))
            except Exception:
                pass
        
        account_list.append({
            "id": a.id,
            "company_name": a.company_name,
            "domain": a.domain,
            "industry": a.industry,
            "created_at": a.created_at.isoformat() if a.created_at else None,
            "intent_score": intent_score,
            "status": status_label,
            "stakeholders_count": stakeholders_count
        })

    return {
        "accounts": account_list
    }


@router.get("/accounts/{account_id}")
async def get_account(
    account_id: str, 
    db: AsyncSession = Depends(get_db)
) -> dict:
    """Get account details including latest analysis."""
    result = await db.execute(select(Account).where(Account.id == account_id))
    account = result.scalar_one_or_none()
    if account is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")

    # Get latest analysis session
    session_result = await db.execute(
        select(AnalysisSession)
        .where(AnalysisSession.account_id == account_id)
        .order_by(AnalysisSession.started_at.desc())
        .limit(1)
    )
    latest_session = session_result.scalar_one_or_none()

    return {
        "id": account.id,
        "company_name": account.company_name,
        "domain": account.domain,
        "industry": account.industry,
        "created_at": account.created_at.isoformat() if account.created_at else None,
        "latest_analysis": {
            "id": latest_session.id,
            "status": latest_session.status,
            "started_at": latest_session.started_at.isoformat() if latest_session and latest_session.started_at else None,
            "completed_at": latest_session.completed_at.isoformat() if latest_session and latest_session.completed_at else None,
            "result": json.loads(latest_session.result_json) if latest_session and latest_session.result_json else None,
        } if latest_session else None,
    }

@router.post("/accounts/{account_id}/drafts/{draft_index}/regenerate")
async def regenerate_draft(
    account_id: str,
    draft_index: int,
    db: AsyncSession = Depends(get_db)
) -> dict:
    """Regenerate a specific outreach draft."""
    # Get latest analysis session
    session_result = await db.execute(
        select(AnalysisSession)
        .where(AnalysisSession.account_id == account_id)
        .order_by(AnalysisSession.started_at.desc())
        .limit(1)
    )
    latest_session = session_result.scalar_one_or_none()
    
    if not latest_session or not latest_session.result_json:
        raise HTTPException(status_code=404, detail="No analysis found")

    data = json.loads(latest_session.result_json)
    drafts = data.get("outreach_drafts", [])
    
    if draft_index < 0 or draft_index >= len(drafts):
        raise HTTPException(status_code=404, detail="Draft not found")

    draft = drafts[draft_index]
    
    # Prompt LLM to regenerate
    llm = get_openrouter_llm(temperature=0.7)
    if not llm:
        raise HTTPException(status_code=500, detail="LLM not configured")
        
    messages = [
        SystemMessage(content="You are an expert enterprise B2B sales copywriter. Your goal is to rewrite and improve the following outreach draft. Make it more compelling, highly tailored, and professional. Output ONLY the raw rewritten email content. Do not output anything before or after the content."),
        HumanMessage(content=f"Rewrite this email targeted at {draft.get('target_persona')}:\n\n{draft.get('content')}")
    ]
    response = await llm.ainvoke(messages)
    
    # Update draft
    draft["content"] = response.content
    drafts[draft_index] = draft
    data["outreach_drafts"] = drafts
    
    latest_session.result_json = json.dumps(data)
    await db.commit()
    
    return {"status": "success", "draft": draft}
