from __future__ import annotations
from sqlalchemy import Column, String, Integer, Boolean, ForeignKey, Text
import uuid
from app.db.models import Base

class DocumentChunkRecord(Base):
    __tablename__ = "document_chunks"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    upload_id = Column(String, nullable=False)
    account_id = Column(String, nullable=False) # Without direct foreign key to allow flexibility
    document_name = Column(String, nullable=False)
    document_type = Column(String, nullable=False)
    text = Column(Text, nullable=False)
    line_start = Column(Integer, nullable=False)
    line_end = Column(Integer, nullable=False)
    char_start = Column(Integer, nullable=False)
    char_end = Column(Integer, nullable=False)
    embedded = Column(Boolean, default=False)
