from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_role
from app.models.bank_account import BankAccount
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.bank_account import BankAccountResponse

router = APIRouter()


@router.get(
    "/me",
    response_model=List[BankAccountResponse],
    summary="List authenticated customer's bank accounts",
)
@router.get(
    "/me/",
    response_model=List[BankAccountResponse],
    summary="List authenticated customer's bank accounts",
    include_in_schema=False,
)
def get_my_accounts(
    current_user: User = Depends(require_role(UserRole.CUSTOMER)),
    db: Session = Depends(get_db),
) -> List[BankAccount]:
    return (
        db.query(BankAccount)
        .filter(BankAccount.user_id == current_user.id)
        .order_by(BankAccount.created_at.desc())
        .all()
    )
