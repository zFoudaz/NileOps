import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import AccountType, AutoDecision, DocumentType, RequestStatus, RequestType
from app.schemas.document import DocumentResponse
from app.schemas.user import UserResponse
from app.schemas.validation_result import ValidationResultResponse


class RequestCreate(BaseModel):
    request_type: RequestType = RequestType.ACCOUNT_OPENING
    sub_type: AccountType


class ProcessResponse(BaseModel):
    message: str
    request_id: uuid.UUID
    status: RequestStatus

    model_config = ConfigDict(from_attributes=True)


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


class CorrectionRequest(BaseModel):
    document_id: uuid.UUID
    corrected_fields: Dict[str, Any]


class VerifyRequest(BaseModel):
    decision: str
    reason: Optional[str] = None


class ExtractedFieldInfo(BaseModel):
    name: str
    value: Optional[Any] = None
    editable: bool = True


class DocumentExtractedData(BaseModel):
    id: uuid.UUID
    document_id: uuid.UUID
    document_type: DocumentType
    file_path: str
    image_url: Optional[str] = None
    ocr_required: bool = True
    ocr_completed: bool = False
    extracted_data: Optional[Dict[str, Any]] = None
    corrected_data: Optional[Dict[str, Any]] = None
    fields: List[ExtractedFieldInfo] = Field(default_factory=list)
    editable_flags: Dict[str, bool] = Field(default_factory=dict)

    model_config = ConfigDict(from_attributes=True)


class ExtractedDataResponse(BaseModel):
    request_id: uuid.UUID
    status: RequestStatus
    auto_decision: Optional[AutoDecision] = None
    documents: List[DocumentExtractedData] = Field(default_factory=list)
    validation_results: List[ValidationResultResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class EmployeeRequestResponse(BaseModel):
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
    customer: Optional[UserResponse] = None
    verifier: Optional[UserResponse] = None
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    verifier_name: Optional[str] = None
    documents: List[DocumentResponse] = Field(default_factory=list)
    validation_results: List[ValidationResultResponse] = Field(default_factory=list)
    required_documents: List[DocumentType] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)
