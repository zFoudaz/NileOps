import uuid
from unittest.mock import patch

from app.models.document import Document
from app.models.enums import AutoDecision, DocumentType, RequestStatus, UserRole
from app.models.request import Request
from app.models.user import User
from app.models.validation_result import ValidationResult
from app.services.ocr.extractor import process_request_documents
from app.services.validation.business_rules import compute_auto_decision
from app.services.validation.cross_validator import validate_request


def create_test_request(db_session, sub_type: str = "individual") -> Request:
    user = User(
        name="Test Validation User",
        email=f"val_user_{uuid.uuid4().hex[:8]}@example.com",
        password_hash="fakehash",
        role=UserRole.CUSTOMER,
    )
    db_session.add(user)
    db_session.flush()

    req = Request(
        customer_id=user.id,
        sub_type=sub_type,
        status=RequestStatus.PROCESSING,
    )
    db_session.add(req)
    db_session.flush()
    return req


def test_cross_validate_id_expiry_valid(db_session):
    """Future expiry date -> id_expiry passed=True."""
    req = create_test_request(db_session, sub_type="individual")
    doc = Document(
        request_id=req.id,
        document_type=DocumentType.NATIONAL_ID_BACK,
        file_path="uploads/back.jpg",
        extracted_data={"expiry_date": "2030-12-31"},
        ocr_completed=True,
    )
    db_session.add(doc)
    db_session.commit()

    results = validate_request(req.id, db_session)
    expiry_res = next((r for r in results if r.rule_name == "id_expiry"), None)
    assert expiry_res is not None
    assert expiry_res.passed is True
    assert expiry_res.details.get("expiry_date") == "2030-12-31"

    # Verify persisted in DB
    db_record = db_session.query(ValidationResult).filter_by(
        request_id=req.id, rule_name="id_expiry"
    ).first()
    assert db_record is not None
    assert db_record.passed is True


def test_cross_validate_id_expiry_expired(db_session):
    """Past expiry date -> id_expiry passed=False."""
    req = create_test_request(db_session, sub_type="individual")
    doc = Document(
        request_id=req.id,
        document_type=DocumentType.NATIONAL_ID_BACK,
        file_path="uploads/back.jpg",
        extracted_data={"expiry_date": "2020-01-01"},
        ocr_completed=True,
    )
    db_session.add(doc)
    db_session.commit()

    results = validate_request(req.id, db_session)
    expiry_res = next((r for r in results if r.rule_name == "id_expiry"), None)
    assert expiry_res is not None
    assert expiry_res.passed is False


def test_cross_validate_age_individual_valid(db_session):
    """Age 25 + individual -> age_check passed=True."""
    req = create_test_request(db_session, sub_type="individual")
    # DOB: 2001-05-15 -> Age 25 in 2026
    doc = Document(
        request_id=req.id,
        document_type=DocumentType.NATIONAL_ID_FRONT,
        file_path="uploads/front.jpg",
        extracted_data={"national_id": "30105150101235"},
        ocr_completed=True,
    )
    db_session.add(doc)
    db_session.commit()

    results = validate_request(req.id, db_session)
    age_res = next((r for r in results if r.rule_name == "age_check"), None)
    assert age_res is not None
    assert age_res.passed is True
    assert age_res.details.get("age") >= 21


def test_cross_validate_age_individual_young(db_session):
    """Age 18 + individual -> age_check passed=False."""
    req = create_test_request(db_session, sub_type="individual")
    # DOB: 2008-05-15 -> Age 18 in 2026
    doc = Document(
        request_id=req.id,
        document_type=DocumentType.NATIONAL_ID_FRONT,
        file_path="uploads/front.jpg",
        extracted_data={"national_id": "30805150101235"},
        ocr_completed=True,
    )
    db_session.add(doc)
    db_session.commit()

    results = validate_request(req.id, db_session)
    age_res = next((r for r in results if r.rule_name == "age_check"), None)
    assert age_res is not None
    assert age_res.passed is False
    assert age_res.details.get("age") < 21


def test_cross_validate_age_youth_valid(db_session):
    """Age 17 + youth -> age_check passed=True."""
    req = create_test_request(db_session, sub_type="youth")
    # DOB: 2009-05-15 -> Age 17 in 2026
    doc = Document(
        request_id=req.id,
        document_type=DocumentType.NATIONAL_ID_FRONT,
        file_path="uploads/front.jpg",
        extracted_data={"national_id": "30905150101235"},
        ocr_completed=True,
    )
    db_session.add(doc)
    db_session.commit()

    results = validate_request(req.id, db_session)
    age_res = next((r for r in results if r.rule_name == "age_check"), None)
    assert age_res is not None
    assert age_res.passed is True
    assert 15 <= age_res.details.get("age") <= 21


def test_cross_validate_age_minor_valid(db_session):
    """Age 10 + minor -> age_check passed=True."""
    req = create_test_request(db_session, sub_type="minor")
    # DOB: 2016-03-20 -> Age 10 in 2026
    doc = Document(
        request_id=req.id,
        document_type=DocumentType.BIRTH_CERTIFICATE,
        file_path="uploads/birth_cert.jpg",
        extracted_data={"date_of_birth": "2016-03-20"},
        ocr_completed=True,
    )
    db_session.add(doc)
    db_session.commit()

    results = validate_request(req.id, db_session)
    age_res = next((r for r in results if r.rule_name == "age_check"), None)
    assert age_res is not None
    assert age_res.passed is True
    assert age_res.details.get("age") < 15


def test_cross_validate_age_minor_future_dob(db_session):
    """Future birth date on minor account -> age_check passed=False."""
    req = create_test_request(db_session, sub_type="minor")
    doc = Document(
        request_id=req.id,
        document_type=DocumentType.BIRTH_CERTIFICATE,
        file_path="uploads/birth_cert.jpg",
        extracted_data={"date_of_birth": "2030-01-01"},
        ocr_completed=True,
    )
    db_session.add(doc)
    db_session.commit()

    results = validate_request(req.id, db_session)
    age_res = next((r for r in results if r.rule_name == "age_check"), None)
    assert age_res is not None
    assert age_res.passed is False


def test_cross_validate_guardian_id_match(db_session):
    """father_national_id matches guardian's -> guardian_id_match passed=True."""
    req = create_test_request(db_session, sub_type="minor")
    doc_birth = Document(
        request_id=req.id,
        document_type=DocumentType.BIRTH_CERTIFICATE,
        file_path="uploads/birth.jpg",
        extracted_data={"father_national_id": "28501010101235", "date_of_birth": "2016-01-01"},
        ocr_completed=True,
    )
    doc_guardian = Document(
        request_id=req.id,
        document_type=DocumentType.GUARDIAN_NATIONAL_ID_FRONT,
        file_path="uploads/guardian_front.jpg",
        extracted_data={"national_id": "28501010101235"},
        ocr_completed=True,
    )
    db_session.add_all([doc_birth, doc_guardian])
    db_session.commit()

    results = validate_request(req.id, db_session)
    guardian_res = next((r for r in results if r.rule_name == "guardian_id_match"), None)
    assert guardian_res is not None
    assert guardian_res.passed is True


def test_cross_validate_guardian_id_mismatch(db_session):
    """different IDs -> guardian_id_match passed=False."""
    req = create_test_request(db_session, sub_type="minor")
    doc_birth = Document(
        request_id=req.id,
        document_type=DocumentType.BIRTH_CERTIFICATE,
        file_path="uploads/birth.jpg",
        extracted_data={"father_national_id": "28501010101235", "date_of_birth": "2016-01-01"},
        ocr_completed=True,
    )
    doc_guardian = Document(
        request_id=req.id,
        document_type=DocumentType.GUARDIAN_NATIONAL_ID_FRONT,
        file_path="uploads/guardian_front.jpg",
        extracted_data={"national_id": "29001010109999"},
        ocr_completed=True,
    )
    db_session.add_all([doc_birth, doc_guardian])
    db_session.commit()

    results = validate_request(req.id, db_session)
    guardian_res = next((r for r in results if r.rule_name == "guardian_id_match"), None)
    assert guardian_res is not None
    assert guardian_res.passed is False


def test_auto_approve_all_pass():
    """All validations pass -> auto_approved."""
    req_id = uuid.uuid4()
    v1 = ValidationResult(request_id=req_id, rule_name="id_expiry", passed=True)
    v2 = ValidationResult(request_id=req_id, rule_name="age_check", passed=True)
    v3 = ValidationResult(request_id=req_id, rule_name="guardian_id_match", passed=True)
    decision = compute_auto_decision([v1, v2, v3])
    assert decision == AutoDecision.AUTO_APPROVED


def test_auto_reject_expired_id():
    """Expiry fails -> auto_rejected."""
    req_id = uuid.uuid4()
    v1 = ValidationResult(request_id=req_id, rule_name="id_expiry", passed=False)
    v2 = ValidationResult(request_id=req_id, rule_name="age_check", passed=True)
    decision = compute_auto_decision([v1, v2])
    assert decision == AutoDecision.AUTO_REJECTED


def test_auto_reject_wrong_age():
    """Age fails -> auto_rejected."""
    req_id = uuid.uuid4()
    v1 = ValidationResult(request_id=req_id, rule_name="id_expiry", passed=True)
    v2 = ValidationResult(request_id=req_id, rule_name="age_check", passed=False)
    decision = compute_auto_decision([v1, v2])
    assert decision == AutoDecision.AUTO_REJECTED


def test_process_request_documents_integration(db_session, tmp_path):
    """process_request_documents runs OCR, validation, auto-decision, and updates status."""
    req = create_test_request(db_session, sub_type="youth")

    img_front = tmp_path / "front.jpg"
    img_front.write_bytes(b"dummy")
    img_back = tmp_path / "back.jpg"
    img_back.write_bytes(b"dummy")

    doc1 = Document(
        request_id=req.id,
        document_type=DocumentType.NATIONAL_ID_FRONT,
        file_path=str(img_front),
        ocr_required=True,
        ocr_completed=False,
    )
    doc2 = Document(
        request_id=req.id,
        document_type=DocumentType.NATIONAL_ID_BACK,
        file_path=str(img_back),
        ocr_required=True,
        ocr_completed=False,
    )
    db_session.add_all([doc1, doc2])
    db_session.commit()

    mock_extractions = {
        DocumentType.NATIONAL_ID_FRONT: {"national_id": "30905150101235"},
        DocumentType.NATIONAL_ID_BACK: {"expiry_date": "2030-12-31"},
    }

    with patch(
        "app.services.ocr.extractor.extract_document_fields",
        side_effect=lambda path, dtype: mock_extractions[dtype],
    ):
        process_request_documents(req.id, db=db_session)

    db_session.refresh(req)
    assert req.status == RequestStatus.PENDING_CORRECTION
    assert req.auto_decision == AutoDecision.AUTO_APPROVED

    # Check validation results were persisted
    val_records = db_session.query(ValidationResult).filter_by(request_id=req.id).all()
    assert len(val_records) == 2
    assert all(r.passed for r in val_records)
