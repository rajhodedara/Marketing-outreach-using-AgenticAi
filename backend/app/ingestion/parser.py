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
            zip_ref.extractall(extract_dir)

    with tempfile.TemporaryDirectory() as temp_dir:
        temp_dir_path = Path(temp_dir)
        
        # Run synchronous zip extraction in a separate thread
        await asyncio.to_thread(extract_zip, zip_path, temp_dir_path)

        for file_path in temp_dir_path.rglob('*'):
            if not file_path.is_file():
                continue

            if file_path.suffix.lower() == '.json':
                async with aiofiles.open(file_path, mode='r', encoding='utf-8') as f:
                    content = await f.read()
                    try:
                        contents.crm_data = json.loads(content)
                    except json.JSONDecodeError:
                        pass
            
            elif file_path.suffix.lower() == '.txt':
                async with aiofiles.open(file_path, mode='r', encoding='utf-8') as f:
                    content = await f.read()
                
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
