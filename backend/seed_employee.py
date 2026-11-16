import argparse
import sys
from pathlib import Path
from typing import Optional
from sqlalchemy.orm import Session

# Ensure backend root is on sys.path
backend_root = Path(__file__).resolve().parent
if str(backend_root) not in sys.path:
    sys.path.insert(0, str(backend_root))

from app.database import SessionLocal, Base, engine
import app.models  # Register all models on Base.metadata
from app.api.deps import get_password_hash
from app.models.enums import UserRole
from app.models.user import User


def seed_employee(
    name: str,
    email: str,
    password: str,
    db: Optional[Session] = None,
) -> User:
    close_session = False
    if db is None:
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        close_session = True

    try:
        user = db.query(User).filter(User.email == email).first()
        if user:
            print(f"[INFO] User with email '{email}' already exists (ID: {user.id}, Role: {user.role.value}).")
            return user

        user = User(
            name=name,
            email=email,
            password_hash=get_password_hash(password),
            role=UserRole.EMPLOYEE,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        print(f"[SUCCESS] Employee created: {user.name} <{user.email}> (ID: {user.id}, Role: {user.role.value})")
        return user
    finally:
        if close_session:
            db.close()


def main():
    parser = argparse.ArgumentParser(
        description="Seed an employee user in NileOps database.",
    )
    parser.add_argument(
        "--name",
        type=str,
        required=True,
        help="Full name of employee",
    )
    parser.add_argument(
        "--email",
        type=str,
        required=True,
        help="Email address of employee",
    )
    parser.add_argument(
        "--password",
        type=str,
        required=True,
        help="Password for employee account",
    )

    args = parser.parse_args()
    seed_employee(name=args.name, email=args.email, password=args.password)


if __name__ == "__main__":
    main()
