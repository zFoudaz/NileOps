import pytest
from fastapi import Depends
from app.main import app as fastapi_app
from app.api.deps import require_role, get_password_hash
from app.models.enums import UserRole
from app.models.user import User
from seed_employee import seed_employee


# Register a test route that requires employee role to verify role enforcement
@fastapi_app.get("/api/test/employee-only")
def employee_only_endpoint(current_user: User = Depends(require_role(UserRole.employee))):
    return {"message": "employee access granted", "user_id": str(current_user.id)}


def test_register_customer(client, db_session):
    """POST /register -> 201, token returned, role=customer."""
    response = client.post(
        "/api/auth/register",
        json={
            "name": "Ahmed Ali",
            "email": "ahmed@bank.com",
            "password": "strongpassword123",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert data["token_type"].lower() == "bearer"

    # Verify user was created in DB with customer role
    user = db_session.query(User).filter(User.email == "ahmed@bank.com").first()
    assert user is not None
    assert user.role == UserRole.CUSTOMER
    assert user.name == "Ahmed Ali"

    # Verify role=customer by querying /me with the returned token
    me_resp = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {data['access_token']}"},
    )
    assert me_resp.status_code == 200
    assert me_resp.json()["role"] == "customer"


def test_register_duplicate_email(client, db_session):
    """POST /register same email -> 400 (including case-insensitive check)."""
    user_payload = {
        "name": "Sara Ahmed",
        "email": "sara@bank.com",
        "password": "secretpassword",
    }
    first_resp = client.post("/api/auth/register", json=user_payload)
    assert first_resp.status_code == 201

    # Attempt to register again with identical email
    second_resp = client.post("/api/auth/register", json=user_payload)
    assert second_resp.status_code == 400
    assert "detail" in second_resp.json()

    # Attempt to register with uppercase variant of existing email -> 400
    upper_resp = client.post(
        "/api/auth/register",
        json={
            "name": "Sara Upper",
            "email": "SARA@BANK.COM",
            "password": "secretpassword",
        },
    )
    assert upper_resp.status_code == 400


def test_login_success(client, db_session):
    """POST /login -> 200, valid token."""
    # First register user
    client.post(
        "/api/auth/register",
        json={
            "name": "Omar Hassan",
            "email": "omar@bank.com",
            "password": "correctpassword",
        },
    )

    # Login with valid credentials (using uppercase email to verify normalization)
    response = client.post(
        "/api/auth/login",
        json={
            "email": "OMAR@BANK.COM",
            "password": "correctpassword",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"].lower() == "bearer"

    # Verify the token can authenticate to /me
    me_resp = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {data['access_token']}"},
    )
    assert me_resp.status_code == 200
    assert me_resp.json()["email"] == "omar@bank.com"


def test_login_wrong_password(client, db_session):
    """POST /login wrong pw -> 401."""
    # First register user
    client.post(
        "/api/auth/register",
        json={
            "name": "Mona Salah",
            "email": "mona@bank.com",
            "password": "correctpassword",
        },
    )

    # Attempt login with incorrect password
    response = client.post(
        "/api/auth/login",
        json={
            "email": "mona@bank.com",
            "password": "wrongpassword",
        },
    )
    assert response.status_code == 401

    # Attempt login with non-existent email
    response_no_user = client.post(
        "/api/auth/login",
        json={
            "email": "nonexistent@bank.com",
            "password": "correctpassword",
        },
    )
    assert response_no_user.status_code == 401


def test_me_authenticated(client, db_session):
    """GET /me with token -> 200, correct user."""
    reg_resp = client.post(
        "/api/auth/register",
        json={
            "name": "Tamer Hosny",
            "email": "tamer@bank.com",
            "password": "password123",
        },
    )
    token = reg_resp.json()["access_token"]

    response = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    user_data = response.json()
    assert user_data["name"] == "Tamer Hosny"
    assert user_data["email"] == "tamer@bank.com"
    assert user_data["role"] == "customer"
    assert "id" in user_data


def test_me_unauthenticated(client):
    """GET /me no token -> 401."""
    response = client.get("/api/auth/me")
    assert response.status_code == 401

    # Also test invalid token
    invalid_resp = client.get(
        "/api/auth/me",
        headers={"Authorization": "Bearer invalid.jwt.token"},
    )
    assert invalid_resp.status_code == 401


def test_require_employee_as_customer(client, db_session):
    """Access employee endpoint as customer -> 403 Forbidden."""
    # 1. Register a customer and obtain token
    reg_resp = client.post(
        "/api/auth/register",
        json={
            "name": "Customer User",
            "email": "cust@bank.com",
            "password": "password123",
        },
    )
    customer_token = reg_resp.json()["access_token"]

    # 2. Try to access employee endpoint with customer token -> 403 Forbidden
    forbidden_resp = client.get(
        "/api/test/employee-only",
        headers={"Authorization": f"Bearer {customer_token}"},
    )
    assert forbidden_resp.status_code == 403
    assert forbidden_resp.json()["detail"] == "Insufficient permissions"

    # 3. Seed an employee user in DB and login to get employee token
    emp = seed_employee(
        name="Employee User",
        email="emp@bank.com",
        password="emppassword123",
        db=db_session,
    )
    assert emp.role == UserRole.EMPLOYEE

    login_resp = client.post(
        "/api/auth/login",
        json={"email": "emp@bank.com", "password": "emppassword123"},
    )
    assert login_resp.status_code == 200
    employee_token = login_resp.json()["access_token"]

    # 4. Access employee endpoint with employee token -> 200 OK
    allowed_resp = client.get(
        "/api/test/employee-only",
        headers={"Authorization": f"Bearer {employee_token}"},
    )
    assert allowed_resp.status_code == 200
    assert allowed_resp.json()["message"] == "employee access granted"


def test_register_arabic_characters(client, db_session):
    """POST /register and GET /me with Arabic characters in name."""
    response = client.post(
        "/api/auth/register",
        json={
            "name": "أحمد علي",
            "email": "ahmed.arabic@bank.com",
            "password": "strongpassword123",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data

    # Verify user in database
    user = db_session.query(User).filter(User.email == "ahmed.arabic@bank.com").first()
    assert user is not None
    assert user.name == "أحمد علي"
    assert user.role == UserRole.CUSTOMER

    # Verify /me returns correct Arabic name
    me_resp = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {data['access_token']}"},
    )
    assert me_resp.status_code == 200
    assert me_resp.json()["name"] == "أحمد علي"


def test_password_length_validation(client):
    """Password must be between 8 and 72 characters."""
    # Under 8 chars (7 chars) -> 422 Unprocessable Entity
    short_resp = client.post(
        "/api/auth/register",
        json={
            "name": "Short Password",
            "email": "short@bank.com",
            "password": "short7!",
        },
    )
    assert short_resp.status_code == 422

    # Over 72 chars (73 chars) -> 422 Unprocessable Entity
    long_resp = client.post(
        "/api/auth/register",
        json={
            "name": "Long Password",
            "email": "long@bank.com",
            "password": "a" * 73,
        },
    )
    assert long_resp.status_code == 422

