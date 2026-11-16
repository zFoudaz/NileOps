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
from app.services.ocr.prompts import (
    OCR_PROMPTS,
    PARSER_PROMPTS,
    PROMPTS,
    get_ocr_prompt,
    get_parser_prompt,
)
from app.services.ocr.extractor import (
    _parse_llm_json,
    extract_document_fields,
    extract_raw_text,
    parse_document_text,
    process_request_documents,
)


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


# ---------------------------------------------------------------------------
# Prompt & Parsing Unit Tests
# ---------------------------------------------------------------------------

def test_prompts_cover_all_ocr_documents():
    """Verify PROMPTS defines instructions for every OCR-requiring DocumentType."""
    assert len(OCR_DOCUMENTS) == 6
    for doc_type in OCR_DOCUMENTS:
        assert doc_type in PROMPTS
        prompt_text = PROMPTS[doc_type]
        assert "valid JSON" in prompt_text or "JSON" in prompt_text


def test_parse_llm_json_variants():
    """Verify _parse_llm_json handles plain, markdown fenced, and outer-bracketed JSON."""
    # Plain JSON
    data = {"name": "أحمد", "national_id": "29501011234567"}
    assert _parse_llm_json(json.dumps(data)) == data

    # Markdown fence with 'json'
    fenced_json = f"```json\n{json.dumps(data)}\n```"
    assert _parse_llm_json(fenced_json) == data

    # Markdown fence without language tag
    fenced_raw = f"```\n{json.dumps(data)}\n```"
    assert _parse_llm_json(fenced_raw) == data

    # Text before and after JSON object
    noisy_text = f"Here is the result:\n{json.dumps(data)}\nHope that helps!"
    assert _parse_llm_json(noisy_text) == data

    # Empty and whitespace
    assert _parse_llm_json("") == {}
    assert _parse_llm_json("   \n\t  ") == {}

    # Invalid / garbage text
    assert _parse_llm_json("No JSON content available") == {}


# ---------------------------------------------------------------------------
# Stage 1: extract_raw_text Tests
# ---------------------------------------------------------------------------

def test_extract_raw_text(tmp_path):
    """Stage 1: Verify Vision LLM is called with image base64 and transcription prompt."""
    dummy_img = tmp_path / "id_front.jpg"
    dummy_img.write_bytes(b"dummy image bytes")

    mock_resp = MagicMock()
    mock_resp.content = "بطاقة تحقيق الشخصية\nأحمد محمود علي\n29501011234567"

    with patch("app.services.ocr.extractor.get_ocr_llm") as mock_get_llm:
        mock_llm = MagicMock()
        mock_llm.invoke.return_value = mock_resp
        mock_get_llm.return_value = mock_llm

        raw_text = extract_raw_text(str(dummy_img), DocumentType.NATIONAL_ID_FRONT)

        assert raw_text == "بطاقة تحقيق الشخصية\nأحمد محمود علي\n29501011234567"
        mock_llm.invoke.assert_called_once()
        invoked_message = mock_llm.invoke.call_args[0][0][0]
        # Check text prompt contains Stage 1 OCR prompt
        assert invoked_message.content[0]["text"] == get_ocr_prompt(DocumentType.NATIONAL_ID_FRONT)
        # Check image payload is base64 encoded
        assert invoked_message.content[1]["image_url"].startswith("data:image/jpeg;base64,")


def test_extract_raw_text_missing_file():
    """Stage 1: Non-existent image file raises FileNotFoundError."""
    with pytest.raises(FileNotFoundError):
        extract_raw_text("non_existent_file_xyz.jpg", DocumentType.NATIONAL_ID_FRONT)


def test_extract_raw_text_empty_prompt(tmp_path):
    """Stage 1: Unsupported document type with empty prompt returns empty string without invoking LLM."""
    dummy_img = tmp_path / "doc.jpg"
    dummy_img.write_bytes(b"dummy bytes")

    with patch("app.services.ocr.extractor.get_ocr_llm") as mock_get_llm:
        mock_llm = MagicMock()
        mock_get_llm.return_value = mock_llm

        result = extract_raw_text(str(dummy_img), "unsupported_type")
        assert result == ""
        mock_llm.invoke.assert_not_called()


# ---------------------------------------------------------------------------
# Stage 2: parse_document_text Tests
# ---------------------------------------------------------------------------

def test_parse_document_text():
    """Stage 2: Verify Text LLM is called with transcribed text and parser prompt."""
    expected = {
        "name": "أحمد محمود علي",
        "national_id": "29501011234567",
        "address": "12 شارع النيل، الجيزة",
    }
    mock_resp = MagicMock()
    mock_resp.content = json.dumps(expected)

    raw_text = "بطاقة الرقم القومي\nأحمد محمود علي\n29501011234567\n12 شارع النيل، الجيزة"

    with patch("app.services.ocr.extractor.get_parser_llm") as mock_get_llm:
        mock_llm = MagicMock()
        mock_llm.invoke.return_value = mock_resp
        mock_get_llm.return_value = mock_llm

        parsed = parse_document_text(raw_text, DocumentType.NATIONAL_ID_FRONT)

        assert parsed == expected
        mock_llm.invoke.assert_called_once()
        invoked_content = mock_llm.invoke.call_args[0][0][0].content
        assert get_parser_prompt(DocumentType.NATIONAL_ID_FRONT) in invoked_content
        assert raw_text in invoked_content


def test_parse_document_text_empty_input():
    """Stage 2: Empty or whitespace raw text returns {} without calling parser LLM."""
    with patch("app.services.ocr.extractor.get_parser_llm") as mock_get_llm:
        mock_llm = MagicMock()
        mock_get_llm.return_value = mock_llm

        assert parse_document_text("", DocumentType.NATIONAL_ID_FRONT) == {}
        assert parse_document_text("   \n\t ", DocumentType.NATIONAL_ID_FRONT) == {}
        mock_llm.invoke.assert_not_called()


def test_parse_document_text_empty_prompt():
    """Stage 2: Unsupported document type with empty prompt returns {}."""
    with patch("app.services.ocr.extractor.get_parser_llm") as mock_get_llm:
        mock_llm = MagicMock()
        mock_get_llm.return_value = mock_llm

        result = parse_document_text("Some transcribed text", "unsupported_type")
        assert result == {}
        mock_llm.invoke.assert_not_called()


def test_parse_document_text_egyptian_id_name_repetition():
    """Stage 2: Handles Egyptian National ID split-line name with repeated father/son names."""
    raw_text = "محمد\nمحمد أحمد حسنين\nبطاقة تحقيق الشخصية\n29805141234567\n15 شارع الهرم، الجيزة"

    mock_resp = MagicMock()
    mock_resp.content = json.dumps({
        "name": "محمد محمد أحمد حسنين",
        "national_id": "29805141234567",
        "address": "15 شارع الهرم، الجيزة",
    })

    with patch("app.services.ocr.extractor.get_parser_llm") as mock_get_llm:
        mock_llm = MagicMock()
        mock_llm.invoke.return_value = mock_resp
        mock_get_llm.return_value = mock_llm

        result = parse_document_text(raw_text, DocumentType.NATIONAL_ID_FRONT)

        # Verify parser prompt was constructed and sent
        sent_content = mock_llm.invoke.call_args[0][0][0].content
        assert raw_text in sent_content
        # Verify Egyptian ID domain instructions are embedded in the prompt sent
        assert "TWO lines" in sent_content
        assert "keep BOTH occurrences" in sent_content or "never omit" in sent_content.lower()

        # Verify parsed name preserved both occurrences
        assert result["name"] == "محمد محمد أحمد حسنين"
        assert result["national_id"] == "29805141234567"
        assert result["address"] == "15 شارع الهرم، الجيزة"


# ---------------------------------------------------------------------------
# Chaining & Backward Compatibility: extract_document_fields Tests
# ---------------------------------------------------------------------------

def test_extract_document_fields_chains_two_stages(tmp_path):
    """End-to-end: extract_document_fields coordinates Stage 1 Vision -> Stage 2 Text LLM."""
    dummy_img = tmp_path / "id_front.jpg"
    dummy_img.write_bytes(b"dummy image bytes")

    mock_ocr_resp = MagicMock()
    mock_ocr_resp.content = "محمد\nمحمد أحمد حسنين\n29805141234567\n15 شارع الهرم، الجيزة"

    mock_parser_resp = MagicMock()
    mock_parser_resp.content = json.dumps({
        "name": "محمد محمد أحمد حسنين",
        "national_id": "29805141234567",
        "address": "15 شارع الهرم، الجيزة",
    })

    with patch("app.services.ocr.extractor.get_ocr_llm") as mock_get_ocr, \
         patch("app.services.ocr.extractor.get_parser_llm") as mock_get_parser:
        mock_ocr_llm = MagicMock()
        mock_ocr_llm.invoke.return_value = mock_ocr_resp
        mock_get_ocr.return_value = mock_ocr_llm

        mock_parser_llm = MagicMock()
        mock_parser_llm.invoke.return_value = mock_parser_resp
        mock_get_parser.return_value = mock_parser_llm

        result = extract_document_fields(str(dummy_img), DocumentType.NATIONAL_ID_FRONT)

        assert result["name"] == "محمد محمد أحمد حسنين"
        assert result["national_id"] == "29805141234567"
        assert result["address"] == "15 شارع الهرم، الجيزة"

        mock_ocr_llm.invoke.assert_called_once()
        mock_parser_llm.invoke.assert_called_once()


def test_extract_document_fields_empty_ocr_fallback(tmp_path):
    """When Stage 1 returns empty or whitespace text, Stage 2 is skipped and {} is returned."""
    dummy_img = tmp_path / "empty_doc.jpg"
    dummy_img.write_bytes(b"dummy image bytes")

    mock_ocr_resp = MagicMock()
    mock_ocr_resp.content = "   \n\t  "

    with patch("app.services.ocr.extractor.get_ocr_llm") as mock_get_ocr, \
         patch("app.services.ocr.extractor.get_parser_llm") as mock_get_parser:
        mock_ocr_llm = MagicMock()
        mock_ocr_llm.invoke.return_value = mock_ocr_resp
        mock_get_ocr.return_value = mock_ocr_llm

        mock_parser_llm = MagicMock()
        mock_get_parser.return_value = mock_parser_llm

        result = extract_document_fields(str(dummy_img), DocumentType.NATIONAL_ID_FRONT)

        assert result == {}
        mock_ocr_llm.invoke.assert_called_once()
        mock_parser_llm.invoke.assert_not_called()


def test_extract_national_id_front(tmp_path):
    """End-to-end: Valid LLM outputs parse fields correctly."""
    dummy_img = tmp_path / "id_front.jpg"
    dummy_img.write_bytes(b"dummy image bytes")

    mock_ocr_resp = MagicMock()
    mock_ocr_resp.content = "أحمد محمود علي\n29501011234567\n12 شارع النيل، الجيزة"

    mock_parser_resp = MagicMock()
    mock_parser_resp.content = json.dumps({
        "name": "أحمد محمود علي",
        "national_id": "29501011234567",
        "address": "12 شارع النيل، الجيزة",
    })

    with patch("app.services.ocr.extractor.get_ocr_llm") as mock_get_ocr, \
         patch("app.services.ocr.extractor.get_parser_llm") as mock_get_parser:
        mock_ocr_llm = MagicMock()
        mock_ocr_llm.invoke.return_value = mock_ocr_resp
        mock_get_ocr.return_value = mock_ocr_llm

        mock_parser_llm = MagicMock()
        mock_parser_llm.invoke.return_value = mock_parser_resp
        mock_get_parser.return_value = mock_parser_llm

        result = extract_document_fields(str(dummy_img), DocumentType.NATIONAL_ID_FRONT)

        assert isinstance(result, dict)
        assert result["national_id"] == "29501011234567"
        assert result["name"] == "أحمد محمود علي"
        assert result["address"] == "12 شارع النيل، الجيزة"


def test_extract_handles_markdown_code_fence(tmp_path):
    """End-to-end: Markdown-wrapped JSON in parser LLM response is stripped and parsed."""
    dummy_img = tmp_path / "id_front_fence.jpg"
    dummy_img.write_bytes(b"dummy image bytes")

    mock_ocr_resp = MagicMock()
    mock_ocr_resp.content = "محمود سمير\n29001011234567\nالإسكندرية"

    mock_parser_resp = MagicMock()
    mock_parser_resp.content = "```json\n" + json.dumps({
        "name": "محمود سمير",
        "national_id": "29001011234567",
        "address": "الإسكندرية",
    }) + "\n```"

    with patch("app.services.ocr.extractor.get_ocr_llm") as mock_get_ocr, \
         patch("app.services.ocr.extractor.get_parser_llm") as mock_get_parser:
        mock_ocr_llm = MagicMock()
        mock_ocr_llm.invoke.return_value = mock_ocr_resp
        mock_get_ocr.return_value = mock_ocr_llm

        mock_parser_llm = MagicMock()
        mock_parser_llm.invoke.return_value = mock_parser_resp
        mock_get_parser.return_value = mock_parser_llm

        result = extract_document_fields(str(dummy_img), DocumentType.NATIONAL_ID_FRONT)

        assert result["national_id"] == "29001011234567"
        assert result["name"] == "محمود سمير"


def test_extract_returns_invalid_json(tmp_path):
    """End-to-end: Parser LLM returning garbage handles gracefully and returns empty dict."""
    dummy_img = tmp_path / "garbage.jpg"
    dummy_img.write_bytes(b"dummy image bytes")

    mock_ocr_resp = MagicMock()
    mock_ocr_resp.content = "Some raw text"

    mock_parser_resp = MagicMock()
    mock_parser_resp.content = "Sorry, I cannot read this image clearly. Please provide a better photo."

    with patch("app.services.ocr.extractor.get_ocr_llm") as mock_get_ocr, \
         patch("app.services.ocr.extractor.get_parser_llm") as mock_get_parser:
        mock_ocr_llm = MagicMock()
        mock_ocr_llm.invoke.return_value = mock_ocr_resp
        mock_get_ocr.return_value = mock_ocr_llm

        mock_parser_llm = MagicMock()
        mock_parser_llm.invoke.return_value = mock_parser_resp
        mock_get_parser.return_value = mock_parser_llm

        result = extract_document_fields(str(dummy_img), DocumentType.NATIONAL_ID_FRONT)

        assert result == {}


def test_extract_dynamic_mime_type(tmp_path):
    """Verify MIME type is dynamically guessed from file extension (e.g. image/png)."""
    dummy_png = tmp_path / "sample.png"
    dummy_png.write_bytes(b"png data")

    mock_ocr_resp = MagicMock()
    mock_ocr_resp.content = "transcribed text"

    mock_parser_resp = MagicMock()
    mock_parser_resp.content = json.dumps({"name": "Test User", "national_id": "29501011234567", "address": "Cairo"})

    with patch("app.services.ocr.extractor.get_ocr_llm") as mock_get_ocr, \
         patch("app.services.ocr.extractor.get_parser_llm") as mock_get_parser:
        mock_ocr_llm = MagicMock()
        mock_ocr_llm.invoke.return_value = mock_ocr_resp
        mock_get_ocr.return_value = mock_ocr_llm

        mock_parser_llm = MagicMock()
        mock_parser_llm.invoke.return_value = mock_parser_resp
        mock_get_parser.return_value = mock_parser_llm

        extract_document_fields(str(dummy_png), DocumentType.NATIONAL_ID_FRONT)

        # Inspect the message sent to vision invoke
        call_args = mock_ocr_llm.invoke.call_args[0][0]
        human_message = call_args[0]
        image_part = human_message.content[1]
        assert image_part["image_url"].startswith("data:image/png;base64,")


# ---------------------------------------------------------------------------
# Request Document Processing & Workflow Tests
# ---------------------------------------------------------------------------

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


def test_process_endpoint_invalid_status(client, db_session):
    """POST /api/requests/{id}/process fails with 400 if request is not in PENDING_UPLOAD status."""
    token = get_customer_auth(client, email="invalid_status_user@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    create_resp = client.post(
        "/api/requests/",
        json={"request_type": "account_opening", "sub_type": "youth"},
        headers=headers,
    )
    assert create_resp.status_code == 201
    req_id = create_resp.json()["id"]

    # Add required documents
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

    # Manually transition request to PROCESSING
    req = db_session.query(Request).filter(Request.id == uuid.UUID(req_id)).first()
    req.status = RequestStatus.PROCESSING
    db_session.commit()

    resp = client.post(f"/api/requests/{req_id}/process", headers=headers)
    assert resp.status_code == 400
    assert resp.json()["detail"] == f"Request cannot be processed in '{RequestStatus.PROCESSING}' status"


def test_process_preserves_uncompleted_on_connection_error(db_session, tmp_path):
    """When LLM or file extraction raises connection/system error, doc.ocr_completed remains False."""
    user = User(
        name="Conn Error User",
        email="conn_err@example.com",
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

    img = tmp_path / "front.jpg"
    img.write_bytes(b"dummy")

    doc = Document(
        request_id=req.id,
        document_type=DocumentType.NATIONAL_ID_FRONT,
        file_path=str(img),
        ocr_required=True,
        ocr_completed=False,
    )
    db_session.add(doc)
    db_session.commit()

    with patch("app.services.ocr.extractor.extract_document_fields", side_effect=ConnectionError("Ollama connection failed")):
        process_request_documents(req.id, db=db_session)

        db_session.refresh(doc)
        assert doc.ocr_completed is False
        assert doc.extracted_data is None
