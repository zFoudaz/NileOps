import uuid
from datetime import datetime
from typing import Any, List, Optional
from pydantic import BaseModel, ConfigDict, Field
from app.models.enums import AccountType, AutoDecision, DocumentType, RequestStatus, RequestType
from app.schemas.document import DocumentResponse


class ValidationResultResponse(BaseModel):
    id: uuid.UUID
    request_id: uuid.UUID
    rule_name: str
    passed: bool
    details: Optional[Any] = None
    user_corrected: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RequestCreate(BaseModel):
    request_type: RequestType = RequestType.ACCOUNT_OPENING
    sub_type: AccountType


class RequestResponse(BaseModel):
    id: uuid.UUID
    customer_id: uuid.UUID
    request_type: RequestType
    sub_type: str
    status: RequestStatus
    auto_decision: Optional[AutoDecision] = None
    rejection_reason: Optional[str] = None
    verified_by: Optional[uuid.UUID] = None
    verified_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    documents: List[DocumentResponse] = Field(default_factory=list)
    validation_results: List[ValidationResultResponse] = Field(default_factory=list)
    required_documents: List[DocumentType] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)
