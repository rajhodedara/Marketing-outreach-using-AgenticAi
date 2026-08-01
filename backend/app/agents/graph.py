from __future__ import annotations

from langgraph.graph import StateGraph, START, END

from app.agents.state import PipelineState
from app.agents.supervisor import supervisor_node
from app.agents.research import research_node
from app.agents.persona import persona_node
from app.agents.intent import intent_node
from app.agents.action import action_node
from app.agents.critic import critic_node, strip_unsupported_claims_node

def route_critic(state: PipelineState) -> str:
    verdict = state.get("critic_verdict")
    retry_count = state.get("critic_retry_count", 0)
    
    if verdict and verdict.overall_pass:
        return "end"
    
    if retry_count < 2:
        return "retry"
        
    return "strip"

def create_abm_graph() -> StateGraph:
    """
    Creates and wires the LangGraph for the ABM Orchestrator.
    """
    builder = StateGraph(PipelineState)
    
    # Add Nodes
    builder.add_node("supervisor", supervisor_node)
    builder.add_node("research", research_node)
    builder.add_node("persona", persona_node)
    builder.add_node("intent", intent_node)
    builder.add_node("action", action_node)
    
    # Add Edges
    builder.add_edge(START, "supervisor")
    
    # Fan-out from supervisor to parallel nodes
    builder.add_edge("supervisor", "research")
    builder.add_edge("supervisor", "persona")
    builder.add_edge("supervisor", "intent")
    
    # Fan-in from parallel nodes to action
    builder.add_edge("research", "action")
    builder.add_edge("persona", "action")
    builder.add_edge("intent", "action")
    
    # End node (Critic will be added in Phase 4)
    builder.add_node("critic", critic_node)
    builder.add_node("strip", strip_unsupported_claims_node)
    
    builder.add_edge("action", "critic")
    
    builder.add_conditional_edges(
        "critic",
        route_critic,
        {
            "end": END,
            "retry": "action",
            "strip": "strip"
        }
    )
    
    builder.add_edge("strip", END)
    
    return builder.compile()

# Provide a compiled instance of the graph
graph = create_abm_graph()
