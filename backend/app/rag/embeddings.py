from __future__ import annotations

import asyncio
from typing import List
from sentence_transformers import SentenceTransformer

class EmbeddingService:
    def __init__(self, model_name: str = "sentence-transformers/all-MiniLM-L6-v2"):
        self.model = SentenceTransformer(model_name)

    async def get_embedding(self, text: str) -> List[float]:
        """Get embedding for a single text."""
        def _embed():
            return self.model.encode(text).tolist()
        return await asyncio.to_thread(_embed)

    async def get_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Get embeddings for a list of texts."""
        def _embed():
            return self.model.encode(texts).tolist()
        return await asyncio.to_thread(_embed)

# Singleton instance
embedding_service = EmbeddingService()
