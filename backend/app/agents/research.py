from __future__ import annotations

import logging
from langchain_core.prompts import ChatPromptTemplate
from app.core.llm import get_cerebras_llm
from app.agents.state import PipelineState
from app.schemas.ai import ResearchFindings, ResearchFinding, CitationRef
from app.rag.retriever import retrieve as qdrant_retrieve
from app.config import settings

logger = logging.getLogger(__name__)

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

async def research_node(state: PipelineState) -> dict:
    """
    Research Agent Node.
    Retrieves background context for the account and extracts ResearchFindings.
    """
    account_id = state.get("account_id")
    company_name = state.get("company_name", "Unknown Company")
    
    logger.info(f"Researching account: {company_name}")
    
    if not account_id:
        logger.warning("No account_id provided in state, skipping research.")
        return {"research": None}
    
    # 1. Retrieve context
    query = f"Background information, products, services, recent news, and market positioning for {company_name}"
    retrieved_docs = await qdrant_retrieve(account_id, query, limit=5)
    
    retrieved_chunks = [_format_retrieved_chunk(doc, idx) for idx, doc in enumerate(retrieved_docs)]
    context = "\n\n".join(retrieved_chunks)
        
    user_prompt = state.get("user_prompt")
        
    # 2. Mock LLM response if needed
    if not user_prompt and settings.use_mock_llm:
        logger.info("Using mock LLM for research node")
        mock_findings = ResearchFindings(
            findings=[
                ResearchFinding(
                    topic="Company Overview",
                    summary=f"{company_name} is a leading provider in their industry, focusing on innovative solutions.",
                    citations=[CitationRef(source_id="mock_chunk_1", quote="leading provider in their industry")]
                )
            ]
        )
        return {"research": mock_findings, "retrieved_chunks": retrieved_chunks}
        
    # 3. Call LLM for structured output
    llm = get_cerebras_llm(temperature=0.0)
    if not llm:
        from langchain_community.chat_models import FakeListChatModel
        llm = FakeListChatModel(responses=['{"summary": "Mock summary", "key_technologies": ["Mock"], "recent_news": ["Mock"]}'])
        
    llm = llm.with_structured_output(ResearchFindings)
    
    if user_prompt:
        system_instruction = f"You are an expert market researcher. The user has given a specific directive: {user_prompt}. Your research MUST strictly fulfill this directive based on the context. Extract key research findings. Make sure to back up your claims by generating CitationRef objects with the exact source_id and quote from the text."
    else:
        system_instruction = "You are an expert market researcher. Extract key research findings from the provided context. Make sure to back up your claims by generating CitationRef objects with the exact source_id and quote from the text."

    prompt = ChatPromptTemplate.from_messages([
        ("system", system_instruction),
        ("user", "Company: {company_name}\n\nContext:\n{context}\n\nPlease extract the key research findings.")
    ])
    
    chain = prompt | llm
    
    try:
        result = await chain.ainvoke({"company_name": company_name, "context": context})
        return {"research": result, "retrieved_chunks": retrieved_chunks}
    except Exception as e:
        logger.error(f"Error in research node LLM call: {e}")
        return {"research": ResearchFindings(findings=[]), "retrieved_chunks": retrieved_chunks}
