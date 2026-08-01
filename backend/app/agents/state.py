from __future__ import annotations

from typing import TypedDict
from app.schemas.ai import (
    ResearchFindings,
    StakeholderProfile,
    IntentSignals,
    AccountPlan,
    OutreachDraft,
    CriticVerdict
)

class PipelineState(TypedDict, total=False):
    """
    LangGraph State for the ABM Orchestrator pipeline.
    """
    account_id: str
    company_name: str
    qdrant_collection: str
    
    # Outcomes from parallel nodes
    research: ResearchFindings | None
    stakeholders: list[StakeholderProfile] | None
    intent: IntentSignals | None
    
    # Outcomes from action node
    account_plan: AccountPlan | None
    outreach_drafts: list[OutreachDraft] | None
    
    # Outcome from critic node (Phase 4)
    critic_verdict: CriticVerdict | None
    critic_retry_count: int
    
    # Retrieved knowledge
    retrieved_chunks: list[str] | None
    
    # State tracking
    next_step: str | None
    status: str | None
    step_count: int
