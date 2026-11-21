import secrets
import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, String, Text, UUID, func
from sqlalchemy.orm import relationship

from app.database import Base


def generate_account_number() -> str:
    """Generate a unique 16-digit Egyptian-style NileOps bank account number."""
    # Prefix 1001 + 12 random digits
    return "1001" + "".join(str(secrets.randbelow(10)) for _ in range(12))


class BankAccount(Base):
    __tablename__ = "bank_accounts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    request_id = Column(UUID(as_uuid=True), ForeignKey("requests.id"), nullable=True, unique=True)
    account_number = Column(
        String(32),
        unique=True,
        index=True,
        nullable=False,
        default=generate_account_number,
    )
    account_type = Column(String(50), nullable=False)
    holder_name = Column(String(255), nullable=False)
    national_id = Column(String(20), nullable=True, index=True)
    address = Column(Text, nullable=True)
    status = Column(String(20), nullable=False, default="active")
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    user = relationship("User", back_populates="bank_accounts")
    request = relationship("Request", foreign_keys=[request_id])
