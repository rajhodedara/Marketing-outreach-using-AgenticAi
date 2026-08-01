from __future__ import annotations

from typing import List, Dict, Any

from app.rag.embeddings import embedding_service


async def retrieve(account_id: str, query: str, limit: int = 5) -> List[Dict[str, Any]]:
    """
    Retrieve relevant chunks for a query from the account's Qdrant collection.
    
    Returns a list of dicts matching the CitationRef schema.
    """
    import app.main
    if not app.main.qdrant_client:
        raise RuntimeError("Qdrant client is not initialized")
        
    collection_name = f"account_{account_id}"
    
    # 1. Embed query
    query_vector = await embedding_service.get_embedding(query)
    
    # 2. Search in Qdrant (query_points replaces deprecated .search())
    from qdrant_client import models
    search_result = await app.main.qdrant_client.query_points(
        collection_name=collection_name,
        query=query_vector,
        limit=limit,
    )
    
    # 3. Format citations
    citations = []
    for hit in search_result.points:
        payload = hit.payload or {}
        citations.append({
            "document_name": payload.get("document_name", ""),
            "document_type": payload.get("document_type", ""),
            "chunk_id": payload.get("chunk_id", ""),
            "line_start": payload.get("line_start", 0),
            "line_end": payload.get("line_end", 0),
            "snippet": payload.get("text", ""),
        })
        
    return citations
