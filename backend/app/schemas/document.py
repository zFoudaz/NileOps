import uuid
from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel, ConfigDict, model_validator
from app.models.enums import DocumentType


class DocumentResponse(BaseModel):
    id: uuid.UUID
    request_id: uuid.UUID
    document_type: DocumentType
    file_path: str
    image_url: Optional[str] = None
    ocr_required: bool
    extracted_data: Optional[Any] = None
    corrected_data: Optional[Any] = None
    ocr_completed: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="after")
    def populate_image_url(self) -> "DocumentResponse":
        if not self.image_url and self.file_path:
            norm_path = self.file_path.replace("\\", "/")
            self.image_url = f"/{norm_path}" if not norm_path.startswith("/") else norm_path
        return self
