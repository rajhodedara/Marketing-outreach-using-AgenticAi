from __future__ import annotations

import logging
from pydantic import BaseModel
from langchain_core.prompts import ChatPromptTemplate
from app.config import settings
from app.core.llm import get_openrouter_llm
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
    retrieved_chunks = state.get("retrieved_chunks", [])
    
    logger.info(f"Generating account plan and outreach drafts for account: {company_name}")
    
    user_prompt = state.get("user_prompt")
    
    if not user_prompt and settings.use_mock_llm:
        logger.info("Using mock LLM for action node")
        mock_plan = AccountPlan(
            account_id=account_id or "acc_123",
            strategy_summary="Focus on executive alignment and ROI-driven messaging.",
            key_steps=["Send intro to CEO", "Follow up with Technical team"]
        )
        from app.schemas.ai import CitationMetadata
        
        mock_draft = OutreachDraft(
            target_persona="CEO",
            channel="Email",
            content="Hi Jane, noticed your focus on AI orchestration [1]. Let's chat.",
            citations=[
                CitationMetadata(
                    id="1",
                    source_type="Transcript",
                    source_name="Gong Call",
                    context="Q3 planning - 04:12",
                    snippet="we are heavily focused on AI orchestration"
                )
            ]
        )
        return {
            "account_plan": mock_plan,
            "outreach_drafts": [mock_draft],
            "custom_response": None
        }
        
    llm = get_openrouter_llm(temperature=0.2).with_structured_output(ActionOutput)
    
    research_text = research.model_dump_json(indent=2) if research else "No research available."
    stakeholders_text = "\n".join([s.model_dump_json() for s in stakeholders]) if stakeholders else "No stakeholders available."
    intent_text = intent.model_dump_json(indent=2) if intent else "No intent signals available."
    chunks_text = "\n\n".join(retrieved_chunks) if retrieved_chunks else "No raw source documents available."
    
    if user_prompt:
        system_instruction = f"The user has given a specific custom directive: {user_prompt}. You MUST completely fulfill this directive and output your entire comprehensive analysis into the `custom_response` field. Ignore the default account plan and outreach formats. Use markdown formatting to make your response easy to read. Synthesize any provided research, intent data, and stakeholders ONLY if they are relevant to answering the prompt. If there are no Raw Source Documents, do not invent citations."
    else:
        system_instruction = "You are an expert Go-To-Market and ABM strategist. Synthesize the provided research, stakeholders, intent data, and Raw Source Documents to generate a strategic Account Plan and draft personalized outreach messages.\n\nIMPORTANT: When drafting the outreach content, you MUST include inline citations to the Raw Source Documents you are using. Use markers like [1], [2], etc. in the text, and output the corresponding citation metadata in the 'citations' array matching the marker ID. Use the Document name for 'source_name' and provide the exact snippet text. If there are no Raw Source Documents, do not invent citations."

    prompt = ChatPromptTemplate.from_messages([
        ("system", system_instruction),
        ("user", "Company: {company_name}\nAccount ID: {account_id}\n\nResearch Summary:\n{research}\n\nStakeholders:\n{stakeholders}\n\nIntent Signals:\n{intent}\n\nRaw Source Documents:\n{chunks}\n\nPlease fulfill your directive.")
    ])
    
    chain = prompt | llm
    
    try:
        result = await chain.ainvoke({
            "company_name": company_name,
            "account_id": account_id or "unknown",
            "research": research_text,
            "stakeholders": stakeholders_text,
            "intent": intent_text,
            "chunks": chunks_text
        })
        return {
            "account_plan": result.account_plan,
            "outreach_drafts": result.outreach_drafts,
            "custom_response": result.custom_response
        }
    except Exception as e:
        logger.error(f"Error in action node LLM call: {e}")
        return {
            "account_plan": None,
            "outreach_drafts": [],
            "custom_response": None
        }
