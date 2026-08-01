from __future__ import annotations

import logging
from langchain_core.prompts import ChatPromptTemplate
from app.core.llm import get_cerebras_llm
from app.agents.state import PipelineState
from app.schemas.ai import IntentSignals, BuyingSignal
from app.rag.retriever import retrieve as qdrant_retrieve
from app.config import settings

logger = logging.getLogger(__name__)

async def intent_node(state: PipelineState) -> dict:
    """
    Intent Analysis Agent Node.
    Retrieves context on buying signals and competitor mentions to extract IntentSignals.
    """
    account_id = state.get("account_id")
    company_name = state.get("company_name", "Unknown Company")
    
    logger.info(f"Analyzing intent for account: {company_name}")
    
    if not account_id:
        return {"intent": None}
        
    query = f"Buying signals, technology stack changes, competitor mentions, and strategic initiatives for {company_name}"
    retrieved_docs = await qdrant_retrieve(account_id, query, limit=5)
    
    context = ""
    for idx, doc in enumerate(retrieved_docs):
        snippet = doc.get('snippet', '')
        context += f"Snippet: {snippet}\n\n"
        
    if settings.use_mock_llm:
        logger.info("Using mock LLM for intent node")
        mock_intent = IntentSignals(
            signals=[
                BuyingSignal(
                    signal_type="Technology Adoption",
                    description="Evaluating new AI orchestration tools",
                    urgency="High"
                )
            ],
            overall_intent_score=85
        )
        return {"intent": mock_intent}
        
    llm = get_cerebras_llm(temperature=0.0)
    if not llm:
        from langchain_community.chat_models import FakeListChatModel
        llm = FakeListChatModel(responses=['{"intent_signals": [{"topic": "Mock", "urgency": "High", "supporting_quotes": []}]}'])
        
    llm = llm.with_structured_output(IntentSignals)
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are an expert intent analyst. Extract buying signals and compute an overall intent score from the provided context."),
        ("user", "Company: {company_name}\n\nContext:\n{context}\n\nPlease extract the intent signals and provide an overall score (0-100).")
    ])
    
    chain = prompt | llm
    
    try:
        result = await chain.ainvoke({"company_name": company_name, "context": context})
        return {"intent": result}
    except Exception as e:
        logger.error(f"Error in intent node LLM call: {e}")
        return {"intent": IntentSignals(signals=[], overall_intent_score=0)}
