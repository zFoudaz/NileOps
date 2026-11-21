import shutil
import uuid
from pathlib import Path
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_role
from app.config import settings
from app.models.document import Document
from app.models.enums import RequestStatus, UserRole
from app.models.request import Request
from app.models.user import User
from app.schemas.document import DocumentResponse
from app.schemas.request import (
    CorrectionRequest,
    DocumentExtractedData,
    ExtractedDataResponse,
    ExtractedFieldInfo,
    RequestCreate,
    RequestResponse,
)
from app.schemas.validation_result import ValidationResultResponse
from app.services.request_types import get_handler

router = APIRouter()


@router.post(
    "",
    response_model=RequestResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create account opening request",
    include_in_schema=False,
)
@router.post(
    "/",
    response_model=RequestResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create account opening request",
)
def create_request(
    request_in: RequestCreate,
    current_user: User = Depends(require_role(UserRole.CUSTOMER)),
    db: Session = Depends(get_db),
) -> Request:
    new_request = Request(
        customer_id=current_user.id,
        request_type=request_in.request_type,
        sub_type=request_in.sub_type,
        status=RequestStatus.PENDING_UPLOAD,
    )
    db.add(new_request)
    db.commit()
    db.refresh(new_request)
    return new_request


@router.get(
    "",
    response_model=List[RequestResponse],
    summary="List customer requests",
    include_in_schema=False,
)
@router.get(
    "/",
    response_model=List[RequestResponse],
    summary="List customer requests",
)
def list_my_requests(
    current_user: User = Depends(require_role(UserRole.CUSTOMER)),
    db: Session = Depends(get_db),
) -> List[Request]:
    return (
        db.query(Request)
        .filter(Request.customer_id == current_user.id)
        .order_by(Request.created_at.desc())
        .all()
    )


@router.get(
    "/{id}",
    response_model=RequestResponse,
    summary="Get request detail",
)
@router.get(
    "/{id}/",
    response_model=RequestResponse,
    summary="Get request detail",
    include_in_schema=False,
)
def get_request_detail(
    id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Request:
    req = db.query(Request).filter(Request.id == id).first()
    if not req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Request not found",
        )

    # Customers can only see their own requests
    user_role = (
        current_user.role.value.lower()
        if hasattr(current_user.role, "value")
        else str(current_user.role).lower()
    )
    if user_role == UserRole.CUSTOMER.value and req.customer_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Request not found",
        )

    return req


@router.get(
    "/{id}/extracted-data",
    response_model=ExtractedDataResponse,
    summary="Get extracted and corrected data for customer review",
)
@router.get(
    "/{id}/extracted-data/",
    response_model=ExtractedDataResponse,
    summary="Get extracted and corrected data for customer review",
    include_in_schema=False,
)
def get_extracted_data(
    id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ExtractedDataResponse:
    req = db.query(Request).filter(Request.id == id).first()
    if not req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Request not found",
        )

    # Customers can only see their own requests
    user_role = (
        current_user.role.value.lower()
        if hasattr(current_user.role, "value")
        else str(current_user.role).lower()
    )
    if user_role == UserRole.CUSTOMER.value and req.customer_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Request not found",
        )

    handler = get_handler(req.request_type)
    non_editable = {f.lower() for f in handler.non_editable_fields}

    doc_responses = []
    for doc in req.documents:
        extracted = doc.extracted_data or {}
        corrected = doc.corrected_data or {}

        all_keys = list(dict.fromkeys(list(extracted.keys()) + list(corrected.keys())))
        fields = []
        editable_flags = {}
        for key in all_keys:
            val = corrected.get(key, extracted.get(key))
            editable = key.lower() not in non_editable
            fields.append(ExtractedFieldInfo(name=key, value=val, editable=editable))
            editable_flags[key] = editable

        norm_path = doc.file_path.replace("\\", "/") if doc.file_path else ""
        img_url = f"/{norm_path}" if norm_path and not norm_path.startswith("/") else norm_path

        doc_responses.append(
            DocumentExtractedData(
                id=doc.id,
                document_id=doc.id,
                document_type=doc.document_type,
                file_path=doc.file_path,
                image_url=img_url,
                ocr_required=doc.ocr_required,
                ocr_completed=doc.ocr_completed,
                extracted_data=doc.extracted_data,
                corrected_data=doc.corrected_data,
                fields=fields,
                editable_flags=editable_flags,
            )
        )

    val_responses = [
        ValidationResultResponse.model_validate(vr)
        for vr in req.validation_results
    ]

    return ExtractedDataResponse(
        request_id=req.id,
        status=req.status,
        auto_decision=req.auto_decision,
        documents=doc_responses,
        validation_results=val_responses,
    )


@router.patch(
    "/{id}/corrections",
    response_model=DocumentResponse,
    summary="Submit field corrections for a document",
)
@router.patch(
    "/{id}/corrections/",
    response_model=DocumentResponse,
    summary="Submit field corrections for a document",
    include_in_schema=False,
)
def submit_corrections(
    id: uuid.UUID,
    correction_in: CorrectionRequest,
    current_user: User = Depends(require_role(UserRole.CUSTOMER)),
    db: Session = Depends(get_db),
) -> Document:
    req = db.query(Request).filter(Request.id == id).first()
    if not req or req.customer_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Request not found",
        )

    # Non-editable fields defined by the request type handler cannot be edited by user
    handler = get_handler(req.request_type)
    non_editable = {f.lower() for f in handler.non_editable_fields}
    for key in correction_in.corrected_fields.keys():
        if key.lower() in non_editable:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{key} cannot be edited",
            )

    doc = (
        db.query(Document)
        .filter(Document.id == correction_in.document_id, Document.request_id == req.id)
        .first()
    )
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    existing_corrected = dict(doc.corrected_data or {})
    existing_corrected.update(correction_in.corrected_fields)
    doc.corrected_data = existing_corrected

    db.commit()
    db.refresh(doc)
    return doc


@router.post(
    "/{id}/submit",
    response_model=RequestResponse,
    summary="Submit request for employee review",
)
@router.post(
    "/{id}/submit/",
    response_model=RequestResponse,
    summary="Submit request for employee review",
    include_in_schema=False,
)
def submit_request_for_review(
    id: uuid.UUID,
    current_user: User = Depends(require_role(UserRole.CUSTOMER)),
    db: Session = Depends(get_db),
) -> Request:
    req = db.query(Request).filter(Request.id == id).first()
    if not req or req.customer_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Request not found",
        )

    if req.status == RequestStatus.PROCESSING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot submit request while it is processing",
        )

    req.status = RequestStatus.PENDING_REVIEW
    db.commit()
    db.refresh(req)
    return req


@router.delete(
    "/{id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a customer request",
)
@router.delete(
    "/{id}/",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a customer request",
    include_in_schema=False,
)
def delete_request(
    id: uuid.UUID,
    current_user: User = Depends(require_role(UserRole.CUSTOMER)),
    db: Session = Depends(get_db),
) -> None:
    req = db.query(Request).filter(Request.id == id).first()
    if not req or req.customer_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Request not found",
        )

    if req.status == RequestStatus.PROCESSING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete request while it is processing",
        )

    # Clean up uploaded physical files for this request
    upload_dir = Path(settings.UPLOAD_DIR) / str(req.id)
    if upload_dir.exists() and upload_dir.is_dir():
        shutil.rmtree(upload_dir, ignore_errors=True)

    db.delete(req)
    db.commit()
    return None

