from __future__ import annotations
import json
import zipfile
import tempfile
import aiofiles
import asyncio
from pathlib import Path
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class TextDocument(BaseModel):
    filename: str
    content: str
    doc_type: str  # 'transcript' | 'email'

class DataPackContents(BaseModel):
    crm_data: Optional[Dict[str, Any]] = None
    transcripts: List[TextDocument] = []
    emails: List[TextDocument] = []

async def parse_data_pack(zip_path: Path) -> DataPackContents:
    contents = DataPackContents()
    
    def extract_zip(zip_file: Path, extract_dir: Path):
        with zipfile.ZipFile(zip_file, 'r') as zip_ref:
            base_dir = extract_dir.resolve()
            for member in zip_ref.infolist():
                target_path = (base_dir / member.filename).resolve()
                if base_dir not in target_path.parents and target_path != base_dir:
                    raise ValueError(f"Unsafe path in zip archive: {member.filename}")
                zip_ref.extract(member, base_dir)

    with tempfile.TemporaryDirectory() as temp_dir:
        temp_dir_path = Path(temp_dir)
        
        # Run synchronous zip extraction in a separate thread
        await asyncio.to_thread(extract_zip, zip_path, temp_dir_path)

        for file_path in temp_dir_path.rglob('*'):
            if not file_path.is_file():
                continue

            if file_path.name.startswith('.') or '__MACOSX' in file_path.parts:
                continue

            if file_path.suffix.lower() == '.json':
                async with aiofiles.open(file_path, mode='r', encoding='utf-8') as f:
                    try:
                        content = await f.read()
                        contents.crm_data = json.loads(content)
                    except (UnicodeDecodeError, json.JSONDecodeError):
                        pass
                continue
            
            # Extract text content from .txt or .pdf
            content = None
            
            if file_path.suffix.lower() == '.txt':
                async with aiofiles.open(file_path, mode='r', encoding='utf-8') as f:
                    try:
                        content = await f.read()
                    except UnicodeDecodeError:
                        continue
                
            elif file_path.suffix.lower() == '.pdf':
                try:
                    def extract_pdf(pdf_path=file_path):
                        import pypdf
                        text = ""
                        with open(pdf_path, "rb") as f:
                            reader = pypdf.PdfReader(f)
                            for page in reader.pages:
                                page_text = page.extract_text()
                                if page_text:
                                    text += page_text + "\n"
                        return text
                    
                    content = await asyncio.to_thread(extract_pdf)
                    if not content or not content.strip():
                        continue
                except Exception as e:
                    print(f"Error reading pdf {file_path}: {e}")
                    continue
            else:
                # Skip unsupported file types
                continue

            # Classify the extracted text document
            if content is None:
                continue
                
            filename_lower = file_path.name.lower()
            doc_type = None
            
            if 'transcript' in filename_lower:
                doc_type = 'transcript'
            elif 'email' in filename_lower:
                doc_type = 'email'
            else:
                # Heuristics based on content
                content_lower = content.lower()
                if 'from:' in content_lower or 'subject:' in content_lower:
                    doc_type = 'email'
                else:
                    doc_type = 'transcript'
            
            doc = TextDocument(
                filename=file_path.name,
                content=content,
                doc_type=doc_type
            )
            
            if doc_type == 'email':
                contents.emails.append(doc)
            else:
                contents.transcripts.append(doc)

    return contents

