import io
import os
import shutil
import uuid
from pathlib import Path
import pytest
from PIL import Image
from app.models.enums import DocumentType


@pytest.fixture(autouse=True)
def cleanup_uploads():
    upload_path = Path("uploads")
    existing_items = set(upload_path.iterdir()) if upload_path.exists() else set()
    yield
    if upload_path.exists():
        for item in set(upload_path.iterdir()) - existing_items:
            if item.is_dir():
                shutil.rmtree(item, ignore_errors=True)
            else:
                try:
                    item.unlink()
                except OSError:
                    pass


def get_auth_token(client, email="doc_customer@example.com", name="Doc Customer"):
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


def make_test_image(format="JPEG"):
    img = Image.new("RGB", (60, 60), color="red")
    buf = io.BytesIO()
    img.save(buf, format=format)
    return buf.getvalue()


def test_upload_document(client):
    """POST /api/requests/{id}/documents -> 201, file saved, Document created."""
    token = get_auth_token(client, email="doc_uploader@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    # Create request
    create_resp = client.post(
        "/api/requests/",
        json={"request_type": "account_opening", "sub_type": "individual"},
        headers=headers,
    )
    assert create_resp.status_code == 201
    req_id = create_resp.json()["id"]

    # Upload valid document
    img_bytes = make_test_image("JPEG")
    files = {"file": ("national_id_front.jpg", img_bytes, "image/jpeg")}
    data = {"document_type": DocumentType.NATIONAL_ID_FRONT.value}

    response = client.post(
        f"/api/requests/{req_id}/documents",
        data=data,
        files=files,
        headers=headers,
    )
    assert response.status_code == 201
    doc_data = response.json()

    assert "id" in doc_data
    assert doc_data["request_id"] == req_id
    assert doc_data["document_type"] == DocumentType.NATIONAL_ID_FRONT.value
    assert doc_data["ocr_required"] is True
    assert doc_data["ocr_completed"] is False
    assert os.path.exists(doc_data["file_path"])

    # Verify request detail now includes this document
    get_resp = client.get(f"/api/requests/{req_id}", headers=headers)
    assert get_resp.status_code == 200
    docs = get_resp.json()["documents"]
    assert len(docs) == 1
    assert docs[0]["id"] == doc_data["id"]


def test_upload_wrong_document_type(client):
    """Upload document type not in required list for this sub_type -> 400."""
    token = get_auth_token(client, email="doc_wrong_type@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    # Create youth request (requires national_id_front, national_id_back only)
    create_resp = client.post(
        "/api/requests/",
        json={"request_type": "account_opening", "sub_type": "youth"},
        headers=headers,
    )
    req_id = create_resp.json()["id"]

    # Try to upload birth_certificate (not valid for youth)
    img_bytes = make_test_image("JPEG")
    files = {"file": ("birth_certificate.jpg", img_bytes, "image/jpeg")}
    data = {"document_type": DocumentType.BIRTH_CERTIFICATE.value}

    response = client.post(
        f"/api/requests/{req_id}/documents",
        data=data,
        files=files,
        headers=headers,
    )
    assert response.status_code == 400
    assert "not required" in response.json()["detail"].lower()


def test_upload_non_image(client):
    """Upload non-image file (e.g. .txt) -> 400."""
    token = get_auth_token(client, email="doc_non_image@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    create_resp = client.post(
        "/api/requests/",
        json={"request_type": "account_opening", "sub_type": "individual"},
        headers=headers,
    )
    req_id = create_resp.json()["id"]

    files = {"file": ("document.txt", b"plain text content", "text/plain")}
    data = {"document_type": DocumentType.NATIONAL_ID_FRONT.value}

    response = client.post(
        f"/api/requests/{req_id}/documents",
        data=data,
        files=files,
        headers=headers,
    )
    assert response.status_code == 400
    assert "image" in response.json()["detail"].lower()


def test_upload_to_other_request(client):
    """Upload to another customer's request -> 404."""
    token1 = get_auth_token(client, email="doc_owner@example.com")
    token2 = get_auth_token(client, email="doc_intruder@example.com")

    create_resp = client.post(
        "/api/requests/",
        json={"request_type": "account_opening", "sub_type": "individual"},
        headers={"Authorization": f"Bearer {token1}"},
    )
    req_id = create_resp.json()["id"]

    img_bytes = make_test_image("JPEG")
    files = {"file": ("id.jpg", img_bytes, "image/jpeg")}
    data = {"document_type": DocumentType.NATIONAL_ID_FRONT.value}

    # Intruder tries to upload to owner's request
    response = client.post(
        f"/api/requests/{req_id}/documents",
        data=data,
        files=files,
        headers={"Authorization": f"Bearer {token2}"},
    )
    assert response.status_code == 404


def test_upload_corrupt_file(client):
    """Review Focus #3: file with image mimetype but corrupt content -> 400."""
    token = get_auth_token(client, email="doc_corrupt@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    create_resp = client.post(
        "/api/requests/",
        json={"request_type": "account_opening", "sub_type": "individual"},
        headers=headers,
    )
    req_id = create_resp.json()["id"]

    # Disguised as image/jpeg, but body is invalid garbage bytes
    corrupt_bytes = b"NotARealJPEGDataJustCorruptedPayload1234567890"
    files = {"file": ("corrupt.jpg", corrupt_bytes, "image/jpeg")}
    data = {"document_type": DocumentType.NATIONAL_ID_FRONT.value}

    response = client.post(
        f"/api/requests/{req_id}/documents",
        data=data,
        files=files,
        headers=headers,
    )
    assert response.status_code == 400
    assert "corrupt" in response.json()["detail"].lower() or "invalid" in response.json()["detail"].lower()


def test_upload_document_ocr_not_required(client):
    """Upload proof_of_income sets ocr_required=False."""
    token = get_auth_token(client, email="doc_income@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    create_resp = client.post(
        "/api/requests/",
        json={"request_type": "account_opening", "sub_type": "individual"},
        headers=headers,
    )
    req_id = create_resp.json()["id"]

    img_bytes = make_test_image("JPEG")
    files = {"file": ("income.jpg", img_bytes, "image/jpeg")}
    data = {"document_type": DocumentType.PROOF_OF_INCOME.value}

    response = client.post(
        f"/api/requests/{req_id}/documents",
        data=data,
        files=files,
        headers=headers,
    )
    assert response.status_code == 201
    assert response.json()["ocr_required"] is False
