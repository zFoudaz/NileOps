import uuid
import pytest
from app.models.enums import AccountType, DocumentType, RequestStatus, RequestType
from app.services.request_types.account_opening import REQUIRED_DOCUMENTS


def get_auth_token(client, email="customer@example.com", name="Customer"):
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


def test_create_request(client):
    """POST /api/requests/ -> 201, status=pending_upload, includes required_documents."""
    token = get_auth_token(client, email="req_create@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "request_type": "account_opening",
        "sub_type": "individual",
    }
    response = client.post("/api/requests/", json=payload, headers=headers)
    assert response.status_code == 201
    data = response.json()

    assert "id" in data
    assert data["request_type"] == RequestType.ACCOUNT_OPENING.value
    assert data["sub_type"] == "individual"
    assert data["status"] == RequestStatus.PENDING_UPLOAD.value
    assert "required_documents" in data
    expected_docs = [doc.value for doc in REQUIRED_DOCUMENTS[AccountType.INDIVIDUAL]]
    assert data["required_documents"] == expected_docs
    assert data["documents"] == []


def test_create_request_invalid_type(client):
    """POST /api/requests/ with invalid sub_type -> 422."""
    token = get_auth_token(client, email="req_invalid@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "request_type": "account_opening",
        "sub_type": "corporate_vip",
    }
    response = client.post("/api/requests/", json=payload, headers=headers)
    assert response.status_code == 422


def test_create_request_unauthenticated(client):
    """POST /api/requests/ without token -> 401."""
    payload = {
        "request_type": "account_opening",
        "sub_type": "individual",
    }
    response = client.post("/api/requests/", json=payload)
    assert response.status_code == 401


def test_list_my_requests(client):
    """GET /api/requests/ -> returns only the current customer's requests."""
    token1 = get_auth_token(client, email="cust1@example.com", name="Cust 1")
    token2 = get_auth_token(client, email="cust2@example.com", name="Cust 2")

    # Cust 1 creates 2 requests
    client.post(
        "/api/requests/",
        json={"request_type": "account_opening", "sub_type": "individual"},
        headers={"Authorization": f"Bearer {token1}"},
    )
    client.post(
        "/api/requests/",
        json={"request_type": "account_opening", "sub_type": "youth"},
        headers={"Authorization": f"Bearer {token1}"},
    )

    # Cust 2 creates 1 request
    client.post(
        "/api/requests/",
        json={"request_type": "account_opening", "sub_type": "minor"},
        headers={"Authorization": f"Bearer {token2}"},
    )

    # Cust 1 lists requests
    resp1 = client.get("/api/requests/", headers={"Authorization": f"Bearer {token1}"})
    assert resp1.status_code == 200
    data1 = resp1.json()
    assert len(data1) == 2
    sub_types1 = [r["sub_type"] for r in data1]
    assert "individual" in sub_types1
    assert "youth" in sub_types1

    # Cust 2 lists requests
    resp2 = client.get("/api/requests/", headers={"Authorization": f"Bearer {token2}"})
    assert resp2.status_code == 200
    data2 = resp2.json()
    assert len(data2) == 1
    assert data2[0]["sub_type"] == "minor"


def test_get_request_detail(client):
    """GET /api/requests/{id} -> includes documents list and required_documents."""
    token = get_auth_token(client, email="cust_detail@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    create_resp = client.post(
        "/api/requests/",
        json={"request_type": "account_opening", "sub_type": "youth"},
        headers=headers,
    )
    req_id = create_resp.json()["id"]

    get_resp = client.get(f"/api/requests/{req_id}", headers=headers)
    assert get_resp.status_code == 200
    data = get_resp.json()
    assert data["id"] == req_id
    assert data["sub_type"] == "youth"
    assert data["status"] == "pending_upload"
    assert isinstance(data["documents"], list)
    expected_docs = [doc.value for doc in REQUIRED_DOCUMENTS[AccountType.YOUTH]]
    assert data["required_documents"] == expected_docs


def test_get_other_customer_request(client):
    """GET /api/requests/{id} for another customer's request -> 404."""
    token1 = get_auth_token(client, email="owner@example.com")
    token2 = get_auth_token(client, email="intruder@example.com")

    create_resp = client.post(
        "/api/requests/",
        json={"request_type": "account_opening", "sub_type": "individual"},
        headers={"Authorization": f"Bearer {token1}"},
    )
    req_id = create_resp.json()["id"]

    # Intruder tries to get owner's request
    resp = client.get(f"/api/requests/{req_id}", headers={"Authorization": f"Bearer {token2}"})
    assert resp.status_code == 404


def test_get_nonexistent_request(client):
    """GET /api/requests/{id} with non-existent UUID -> 404."""
    token = get_auth_token(client, email="notfound_tester@example.com")
    fake_id = str(uuid.uuid4())
    resp = client.get(f"/api/requests/{fake_id}", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 404


def test_delete_own_request(client, tmp_path, monkeypatch):
    """DELETE /api/requests/{id} -> 204, request and files deleted."""
    from app.config import settings
    monkeypatch.setattr(settings, "UPLOAD_DIR", str(tmp_path))

    token = get_auth_token(client, email="del_owner@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    create_resp = client.post(
        "/api/requests/",
        json={"request_type": "account_opening", "sub_type": "individual"},
        headers=headers,
    )
    req_id = create_resp.json()["id"]

    # Create dummy upload directory
    req_upload_dir = tmp_path / req_id
    req_upload_dir.mkdir(parents=True, exist_ok=True)
    dummy_file = req_upload_dir / "test.png"
    dummy_file.write_text("dummy")

    del_resp = client.delete(f"/api/requests/{req_id}", headers=headers)
    assert del_resp.status_code == 204

    # Verify request is gone from DB
    get_resp = client.get(f"/api/requests/{req_id}", headers=headers)
    assert get_resp.status_code == 404

    # Verify files were cleaned up
    assert not req_upload_dir.exists()


def test_delete_other_customer_request(client):
    """DELETE /api/requests/{id} for another customer's request -> 404."""
    token1 = get_auth_token(client, email="del_owner2@example.com")
    token2 = get_auth_token(client, email="del_intruder@example.com")

    create_resp = client.post(
        "/api/requests/",
        json={"request_type": "account_opening", "sub_type": "individual"},
        headers={"Authorization": f"Bearer {token1}"},
    )
    req_id = create_resp.json()["id"]

    del_resp = client.delete(f"/api/requests/{req_id}", headers={"Authorization": f"Bearer {token2}"})
    assert del_resp.status_code == 404

    # Verify request is still intact for owner
    get_resp = client.get(f"/api/requests/{req_id}", headers={"Authorization": f"Bearer {token1}"})
    assert get_resp.status_code == 200


def test_delete_processing_request(client, db_session):
    """DELETE /api/requests/{id} when status=processing -> 400."""
    from app.models.request import Request
    from app.models.enums import RequestStatus

    token = get_auth_token(client, email="del_proc@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    create_resp = client.post(
        "/api/requests/",
        json={"request_type": "account_opening", "sub_type": "individual"},
        headers=headers,
    )
    req_id = create_resp.json()["id"]

    # Manually transition to PROCESSING
    req = db_session.query(Request).filter(Request.id == req_id).first()
    req.status = RequestStatus.PROCESSING
    db_session.commit()

    del_resp = client.delete(f"/api/requests/{req_id}", headers=headers)
    assert del_resp.status_code == 400
    assert "Cannot delete request while it is processing" in del_resp.json()["detail"]


def test_delete_nonexistent_request(client):
    """DELETE /api/requests/{id} with non-existent UUID -> 404."""
    token = get_auth_token(client, email="del_notfound@example.com")
    fake_id = str(uuid.uuid4())
    resp = client.delete(f"/api/requests/{fake_id}", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 404

