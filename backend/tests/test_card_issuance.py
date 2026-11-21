import io
import uuid

from PIL import Image

from app.api.deps import create_access_token, get_password_hash
from app.models.bank_account import BankAccount
from app.models.document import Document
from app.models.enums import (
    AutoDecision,
    DocumentType,
    RequestStatus,
    RequestType,
    UserRole,
)
from app.models.request import Request
from app.models.user import User
from app.services.validation.business_rules import compute_auto_decision
from app.services.validation.cross_validator import validate_request


def _make_png_bytes() -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (50, 50), color=(20, 120, 80)).save(buf, format="PNG")
    return buf.getvalue()


def _register_customer(client, email: str, name: str = "عميل تجريبي") -> str:
    resp = client.post(
        "/api/auth/register",
        json={"name": name, "email": email, "password": "Password123!"},
    )
    assert resp.status_code == 201
    return resp.json()["access_token"]


def _create_employee_token(db_session, email: str = "emp_card@nileops.com") -> str:
    emp = User(
        name="موظف بنك",
        email=email,
        password_hash=get_password_hash("EmpPass123!"),
        role=UserRole.EMPLOYEE,
    )
    db_session.add(emp)
    db_session.commit()
    db_session.refresh(emp)
    return create_access_token({"sub": str(emp.id), "email": emp.email, "role": emp.role.value})


def test_prepaid_card_creation_without_bank_account(client, db_session):
    token = _register_customer(client, f"prepaid_{uuid.uuid4().hex[:6]}@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.post(
        "/api/requests/",
        json={"request_type": "card_issuance", "sub_type": "prepaid"},
        headers=headers,
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["request_type"] == "card_issuance"
    assert data["sub_type"] == "prepaid"
    assert data["required_documents"] == ["national_id_front", "national_id_back"]

    # Validate prepaid card: only id_expiry checked (no age_check)
    req_id = uuid.UUID(data["id"])
    db_session.add(
        Document(
            request_id=req_id,
            document_type=DocumentType.NATIONAL_ID_BACK,
            file_path="uploads/back.png",
            extracted_data={"expiry_date": "2032-08-19"},
            ocr_completed=True,
        )
    )
    db_session.commit()

    results = validate_request(req_id, db_session)
    rule_names = [r.rule_name for r in results]
    assert rule_names == ["id_expiry"]
    assert results[0].passed is True
    assert compute_auto_decision(results, request_type=RequestType.CARD_ISSUANCE) == AutoDecision.AUTO_APPROVED


def test_credit_card_required_docs_and_visual_only_guarantee(client):
    token = _register_customer(client, f"credit_{uuid.uuid4().hex[:6]}@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.post(
        "/api/requests/",
        json={"request_type": "card_issuance", "sub_type": "credit"},
        headers=headers,
    )
    assert resp.status_code == 201
    data = resp.json()
    req_id = data["id"]
    assert data["required_documents"] == [
        "national_id_front",
        "national_id_back",
        "proof_of_residence",
        "proof_of_income",
        "guarantee_proof",
    ]

    # Upload guarantee_proof and confirm ocr_required is False (visual review only)
    upload_resp = client.post(
        f"/api/requests/{req_id}/documents",
        data={"document_type": "guarantee_proof"},
        files={"file": ("guarantee.png", _make_png_bytes(), "image/png")},
        headers=headers,
    )
    assert upload_resp.status_code == 201
    assert upload_resp.json()["ocr_required"] is False

    # Upload proof_of_income and confirm ocr_required is False
    income_resp = client.post(
        f"/api/requests/{req_id}/documents",
        data={"document_type": "proof_of_income"},
        files={"file": ("income.png", _make_png_bytes(), "image/png")},
        headers=headers,
    )
    assert income_resp.status_code == 201
    assert income_resp.json()["ocr_required"] is False

    # Upload national_id_front and confirm ocr_required is True
    id_resp = client.post(
        f"/api/requests/{req_id}/documents",
        data={"document_type": "national_id_front"},
        files={"file": ("id.png", _make_png_bytes(), "image/png")},
        headers=headers,
    )
    assert id_resp.status_code == 201
    assert id_resp.json()["ocr_required"] is True


def test_debit_card_blocked_without_active_bank_account(client):
    token = _register_customer(client, f"noacc_{uuid.uuid4().hex[:6]}@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.post(
        "/api/requests/",
        json={"request_type": "card_issuance", "sub_type": "debit"},
        headers=headers,
    )
    assert resp.status_code == 400
    assert "حساب بنكي" in resp.json()["detail"]


def test_account_approval_creates_bank_account_and_unlocks_debit_card(client, db_session):
    cust_email = f"debit_flow_{uuid.uuid4().hex[:6]}@example.com"
    cust_token = _register_customer(client, cust_email, name="محمد محمد أحمد حسنين")
    cust_headers = {"Authorization": f"Bearer {cust_token}"}
    emp_token = _create_employee_token(db_session, email=f"emp_{uuid.uuid4().hex[:6]}@nileops.com")
    emp_headers = {"Authorization": f"Bearer {emp_token}"}

    # 1. Customer initially has no bank accounts
    acc_resp = client.get("/api/accounts/me", headers=cust_headers)
    assert acc_resp.status_code == 200
    assert acc_resp.json() == []

    # 2. Customer creates an account_opening request with extracted national ID data
    open_resp = client.post(
        "/api/requests/",
        json={"request_type": "account_opening", "sub_type": "individual"},
        headers=cust_headers,
    )
    assert open_resp.status_code == 201
    open_req_id = uuid.UUID(open_resp.json()["id"])

    db_session.add(
        Document(
            request_id=open_req_id,
            document_type=DocumentType.NATIONAL_ID_FRONT,
            file_path="uploads/front.png",
            extracted_data={
                "name": "محمد محمد أحمد حسنين",
                "national_id": "29810150101235",
                "address": "15 شارع النصر - المعادي",
            },
            ocr_completed=True,
        )
    )
    req_obj = db_session.query(Request).filter(Request.id == open_req_id).first()
    req_obj.status = RequestStatus.PENDING_REVIEW
    db_session.commit()

    # 3. Employee approves the account_opening request -> BankAccount auto-created
    verify_resp = client.post(
        f"/api/employee/requests/{open_req_id}/verify",
        json={"decision": "approved"},
        headers=emp_headers,
    )
    assert verify_resp.status_code == 200
    assert verify_resp.json()["status"] == "approved"

    acc_resp = client.get("/api/accounts/me", headers=cust_headers)
    assert acc_resp.status_code == 200
    accounts = acc_resp.json()
    assert len(accounts) == 1
    assert accounts[0]["national_id"] == "29810150101235"
    assert accounts[0]["holder_name"] == "محمد محمد أحمد حسنين"
    assert accounts[0]["account_type"] == "individual"
    assert accounts[0]["status"] == "active"

    # 4. Now customer CAN apply for a Debit Card!
    debit_resp = client.post(
        "/api/requests/",
        json={"request_type": "card_issuance", "sub_type": "debit"},
        headers=cust_headers,
    )
    assert debit_resp.status_code == 201
    debit_data = debit_resp.json()
    assert debit_data["required_documents"] == [
        "national_id_front",
        "national_id_back",
        "proof_of_residence",
    ]
    debit_req_id = uuid.UUID(debit_data["id"])

    # 5. Matching National ID + valid expiry -> AUTO_APPROVED
    db_session.add_all(
        [
            Document(
                request_id=debit_req_id,
                document_type=DocumentType.NATIONAL_ID_FRONT,
                file_path="uploads/debit_front.png",
                extracted_data={"national_id": "29810150101235", "name": "محمد محمد أحمد حسنين"},
                ocr_completed=True,
            ),
            Document(
                request_id=debit_req_id,
                document_type=DocumentType.NATIONAL_ID_BACK,
                file_path="uploads/debit_back.png",
                extracted_data={"expiry_date": "2031-10-14"},
                ocr_completed=True,
            ),
        ]
    )
    db_session.commit()

    results = validate_request(debit_req_id, db_session)
    by_rule = {r.rule_name: r for r in results}
    assert by_rule["id_expiry"].passed is True
    assert by_rule["bank_account_check"].passed is True
    assert compute_auto_decision(results, request_type=RequestType.CARD_ISSUANCE) == AutoDecision.AUTO_APPROVED

    # 6. Mismatched National ID -> bank_account_check fails -> AUTO_REJECTED
    front_doc = (
        db_session.query(Document)
        .filter(
            Document.request_id == debit_req_id,
            Document.document_type == DocumentType.NATIONAL_ID_FRONT,
        )
        .first()
    )
    front_doc.corrected_data = {"national_id": "29901010109999"}
    db_session.commit()

    mismatch_results = validate_request(debit_req_id, db_session)
    mismatch_by_rule = {r.rule_name: r for r in mismatch_results}
    assert mismatch_by_rule["bank_account_check"].passed is False
    assert (
        compute_auto_decision(mismatch_results, request_type=RequestType.CARD_ISSUANCE)
        == AutoDecision.AUTO_REJECTED
    )


def test_rejected_account_opening_does_not_create_bank_account(client, db_session):
    cust_token = _register_customer(client, f"rej_{uuid.uuid4().hex[:6]}@example.com")
    cust_headers = {"Authorization": f"Bearer {cust_token}"}
    emp_token = _create_employee_token(db_session, email=f"emp_rej_{uuid.uuid4().hex[:6]}@nileops.com")
    emp_headers = {"Authorization": f"Bearer {emp_token}"}

    open_resp = client.post(
        "/api/requests/",
        json={"request_type": "account_opening", "sub_type": "youth"},
        headers=cust_headers,
    )
    open_req_id = uuid.UUID(open_resp.json()["id"])

    verify_resp = client.post(
        f"/api/employee/requests/{open_req_id}/verify",
        json={"decision": "rejected", "reason": "Expired ID"},
        headers=emp_headers,
    )
    assert verify_resp.status_code == 200
    assert db_session.query(BankAccount).filter(BankAccount.request_id == open_req_id).first() is None
