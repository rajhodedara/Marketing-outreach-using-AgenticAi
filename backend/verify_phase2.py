"""Phase 2 Verification - RAG Setup End-to-End."""
from __future__ import annotations
import sys, asyncio, uuid
from pathlib import Path
from fastapi import UploadFile

sys.path.insert(0, str(Path(__file__).parent))

async def run():
    from app.db.session import engine, async_session_maker
    from app.db.models import create_tables
    from app.db import chunk_model
    from app.api.routes.upload import upload_data_pack
    from app.rag.retriever import retrieve
    import app.main  # so main.qdrant_client gets set up
    from qdrant_client import AsyncQdrantClient

    print("=== PHASE 2 VERIFICATION ===")
    
    # 1. Init DB & Qdrant
    print("Setting up DB and Qdrant in-memory...")
    await create_tables(engine)
    app.main.qdrant_client = AsyncQdrantClient(location=":memory:")

    # 2. Mock FastAPI UploadFile
    zip_path = Path("sample_data/acme_corp.zip")
    assert zip_path.exists(), "Sample zip not found!"
    
    class MockUploadFile:
        def __init__(self, path):
            self.path = path
            self.filename = path.name
        async def read(self):
            return self.path.read_bytes()

    upload_file = MockUploadFile(zip_path)
    account_name = f"TestCorp_{uuid.uuid4().hex[:8]}"

    # 3. Test Upload Endpoint (which triggers PII, chunking, AND Qdrant embeddings now)
    print("Testing /upload endpoint (end-to-end data ingestion)...")
    async with async_session_maker() as db_session:
        result = await upload_data_pack(
            file=upload_file, # type: ignore
            account_name=account_name,
            account_domain=None,
            db=db_session
        )
    
    print(f"Upload result: {result}")
    account_id = result["account_id"]
    chunks_created = result["chunks_created"]
    assert chunks_created > 0, "No chunks created"
    
    # 4. Test Retrieval
    print(f"\nTesting Retrieval for account: {account_id}...")
    queries = [
        "What are their pain points with scaling?",
        "Do they have a budget for this quarter?",
        "Who is the engineering VP?"
    ]
    
    for q in queries:
        print(f"\nQuery: '{q}'")
        citations = await retrieve(account_id, q, limit=2)
        print(f"  Found {len(citations)} citations:")
        for c in citations:
            print(f"    - Doc: {c['document_name']} (lines {c['line_start']}-{c['line_end']})")
            print(f"    - Snippet: '{c['snippet'][:100]}...'")
            assert 'snippet' in c
            assert 'line_start' in c
            assert 'document_name' in c

    print("\n✅ PHASE 2 TESTS PASSED")

if __name__ == "__main__":
    asyncio.run(run())
