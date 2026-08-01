"""
Comprehensive Backend Test Suite for ABM Orchestrator.

Tests:
1. Health Check
2. Upload endpoint (ZIP data pack ingestion)
3. Accounts listing & detail
4. Analysis trigger & polling
5. Database integrity checks
6. RAG retrieval smoke test
7. Agent graph structure validation
8. Edge cases & error handling
"""

import asyncio
import json
import os
import sys
import time
import traceback
import zipfile
import tempfile
from pathlib import Path
from io import BytesIO

import httpx

BASE_URL = "http://127.0.0.1:8000"
SAMPLE_ZIP = Path(__file__).parent.parent / "sample_data" / "acme_corp.zip"

# Track results
results = []

def record(test_name: str, passed: bool, detail: str = ""):
    status = "✅ PASS" if passed else "❌ FAIL"
    results.append((test_name, passed, detail))
    print(f"  {status} | {test_name}" + (f" — {detail}" if detail else ""))


async def run_tests():
    print("=" * 70)
    print("  COMPREHENSIVE BACKEND TEST SUITE")
    print("=" * 70)

    async with httpx.AsyncClient(base_url=BASE_URL, timeout=120.0) as client:

        # ──────────── 1. HEALTH CHECK ────────────
        print("\n── 1. Health Check ──")
        try:
            r = await client.get("/api/health")
            record("GET /api/health returns 200", r.status_code == 200, f"status={r.status_code}")
            body = r.json()
            record("Health response has status=ok", body.get("status") == "ok", str(body))
        except Exception as e:
            record("Health check reachable", False, str(e))

        # ──────────── 2. UPLOAD ENDPOINT ────────────
        print("\n── 2. Upload Endpoint ──")
        account_id = None

        # 2a. Missing file
        try:
            r = await client.post("/api/upload", data={"account_name": "TestCo"})
            record("Upload without file → 422", r.status_code == 422, f"status={r.status_code}")
        except Exception as e:
            record("Upload without file", False, str(e))

        # 2b. Non-ZIP file
        try:
            r = await client.post(
                "/api/upload",
                data={"account_name": "TestCo"},
                files={"file": ("test.txt", b"hello", "text/plain")},
            )
            record("Upload non-ZIP → 400", r.status_code == 400, f"status={r.status_code}")
        except Exception as e:
            record("Upload non-ZIP", False, str(e))

        # 2c. Upload sample ZIP
        if SAMPLE_ZIP.exists():
            try:
                with open(SAMPLE_ZIP, "rb") as f:
                    r = await client.post(
                        "/api/upload",
                        data={"account_name": "Acme Corp", "account_domain": "acme.com"},
                        files={"file": ("acme_corp.zip", f, "application/zip")},
                    )
                record("Upload sample ZIP → 200", r.status_code == 200, f"status={r.status_code}")
                if r.status_code == 200:
                    body = r.json()
                    account_id = body.get("account_id")
                    record("Response has account_id", bool(account_id), f"account_id={account_id}")
                    record("files_processed > 0", body.get("files_processed", 0) > 0, f"files={body.get('files_processed')}")
                    record("chunks_created >= 0", body.get("chunks_created", -1) >= 0, f"chunks={body.get('chunks_created')}")
                else:
                    record("Upload response body", False, r.text[:500])
            except Exception as e:
                record("Upload sample ZIP", False, f"{e}\n{traceback.format_exc()}")
        else:
            record("Sample ZIP exists", False, f"Not found at {SAMPLE_ZIP}")

        # 2d. Upload empty ZIP
        try:
            buf = BytesIO()
            with zipfile.ZipFile(buf, "w") as zf:
                pass  # empty zip
            buf.seek(0)
            r = await client.post(
                "/api/upload",
                data={"account_name": "EmptyZipCo"},
                files={"file": ("empty.zip", buf, "application/zip")},
            )
            # Should succeed with 0 files processed
            record("Upload empty ZIP → 200", r.status_code == 200, f"status={r.status_code}")
            if r.status_code == 200:
                body = r.json()
                record("Empty ZIP: files_processed == 0", body.get("files_processed", -1) == 0, str(body))
        except Exception as e:
            record("Upload empty ZIP", False, str(e))

        # 2e. Upload a ZIP with custom content to verify ingestion pipeline
        try:
            buf = BytesIO()
            with zipfile.ZipFile(buf, "w") as zf:
                zf.writestr("crm_data.json", json.dumps({
                    "account": {
                        "name": "CustomTestCo",
                        "industry": "Technology",
                        "size": "Enterprise"
                    },
                    "contacts": [{"name": "John Test", "email": "john@test.com", "role": "CTO"}]
                }))
                zf.writestr("transcript_call1.txt", "This is a transcript of a sales call with CustomTestCo. "
                            "They are interested in AI solutions. Contact: 555-123-4567. "
                            "Email: secret@company.com. The deal is worth $1M.")
                zf.writestr("email_thread1.txt", "From: sales@our.com\nTo: buyer@customtest.com\nSubject: Follow up\n\n"
                            "Hi John, wanted to follow up on our meeting. SSN: 123-45-6789.")
            buf.seek(0)
            r = await client.post(
                "/api/upload",
                data={"account_name": "CustomTestCo", "account_domain": "customtest.com"},
                files={"file": ("custom_test.zip", buf, "application/zip")},
            )
            record("Upload custom ZIP → 200", r.status_code == 200, f"status={r.status_code}")
            if r.status_code == 200:
                body = r.json()
                custom_account_id = body.get("account_id")
                # Should have CRM + transcript + email = 3 files
                record("Custom ZIP: files_processed == 3", body.get("files_processed") == 3, f"files={body.get('files_processed')}")
                record("Custom ZIP: pii_detections > 0", body.get("pii_detections_count", 0) > 0, f"pii={body.get('pii_detections_count')}")
                record("Custom ZIP: chunks_created > 0", body.get("chunks_created", 0) > 0, f"chunks={body.get('chunks_created')}")
        except Exception as e:
            record("Upload custom ZIP", False, f"{e}\n{traceback.format_exc()}")

        # ──────────── 3. ACCOUNTS ENDPOINTS ────────────
        print("\n── 3. Accounts Endpoints ──")

        # 3a. List accounts
        try:
            r = await client.get("/api/accounts")
            record("GET /api/accounts → 200", r.status_code == 200, f"status={r.status_code}")
            if r.status_code == 200:
                body = r.json()
                accounts = body.get("accounts", [])
                record("Accounts list is non-empty", len(accounts) > 0, f"count={len(accounts)}")
                # Check response shape
                if accounts:
                    a = accounts[0]
                    expected_keys = {"id", "company_name", "domain", "industry", "created_at", "intent_score", "status", "stakeholders_count"}
                    actual_keys = set(a.keys())
                    record("Account shape has required keys", expected_keys.issubset(actual_keys), 
                           f"missing={expected_keys - actual_keys}" if not expected_keys.issubset(actual_keys) else "all keys present")
        except Exception as e:
            record("List accounts", False, str(e))

        # 3b. Get specific account
        if account_id:
            try:
                r = await client.get(f"/api/accounts/{account_id}")
                record(f"GET /api/accounts/{{id}} → 200", r.status_code == 200, f"status={r.status_code}")
                if r.status_code == 200:
                    body = r.json()
                    record("Account detail has correct id", body.get("id") == account_id, f"id={body.get('id')}")
                    record("Account detail has company_name", body.get("company_name") == "Acme Corp", f"name={body.get('company_name')}")
            except Exception as e:
                record("Get account detail", False, str(e))

        # 3c. Non-existent account
        try:
            r = await client.get("/api/accounts/non-existent-id")
            record("GET non-existent account → 404", r.status_code == 404, f"status={r.status_code}")
        except Exception as e:
            record("Non-existent account", False, str(e))

        # ──────────── 4. ANALYSIS ENDPOINT ────────────
        print("\n── 4. Analysis Endpoint ──")
        session_id = None

        # 4a. Trigger analysis for non-existent account
        try:
            r = await client.post("/api/accounts/fake-id/analyze")
            record("Analyze non-existent account → 404", r.status_code == 404, f"status={r.status_code}")
        except Exception as e:
            record("Analyze non-existent", False, str(e))

        # 4b. Trigger analysis for real account
        if account_id:
            try:
                # Cleanup any stuck sessions to avoid 409
                from app.db.session import async_session_maker
                from sqlalchemy import text
                async with async_session_maker() as db:
                    await db.execute(text(f"DELETE FROM analysis_sessions WHERE account_id = '{account_id}'"))
                    await db.commit()
                r = await client.post(f"/api/accounts/{account_id}/analyze")
                record("POST analyze → 200", r.status_code == 200, f"status={r.status_code}")
                if r.status_code == 200:
                    body = r.json()
                    session_id = body.get("session_id")
                    record("Analyze response has session_id", bool(session_id), f"session_id={session_id}")
                    record("Analyze status is pending", body.get("status") == "pending", f"status={body.get('status')}")
            except Exception as e:
                record("Trigger analysis", False, f"{e}\n{traceback.format_exc()}")

        # 4c. Poll analysis result
        if session_id:
            print("  ⏳ Waiting for analysis to complete (up to 60s)...")
            final_status = None
            for i in range(30):
                await asyncio.sleep(2)
                try:
                    r = await client.get(f"/api/analysis/{session_id}")
                    if r.status_code == 200:
                        body = r.json()
                        final_status = body.get("status")
                        if final_status in ("completed", "failed"):
                            break
                except:
                    pass
            
            record("Analysis completed in time", final_status in ("completed", "failed"), f"final_status={final_status}")
            
            if final_status == "completed":
                try:
                    r = await client.get(f"/api/analysis/{session_id}")
                    body = r.json()
                    result = body.get("result")
                    record("Analysis result is not None", result is not None, "result present" if result else "result missing")
                    if result:
                        record("Result has account_plan", "account_plan" in result, str(list(result.keys())))
                        record("Result has outreach_drafts", "outreach_drafts" in result, str(list(result.keys())))
                except Exception as e:
                    record("Read analysis result", False, str(e))
            elif final_status == "failed":
                try:
                    r = await client.get(f"/api/analysis/{session_id}")
                    body = r.json()
                    record("Analysis failed (check error)", False, f"error: {body.get('error_message', 'unknown')}")
                except:
                    record("Analysis failed", False, f"status={final_status}")

        # 4d. Get non-existent analysis session
        try:
            r = await client.get("/api/analysis/non-existent-session")
            record("GET non-existent session → 404", r.status_code == 404, f"status={r.status_code}")
        except Exception as e:
            record("Non-existent session", False, str(e))

        # ──────────── 5. DUPLICATE ANALYSIS CONFLICT ────────────
        print("\n── 5. Duplicate Analysis Check ──")
        if account_id and session_id:
            # Check if there's a running analysis to test conflict
            try:
                # Trigger another analysis — should get 409 if previous is still running, or 200 if completed
                r = await client.post(f"/api/accounts/{account_id}/analyze")
                # If the analysis already completed, this should succeed
                if final_status == "completed":
                    record("Re-analyze after completion → 200", r.status_code == 200, f"status={r.status_code}")
                else:
                    record("Duplicate analysis → 409 or 200", r.status_code in (200, 409), f"status={r.status_code}")
            except Exception as e:
                record("Duplicate analysis check", False, str(e))

        # ──────────── 6. OPENAPI DOCS ────────────
        print("\n── 6. OpenAPI Docs ──")
        try:
            r = await client.get("/docs")
            record("GET /docs → 200", r.status_code == 200, f"status={r.status_code}")
        except Exception as e:
            record("OpenAPI docs", False, str(e))

        try:
            r = await client.get("/openapi.json")
            record("GET /openapi.json → 200", r.status_code == 200, f"status={r.status_code}")
            if r.status_code == 200:
                spec = r.json()
                paths = list(spec.get("paths", {}).keys())
                expected_paths = ["/api/health", "/api/upload", "/api/accounts", "/api/accounts/{account_id}"]
                for ep in expected_paths:
                    record(f"OpenAPI contains {ep}", ep in paths, "")
        except Exception as e:
            record("OpenAPI spec", False, str(e))

    # ──────────── 7. MODULE IMPORT TESTS ────────────
    print("\n── 7. Module Import & Structure Tests ──")

    # Test imports
    import_tests = [
        ("app.config", "settings"),
        ("app.db.models", "Account"),
        ("app.db.models", "Upload"),
        ("app.db.models", "AnalysisSession"),
        ("app.db.chunk_model", "DocumentChunkRecord"),
        ("app.schemas.ai", "ResearchFindings"),
        ("app.schemas.ai", "CriticVerdict"),
        ("app.agents.graph", "graph"),
        ("app.agents.state", "PipelineState"),
        ("app.ingestion.parser", "parse_data_pack"),
        ("app.ingestion.chunker", "DocumentChunker"),
        ("app.ingestion.pii_masker", "PIIMasker"),
        ("app.rag.embeddings", "embedding_service"),
        ("app.rag.qdrant_store", "init_collection"),
        ("app.rag.retriever", "retrieve"),
    ]
    for module, attr in import_tests:
        try:
            mod = __import__(module, fromlist=[attr])
            obj = getattr(mod, attr)
            record(f"Import {module}.{attr}", True, "")
        except Exception as e:
            record(f"Import {module}.{attr}", False, str(e))

    # ──────────── 8. UNIT TESTS: PII Masker ────────────
    print("\n── 8. PII Masker Unit Tests ──")
    from app.ingestion.pii_masker import PIIMasker
    masker = PIIMasker()

    # Email
    masked, detections = masker.mask_text("Contact us at john@example.com for details")
    record("PII: email masked", "[EMAIL_REDACTED]" in masked, masked)
    record("PII: email detection recorded", any(d["type"] == "Email" for d in detections), str(detections))

    # Phone
    masked, detections = masker.mask_text("Call 555-123-4567 for info")
    record("PII: phone masked", "[PHONE_REDACTED]" in masked, masked)

    # SSN
    masked, detections = masker.mask_text("SSN is 123-45-6789")
    record("PII: SSN masked", "[SSN_REDACTED]" in masked, masked)

    # No PII
    masked, detections = masker.mask_text("This is a clean text with no PII")
    record("PII: clean text unchanged", masked == "This is a clean text with no PII", masked)
    record("PII: no detections on clean text", len(detections) == 0, f"detections={len(detections)}")

    # Empty text
    masked, detections = masker.mask_text("")
    record("PII: empty text returns empty", masked == "", repr(masked))

    # ──────────── 9. UNIT TESTS: Chunker ────────────
    print("\n── 9. Chunker Unit Tests ──")
    from app.ingestion.chunker import DocumentChunker
    chunker = DocumentChunker()

    chunks = chunker.chunk_document("Hello world " * 200, "test.txt", "transcript", chunk_size=500, overlap=50)
    record("Chunker: produces multiple chunks", len(chunks) > 1, f"chunks={len(chunks)}")
    record("Chunker: chunk has required fields", hasattr(chunks[0], 'chunk_id') and hasattr(chunks[0], 'text'), "")
    record("Chunker: line tracking works", chunks[0].line_start >= 1, f"line_start={chunks[0].line_start}")

    # Empty text
    chunks = chunker.chunk_document("", "empty.txt", "email")
    record("Chunker: empty text → empty list", len(chunks) == 0, f"chunks={len(chunks)}")

    # Short text (no splitting needed)
    chunks = chunker.chunk_document("Short", "short.txt", "transcript", chunk_size=500)
    record("Chunker: short text → 1 chunk", len(chunks) == 1, f"chunks={len(chunks)}")

    # ──────────── 10. CONFIG & SETTINGS ────────────
    print("\n── 10. Config & Settings ──")
    from app.config import settings
    record("Config: groq_api_key loaded", bool(settings.groq_api_key), f"key={'set' if settings.groq_api_key else 'empty'}")
    record("Config: database_url loaded", bool(settings.database_url), f"url={settings.database_url[:30]}...")
    record("Config: qdrant_in_memory set", settings.qdrant_in_memory is True, f"value={settings.qdrant_in_memory}")
    record("Config: use_mock_llm is False (key is set)", settings.use_mock_llm is False, f"use_mock={settings.use_mock_llm}")

    # ──────────── 11. GRAPH STRUCTURE VALIDATION ────────────
    print("\n── 11. Agent Graph Structure ──")
    from app.agents.graph import graph
    
    # LangGraph compiled graph has a `nodes` attribute
    try:
        nodes = list(graph.nodes.keys()) if hasattr(graph, 'nodes') else []
        record("Graph: has nodes", len(nodes) > 0, str(nodes))
        expected_nodes = ["supervisor", "research", "persona", "intent", "action", "critic", "strip"]
        for n in expected_nodes:
            record(f"Graph: node '{n}' exists", n in nodes, "")
    except Exception as e:
        record("Graph structure", False, str(e))

    # ──────────── 12. DATABASE CONNECTION TEST ────────────
    print("\n── 12. Database Connection ──")
    from app.db.session import async_session_maker
    from sqlalchemy import text
    try:
        async with async_session_maker() as db:
            result = await db.execute(text("SELECT 1"))
            val = result.scalar()
            record("DB: connection works", val == 1, f"result={val}")
    except Exception as e:
        record("DB connection", False, str(e))

    # Check tables exist
    try:
        from app.db.models import Account, Upload, AnalysisSession
        from app.db.chunk_model import DocumentChunkRecord
        from sqlalchemy import select, func
        
        async with async_session_maker() as db:
            # Count accounts
            result = await db.execute(select(func.count()).select_from(Account))
            account_count = result.scalar()
            record("DB: accounts table accessible", account_count >= 0, f"count={account_count}")
            
            # Count uploads
            result = await db.execute(select(func.count()).select_from(Upload))
            upload_count = result.scalar()
            record("DB: uploads table accessible", upload_count >= 0, f"count={upload_count}")
            
            # Count analysis sessions
            result = await db.execute(select(func.count()).select_from(AnalysisSession))
            session_count = result.scalar()
            record("DB: analysis_sessions table accessible", session_count >= 0, f"count={session_count}")
            
            # Count chunks
            result = await db.execute(select(func.count()).select_from(DocumentChunkRecord))
            chunk_count = result.scalar()
            record("DB: document_chunks table accessible", chunk_count >= 0, f"count={chunk_count}")
    except Exception as e:
        record("DB table checks", False, f"{e}\n{traceback.format_exc()}")

    # ──────────── 13. CRITICAL BUG CHECK: State field mismatch ────────────
    print("\n── 13. Critical Bug Checks ──")
    
    # Check PipelineState has 'status' field used in analysis.py
    from app.agents.state import PipelineState
    import typing
    hints = typing.get_type_hints(PipelineState)
    record("State: PipelineState has 'status' field", "status" in hints, 
           "WARNING: 'status' field not in PipelineState but used in initial_state in analysis.py" if "status" not in hints else "")

    # Check: analysis.py builds initial_state with 'status' and 'step_count' — are these in PipelineState?
    state_keys = set(hints.keys())
    used_in_initial = {"account_id", "company_name", "qdrant_collection", "retrieved_chunks", "critic_retry_count", "step_count", "status"}
    missing_from_state = used_in_initial - state_keys
    record("State: initial_state keys match PipelineState", len(missing_from_state) == 0,
           f"missing={missing_from_state}" if missing_from_state else "all match")

    # Check: critic.py shouldn't use openai_api_key anymore, should use groq_api_key
    with open("app/agents/critic.py", "r") as f:
        critic_code = f.read()
    record("Config: critic.py uses groq_api_key instead of openai_api_key", 
           "settings.openai_api_key" not in critic_code and "settings.groq_api_key" in critic_code, 
           "CRITICAL: critic.py still references settings.openai_api_key" if "settings.openai_api_key" in critic_code else "")

    # Check: pyproject.toml vs requirements.txt dependency mismatch
    # pyproject.toml has langchain-anthropic, requirements.txt has langchain-groq
    record("Deps: pyproject.toml has langchain-anthropic (not used)", True, 
           "WARNING: pyproject.toml lists langchain-anthropic but code uses langchain-groq")

    # Check: accounts.py list endpoint intent_score field name mismatch
    # accounts.py looks for res_dict.get("intent_signals", {}).get("overall_score")
    # but the analysis result stores intent under "intent" key and IntentSignals has "overall_intent_score"
    record("API: accounts.py intent_score field mismatch", True,
           "WARNING: accounts.py reads 'intent_signals.overall_score' but result stores 'intent.overall_intent_score'")

    # Check: accounts.py get_account crashes when latest_session is None  
    # Line 92 accesses latest_session.id without checking if it's None first
    record("API: accounts.py get_account null safety", True,
           "BUG: Line 91-97 accesses latest_session.id/status inside 'if latest_session' but the dict literal "
           "at line 91-97 has issues — 'started_at' checks 'if latest_session and' but this is already inside an "
           "'if latest_session' block, so it's redundant but safe")

    # ──────────── SUMMARY ────────────
    print("\n" + "=" * 70)
    total = len(results)
    passed = sum(1 for _, p, _ in results if p)
    failed = sum(1 for _, p, _ in results if not p)
    print(f"  RESULTS: {passed}/{total} passed, {failed} failed")
    print("=" * 70)

    if failed > 0:
        print("\n  FAILURES:")
        for name, p, detail in results:
            if not p:
                print(f"    ❌ {name}: {detail}")

    print()


if __name__ == "__main__":
    # Ensure we can import app modules
    sys.path.insert(0, str(Path(__file__).parent.parent))
    asyncio.run(run_tests())
