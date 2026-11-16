import uuid
from datetime import datetime, timezone
import pytest
from app.models.document import Document
from app.models.enums import DocumentType, RequestStatus, RequestType, UserRole
from app.models.request import Request
from app.models.validation_result import ValidationResult
from seed_employee import seed_employee


def get_employee_auth_token(client, db_session, email="emp_test@bank.com"):
    seed_employee(
        name="Employee Reviewer",
        email=email,
        password="emppassword123",
        db=db_session,
    )
    login_resp = client.post(
        "/api/auth/login",
        json={"email": email, "password": "emppassword123"},
    )
    assert login_resp.status_code == 200
    return login_resp.json()["access_token"]


def get_customer_auth_token(client, email="cust_for_emp@example.com"):
    reg_resp = client.post(
        "/api/auth/register",
        json={
            "name": "Customer User",
            "email": email,
            "password": "password123",
        },
    )
    assert reg_resp.status_code == 201
    return reg_resp.json()["access_token"]


def test_employee_list_requests(client, db_session):
    """GET /api/employee/requests -> returns pending_review requests."""
    emp_token = get_employee_auth_token(client, db_session, email="emp_list@bank.com")
    emp_headers = {"Authorization": f"Bearer {emp_token}"}

    cust_token = get_customer_auth_token(client, email="cust_list1@example.com")
    cust_headers = {"Authorization": f"Bearer {cust_token}"}

    # Request 1: pending_review
    resp1 = client.post(
        "/api/requests/",
        json={"request_type": "account_opening", "sub_type": "individual"},
        headers=cust_headers,
    )
    req1_id = uuid.UUID(resp1.json()["id"])
    req1 = db_session.query(Request).filter(Request.id == req1_id).first()
    req1.status = RequestStatus.PENDING_REVIEW

    # Request 2: pending_upload (should not appear in default list)
    resp2 = client.post(
        "/api/requests/",
        json={"request_type": "account_opening", "sub_type": "youth"},
        headers=cust_headers,
    )

    # Request 3: pending_review
    resp3 = client.post(
        "/api/requests/",
        json={"request_type": "account_opening", "sub_type": "minor"},
        headers=cust_headers,
    )
    req3_id = uuid.UUID(resp3.json()["id"])
    req3 = db_session.query(Request).filter(Request.id == req3_id).first()
    req3.status = RequestStatus.PENDING_REVIEW

    db_session.commit()

    list_resp = client.get("/api/employee/requests", headers=emp_headers)
    assert list_resp.status_code == 200
    data = list_resp.json()
    assert isinstance(data, list)
    assert len(data) == 2
    listed_ids = [item["id"] for item in data]
    assert str(req1_id) in listed_ids
    assert str(req3_id) in listed_ids
    assert str(resp2.json()["id"]) not in listed_ids


def test_employee_list_filter_by_type(client, db_session):
    """GET /api/employee/requests?sub_type=youth -> returns only youth requests."""
    emp_token = get_employee_auth_token(client, db_session, email="emp_filter@bank.com")
    emp_headers = {"Authorization": f"Bearer {emp_token}"}

    cust_token = get_customer_auth_token(client, email="cust_filter@example.com")
    cust_headers = {"Authorization": f"Bearer {cust_token}"}

    resp1 = client.post(
        "/api/requests/",
        json={"request_type": "account_opening", "sub_type": "individual"},
        headers=cust_headers,
    )
    req1 = db_session.query(Request).filter(Request.id == uuid.UUID(resp1.json()["id"])).first()
    req1.status = RequestStatus.PENDING_REVIEW

    resp2 = client.post(
        "/api/requests/",
        json={"request_type": "account_opening", "sub_type": "youth"},
        headers=cust_headers,
    )
    req2 = db_session.query(Request).filter(Request.id == uuid.UUID(resp2.json()["id"])).first()
    req2.status = RequestStatus.PENDING_REVIEW

    db_session.commit()

    resp = client.get("/api/employee/requests?sub_type=youth", headers=emp_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["sub_type"] == "youth"
    assert data[0]["id"] == str(req2.id)


def test_employee_get_request_detail(client, db_session):
    """GET /api/employee/requests/{id} -> includes customer info, documents, extracted/corrected data, images."""
    emp_token = get_employee_auth_token(client, db_session, email="emp_detail@bank.com")
    emp_headers = {"Authorization": f"Bearer {emp_token}"}

    cust_token = get_customer_auth_token(client, email="cust_detail_target@example.com")
    cust_headers = {"Authorization": f"Bearer {cust_token}"}

    create_resp = client.post(
        "/api/requests/",
        json={"request_type": "account_opening", "sub_type": "individual"},
        headers=cust_headers,
    )
    req_id = uuid.UUID(create_resp.json()["id"])
    req = db_session.query(Request).filter(Request.id == req_id).first()
    req.status = RequestStatus.PENDING_REVIEW

    doc = Document(
        request_id=req_id,
        document_type=DocumentType.NATIONAL_ID_FRONT,
        file_path="uploads/test/front_emp.jpg",
        ocr_required=True,
        ocr_completed=True,
        extracted_data={"name": "Mohamed Ali", "national_id": "29001011234567"},
        corrected_data={"name": "Mohamed Ali Hassan"},
    )
    db_session.add(doc)

    val = ValidationResult(
        request_id=req_id,
        rule_name="national_id_length",
        passed=True,
        details={"length": 14},
    )
    db_session.add(val)
    db_session.commit()

    detail_resp = client.get(f"/api/employee/requests/{req_id}", headers=emp_headers)
    assert detail_resp.status_code == 200
    data = detail_resp.json()

    assert data["id"] == str(req_id)
    assert data["sub_type"] == "individual"
    assert data["status"] == "pending_review"
    assert "customer" in data or "customer_email" in data
    assert len(data["documents"]) == 1
    doc_detail = data["documents"][0]
    assert doc_detail["document_type"] == "national_id_front"
    assert "image_url" in doc_detail or "file_path" in doc_detail
    assert doc_detail["extracted_data"]["name"] == "Mohamed Ali"
    assert doc_detail["corrected_data"]["name"] == "Mohamed Ali Hassan"
    assert len(data["validation_results"]) == 1
    assert data["validation_results"][0]["rule_name"] == "national_id_length"


def test_employee_approve_request(client, db_session):
    """POST /api/employee/requests/{id}/verify approved -> status=approved, verified_by set."""
    emp_token = get_employee_auth_token(client, db_session, email="emp_approver@bank.com")
    emp_headers = {"Authorization": f"Bearer {emp_token}"}

    cust_token = get_customer_auth_token(client, email="cust_approve@example.com")
    create_resp = client.post(
        "/api/requests/",
        json={"request_type": "account_opening", "sub_type": "individual"},
        headers={"Authorization": f"Bearer {cust_token}"},
    )
    req_id = uuid.UUID(create_resp.json()["id"])
    req = db_session.query(Request).filter(Request.id == req_id).first()
    req.status = RequestStatus.PENDING_REVIEW
    db_session.commit()

    verify_payload = {"decision": "approved"}
    resp = client.post(
        f"/api/employee/requests/{req_id}/verify",
        json=verify_payload,
        headers=emp_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "approved"
    assert data["verified_by"] is not None
    assert data["verified_at"] is not None

    db_session.refresh(req)
    assert req.status == RequestStatus.APPROVED
    assert req.verified_by is not None
    assert req.verified_at is not None


def test_employee_reject_with_reason(client, db_session):
    """POST /api/employee/requests/{id}/verify rejected -> requires reason, sets status=rejected."""
    emp_token = get_employee_auth_token(client, db_session, email="emp_rejecter@bank.com")
    emp_headers = {"Authorization": f"Bearer {emp_token}"}

    cust_token = get_customer_auth_token(client, email="cust_reject@example.com")
    create_resp = client.post(
        "/api/requests/",
        json={"request_type": "account_opening", "sub_type": "individual"},
        headers={"Authorization": f"Bearer {cust_token}"},
    )
    req_id = uuid.UUID(create_resp.json()["id"])
    req = db_session.query(Request).filter(Request.id == req_id).first()
    req.status = RequestStatus.PENDING_REVIEW
    db_session.commit()

    # Reject without reason -> 400 Bad Request
    fail_resp = client.post(
        f"/api/employee/requests/{req_id}/verify",
        json={"decision": "rejected"},
        headers=emp_headers,
    )
    assert fail_resp.status_code == 400
    assert "reason" in fail_resp.json()["detail"].lower()

    # Reject with reason -> 200 OK
    reason_text = "National ID photo is unreadable and blurry."
    ok_resp = client.post(
        f"/api/employee/requests/{req_id}/verify",
        json={"decision": "rejected", "reason": reason_text},
        headers=emp_headers,
    )
    assert ok_resp.status_code == 200
    data = ok_resp.json()
    assert data["status"] == "rejected"
    assert data["rejection_reason"] == reason_text
    assert data["verified_by"] is not None

    db_session.refresh(req)
    assert req.status == RequestStatus.REJECTED
    assert req.rejection_reason == reason_text


def test_employee_verify_already_verified(client, db_session):
    """Review Focus #4: verify an already verified request -> 409 Conflict."""
    emp_token = get_employee_auth_token(client, db_session, email="emp_focus4@bank.com")
    emp_headers = {"Authorization": f"Bearer {emp_token}"}

    cust_token = get_customer_auth_token(client, email="cust_focus4@example.com")
    create_resp = client.post(
        "/api/requests/",
        json={"request_type": "account_opening", "sub_type": "individual"},
        headers={"Authorization": f"Bearer {cust_token}"},
    )
    req_id = uuid.UUID(create_resp.json()["id"])
    req = db_session.query(Request).filter(Request.id == req_id).first()
    req.status = RequestStatus.PENDING_REVIEW
    db_session.commit()

    # First verification -> 200 OK
    first_resp = client.post(
        f"/api/employee/requests/{req_id}/verify",
        json={"decision": "approved"},
        headers=emp_headers,
    )
    assert first_resp.status_code == 200

    # Second verification -> 409 Conflict
    second_resp = client.post(
        f"/api/employee/requests/{req_id}/verify",
        json={"decision": "rejected", "reason": "Attempting to change decision"},
        headers=emp_headers,
    )
    assert second_resp.status_code == 409
    assert second_resp.json()["detail"] == "Request has already been verified"


def test_customer_cannot_access_employee(client, db_session):
    """Customer token hitting employee endpoints -> 403 Forbidden."""
    cust_token = get_customer_auth_token(client, email="cust_forbidden@example.com")
    cust_headers = {"Authorization": f"Bearer {cust_token}"}

    # Attempt to list employee requests
    list_resp = client.get("/api/employee/requests", headers=cust_headers)
    assert list_resp.status_code == 403
    assert list_resp.json()["detail"] == "Insufficient permissions"

    fake_id = str(uuid.uuid4())
    # Attempt to get request details as employee
    detail_resp = client.get(f"/api/employee/requests/{fake_id}", headers=cust_headers)
    assert detail_resp.status_code == 403
    assert detail_resp.json()["detail"] == "Insufficient permissions"

    # Attempt to verify request as employee
    verify_resp = client.post(
        f"/api/employee/requests/{fake_id}/verify",
        json={"decision": "approved"},
        headers=cust_headers,
    )
    assert verify_resp.status_code == 403
    assert verify_resp.json()["detail"] == "Insufficient permissions"
