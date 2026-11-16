import uuid
import pytest
from app.models.document import Document
from app.models.enums import DocumentType, RequestStatus, RequestType
from app.models.request import Request
from app.models.validation_result import ValidationResult


def get_customer_auth_token(client, email="cust_corrections@example.com", name="Customer Corrections"):
    response = client.post(
        "/api/auth/register",
        json={
            "name": name,
            "email": email,
            "password": "password123",
        },
    )
    assert response.status_code == 201
    return response.json()["access_token"]


def test_get_extracted_data(client, db_session):
    """GET /api/requests/{id}/extracted-data returns fields with editable flags."""
    token = get_customer_auth_token(client, email="get_ext@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    create_resp = client.post(
        "/api/requests/",
        json={"request_type": "account_opening", "sub_type": "individual"},
        headers=headers,
    )
    assert create_resp.status_code == 201
    req_id = create_resp.json()["id"]

    # Add document with extracted data
    doc = Document(
        request_id=uuid.UUID(req_id),
        document_type=DocumentType.NATIONAL_ID_BACK,
        file_path="uploads/test/back.jpg",
        ocr_required=True,
        ocr_completed=True,
        extracted_data={
            "job": "Software Engineer",
            "marital_status": "Single",
            "expiry_date": "2028-12-31",
        },
    )
    db_session.add(doc)

    # Add validation result
    val_res = ValidationResult(
        request_id=uuid.UUID(req_id),
        rule_name="national_id_expiry",
        passed=True,
        details={"expiry_date": "2028-12-31"},
    )
    db_session.add(val_res)
    db_session.commit()

    resp = client.get(f"/api/requests/{req_id}/extracted-data", headers=headers)
    assert resp.status_code == 200
    data = resp.json()

    assert data["request_id"] == req_id
    assert len(data["documents"]) == 1
    doc_data = data["documents"][0]
    assert doc_data["document_id"] == str(doc.id)

    # Find expiry_date field and job field
    fields_by_name = {f["name"]: f for f in doc_data["fields"]}
    assert "expiry_date" in fields_by_name
    assert fields_by_name["expiry_date"]["editable"] is False
    assert fields_by_name["expiry_date"]["value"] == "2028-12-31"

    assert "job" in fields_by_name
    assert fields_by_name["job"]["editable"] is True
    assert fields_by_name["job"]["value"] == "Software Engineer"

    # Also verify editable_flags if present
    if "editable_flags" in doc_data:
        assert doc_data["editable_flags"]["expiry_date"] is False
        assert doc_data["editable_flags"]["job"] is True

    # Check validation results
    assert len(data["validation_results"]) == 1
    assert data["validation_results"][0]["rule_name"] == "national_id_expiry"


def test_submit_correction(client, db_session):
    """PATCH /api/requests/{id}/corrections -> corrected_data updated."""
    token = get_customer_auth_token(client, email="sub_corr@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    create_resp = client.post(
        "/api/requests/",
        json={"request_type": "account_opening", "sub_type": "individual"},
        headers=headers,
    )
    req_id = create_resp.json()["id"]

    doc = Document(
        request_id=uuid.UUID(req_id),
        document_type=DocumentType.NATIONAL_ID_FRONT,
        file_path="uploads/test/front.jpg",
        ocr_required=True,
        ocr_completed=True,
        extracted_data={"name": "Ahmed Mohamed", "national_id": "29001011234567"},
    )
    db_session.add(doc)
    db_session.commit()

    payload = {
        "document_id": str(doc.id),
        "corrected_fields": {"name": "Ahmed Mohamed Ali"},
    }
    patch_resp = client.patch(
        f"/api/requests/{req_id}/corrections",
        json=payload,
        headers=headers,
    )
    assert patch_resp.status_code == 200

    db_session.refresh(doc)
    assert doc.corrected_data == {"name": "Ahmed Mohamed Ali"}

    # Verify extracted-data reflects corrected value
    get_resp = client.get(f"/api/requests/{req_id}/extracted-data", headers=headers)
    assert get_resp.status_code == 200
    doc_fields = {f["name"]: f for f in get_resp.json()["documents"][0]["fields"]}
    assert doc_fields["name"]["value"] == "Ahmed Mohamed Ali"


def test_correction_rejects_expiry_date(client, db_session):
    """PATCH /api/requests/{id}/corrections with expiry_date -> 400 Bad Request."""
    token = get_customer_auth_token(client, email="expiry_lock@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    create_resp = client.post(
        "/api/requests/",
        json={"request_type": "account_opening", "sub_type": "individual"},
        headers=headers,
    )
    req_id = create_resp.json()["id"]

    doc = Document(
        request_id=uuid.UUID(req_id),
        document_type=DocumentType.NATIONAL_ID_BACK,
        file_path="uploads/test/back2.jpg",
        ocr_required=True,
        ocr_completed=True,
        extracted_data={"expiry_date": "2025-01-01", "job": "Accountant"},
    )
    db_session.add(doc)
    db_session.commit()

    payload = {
        "document_id": str(doc.id),
        "corrected_fields": {"expiry_date": "2030-01-01"},
    }
    patch_resp = client.patch(
        f"/api/requests/{req_id}/corrections",
        json=payload,
        headers=headers,
    )
    assert patch_resp.status_code == 400
    assert "expiry_date cannot be edited" in patch_resp.json()["detail"]


def test_submit_request_for_review(client, db_session):
    """POST /api/requests/{id}/submit -> status=pending_review."""
    token = get_customer_auth_token(client, email="submit_rev@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    create_resp = client.post(
        "/api/requests/",
        json={"request_type": "account_opening", "sub_type": "individual"},
        headers=headers,
    )
    req_id = create_resp.json()["id"]

    submit_resp = client.post(f"/api/requests/{req_id}/submit", headers=headers)
    assert submit_resp.status_code == 200
    assert submit_resp.json()["status"] == RequestStatus.PENDING_REVIEW.value

    # Verify in DB
    req = db_session.query(Request).filter(Request.id == uuid.UUID(req_id)).first()
    assert req.status == RequestStatus.PENDING_REVIEW


def test_submit_already_processing(client, db_session):
    """POST /api/requests/{id}/submit while processing -> 400 Bad Request."""
    token = get_customer_auth_token(client, email="sub_proc@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    create_resp = client.post(
        "/api/requests/",
        json={"request_type": "account_opening", "sub_type": "individual"},
        headers=headers,
    )
    req_id = create_resp.json()["id"]

    # Set status to processing
    req = db_session.query(Request).filter(Request.id == uuid.UUID(req_id)).first()
    req.status = RequestStatus.PROCESSING
    db_session.commit()

    submit_resp = client.post(f"/api/requests/{req_id}/submit", headers=headers)
    assert submit_resp.status_code == 400
    assert "processing" in submit_resp.json()["detail"].lower()
