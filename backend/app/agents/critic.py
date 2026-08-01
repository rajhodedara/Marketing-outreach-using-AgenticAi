from __future__ import annotations

import json
from pydantic import BaseModel, Field
from typing import Any

from app.agents.state import PipelineState
from app.schemas.ai import CriticVerdict, ClaimVerdict, CitationRef
from app.config import settings

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
        
    import instructor
    from openai import AsyncOpenAI
    client = instructor.from_openai(AsyncOpenAI(api_key=settings.openai_api_key))
    
    chunks = state.get("retrieved_chunks", [])
    chunks_text = "\n\n".join(chunks)
    
    # Extract text from AccountPlan and drafts for evaluation
    claims_source_text = ""
    if state.get("account_plan"):
        claims_source_text += f"Account Plan Strategy: {state['account_plan'].strategy_summary}\n"
        claims_source_text += f"Account Plan Steps: {', '.join(state['account_plan'].key_steps)}\n"
        
    if state.get("outreach_drafts"):
        for draft in state["outreach_drafts"]:
            claims_source_text += f"Draft for {draft.target_persona} via {draft.channel}: {draft.content}\n"
    
    system_prompt = (
        "You are a strict guardrail critic agent. Your job is to verify every single factual claim made in the generated text "
        "against the provided source chunks. A claim is supported only if it is explicitly stated in the source chunks. "
        "Return a precise evaluation for every claim."
    )
    
    user_prompt = f"""
    Source Chunks:
    {chunks_text}
    
    Generated Text:
    {claims_source_text}
    """
    
    verdict = await client.chat.completions.create(
        model="gpt-4o",
        response_model=CriticVerdict,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
    )
    
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
        
    import instructor
    from openai import AsyncOpenAI
    from app.schemas.ai import AccountPlan, OutreachDraft
    
    client = instructor.from_openai(AsyncOpenAI(api_key=settings.openai_api_key))
    
    class StrippedContent(BaseModel):
        account_plan: AccountPlan
        outreach_drafts: list[OutreachDraft]
        
    system_prompt = "You are an editor. Your task is to rewrite the provided content to completely remove any mention of the following unsupported claims."
    user_prompt = f"Unsupported Claims to Remove:\n{chr(10).join(unsupported_claims)}\n\n"
    
    if state.get("account_plan"):
        user_prompt += f"Original Account Plan:\n{state['account_plan'].model_dump_json()}\n\n"
        
    if state.get("outreach_drafts"):
        user_prompt += f"Original Outreach Drafts:\n{json.dumps([d.model_dump() for d in state['outreach_drafts']])}\n"
        
    try:
        stripped = await client.chat.completions.create(
            model="gpt-4o",
            response_model=StrippedContent,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ]
        )
        return {
            "account_plan": stripped.account_plan,
            "outreach_drafts": stripped.outreach_drafts
        }
    except Exception:
        return {}

