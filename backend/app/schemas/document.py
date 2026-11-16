import uuid
from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel, ConfigDict
from app.models.enums import DocumentType


class DocumentResponse(BaseModel):
    id: uuid.UUID
    request_id: uuid.UUID
    document_type: DocumentType
    file_path: str
    ocr_required: bool
    extracted_data: Optional[Any] = None
    corrected_data: Optional[Any] = None
    ocr_completed: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
