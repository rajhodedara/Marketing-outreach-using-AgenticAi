from __future__ import annotations

import asyncio
from typing import List
from fastembed import TextEmbedding

class EmbeddingService:
    def __init__(self, model_name: str = "sentence-transformers/all-MiniLM-L6-v2"):
        # fastembed supports the same models but uses ONNX (no PyTorch, 90% less RAM)
        self.model = TextEmbedding(model_name)

    async def get_embedding(self, text: str) -> List[float]:
        """Get embedding for a single text."""
        def _embed():
            # fastembed returns a generator of numpy arrays
            return next(self.model.embed([text])).tolist()
        return await asyncio.to_thread(_embed)

    async def get_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Get embeddings for a list of texts."""
        def _embed():
            # fastembed returns a generator, convert to list of lists
            embeddings_gen = self.model.embed(texts)
            return [e.tolist() for e in embeddings_gen]
        return await asyncio.to_thread(_embed)

# Singleton instance
embedding_service = EmbeddingService()
