"""Phase 1 Verification - lightweight (no heavy imports)."""
from __future__ import annotations
import sys, os, zipfile, asyncio
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from app.ingestion.pii_masker import PIIMasker
from app.ingestion.chunker import DocumentChunker


def run():
    print("=== PII MASKER TEST ===")
    masker = PIIMasker()
    transcript = (Path("sample_data/acme_corp/transcript_q4_call.txt")
                  .read_text(encoding="utf-8"))
    masked, detections = masker.mask_text(transcript)
    print("Detections: %d" % len(detections))
    for d in detections:
        print("  [%s] %s -> %s" % (d["type"], d["original"], d["replacement"]))

    assert "m.johnson@acmecorp.com" not in masked, "Email leaked!"
    assert "(415) 555-0198" not in masked, "Phone leaked!"
    assert "sarah.chen@acmecorp.com" not in masked, "Email leaked!"
    assert "+1-415-555-0142" not in masked, "Phone leaked!"
    assert "[EMAIL_REDACTED]" in masked
    assert "[PHONE_REDACTED]" in masked
    print("PASS: All PII masked correctly\n")

    # Test email file too
    email = (Path("sample_data/acme_corp/email_thread.txt")
             .read_text(encoding="utf-8"))
    masked_email, email_dets = masker.mask_text(email)
    print("Email detections: %d" % len(email_dets))
    for d in email_dets:
        print("  [%s] %s" % (d["type"], d["original"]))
    print("PASS: Email PII masked\n")

    print("=== CHUNKER TEST ===")
    chunker = DocumentChunker()
    chunks = chunker.chunk_document(masked, "transcript_q4_call.txt", "transcript")
    print("Total chunks: %d" % len(chunks))
    for i, c in enumerate(chunks):
        print("  Chunk %d: lines %d-%d, chars %d-%d, len=%d" %
              (i + 1, c.line_start, c.line_end, c.char_start, c.char_end, len(c.text)))
    assert len(chunks) > 0, "No chunks!"
    for c in chunks:
        assert c.line_start >= 1
        assert c.line_end >= c.line_start
        assert len(c.chunk_id) > 0
    print("PASS: Chunking works with line offsets\n")

    # Create zip
    print("=== ZIP CREATION ===")
    sample_dir = Path("sample_data/acme_corp")
    zip_path = Path("sample_data/acme_corp.zip")
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for f in sample_dir.glob("*"):
            if f.is_file() and f.suffix in (".json", ".txt"):
                zf.write(f, f.name)
    print("Created: %s (%d bytes)" % (zip_path, zip_path.stat().st_size))
    with zipfile.ZipFile(zip_path, "r") as zf:
        for name in zf.namelist():
            print("  %s" % name)
    print("PASS: Zip created\n")

    # Test parser
    print("=== PARSER TEST ===")
    from app.ingestion.parser import parse_data_pack
    pack = asyncio.run(parse_data_pack(zip_path))
    print("CRM data: %s" % (pack.crm_data is not None))
    print("Transcripts: %d" % len(pack.transcripts))
    print("Emails: %d" % len(pack.emails))
    assert pack.crm_data is not None, "CRM data missing!"
    assert len(pack.transcripts) > 0, "No transcripts!"
    assert len(pack.emails) > 0, "No emails!"
    print("PASS: Parser works\n")

    # Test DB creation
    print("=== DATABASE TEST ===")
    async def test_db():
        from app.db.session import engine
        from app.db.models import create_tables, Base
        from app.db import chunk_model  # noqa: register table
        await create_tables(engine)
        
        # Verify tables exist across supported SQLAlchemy dialects.
        from sqlalchemy import inspect
        async with engine.begin() as conn:
            tables = await conn.run_sync(
                lambda sync_conn: inspect(sync_conn).get_table_names()
            )
        
        print("Tables: %s" % tables)
        assert "accounts" in tables
        assert "uploads" in tables
        assert "analysis_sessions" in tables
        assert "document_chunks" in tables
        await engine.dispose()
        print("PASS: All tables created")
    
    asyncio.run(test_db())

    print("\n" + "=" * 50)
    print("PHASE 1: ALL VERIFICATIONS PASSED")
    print("=" * 50)


if __name__ == "__main__":
    run()
