import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Enum as SAEnum, JSON, func
from sqlalchemy import UUID
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.enums import DocumentType


class Document(Base):
    __tablename__ = "documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    request_id = Column(UUID(as_uuid=True), ForeignKey("requests.id"), nullable=False)
    document_type = Column(
        SAEnum(DocumentType, name="document_type", values_callable=lambda x: [e.value for e in x]),
        nullable=False,
    )
    file_path = Column(String(500), nullable=False)
    ocr_required = Column(Boolean, default=True, nullable=False)
    extracted_data = Column(JSONB().with_variant(JSON, "sqlite"), nullable=True)
    corrected_data = Column(JSONB().with_variant(JSON, "sqlite"), nullable=True)
    ocr_completed = Column(Boolean, default=False, nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    request = relationship("Request", back_populates="documents")
