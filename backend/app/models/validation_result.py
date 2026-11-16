import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, JSON, func
from sqlalchemy import UUID
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from app.database import Base


class ValidationResult(Base):
    __tablename__ = "validation_results"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    request_id = Column(UUID(as_uuid=True), ForeignKey("requests.id"), nullable=False)
    rule_name = Column(String(100), nullable=False)
    passed = Column(Boolean, nullable=False)
    details = Column(JSONB().with_variant(JSON, "sqlite"), nullable=True)
    user_corrected = Column(Boolean, default=False, nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    request = relationship("Request", back_populates="validation_results")
