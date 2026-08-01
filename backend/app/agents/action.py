from __future__ import annotations

import logging
from pydantic import BaseModel
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from app.config import settings
from app.agents.state import PipelineState
from app.schemas.ai import AccountPlan, OutreachDraft

logger = logging.getLogger(__name__)

class ActionOutput(BaseModel):
    account_plan: AccountPlan
    outreach_drafts: list[OutreachDraft]

async def action_node(state: PipelineState) -> dict:
    """
    Action Sequencing Agent Node.
    Uses research, stakeholders, and intent from state to generate an AccountPlan and OutreachDrafts.
    """
    account_id = state.get("account_id")
    company_name = state.get("company_name", "Unknown Company")
    
    research = state.get("research")
    stakeholders = state.get("stakeholders", [])
    intent = state.get("intent")
    
    logger.info(f"Generating account plan and outreach drafts for account: {company_name}")
    
    if settings.use_mock_llm:
        logger.info("Using mock LLM for action node")
        mock_plan = AccountPlan(
            account_id=account_id or "acc_123",
            strategy_summary="Focus on executive alignment and ROI-driven messaging.",
            key_steps=["Send intro to CEO", "Follow up with Technical team"]
        )
        mock_draft = OutreachDraft(
            target_persona="CEO",
            channel="Email",
            content="Hi Jane, noticed your focus on AI orchestration. Let's chat."
        )
        return {
            "account_plan": mock_plan,
            "outreach_drafts": [mock_draft]
        }
        
    llm = ChatGroq(
        model="llama-3.1-70b-versatile", 
        api_key=settings.groq_api_key, 
        temperature=0.4
    ).with_structured_output(ActionOutput)
    
    research_text = research.model_dump_json(indent=2) if research else "No research available."
    stakeholders_text = "\n".join([s.model_dump_json() for s in stakeholders]) if stakeholders else "No stakeholders available."
    intent_text = intent.model_dump_json(indent=2) if intent else "No intent signals available."
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are an expert Go-To-Market and ABM strategist. Synthesize the provided research, stakeholders, and intent data to generate a strategic Account Plan and draft personalized outreach messages."),
        ("user", "Company: {company_name}\nAccount ID: {account_id}\n\nResearch:\n{research}\n\nStakeholders:\n{stakeholders}\n\nIntent Signals:\n{intent}\n\nPlease generate the account plan and outreach drafts.")
    ])
    
    chain = prompt | llm
    
    try:
        result = await chain.ainvoke({
            "company_name": company_name,
            "account_id": account_id or "unknown",
            "research": research_text,
            "stakeholders": stakeholders_text,
            "intent": intent_text
        })
        return {
            "account_plan": result.account_plan,
            "outreach_drafts": result.outreach_drafts
        }
    except Exception as e:
        logger.error(f"Error in action node LLM call: {e}")
        return {
            "account_plan": None,
            "outreach_drafts": []
        }
