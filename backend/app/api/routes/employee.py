import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_role
from app.models.enums import RequestStatus, UserRole
from app.models.request import Request
from app.models.user import User
from app.schemas.document import DocumentResponse
from app.schemas.request import EmployeeRequestResponse, VerifyRequest
from app.schemas.user import UserResponse
from app.schemas.validation_result import ValidationResultResponse
from app.services.request_types import get_handler

router = APIRouter(dependencies=[Depends(require_role(UserRole.EMPLOYEE))])


def _to_employee_response(req: Request) -> EmployeeRequestResponse:
    customer_dto = UserResponse.model_validate(req.customer) if req.customer else None
    verifier_dto = UserResponse.model_validate(req.verifier) if req.verifier else None

    docs = []
    for d in req.documents:
        norm_path = d.file_path.replace("\\", "/") if d.file_path else ""
        img_url = f"/{norm_path}" if norm_path and not norm_path.startswith("/") else norm_path
        docs.append(
            DocumentResponse(
                id=d.id,
                request_id=d.request_id,
                document_type=d.document_type,
                file_path=d.file_path,
                image_url=img_url,
                ocr_required=d.ocr_required,
                ocr_completed=d.ocr_completed,
                extracted_data=d.extracted_data,
                corrected_data=d.corrected_data,
                created_at=d.created_at,
            )
        )

    val_results = [
        ValidationResultResponse.model_validate(vr)
        for vr in req.validation_results
    ]

    return EmployeeRequestResponse(
        id=req.id,
        customer_id=req.customer_id,
        request_type=req.request_type,
        sub_type=req.sub_type,
        status=req.status,
        auto_decision=req.auto_decision,
        rejection_reason=req.rejection_reason,
        verified_by=req.verified_by,
        verified_at=req.verified_at,
        created_at=req.created_at,
        updated_at=req.updated_at,
        customer=customer_dto,
        verifier=verifier_dto,
        customer_name=req.customer.name if req.customer else None,
        customer_email=req.customer.email if req.customer else None,
        verifier_name=req.verifier.name if req.verifier else None,
        documents=docs,
        validation_results=val_results,
        required_documents=req.required_documents,
    )


@router.get(
    "/requests",
    response_model=List[EmployeeRequestResponse],
    summary="List requests for employee review",
)
@router.get(
    "/requests/",
    response_model=List[EmployeeRequestResponse],
    summary="List requests for employee review",
    include_in_schema=False,
)
def list_requests(
    status: Optional[str] = Query(default=None, description="Filter by status (default: pending_review)"),
    sub_type: Optional[str] = Query(default=None, description="Filter by account sub_type"),
    start_date: Optional[datetime] = Query(default=None, description="Filter by created_at >= start_date"),
    end_date: Optional[datetime] = Query(default=None, description="Filter by created_at <= end_date"),
    page: int = Query(default=1, ge=1, description="Page number"),
    limit: int = Query(default=20, ge=1, le=100, description="Page size limit"),
    skip: Optional[int] = Query(default=None, ge=0, description="Offset override"),
    current_user: User = Depends(require_role(UserRole.EMPLOYEE)),
    db: Session = Depends(get_db),
) -> List[EmployeeRequestResponse]:
    query = db.query(Request)

    # Status filter: defaults to pending_review if not provided
    if status is None:
        query = query.filter(Request.status == RequestStatus.PENDING_REVIEW)
    elif status.strip().lower() != "all":
        query = query.filter(Request.status == status.strip().lower())

    if sub_type:
        query = query.filter(Request.sub_type == sub_type.strip().lower())

    if start_date:
        query = query.filter(Request.created_at >= start_date)
    if end_date:
        query = query.filter(Request.created_at <= end_date)

    offset = skip if skip is not None else (page - 1) * limit
    requests = query.order_by(Request.created_at.desc()).offset(offset).limit(limit).all()

    return [_to_employee_response(r) for r in requests]


@router.get(
    "/requests/{id}",
    response_model=EmployeeRequestResponse,
    summary="Get full request details for employee review",
)
@router.get(
    "/requests/{id}/",
    response_model=EmployeeRequestResponse,
    summary="Get full request details for employee review",
    include_in_schema=False,
)
def get_request_detail(
    id: uuid.UUID,
    current_user: User = Depends(require_role(UserRole.EMPLOYEE)),
    db: Session = Depends(get_db),
) -> EmployeeRequestResponse:
    req = db.query(Request).filter(Request.id == id).first()
    if not req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Request not found",
        )

    return _to_employee_response(req)


@router.post(
    "/requests/{id}/verify",
    response_model=EmployeeRequestResponse,
    summary="Approve or reject a request with verification notes",
)
@router.post(
    "/requests/{id}/verify/",
    response_model=EmployeeRequestResponse,
    summary="Approve or reject a request with verification notes",
    include_in_schema=False,
)
def verify_request(
    id: uuid.UUID,
    verify_in: VerifyRequest,
    current_user: User = Depends(require_role(UserRole.EMPLOYEE)),
    db: Session = Depends(get_db),
) -> EmployeeRequestResponse:
    req = db.query(Request).filter(Request.id == id).first()
    if not req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Request not found",
        )

    # Review Focus #4: If already verified, return 409 Conflict
    if (
        req.verified_by is not None
        or req.verified_at is not None
        or req.status in (RequestStatus.APPROVED, RequestStatus.REJECTED)
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Request has already been verified",
        )

    clean_decision = verify_in.decision.strip().lower()
    if clean_decision not in ("approved", "rejected"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Decision must be 'approved' or 'rejected'",
        )

    if clean_decision == "rejected":
        if not verify_in.reason or not verify_in.reason.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Rejection reason is required when rejecting a request",
            )
        req.status = RequestStatus.REJECTED
        req.rejection_reason = verify_in.reason.strip()
    else:
        req.status = RequestStatus.APPROVED
        req.rejection_reason = None
        get_handler(req.request_type).on_approved(req, db)

    req.verified_by = current_user.id
    req.verified_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(req)
    return _to_employee_response(req)
