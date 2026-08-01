from __future__ import annotations

import logging
from app.agents.state import PipelineState

logger = logging.getLogger(__name__)

def supervisor_node(state: PipelineState) -> dict:
    """
    Supervisor node to orchestrate the pipeline.
    It simply triggers the parallel fan-out for the research, persona, and intent nodes.
    """
    logger.info(f"Starting orchestration for account: {state.get('company_name', 'Unknown')}")
    
    # Return any state updates if necessary. 
    # For now, we can just return a status or nothing, since LangGraph will fan out based on edges.
    return {"next_step": "fan_out"}
