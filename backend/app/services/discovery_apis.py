import os
import time
import httpx
import asyncio
import logging
import json
from urllib.parse import urlparse
from app.config import settings
from pydantic import BaseModel
from langchain_groq import ChatGroq
from langchain_openai import ChatOpenAI

logger = logging.getLogger(__name__)

def log_api_usage(provider: str, request_type: str, status: str, latency: float):
    logger.info(f"[API USAGE] Provider: {provider} | Request: {request_type} | Status: {status} | Latency: {latency:.2f}s")

async def discover_companies(queries: list[str]) -> list[dict]:
    companies = []
    # Deduplicate queries to avoid wasting limits
    queries = list(set(queries))[:settings.max_search_queries]
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        async def fetch_query(query):
            local_companies = []
            start_time = time.time()
            provider = "Tavily"
            try:
                # Primary: Tavily
                if settings.tavily_api_key:
                    res = await client.post("https://api.tavily.com/search", json={"query": query, "api_key": settings.tavily_api_key, "include_domains": []})
                    res.raise_for_status()
                    data = res.json()
                    
                    for r in data.get("results", []):
                        url = r.get("url", "")
                        domain_name = ""
                        if url:
                            try:
                                netloc = urlparse(url).netloc.replace("www.", "")
                                domain_name = netloc.split(".")[0].capitalize()
                            except:
                                pass
                        local_companies.append({
                            "name": domain_name or r.get("title", ""), # Approximate company name
                            "url": url,
                            "evidence": r.get("content", ""),
                            "query_used": query,
                            "discovered_through": provider
                        })
                    log_api_usage(provider, "Company Discovery", "Success", time.time() - start_time)
                else:
                    raise Exception("No Tavily Key")
                    
            except Exception as e:
                log_api_usage(provider, "Company Discovery", f"Failed ({str(e)})", time.time() - start_time)
                # Fallback: SerpAPI
                provider = "SerpAPI"
                start_time = time.time()
                try:
                    if settings.serpapi_api_key:
                        res = await client.get("https://serpapi.com/search", params={"q": query, "api_key": settings.serpapi_api_key})
                        res.raise_for_status()
                        data = res.json()
                        for r in data.get("organic_results", []):
                            url = r.get("link", "")
                            domain_name = ""
                            if url:
                                try:
                                    netloc = urlparse(url).netloc.replace("www.", "")
                                    domain_name = netloc.split(".")[0].capitalize()
                                except:
                                    pass
                            local_companies.append({
                                "name": domain_name or r.get("title", ""),
                                "url": url,
                                "evidence": r.get("snippet", ""),
                                "query_used": query,
                                "discovered_through": provider
                            })
                        log_api_usage(provider, "Company Discovery", "Success", time.time() - start_time)
                except Exception as ex:
                    log_api_usage(provider, "Company Discovery", f"Failed ({str(ex)})", time.time() - start_time)
            return local_companies

        tasks = [fetch_query(q) for q in queries]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        for res in results:
            if isinstance(res, list):
                for c in res:
                    if len(companies) >= settings.max_companies:
                        break
                    companies.append(c)
            if len(companies) >= settings.max_companies:
                break
    
    if not companies:
        return []
        
    # Use LLM to extract the true target companies from the raw search results
    class ExtractedCompany(BaseModel):
        name: str
        url: str
        evidence: str
        
    class ExtractedCompanies(BaseModel):
        companies: list[ExtractedCompany]
        
    try:
        start_time = time.time()
        llm = ChatGroq(temperature=0, api_key=settings.groq_api_key, model_name="llama-3.3-70b-versatile").with_fallbacks([
            ChatOpenAI(temperature=0, api_key=settings.openrouter_api_key, base_url="https://openrouter.ai/api/v1", model="meta-llama/llama-3.3-70b-instruct")
        ])
        extractor = llm.with_structured_output(ExtractedCompanies)
        prompt = f"Extract up to {settings.max_companies} individual target companies mentioned in the following search results. Only extract actual companies that are the subject of the search, not news publishers, not generic list titles, and not investors. \n\nResults:\n{json.dumps(companies[:20])}"
        res = await extractor.ainvoke(prompt)
        
        final_companies = []
        for c in res.companies:
            final_companies.append({
                "name": c.name,
                "url": c.url,
                "evidence": c.evidence,
                "query_used": companies[0]["query_used"] if companies else "",
                "discovered_through": "Tavily + LLM Extraction"
            })
        log_api_usage("Groq", "Company Name Extraction", "Success", time.time() - start_time)
        return final_companies[:settings.max_companies]
    except Exception as e:
        logger.error(f"LLM Company Extraction failed: {e}")
        return companies[:settings.max_companies]

async def fetch_signals(company_name: str) -> list[dict]:
    signals = []
    async with httpx.AsyncClient(timeout=10.0) as client:
        start_time = time.time()
        provider = "GNews"
        try:
            if settings.gnews_api_key:
                res = await client.get("https://gnews.io/api/v4/search", params={"q": company_name, "token": settings.gnews_api_key, "lang": "en", "max": settings.max_articles_per_company})
                res.raise_for_status()
                data = res.json()
                for art in data.get("articles", []):
                    signals.append({
                        "event": art.get("title", ""),
                        "date": art.get("publishedAt", ""),
                        "source": art.get("url", ""),
                        "company": company_name,
                        "provider": provider
                    })
                log_api_usage(provider, "Signal Intelligence", "Success", time.time() - start_time)
            else:
                raise Exception("No GNews Key")
        except Exception as e:
            log_api_usage(provider, "Signal Intelligence", f"Failed ({str(e)})", time.time() - start_time)
            # Fallback: Tavily for Signals
            provider = "Tavily"
            start_time = time.time()
            try:
                if settings.tavily_api_key:
                    res = await client.post("https://api.tavily.com/search", json={"query": f"{company_name} news announcements latest", "api_key": settings.tavily_api_key})
                    res.raise_for_status()
                    data = res.json()
                    for r in data.get("results", [])[:settings.max_articles_per_company]:
                        signals.append({
                            "event": r.get("title", ""),
                            "date": "Recent",
                            "source": r.get("url", ""),
                            "company": company_name,
                            "provider": provider
                        })
                    log_api_usage(provider, "Signal Intelligence", "Success", time.time() - start_time)
            except Exception as ex:
                log_api_usage(provider, "Signal Intelligence", f"Failed ({str(ex)})", time.time() - start_time)
                
    return signals[:settings.max_articles_per_company]

async def enrich_contacts(company_name: str, persona: str) -> list[dict]:
    contacts = []
    async with httpx.AsyncClient(timeout=10.0) as client:
        start_time = time.time()
        provider = "Apollo"
        try:
            if settings.apollo_api_key:
                # Apollo Search API
                payload = {
                    "api_key": settings.apollo_api_key,
                    "q_organization_domains": f"{company_name.lower().replace(' ', '')}.com",
                    "person_titles": [persona]
                }
                res = await client.post("https://api.apollo.io/v1/people/search", json=payload)
                res.raise_for_status()
                data = res.json()
                for p in data.get("people", [])[:settings.max_contacts_per_company]:
                    contacts.append({
                        "name": f"{p.get('first_name', '')} {p.get('last_name', '')}".strip(),
                        "role": p.get("title", ""),
                        "company": company_name,
                        "provider": provider
                    })
                log_api_usage(provider, "Contact Enrichment", "Success", time.time() - start_time)
            else:
                raise Exception("No Apollo Key")
        except Exception as e:
            log_api_usage(provider, "Contact Enrichment", f"Failed ({str(e)})", time.time() - start_time)
            # Fallback: DataMagnet
            provider = "DataMagnet"
            start_time = time.time()
            try:
                if settings.datamagnet_api_key:
                    # Mock DataMagnet structure
                    res = await client.post("http://api.datamagnet.com/v1/enrich", json={"company": company_name, "role": persona}, headers={"Authorization": f"Bearer {settings.datamagnet_api_key}"})
                    res.raise_for_status()
                    data = res.json()
                    for p in data.get("contacts", [])[:settings.max_contacts_per_company]:
                        contacts.append({
                            "name": p.get("name", ""),
                            "role": p.get("role", ""),
                            "company": company_name,
                            "provider": provider
                        })
                    log_api_usage(provider, "Contact Enrichment", "Success", time.time() - start_time)
                else:
                    raise Exception("No DataMagnet Key")
            except Exception as ex:
                log_api_usage(provider, "Contact Enrichment", f"Failed ({str(ex)})", time.time() - start_time)
                # Fallback: Tavily for Contacts
                provider = "Tavily"
                start_time = time.time()
                try:
                    if settings.tavily_api_key:
                        res = await client.post("https://api.tavily.com/search", json={"query": f"{company_name} {persona} linkedin profile", "api_key": settings.tavily_api_key})
                        res.raise_for_status()
                        data = res.json()
                        for r in data.get("results", [])[:1]:
                            name = r.get("title", "").split("-")[0].replace("LinkedIn", "").strip()
                            contacts.append({
                                "name": name if len(name) > 2 else "Executive",
                                "role": persona,
                                "company": company_name,
                                "provider": provider
                            })
                        log_api_usage(provider, "Contact Enrichment", "Success", time.time() - start_time)
                except Exception as ex2:
                    log_api_usage(provider, "Contact Enrichment", f"Failed ({str(ex2)})", time.time() - start_time)
                    
    return contacts[:settings.max_contacts_per_company]
