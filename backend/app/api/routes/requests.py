import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_role
from app.models.enums import RequestStatus, UserRole
from app.models.request import Request
from app.models.user import User
from app.schemas.request import RequestCreate, RequestResponse

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
        sub_type=request_in.sub_type.value,
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
