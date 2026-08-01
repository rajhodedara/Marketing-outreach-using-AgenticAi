from __future__ import annotations

import json
import logging
import tempfile
import uuid
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.db.models import Account, Upload
from app.db.chunk_model import DocumentChunkRecord
from app.ingestion.parser import parse_data_pack
from app.ingestion.pii_masker import PIIMasker
from app.ingestion.chunker import DocumentChunker
from app.rag.qdrant_store import init_collection, store_chunks

logger = logging.getLogger(__name__)
router = APIRouter()
pii_masker = PIIMasker()
chunker = DocumentChunker()


@router.post("/upload")
async def upload_data_pack(
    file: UploadFile = File(...),
    account_name: str = Form(...),
    account_domain: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Upload a Data Pack (.zip) for an account.

    Accepts a zip containing CRM JSON, transcript .txt, and email .txt files.
    Parses, masks PII, chunks text, and stores everything in SQLite.
    """
    if not file.filename or not file.filename.endswith(".zip"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be a .zip archive.",
        )

    # 1. Save zip to temp location
    with tempfile.NamedTemporaryFile(suffix=".zip", delete=False) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = Path(tmp.name)

    try:
        # 2. Parse the data pack
        logger.info(f"Parsing data pack: {file.filename}")
        pack = await parse_data_pack(tmp_path)
        logger.info(f"Parsed pack: CRM={bool(pack.crm_data)} Transcripts={len(pack.transcripts)} Emails={len(pack.emails)}")

        # 3. Create or find Account
        logger.info(f"Querying DB for account: {account_name}")
        logger.info("Before db.execute")
        result = await db.execute(
            select(Account).where(Account.company_name == account_name)
        )
        logger.info("After db.execute")
        account = result.scalar_one_or_none()
        if account is None:
            logger.info("Creating new account record")
            account = Account(
                id=str(uuid.uuid4()),
                company_name=account_name,
                domain=account_domain,
                industry=pack.crm_data.get("account", {}).get("industry") if pack.crm_data else None,
            )
            db.add(account)
            # await db.flush() - Removed because it might cause a hang

        account_id = account.id
        logger.info(f"Account ID: {account_id}")
        files_processed = 0
        total_pii_detections = 0
        total_chunks = 0

        # 4. Store CRM data as a JSON upload record
        if pack.crm_data:
            logger.info("Adding CRM data to DB session")
            crm_upload = Upload(
                id=str(uuid.uuid4()),
                account_id=account_id,
                filename="crm_data.json",
                file_type="crm_json",
                status="processed",
                raw_text=json.dumps(pack.crm_data, indent=2),
                masked_text=None,  # CRM structured data — no PII masking needed on JSON
            )
            db.add(crm_upload)
            files_processed += 1

        # 5. Process unstructured text files (transcripts + emails)
        all_docs = pack.transcripts + pack.emails
        all_chunk_records = []

        for doc in all_docs:
            # PII masking
            logger.info(f"Masking doc: {doc.filename}")
            masked_text, detections = pii_masker.mask_text(doc.content)
            logger.info(f"Finished masking doc: {doc.filename}")
            total_pii_detections += len(detections)

            upload_id = str(uuid.uuid4())
            upload_record = Upload(
                id=upload_id,
                account_id=account_id,
                filename=doc.filename,
                file_type=doc.doc_type,
                status="processed",
                raw_text=doc.content,
                masked_text=masked_text,
            )
            db.add(upload_record)
            files_processed += 1

            # 6. Chunk the MASKED text (not raw)
            logger.info(f"Chunking doc: {doc.filename}")
            chunks = chunker.chunk_document(
                text=masked_text,
                doc_name=doc.filename,
                doc_type=doc.doc_type,
                chunk_size=500,
                overlap=50,
            )
            logger.info(f"Finished chunking doc: {doc.filename}, {len(chunks)} chunks")
            for chunk in chunks:
                chunk_record = DocumentChunkRecord(
                    id=chunk.chunk_id,
                    upload_id=upload_id,
                    account_id=account_id,
                    document_name=chunk.document_name,
                    document_type=chunk.document_type,
                    text=chunk.text,
                    line_start=chunk.line_start,
                    line_end=chunk.line_end,
                    char_start=chunk.char_start,
                    char_end=chunk.char_end,
                    embedded=False,
                )
                db.add(chunk_record)
                total_chunks += 1
                all_chunk_records.append(chunk_record)

        # 7. Initialize Qdrant collection and store chunks
        logger.info(f"Init Qdrant collection for account {account_id}")
        await init_collection(account_id)
        if all_chunk_records:
            logger.info(f"Storing {len(all_chunk_records)} chunks in Qdrant")
            await store_chunks(account_id, all_chunk_records)
            logger.info(f"Stored chunks in Qdrant")

        logger.info("Before db.commit()")
        await db.commit()
        logger.info("After db.commit()")

        logger.info(
            f"Upload complete: account={account_id}, "
            f"files={files_processed}, pii={total_pii_detections}, chunks={total_chunks}"
        )

        return {
            "account_id": account_id,
            "account_name": account_name,
            "files_processed": files_processed,
            "pii_detections_count": total_pii_detections,
            "chunks_created": total_chunks,
        }

    except Exception as e:
        logger.error(f"Upload failed: {e}", exc_info=True)
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process data pack: {str(e)}",
        )
    finally:
        tmp_path.unlink(missing_ok=True)
