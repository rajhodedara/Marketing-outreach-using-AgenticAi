from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload
from typing import List, Optional
import logging

from app.db.session import get_db
from app.db.models import IntentSignal, Account

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/signals")
async def get_signals(
    limit: int = Query(500, description="Max number of signals to retrieve"),
    db: AsyncSession = Depends(get_db)
):
    """Get the latest intent and whitespace signals globally."""
    # We load account info too so the frontend can display the company name
    stmt = (
        select(IntentSignal, Account)
        .join(Account, IntentSignal.account_id == Account.id)
        .order_by(IntentSignal.created_at.desc())
        .limit(limit)
    )
    result = await db.execute(stmt)
    rows = result.all()
    
    signals = []
    for sig, acc in rows:
        signals.append({
            "id": sig.id,
            "account_id": sig.account_id,
            "company_name": acc.company_name,
            "signal_type": sig.signal_type,
            "content": sig.content,
            "source_id": sig.source_id,
            "score": sig.score,
            "created_at": sig.created_at.isoformat() if sig.created_at else None
        })
        
    return {"signals": signals}

@router.post("/mock-generate")
async def mock_generate_signal(
    signal_type: str = Query("intent"),
    score: int = Query(85),
    db: AsyncSession = Depends(get_db)
):
    """Test endpoint to generate a signal and broadcast it to websocket."""
    from app.api.routes.ws import broadcast_intelligence
    import random
    
    # Get a random account
    result = await db.execute(select(Account).limit(50))
    accounts = result.scalars().all()
    
    if not accounts:
        return {"error": "No accounts in db. Create one first."}
        
    acc = random.choice(accounts)
    
    contents = [
        "Mentioned budget approval next quarter in meeting",
        "Executive leadership downloaded whitepaper on security",
        "Competitor contract expires in 3 months",
        "Looking for a unified solution across departments",
        "High engagement with recent ABM email campaign"
    ]
    
    new_signal = IntentSignal(
        account_id=acc.id,
        signal_type=signal_type,
        content=random.choice(contents),
        score=score
    )
    
    db.add(new_signal)
    await db.commit()
    await db.refresh(new_signal)
    
    signal_data = {
        "id": new_signal.id,
        "account_id": new_signal.account_id,
        "company_name": acc.company_name,
        "signal_type": new_signal.signal_type,
        "content": new_signal.content,
        "source_id": new_signal.source_id,
        "score": new_signal.score,
        "created_at": new_signal.created_at.isoformat() if new_signal.created_at else None
    }
    
    import json
    await broadcast_intelligence(json.dumps(signal_data))
    
    return {"status": "success", "signal": signal_data}
