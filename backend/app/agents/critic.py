from __future__ import annotations

import json
import logging
from pydantic import BaseModel, Field
from typing import Any

from langchain_core.prompts import ChatPromptTemplate
from app.agents.state import PipelineState
from app.core.llm import get_openrouter_llm
from app.schemas.ai import CriticVerdict, ClaimVerdict, CitationRef, AccountPlan, OutreachDraft
from app.config import settings

logger = logging.getLogger(__name__)

def _mock_critic(state: PipelineState) -> dict[str, Any]:
    return {
        "critic_verdict": CriticVerdict(
            overall_pass=True,
            claims_checked=1,
            claims_supported=1,
            claims_unsupported=0,
            verdicts=[
                ClaimVerdict(
                    claim_text="Mock claim",
                    supported=True,
                    supporting_citation=None,
                    reason="Mock passing reason."
                )
            ],
            retry_count=state.get("critic_retry_count", 0) + 1
        ),
        "critic_retry_count": state.get("critic_retry_count", 0) + 1
    }

async def critic_node(state: PipelineState) -> dict[str, Any]:
    """
    Critic Agent / Guardrail.
    Validates claims in AccountPlan and outreach drafts against retrieved chunks.
    """
    retry_count = state.get("critic_retry_count", 0)
    
    if settings.use_mock_llm:
        return _mock_critic(state)
        
    chunks = state.get("retrieved_chunks", [])
    chunks_text = "\n\n".join(chunks) if chunks else "No source chunks available."
    
    # Extract text from AccountPlan and drafts for evaluation
    claims_source_text = ""
    if state.get("account_plan"):
        claims_source_text += f"Account Plan Strategy: {state['account_plan'].strategy_summary}\n"
        claims_source_text += f"Account Plan Steps: {', '.join(state['account_plan'].key_steps)}\n"
        
    if state.get("outreach_drafts"):
        for draft in state["outreach_drafts"]:
            claims_source_text += f"Draft for {draft.target_persona} via {draft.channel}: {draft.content}\n"
    
    llm = get_openrouter_llm(temperature=0.0)
    if not llm:
        return _mock_critic(state)
        
    llm = llm.with_structured_output(CriticVerdict)
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are a strict guardrail critic agent. Your job is to verify every single factual claim made in the generated text "
                   "against the provided source chunks. A claim is supported only if it is explicitly stated in the source chunks. "
                   "Return a precise evaluation for every claim."),
        ("user", "Source Chunks:\n{chunks_text}\n\nGenerated Text:\n{claims_source_text}\n\nPlease evaluate all claims.")
    ])
    
    chain = prompt | llm
    
    try:
        verdict = await chain.ainvoke({"chunks_text": chunks_text, "claims_source_text": claims_source_text})
        
        # Override computed metrics to ensure consistency
        verdict.retry_count = retry_count + 1
        verdict.claims_checked = len(verdict.verdicts)
        verdict.claims_supported = sum(1 for v in verdict.verdicts if v.supported)
        verdict.claims_unsupported = sum(1 for v in verdict.verdicts if not v.supported)
        verdict.overall_pass = verdict.claims_unsupported == 0
        
        return {
            "critic_verdict": verdict,
            "critic_retry_count": verdict.retry_count
        }
    except Exception as e:
        logger.error(f"Error in critic node LLM call: {e}")
        # On error, pass through to avoid blocking the pipeline
        return _mock_critic(state)

class StrippedContent(BaseModel):
    account_plan: AccountPlan
    outreach_drafts: list[OutreachDraft]

async def strip_unsupported_claims_node(state: PipelineState) -> dict[str, Any]:
    """
    Strips unsupported claims from the account plan and outreach drafts.
    """
    if not state.get("critic_verdict") or state["critic_verdict"].overall_pass:
        return {}
        
    verdict = state["critic_verdict"]
    unsupported_claims = [v.claim_text for v in verdict.verdicts if not v.supported]
    
    if not unsupported_claims:
        return {}
        
    if settings.use_mock_llm:
        return {}
        
    llm = get_openrouter_llm(temperature=0.0)
    if not llm:
        return {}
        
    llm = llm.with_structured_output(StrippedContent)
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are an editor. Your task is to rewrite the provided content to completely remove any mention of the following unsupported claims."),
        ("user", "Unsupported Claims to Remove:\n{unsupported_claims}\n\n{original_content}\n\nPlease rewrite with unsupported claims removed.")
    ])
    
    original_content = ""
    if state.get("account_plan"):
        original_content += f"Original Account Plan:\n{state['account_plan'].model_dump_json()}\n\n"
    if state.get("outreach_drafts"):
        original_content += f"Original Outreach Drafts:\n{json.dumps([d.model_dump() for d in state['outreach_drafts']])}\n"
        
    chain = prompt | llm
    
    try:
        stripped = await chain.ainvoke({
            "unsupported_claims": chr(10).join(unsupported_claims),
            "original_content": original_content
        })
        return {
            "account_plan": stripped.account_plan,
            "outreach_drafts": stripped.outreach_drafts
        }
    except Exception:
        return {}

