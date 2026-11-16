import json
import uuid
from pathlib import Path
from unittest.mock import MagicMock, patch
import pytest

from app.models.document import Document
from app.models.enums import DocumentType, RequestStatus, UserRole
from app.models.request import Request
from app.models.user import User
from app.services.request_types.account_opening import OCR_DOCUMENTS
from app.services.ocr.prompts import PROMPTS
from app.services.ocr.extractor import extract_document_fields, process_request_documents


def get_customer_auth(client, email="ocr_user@example.com"):
    resp = client.post(
        "/api/auth/register",
        json={
            "name": "OCR Customer",
            "email": email,
            "password": "password123",
            "role": "customer",
        },
    )
    assert resp.status_code == 201
    return resp.json()["access_token"]


def test_prompts_cover_all_ocr_documents():
    """Verify PROMPTS defines instructions for every OCR-requiring DocumentType."""
    assert len(OCR_DOCUMENTS) == 6
    for doc_type in OCR_DOCUMENTS:
        assert doc_type in PROMPTS
        prompt_text = PROMPTS[doc_type]
        assert "valid JSON" in prompt_text or "JSON" in prompt_text


def test_extract_national_id_front(tmp_path):
    """Mock ChatOllama returns valid JSON -> fields parsed correctly."""
    dummy_img = tmp_path / "id_front.jpg"
    dummy_img.write_bytes(b"dummy image bytes")

    mock_response = MagicMock()
    mock_response.content = json.dumps({
        "name": "أحمد محمود علي",
        "national_id": "29501011234567",
        "address": "12 شارع النيل، الجيزة",
    })

    with patch("app.services.ocr.extractor.ChatOllama") as mock_chat_cls:
        mock_instance = MagicMock()
        mock_chat_cls.return_value = mock_instance
        mock_instance.invoke.return_value = mock_response

        result = extract_document_fields(str(dummy_img), DocumentType.NATIONAL_ID_FRONT)

        assert isinstance(result, dict)
        assert result["national_id"] == "29501011234567"
        assert result["name"] == "أحمد محمود علي"
        assert result["address"] == "12 شارع النيل، الجيزة"


def test_extract_handles_markdown_code_fence(tmp_path):
    """Mock ChatOllama returns markdown-wrapped JSON -> fences stripped and parsed."""
    dummy_img = tmp_path / "id_front_fence.jpg"
    dummy_img.write_bytes(b"dummy image bytes")

    mock_response = MagicMock()
    mock_response.content = "```json\n" + json.dumps({
        "name": "محمود سمير",
        "national_id": "29001011234567",
        "address": "الإسكندرية",
    }) + "\n```"

    with patch("app.services.ocr.extractor.ChatOllama") as mock_chat_cls:
        mock_instance = MagicMock()
        mock_chat_cls.return_value = mock_instance
        mock_instance.invoke.return_value = mock_response

        result = extract_document_fields(str(dummy_img), DocumentType.NATIONAL_ID_FRONT)

        assert result["national_id"] == "29001011234567"
        assert result["name"] == "محمود سمير"


def test_extract_returns_invalid_json(tmp_path):
    """Mock ChatOllama returns garbage -> handles gracefully and returns empty dict."""
    dummy_img = tmp_path / "garbage.jpg"
    dummy_img.write_bytes(b"dummy image bytes")

    mock_response = MagicMock()
    mock_response.content = "Sorry, I cannot read this image clearly. Please provide a better photo."

    with patch("app.services.ocr.extractor.ChatOllama") as mock_chat_cls:
        mock_instance = MagicMock()
        mock_chat_cls.return_value = mock_instance
        mock_instance.invoke.return_value = mock_response

        result = extract_document_fields(str(dummy_img), DocumentType.NATIONAL_ID_FRONT)

        assert result == {}


def test_process_request_documents(db_session, tmp_path):
    """Process OCR for all OCR-required documents of a request."""
    user = User(
        name="Test Applicant",
        email="applicant@example.com",
        password_hash="fakehash",
        role=UserRole.CUSTOMER,
    )
    db_session.add(user)
    db_session.commit()

    req = Request(
        customer_id=user.id,
        sub_type="youth",
        status=RequestStatus.PENDING_UPLOAD,
    )
    db_session.add(req)
    db_session.commit()

    img1 = tmp_path / "front.jpg"
    img1.write_bytes(b"fake image 1")
    img2 = tmp_path / "back.jpg"
    img2.write_bytes(b"fake image 2")

    doc1 = Document(
        request_id=req.id,
        document_type=DocumentType.NATIONAL_ID_FRONT,
        file_path=str(img1),
        ocr_required=True,
        ocr_completed=False,
    )
    doc2 = Document(
        request_id=req.id,
        document_type=DocumentType.NATIONAL_ID_BACK,
        file_path=str(img2),
        ocr_required=True,
        ocr_completed=False,
    )
    db_session.add_all([doc1, doc2])
    db_session.commit()

    with patch("app.services.ocr.extractor.extract_document_fields") as mock_extract:
        mock_extract.side_effect = [
            {"name": "أحمد", "national_id": "30101011234567", "address": "القاهرة"},
            {"expiry_date": "2030-01-01", "job": "طالب", "marital_status": "أعزب"},
        ]

        process_request_documents(req.id, db=db_session)

        db_session.refresh(doc1)
        db_session.refresh(doc2)

        assert doc1.ocr_completed is True
        assert doc1.extracted_data == {"name": "أحمد", "national_id": "30101011234567", "address": "القاهرة"}
        assert doc2.ocr_completed is True
        assert doc2.extracted_data == {"expiry_date": "2030-01-01", "job": "طالب", "marital_status": "أعزب"}


def test_process_skips_non_ocr_docs(db_session, tmp_path):
    """Ensure documents with ocr_required=False are not processed."""
    user = User(
        name="Income Applicant",
        email="income_app@example.com",
        password_hash="fakehash",
        role=UserRole.CUSTOMER,
    )
    db_session.add(user)
    db_session.commit()

    req = Request(
        customer_id=user.id,
        sub_type="individual",
        status=RequestStatus.PENDING_UPLOAD,
    )
    db_session.add(req)
    db_session.commit()

    img1 = tmp_path / "front.jpg"
    img1.write_bytes(b"fake image 1")
    img2 = tmp_path / "income.pdf"
    img2.write_bytes(b"fake pdf")

    doc1 = Document(
        request_id=req.id,
        document_type=DocumentType.NATIONAL_ID_FRONT,
        file_path=str(img1),
        ocr_required=True,
        ocr_completed=False,
    )
    doc2 = Document(
        request_id=req.id,
        document_type=DocumentType.PROOF_OF_INCOME,
        file_path=str(img2),
        ocr_required=False,
        ocr_completed=False,
        extracted_data=None,
    )
    db_session.add_all([doc1, doc2])
    db_session.commit()

    with patch("app.services.ocr.extractor.extract_document_fields") as mock_extract:
        mock_extract.return_value = {"name": "أحمد"}

        process_request_documents(req.id, db=db_session)

        db_session.refresh(doc1)
        db_session.refresh(doc2)

        assert doc1.ocr_completed is True
        assert doc1.extracted_data == {"name": "أحمد"}
        # Non-OCR doc remains uncompleted and unextracted
        assert doc2.ocr_completed is False
        assert doc2.extracted_data is None
        assert mock_extract.call_count == 1


def test_process_endpoint_returns_202(client, db_session, tmp_path):
    """POST /api/requests/{id}/process -> 202, status becomes processing, background task dispatched."""
    token = get_customer_auth(client, email="process_user@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    create_resp = client.post(
        "/api/requests/",
        json={"request_type": "account_opening", "sub_type": "youth"},
        headers=headers,
    )
    assert create_resp.status_code == 201
    req_id = create_resp.json()["id"]

    # Add required documents to DB for youth account (national_id_front, national_id_back)
    doc1 = Document(
        request_id=uuid.UUID(req_id),
        document_type=DocumentType.NATIONAL_ID_FRONT,
        file_path="uploads/fake_front.jpg",
        ocr_required=True,
        ocr_completed=False,
    )
    doc2 = Document(
        request_id=uuid.UUID(req_id),
        document_type=DocumentType.NATIONAL_ID_BACK,
        file_path="uploads/fake_back.jpg",
        ocr_required=True,
        ocr_completed=False,
    )
    db_session.add_all([doc1, doc2])
    db_session.commit()

    with patch("app.api.routes.documents.process_request_documents") as mock_bg_task:
        resp = client.post(f"/api/requests/{req_id}/process", headers=headers)
        assert resp.status_code == 202
        body = resp.json()
        assert body["message"] == "Processing started"
        assert body["request_id"] == req_id
        assert body["status"] == "processing"

        # Check request status updated in DB
        db_req = db_session.query(Request).filter(Request.id == uuid.UUID(req_id)).first()
        assert db_req.status == RequestStatus.PROCESSING
        mock_bg_task.assert_called_once_with(uuid.UUID(req_id))


def test_process_endpoint_missing_documents(client, db_session):
    """POST /api/requests/{id}/process fails with 400 if required docs are not uploaded."""
    token = get_customer_auth(client, email="missing_docs_user@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    create_resp = client.post(
        "/api/requests/",
        json={"request_type": "account_opening", "sub_type": "youth"},
        headers=headers,
    )
    assert create_resp.status_code == 201
    req_id = create_resp.json()["id"]

    # Only upload 1 doc (national_id_front), youth requires both front and back
    doc1 = Document(
        request_id=uuid.UUID(req_id),
        document_type=DocumentType.NATIONAL_ID_FRONT,
        file_path="uploads/fake_front.jpg",
        ocr_required=True,
        ocr_completed=False,
    )
    db_session.add(doc1)
    db_session.commit()

    resp = client.post(f"/api/requests/{req_id}/process", headers=headers)
    assert resp.status_code == 400
    assert "Missing required documents" in resp.json()["detail"]


def test_process_endpoint_not_found_for_other_user(client, db_session):
    """POST /api/requests/{id}/process returns 404 if request belongs to someone else."""
    token1 = get_customer_auth(client, email="user1@example.com")
    token2 = get_customer_auth(client, email="user2@example.com")

    # user1 creates request
    create_resp = client.post(
        "/api/requests/",
        json={"request_type": "account_opening", "sub_type": "youth"},
        headers={"Authorization": f"Bearer {token1}"},
    )
    req_id = create_resp.json()["id"]

    # user2 tries to process user1's request
    resp = client.post(
        f"/api/requests/{req_id}/process",
        headers={"Authorization": f"Bearer {token2}"},
    )
    assert resp.status_code == 404
    assert resp.json()["detail"] == "Request not found"
