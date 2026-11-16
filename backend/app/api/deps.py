import enum
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional, Union, Sequence
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.enums import UserRole
from app.models.user import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_identifier: Optional[str] = payload.get("sub")
        if user_identifier is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    # Try lookup by UUID first, fall back to email
    user = None
    try:
        user_uuid = uuid.UUID(user_identifier)
        user = db.query(User).filter(User.id == user_uuid).first()
    except (ValueError, TypeError):
        pass

    if user is None:
        user = db.query(User).filter(User.email == user_identifier.strip().lower()).first()

    if user is None:
        raise credentials_exception

    return user


def require_role(role: Union[UserRole, str, Sequence[Union[UserRole, str]]]):
    if isinstance(role, (list, tuple, set)):
        roles = list(role)
    else:
        roles = [role]

    allowed_roles = {
        r.value.lower() if isinstance(r, enum.Enum) else str(r).lower()
        for r in roles
    }

    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        user_role = (
            current_user.role.value.lower()
            if isinstance(current_user.role, enum.Enum)
            else str(current_user.role).lower()
        )
        if user_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return current_user

    return role_checker
