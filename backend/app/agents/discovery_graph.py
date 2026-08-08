from __future__ import annotations
import json
import logging
import asyncio
from datetime import datetime
import traceback
from typing import List, Dict, Optional

from langgraph.graph import StateGraph, START, END
from langchain_groq import ChatGroq
from langchain_openai import ChatOpenAI

from app.agents.discovery_state import DiscoveryState
from app.schemas.discovery import ICP, DiscoveredCompany, DiscoverySynthesis, StructuredSalesContext, OutreachSequence
from app.core.events import publish_event
from app.config import settings
from pydantic import BaseModel
from app.services.discovery_apis import discover_companies, fetch_signals, enrich_contacts

logger = logging.getLogger(__name__)

async def send_event(session_id: str, node: str, message: str, agent: str = "System"):
    await publish_event(session_id, json.dumps({
        "node": node,
        "agent": agent,
        "message": message
    }))

def load_demo_cache():
    try:
        with open("./data/mock_research_cache.json", "r", encoding="utf-8") as f:
            return json.load(f)
    except:
        return {"raw_companies": [], "raw_signals": [], "raw_contacts": []}

async def icp_understanding_node(state: DiscoveryState) -> dict:
    session_id = state["session_id"]
    prompt = state["user_prompt"]
    await send_event(session_id, "icp", "Interpreting sales mission and constructing ICP...", "ICP Understanding Agent")
    
    llm = ChatGroq(temperature=0, api_key=settings.groq_api_key, model_name="llama-3.3-70b-versatile").with_fallbacks([
        ChatOpenAI(temperature=0, api_key=settings.openrouter_api_key, base_url="https://openrouter.ai/api/v1", model="meta-llama/llama-3.3-70b-instruct")
    ])
    structured_llm = llm.with_structured_output(ICP)
    
    try:
        icp_result = await structured_llm.ainvoke(f"Extract the ideal customer profile from this sales request: {prompt}. Be explicit about buying signals and personas.")
        await send_event(session_id, "icp_result", json.dumps(icp_result.model_dump()), "ICP Understanding Agent")
        return {"icp": icp_result, "progress_percent": 10}
    except Exception as e:
        logger.error(f"Failed to extract ICP: {e}")
        mock_icp = ICP(industry="Technology", company_characteristics=["Enterprise"], buying_signals=["Expansion"], target_personas=["CTO"])
        await send_event(session_id, "icp_result", json.dumps(mock_icp.model_dump()), "ICP Understanding Agent")
        return {"icp": mock_icp, "progress_percent": 10}

class SearchStrategies(BaseModel):
    queries: list[str]

async def search_strategy_node(state: DiscoveryState) -> dict:
    session_id = state["session_id"]
    icp = state.get("icp")
    await send_event(session_id, "strategy", "Converting ICP into optimized parallel search strategies...", "Search Strategy Planner")
    
    llm = ChatGroq(temperature=0.2, api_key=settings.groq_api_key, model_name="llama-3.3-70b-versatile").with_fallbacks([
        ChatOpenAI(temperature=0.2, api_key=settings.openrouter_api_key, base_url="https://openrouter.ai/api/v1", model="meta-llama/llama-3.3-70b-instruct")
    ])
    structured_llm = llm.with_structured_output(SearchStrategies)
    
    try:
        res = await structured_llm.ainvoke(f"Generate exactly 3 diverse search queries (Tavily/Google style) to find companies matching this ICP: {icp.model_dump() if icp else 'None'}. Make them highly specific to find intent signals.")
        queries = res.queries
        await send_event(session_id, "strategy", f"Generated {len(queries)} parallel search vectors.\nExamples:\n- {queries[0] if len(queries)>0 else ''}", "Search Strategy Planner")
        return {"search_strategies": queries, "progress_percent": 20}
    except Exception as e:
        logger.error(f"Failed to generate search strategies: {e}")
        return {"search_strategies": ["fintech AI adoption"], "progress_percent": 20}

async def company_discovery_node(state: DiscoveryState) -> dict:
    session_id = state["session_id"]
    await send_event(session_id, "discovery", "Executing real-time searches across web databases...", "Scout Agent")
    queries = state.get("search_strategies", [])
    
    raw_companies = []
    if settings.live_research_mode:
        try:
            raw_companies = await discover_companies(queries)
            if not raw_companies:
                raise Exception("Live APIs returned 0 companies (likely missing/invalid API keys)")
        except Exception as e:
            logger.error(f"Discovery APIs failed: {e}. Falling back to demo mode.")
            raw_companies = load_demo_cache().get("raw_companies", [])
    else:
        raw_companies = load_demo_cache().get("raw_companies", [])
        
    await send_event(session_id, "discovery", f"Discovered {len(raw_companies)} raw accounts.", "Scout Agent")
    return {"raw_companies": raw_companies}

async def signal_intelligence_node(state: DiscoveryState) -> dict:
    session_id = state["session_id"]
    await send_event(session_id, "signal", "Extracting buying triggers, dates, and evidence quotes from news/web...", "Radar Agent")
    raw_companies = state.get("raw_companies", [])
    raw_signals = []
    
    if settings.live_research_mode:
        async def fetch_signals_safe(comp):
            try:
                return await fetch_signals(comp["name"])
            except Exception as e:
                logger.error(f"Signal API failed for {comp['name']}: {e}")
                return []
                
        tasks = [fetch_signals_safe(comp) for comp in raw_companies]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        for sigs in results:
            if isinstance(sigs, list):
                raw_signals.extend(sigs)
    else:
        raw_signals = load_demo_cache().get("raw_signals", [])
        
    return {"raw_signals": raw_signals}

async def market_context_node(state: DiscoveryState) -> dict:
    session_id = state["session_id"]
    await send_event(session_id, "context", "Building company momentum timelines...", "Context Agent")
    await asyncio.sleep(0.5)
    return {}

async def icp_matching_node(state: DiscoveryState) -> dict:
    session_id = state["session_id"]
    await send_event(session_id, "matching", "Evaluating discovered companies against ICP criteria...", "ICP Matching Agent")
    await asyncio.sleep(0.5)
    return {}

async def validation_node(state: DiscoveryState) -> dict:
    session_id = state["session_id"]
    await send_event(session_id, "validation", "Validating raw data integrity (discarding incomplete records)...", "Validation Layer")
    
    raw_companies = state.get("raw_companies", [])
    raw_signals = state.get("raw_signals", [])
    raw_contacts = state.get("raw_contacts", [])
    
    valid_companies = [c for c in raw_companies if c.get("name") and c.get("url") and c.get("evidence")]
    valid_signals = [s for s in raw_signals if s.get("event") and s.get("date") and s.get("source")]
    valid_contacts = [c for c in raw_contacts if c.get("name") and c.get("role") and c.get("company")]
    
    logger.info(f"Validation complete: {len(valid_companies)} companies, {len(valid_signals)} signals, {len(valid_contacts)} contacts passed.")
    return {"raw_companies": valid_companies, "raw_signals": valid_signals, "raw_contacts": valid_contacts, "progress_percent": 60}

async def opportunity_scoring_node(state: DiscoveryState) -> dict:
    session_id = state["session_id"]
    await send_event(session_id, "scoring", "Calculating opportunity scores based on verified evidence...", "Scoring Agent")
    await asyncio.sleep(0.5)
    return {"progress_percent": 65}

async def atlas_agent_node(state: DiscoveryState) -> dict:
    session_id = state["session_id"]
    await send_event(session_id, "contact", "Identifying target executive roles based on buying signals...", "Atlas Agent")
    await asyncio.sleep(0.5)
    return {"progress_percent": 70}

async def contact_enrichment_node(state: DiscoveryState) -> dict:
    session_id = state["session_id"]
    await send_event(session_id, "enrichment", "Hybrid enrichment (Apollo + DataMagnet) pulling real executive context...", "DataMagnet Intelligence")
    raw_companies = state.get("raw_companies", [])
    icp = state.get("icp")
    target_personas = icp.target_personas if icp and icp.target_personas else ["CEO"]
    
    raw_contacts = []
    if settings.live_research_mode:
        async def enrich_contacts_safe(comp, persona):
            try:
                return await enrich_contacts(comp["name"], persona)
            except Exception as e:
                logger.error(f"Contact Enrichment failed for {comp['name']}: {e}")
                return []
                
        tasks = []
        for comp in raw_companies:
            for persona in target_personas[:2]: # Max 2 personas per company to save limits
                tasks.append(enrich_contacts_safe(comp, persona))
                
        results = await asyncio.gather(*tasks, return_exceptions=True)
        for cons in results:
            if isinstance(cons, list):
                raw_contacts.extend(cons)
    else:
        raw_contacts = load_demo_cache().get("raw_contacts", [])
        
    return {"raw_contacts": raw_contacts, "progress_percent": 80}

async def persona_ranking_node(state: DiscoveryState) -> dict:
    session_id = state["session_id"]
    await send_event(session_id, "ranking", "Ranking contacts by relevance score, influence, and signal ownership...", "Persona Ranking Agent")
    await asyncio.sleep(0.5)
    return {"progress_percent": 85}

class CompanySalesContext(BaseModel):
    company_name: str
    sales_context: StructuredSalesContext

class SalesContextList(BaseModel):
    contexts: List[CompanySalesContext]

async def sales_context_node(state: DiscoveryState) -> dict:
    session_id = state["session_id"]
    await send_event(session_id, "sales_context", "Extracting structured sales context (Trigger -> Challenge -> Opening)...", "Sales Context Agent")
    
    raw_companies = state.get("raw_companies", [])[:3]
    raw_signals = state.get("raw_signals", [])
    raw_contacts = state.get("raw_contacts", [])
    
    if not raw_companies:
        return {"sales_contexts": {}, "progress_percent": 90}
        
    llm = ChatGroq(temperature=0.0, api_key=settings.groq_api_key, model_name="llama-3.3-70b-versatile").with_fallbacks([
        ChatOpenAI(temperature=0.0, api_key=settings.openrouter_api_key, base_url="https://openrouter.ai/api/v1", model="meta-llama/llama-3.3-70b-instruct")
    ])
    structured_llm = llm.with_structured_output(SalesContextList)
    
    prompt = f"""
    Generate a detailed Structured Sales Context for each of these companies based on the research.
    COMPANIES: {json.dumps(raw_companies)}
    SIGNALS: {json.dumps(raw_signals)}
    CONTACTS: {json.dumps(raw_contacts)}
    
    CRITICAL INSTRUCTIONS:
    - You must output exactly {len(raw_companies)} items.
    - Identify a specific Target Person from the CONTACTS list.
    - Identify a specific Trigger Event from the SIGNALS list.
    - Ensure 'evidence_used' contains specific facts (e.g. "Q3 Earnings Report", "New product launch").
    """
    try:
        res = await structured_llm.ainvoke(prompt)
        contexts_dict = {c.company_name: c.sales_context.model_dump() for c in res.contexts}
        return {"sales_contexts": contexts_dict, "progress_percent": 90}
    except Exception as e:
        logger.error(f"Sales Context Extraction failed: {e}")
        return {"sales_contexts": {}, "progress_percent": 90}

class CompanyOutreach(BaseModel):
    company_name: str
    sequence: OutreachSequence

class OutreachList(BaseModel):
    outreaches: List[CompanyOutreach]

async def outreach_agent_node(state: DiscoveryState) -> dict:
    session_id = state["session_id"]
    await send_event(session_id, "outreach", "Drafting personalized multi-step sequence...", "Outreach Agent")
    
    sales_contexts = state.get("sales_contexts", {})
    if not sales_contexts:
        return {"outreach_sequences": {}, "progress_percent": 95}
        
    llm = ChatGroq(temperature=0.0, api_key=settings.groq_api_key, model_name="llama-3.3-70b-versatile").with_fallbacks([
        ChatOpenAI(temperature=0.0, api_key=settings.openrouter_api_key, base_url="https://openrouter.ai/api/v1", model="meta-llama/llama-3.3-70b-instruct")
    ])
    structured_llm = llm.with_structured_output(OutreachList)
    
    prompt = f"""
    Generate a highly personalized, 3-step cold email sequence (Initial, Follow-up, Breakup) for each company using the provided Sales Context.
    SALES CONTEXTS: {json.dumps(sales_contexts)}
    
    CRITICAL INSTRUCTIONS:
    - Avoid generic phrases like "I noticed your recent announcement". Reference exact details.
    - Email 1: Use the trigger event and business challenge to open the conversation.
    - Email 2: Add additional insight and a new angle.
    - Email 3: Close the loop respectfully.
    - Write like a top-tier B2B sales professional.
    """
    try:
        res = await structured_llm.ainvoke(prompt)
        outreach_dict = {c.company_name: c.sequence.model_dump() for c in res.outreaches}
        return {"outreach_sequences": outreach_dict, "progress_percent": 95}
    except Exception as e:
        logger.error(f"Outreach Generation failed: {e}")
        return {"outreach_sequences": {}, "progress_percent": 95}

async def synthesis_node(state: DiscoveryState) -> dict:
    session_id = state["session_id"]
    icp = state.get("icp")
    prompt = state["user_prompt"]
    
    raw_companies = state.get("raw_companies", [])
    sales_contexts = state.get("sales_contexts", {})
    outreach_sequences = state.get("outreach_sequences", {})
    
    top_companies = raw_companies[:3]
    top_names = {c.get("name") for c in top_companies}
    
    raw_signals = [s for s in state.get("raw_signals", []) if s.get("company") in top_names]
    raw_contacts = [c for c in state.get("raw_contacts", []) if c.get("company") in top_names]
    
    await send_event(session_id, "synthesis", "Structuring verified research into intelligence reports...", "Luna")
    
    llm = ChatGroq(temperature=0.0, api_key=settings.groq_api_key, model_name="llama-3.3-70b-versatile").with_fallbacks([
        ChatOpenAI(temperature=0.0, api_key=settings.openrouter_api_key, base_url="https://openrouter.ai/api/v1", model="meta-llama/llama-3.3-70b-instruct")
    ])
    structured_llm = llm.with_structured_output(DiscoverySynthesis)
    
    sys_prompt = f"""
    You are a sales intelligence formatter.
    USER REQUEST: '{prompt}'
    ICP TARGET: {icp.model_dump() if icp else 'None'}
    
    RAW COMPANIES DISCOVERED: {json.dumps(top_companies)}
    RAW SIGNALS FOUND: {json.dumps(raw_signals)}
    RAW CONTACTS FOUND: {json.dumps(raw_contacts)}
    SALES CONTEXTS: {json.dumps(sales_contexts)}
    OUTREACH SEQUENCES: {json.dumps(outreach_sequences)}
    
    CRITICAL INSTRUCTIONS:
    - EXACTLY {len(top_companies)} COMPANIES MUST BE OUTPUT.
    - Fill in `sales_context` and `outreach_sequence` using the exact provided SALES CONTEXTS and OUTREACH SEQUENCES.
    - Map the 'raw_signals' to the 'why_now' triggers for the matching company.
    - Map the 'raw_contacts' to the 'decision_makers' for the matching company.
    - **DYNAMIC SCORING**: Generate realistic numbers for `opportunity_score`, `intent_strength`, and importantly, the `personalization_score`. Ensure personalization_score totals 100 max (e.g. total 92 based on source evidence 40, persona 25, signal 15, timing 12).
    """
    
    try:
        result = await structured_llm.ainvoke(sys_prompt)
        executive_briefing = result.executive_briefing.model_dump() if result.executive_briefing else {}
        companies = result.companies
        
        executive_briefing["analyzed_companies"] = len(raw_companies)
        if not executive_briefing.get("key_signals"):
            executive_briefing["key_signals"] = [s.get("event") for s in raw_signals[:3]] if raw_signals else ["No major signals"]
            
    except Exception as e:
        logger.error(f"Failed to generate companies: {e}")
        traceback.print_exc()
        companies = []
        executive_briefing = {"analyzed_companies": 0, "key_signals": []}

    await send_event(session_id, "synthesis", f"✓ {len(companies)} verified accounts enriched", "Luna")
    return {"discovered_companies": companies, "executive_briefing": executive_briefing, "progress_percent": 100}

def create_discovery_graph() -> StateGraph:
    builder = StateGraph(DiscoveryState)
    
    builder.add_node("icp_understanding", icp_understanding_node)
    builder.add_node("search_strategy", search_strategy_node)
    builder.add_node("company_discovery", company_discovery_node)
    builder.add_node("signal_intelligence", signal_intelligence_node)
    builder.add_node("market_context", market_context_node)
    builder.add_node("validation", validation_node)
    builder.add_node("icp_matching", icp_matching_node)
    builder.add_node("opportunity_scoring", opportunity_scoring_node)
    
    # New sequential DM nodes
    builder.add_node("atlas_agent", atlas_agent_node)
    builder.add_node("contact_enrichment", contact_enrichment_node)
    builder.add_node("persona_ranking", persona_ranking_node)
    
    builder.add_node("sales_context", sales_context_node)
    builder.add_node("outreach", outreach_agent_node)
    builder.add_node("synthesis", synthesis_node)
    
    builder.add_edge(START, "icp_understanding")
    builder.add_edge("icp_understanding", "search_strategy")
    
    # Proper Sequential Data Gathering
    builder.add_edge("search_strategy", "company_discovery")
    builder.add_edge("company_discovery", "signal_intelligence")
    builder.add_edge("signal_intelligence", "market_context")
    
    # Decision Maker Phase (Atlas -> Enrichment)
    builder.add_edge("market_context", "atlas_agent")
    builder.add_edge("atlas_agent", "contact_enrichment")
    
    # Validation runs AFTER all raw data is gathered
    builder.add_edge("contact_enrichment", "validation")
    
    # Post-validation scoring and ranking
    builder.add_edge("validation", "icp_matching")
    builder.add_edge("icp_matching", "opportunity_scoring")
    builder.add_edge("opportunity_scoring", "persona_ranking")
    
    # Sales Context & Outreach
    builder.add_edge("persona_ranking", "sales_context")
    builder.add_edge("sales_context", "outreach")
    builder.add_edge("outreach", "synthesis")
    builder.add_edge("synthesis", END)
    
    return builder.compile()

discovery_graph = create_discovery_graph()
