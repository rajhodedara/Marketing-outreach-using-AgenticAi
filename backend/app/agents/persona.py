from __future__ import annotations

import logging
from pydantic import BaseModel
from langchain_core.prompts import ChatPromptTemplate
from app.core.llm import get_cerebras_llm
from app.agents.state import PipelineState
from app.schemas.ai import StakeholderProfile
from app.rag.retriever import retrieve as qdrant_retrieve
from app.config import settings

logger = logging.getLogger(__name__)

class StakeholderProfiles(BaseModel):
    profiles: list[StakeholderProfile]

def _format_retrieved_chunk(doc: dict, idx: int) -> str:
    chunk_id = doc.get("chunk_id", f"doc_{idx}")
    document_name = doc.get("document_name", "unknown")
    line_start = doc.get("line_start", 0)
    line_end = doc.get("line_end", 0)
    snippet = doc.get("snippet", "")
    return (
        f"Source ID: {chunk_id}\n"
        f"Document: {document_name}\n"
        f"Lines: {line_start}-{line_end}\n"
        f"Snippet: {snippet}"
    )

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
    retrieved_docs = await qdrant_retrieve(account_id, query, limit=15)
    
    retrieved_chunks = [_format_retrieved_chunk(doc, idx) for idx, doc in enumerate(retrieved_docs)]
    context = "\n\n".join(retrieved_chunks)
        
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
        return {"stakeholders": mock_profiles, "retrieved_chunks": retrieved_chunks}
        
    llm = get_cerebras_llm(temperature=0.0)
    if not llm:
        from langchain_community.chat_models import FakeListChatModel
        llm = FakeListChatModel(responses=['{"stakeholders": [{"role": "Mock", "name": "Mock", "priorities": ["Mock"]}]}'])
        
    llm = llm.with_structured_output(StakeholderProfiles)
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are an expert in B2B sales and persona mapping. Extract stakeholder profiles from the provided context. You must identify exactly 5 key stakeholders, specifically targeting roles like CTO, SVP Risk & Compliance, Director of Data Engineering, CFO, and VP Product."),
        ("user", "Company: {company_name}\n\nContext:\n{context}\n\nPlease extract the key stakeholders.")
    ])
    
    chain = prompt | llm
    
    try:
        result = await chain.ainvoke({"company_name": company_name, "context": context})
        return {"stakeholders": result.profiles, "retrieved_chunks": retrieved_chunks}
    except Exception as e:
        logger.error(f"Error in persona node LLM call: {e}")
        return {"stakeholders": [], "retrieved_chunks": retrieved_chunks}
