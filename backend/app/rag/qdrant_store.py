from __future__ import annotations

import uuid
from typing import List

from qdrant_client import models
from qdrant_client.http.exceptions import UnexpectedResponse

from app.db.chunk_model import DocumentChunkRecord
from app.rag.embeddings import embedding_service


async def init_collection(account_id: str) -> None:
    """Initialize Qdrant collection for an account."""
    import app.main
    if not app.main.qdrant_client:
        raise RuntimeError("Qdrant client is not initialized")
        
    collection_name = f"account_{account_id}"
    
    try:
        # Check if collection exists
        await app.main.qdrant_client.get_collection(collection_name)
    except (UnexpectedResponse, ValueError) as e:
        # UnexpectedResponse for HTTP, ValueError for Local memory client
        if isinstance(e, ValueError) and "not found" in str(e).lower() or (hasattr(e, "status_code") and e.status_code == 404):
            # Collection does not exist, create it
            await app.main.qdrant_client.create_collection(
                collection_name=collection_name,
                vectors_config=models.VectorParams(
                    size=384,  # all-MiniLM-L6-v2 dimensions
                    distance=models.Distance.COSINE,
                ),
            )
        else:
            raise


async def store_chunks(account_id: str, chunks: List[DocumentChunkRecord]) -> None:
    """Embed and store chunks in Qdrant, updating DB records."""
    import app.main
    if not chunks:
        return
        
    if not app.main.qdrant_client:
        raise RuntimeError("Qdrant client is not initialized")
        
    collection_name = f"account_{account_id}"
    
    # 1. Embed texts
    texts = [chunk.text for chunk in chunks]
    embeddings = await embedding_service.get_embeddings(texts)
    
    # 2. Format as Qdrant Points
    points = []
    for chunk, vector in zip(chunks, embeddings):
        # We can create a deterministic or random UUID based on chunk.id, 
        # or use a new one. The spec says: "Uses UUIDs generated from chunk.id for point IDs"
        point_id = str(uuid.uuid5(uuid.NAMESPACE_OID, chunk.id))
        
        points.append(
            models.PointStruct(
                id=point_id,
                vector=vector,
                payload={
                    "document_name": chunk.document_name,
                    "document_type": chunk.document_type,
                    "text": chunk.text,
                    "line_start": chunk.line_start,
                    "line_end": chunk.line_end,
                    "char_start": chunk.char_start,
                    "char_end": chunk.char_end,
                    "chunk_id": chunk.id,
                },
            )
        )
        
        # 3. Update chunk in DB (requires caller to commit)
        chunk.embedded = True

    # 4. Upsert to Qdrant
    await app.main.qdrant_client.upsert(
        collection_name=collection_name,
        points=points,
    )
