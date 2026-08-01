from __future__ import annotations
import uuid
import hashlib
from typing import List
from pydantic import BaseModel

class DocumentChunk(BaseModel):
    chunk_id: str
    document_name: str
    document_type: str
    text: str
    line_start: int
    line_end: int
    char_start: int
    char_end: int

class DocumentChunker:
    """Splits documents into chunks and tracks line/character offsets."""
    
    def chunk_document(
        self, text: str, doc_name: str, doc_type: str, chunk_size: int = 500, overlap: int = 50
    ) -> List[DocumentChunk]:
        if not text:
            return []

        chunks = []
        text_length = len(text)
        
        # Pre-compute newline positions to calculate lines efficiently
        newline_positions = [i for i, char in enumerate(text) if char == '\n']
        
        def get_line_number(char_idx: int) -> int:
            if char_idx <= 0:
                return 1
            line_count = 1
            for pos in newline_positions:
                if pos < char_idx:
                    line_count += 1
                else:
                    break
            return line_count

        start = 0
        while start < text_length:
            end = min(start + chunk_size, text_length)
            
            # Align end with word boundaries
            if end < text_length:
                last_space = text.rfind(' ', start, end)
                last_newline = text.rfind('\n', start, end)
                boundary = max(last_space, last_newline)
                if boundary > start:
                    end = boundary + 1
            
            chunk_text = text[start:end].strip()
            if chunk_text:
                # Find start index in the original text (ignoring leading whitespace)
                offset = len(text[start:end]) - len(text[start:end].lstrip())
                stripped_start = start + offset
                stripped_end = stripped_start + len(chunk_text)
                
                line_start = get_line_number(stripped_start)
                line_end = get_line_number(stripped_end - 1 if stripped_end > stripped_start else stripped_start)
                
                chunk_id = str(uuid.uuid4())
                
                chunks.append(DocumentChunk(
                    chunk_id=chunk_id,
                    document_name=doc_name,
                    document_type=doc_type,
                    text=chunk_text,
                    line_start=line_start,
                    line_end=line_end,
                    char_start=stripped_start,
                    char_end=stripped_end
                ))
            
            next_start = end - overlap
            if next_start <= start:
                next_start = end
            start = next_start

        return chunks
