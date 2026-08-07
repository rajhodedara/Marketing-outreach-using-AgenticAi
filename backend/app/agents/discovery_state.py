from __future__ import annotations

from typing import TypedDict
from app.schemas.discovery import DiscoveredCompany, ICP

class DiscoveryState(TypedDict, total=False):
    """
    LangGraph State for the Autonomous Discovery pipeline.
    """
    session_id: str
    user_prompt: str
    
    # 1. Sequential Generation Outcomes
    icp: ICP | None
    search_strategies: list[str] | None
    
    # 2. Parallel Node Outcomes
    discovered_companies: list[DiscoveredCompany] | None
    executive_briefing: dict | None
    
    # 3. Raw Data Fields
    raw_companies: list[dict]
    raw_signals: list[dict]
    raw_contacts: list[dict]
    
    # 4. Intermediate Generation (Per Company Name)
    sales_contexts: dict[str, dict]
    outreach_sequences: dict[str, dict]
    
    # State tracking
    next_step: str | None
    status: str | None
    step_count: int
    progress_percent: int
    current_agent_status: dict
