from __future__ import annotations

import logging
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from app.config import settings
from app.agents.state import PipelineState
from app.schemas.ai import ResearchFindings, ResearchFinding, CitationRef
from app.rag.retriever import retrieve as qdrant_retrieve

logger = logging.getLogger(__name__)

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
    
    context = ""
    for idx, doc in enumerate(retrieved_docs):
        chunk_id = doc.get('chunk_id', f"doc_{idx}")
        snippet = doc.get('snippet', '')
        context += f"Source ID: {chunk_id}\nSnippet: {snippet}\n\n"
        
    # 2. Mock LLM response if needed
    if settings.use_mock_llm:
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
        return {"research": mock_findings}
        
    # 3. Call LLM for structured output
    llm = ChatGroq(
        model="llama-3.1-70b-versatile", 
        api_key=settings.groq_api_key, 
        temperature=0.0
    ).with_structured_output(ResearchFindings)
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are an expert market researcher. Extract key research findings from the provided context. Make sure to back up your claims by generating CitationRef objects with the exact source_id and quote from the text."),
        ("user", "Company: {company_name}\n\nContext:\n{context}\n\nPlease extract the key research findings.")
    ])
    
    chain = prompt | llm
    
    try:
        result = await chain.ainvoke({"company_name": company_name, "context": context})
        return {"research": result}
    except Exception as e:
        logger.error(f"Error in research node LLM call: {e}")
        return {"research": ResearchFindings(findings=[])}
