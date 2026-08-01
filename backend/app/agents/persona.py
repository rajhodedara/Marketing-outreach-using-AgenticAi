from __future__ import annotations

import logging
from pydantic import BaseModel
from langchain_core.prompts import ChatPromptTemplate
from app.core.llm import get_cerebras_llm
from app.agents.state import PipelineState
from app.schemas.ai import StakeholderProfile
from app.rag.retriever import retrieve as qdrant_retrieve

logger = logging.getLogger(__name__)

class StakeholderProfiles(BaseModel):
    profiles: list[StakeholderProfile]

async def persona_node(state: PipelineState) -> dict:
    """
    Persona Mapping Agent Node.
    Retrieves context on stakeholders and extracts stakeholder profiles.
    """
    account_id = state.get("account_id")
    company_name = state.get("company_name", "Unknown Company")
    
    logger.info(f"Mapping personas for account: {company_name}")
    
    if not account_id:
        return {"stakeholders": []}
        
    query = f"Key stakeholders, decision makers, executives, and team members at {company_name}"
    retrieved_docs = await qdrant_retrieve(account_id, query, limit=5)
    
    context = ""
    for idx, doc in enumerate(retrieved_docs):
        snippet = doc.get('snippet', '')
        context += f"Snippet: {snippet}\n\n"
        
    if settings.use_mock_llm:
        logger.info("Using mock LLM for persona node")
        mock_profiles = [
            StakeholderProfile(
                name="Jane Doe",
                role="CEO",
                influence_level="High",
                key_concerns=["Revenue growth", "Market expansion"]
            )
        ]
        return {"stakeholders": mock_profiles}
        
    llm = get_cerebras_llm(temperature=0.0)
    if not llm:
        from langchain_community.chat_models import FakeListChatModel
        llm = FakeListChatModel(responses=['{"stakeholders": [{"role": "Mock", "name": "Mock", "priorities": ["Mock"]}]}'])
        
    llm = llm.with_structured_output(StakeholderProfiles)
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are an expert in B2B sales and persona mapping. Extract stakeholder profiles from the provided context."),
        ("user", "Company: {company_name}\n\nContext:\n{context}\n\nPlease extract the key stakeholders.")
    ])
    
    chain = prompt | llm
    
    try:
        result = await chain.ainvoke({"company_name": company_name, "context": context})
        return {"stakeholders": result.profiles}
    except Exception as e:
        logger.error(f"Error in persona node LLM call: {e}")
        return {"stakeholders": []}
