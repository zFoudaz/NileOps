import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Enum as SAEnum, func
from sqlalchemy import UUID
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.enums import RequestStatus, RequestType, AutoDecision


class Request(Base):
    __tablename__ = "requests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    request_type = Column(
        SAEnum(RequestType, name="request_type", values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=RequestType.ACCOUNT_OPENING,
    )
    sub_type = Column(String(50), nullable=False)
    status = Column(
        SAEnum(RequestStatus, name="request_status", values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=RequestStatus.PENDING_UPLOAD,
        index=True,
    )
    auto_decision = Column(
        SAEnum(AutoDecision, name="auto_decision", values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )
    rejection_reason = Column(Text, nullable=True)
    verified_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True)
    verified_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    customer = relationship("User", foreign_keys=[customer_id], back_populates="requests")
    verifier = relationship("User", foreign_keys=[verified_by], back_populates="verified_requests")
    documents = relationship("Document", back_populates="request", cascade="all, delete-orphan")
    validation_results = relationship("ValidationResult", back_populates="request", cascade="all, delete-orphan")

    @property
    def required_documents(self):
        from app.services.request_types import get_handler

        try:
            handler = get_handler(self.request_type)
        except ValueError:
            return []
        return handler.get_required_documents(self.sub_type)
