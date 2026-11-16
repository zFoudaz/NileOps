import uuid
import pytest
from sqlalchemy.exc import IntegrityError
from app.models import (
    User,
    Request,
    Document,
    ValidationResult,
    UserRole,
    RequestStatus,
    RequestType,
    DocumentType,
    AutoDecision,
)


def test_create_user(db_session):
    """Create customer, assert fields and UUID primary key."""
    user = User(
        name="Ahmed Ali",
        email="ahmed@example.com",
        password_hash="hashed_pw_123",
        role=UserRole.CUSTOMER,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    assert isinstance(user.id, uuid.UUID)
    assert user.name == "Ahmed Ali"
    assert user.email == "ahmed@example.com"
    assert user.password_hash == "hashed_pw_123"
    assert user.role == UserRole.CUSTOMER
    assert user.created_at is not None


def test_create_request(db_session):
    """Create request with sub_type, assert default status=pending_upload and relationships."""
    user = User(
        name="Sara Mohamed",
        email="sara@example.com",
        password_hash="hashed_pw_456",
        role=UserRole.CUSTOMER,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    req = Request(
        customer_id=user.id,
        request_type=RequestType.ACCOUNT_OPENING,
        sub_type="individual",
    )
    db_session.add(req)
    db_session.commit()
    db_session.refresh(req)

    assert isinstance(req.id, uuid.UUID)
    assert req.customer_id == user.id
    assert req.request_type == RequestType.ACCOUNT_OPENING
    assert req.sub_type == "individual"
    assert req.status == RequestStatus.PENDING_UPLOAD
    assert req.auto_decision is None
    assert req.rejection_reason is None
    assert req.verified_by is None
    assert req.created_at is not None
    assert req.updated_at is not None
    assert req.customer.name == "Sara Mohamed"


def test_create_document(db_session):
    """Create document linked to request, assert extracted_data stores JSON/JSONB."""
    user = User(
        name="Omar Tarek",
        email="omar@example.com",
        password_hash="hashed_pw_789",
        role=UserRole.CUSTOMER,
    )
    db_session.add(user)
    db_session.commit()

    req = Request(
        customer_id=user.id,
        request_type=RequestType.ACCOUNT_OPENING,
        sub_type="youth",
    )
    db_session.add(req)
    db_session.commit()

    doc = Document(
        request_id=req.id,
        document_type=DocumentType.NATIONAL_ID_FRONT,
        file_path="uploads/test_national_id_front.jpg",
        ocr_required=True,
        extracted_data={"national_id": "30101011234567", "name": "Omar Tarek", "address": "Cairo, Egypt"},
        corrected_data=None,
        ocr_completed=True,
    )
    db_session.add(doc)
    db_session.commit()
    db_session.refresh(doc)

    assert isinstance(doc.id, uuid.UUID)
    assert doc.request_id == req.id
    assert doc.document_type == DocumentType.NATIONAL_ID_FRONT
    assert doc.file_path == "uploads/test_national_id_front.jpg"
    assert doc.ocr_required is True
    assert doc.ocr_completed is True
    assert doc.extracted_data["national_id"] == "30101011234567"
    assert doc.extracted_data["name"] == "Omar Tarek"
    assert doc.corrected_data is None
    assert doc.created_at is not None
    assert doc.request.id == req.id


def test_create_validation(db_session):
    """Create validation_result, assert passed field and details JSON."""
    user = User(
        name="Mona Hassan",
        email="mona@example.com",
        password_hash="hashed_pw_321",
        role=UserRole.CUSTOMER,
    )
    db_session.add(user)
    db_session.commit()

    req = Request(
        customer_id=user.id,
        request_type=RequestType.ACCOUNT_OPENING,
        sub_type="individual",
    )
    db_session.add(req)
    db_session.commit()

    val = ValidationResult(
        request_id=req.id,
        rule_name="id_expiry",
        passed=True,
        details={"expiry_date": "2030-05-15", "is_expired": False},
        user_corrected=False,
    )
    db_session.add(val)
    db_session.commit()
    db_session.refresh(val)

    assert isinstance(val.id, uuid.UUID)
    assert val.request_id == req.id
    assert val.rule_name == "id_expiry"
    assert val.passed is True
    assert val.details["expiry_date"] == "2030-05-15"
    assert val.user_corrected is False
    assert val.created_at is not None
    assert val.request.id == req.id


def test_user_email_uniqueness(db_session):
    """Assert unique constraint on user email."""
    user1 = User(
        name="User One",
        email="duplicate@example.com",
        password_hash="pw1",
        role=UserRole.CUSTOMER,
    )
    db_session.add(user1)
    db_session.commit()

    user2 = User(
        name="User Two",
        email="duplicate@example.com",
        password_hash="pw2",
        role=UserRole.CUSTOMER,
    )
    db_session.add(user2)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_request_cascade_delete(db_session):
    """Assert deleting a request cascades to its documents and validation results."""
    user = User(
        name="Cascade Test",
        email="cascade@example.com",
        password_hash="pw_cascade",
        role=UserRole.CUSTOMER,
    )
    db_session.add(user)
    db_session.commit()

    req = Request(
        customer_id=user.id,
        request_type=RequestType.ACCOUNT_OPENING,
        sub_type="individual",
    )
    db_session.add(req)
    db_session.commit()

    doc = Document(
        request_id=req.id,
        document_type=DocumentType.PROOF_OF_RESIDENCE,
        file_path="uploads/residence.pdf",
    )
    val = ValidationResult(
        request_id=req.id,
        rule_name="residence_check",
        passed=True,
    )
    db_session.add_all([doc, val])
    db_session.commit()

    req_id = req.id
    doc_id = doc.id
    val_id = val.id

    db_session.delete(req)
    db_session.commit()

    assert db_session.get(Request, req_id) is None
    assert db_session.get(Document, doc_id) is None
    assert db_session.get(ValidationResult, val_id) is None


def test_employee_verification_relationship(db_session):
    """Assert request verification links to employee user."""
    customer = User(
        name="Customer User",
        email="customer@example.com",
        password_hash="pw_cust",
        role=UserRole.CUSTOMER,
    )
    employee = User(
        name="Bank Employee",
        email="employee@bank.com",
        password_hash="pw_emp",
        role=UserRole.EMPLOYEE,
    )
    db_session.add_all([customer, employee])
    db_session.commit()

    req = Request(
        customer_id=customer.id,
        request_type=RequestType.ACCOUNT_OPENING,
        sub_type="individual",
        status=RequestStatus.APPROVED,
        auto_decision=AutoDecision.AUTO_APPROVED,
        verified_by=employee.id,
    )
    db_session.add(req)
    db_session.commit()
    db_session.refresh(req)

    assert req.verified_by == employee.id
    assert req.verifier.name == "Bank Employee"
    assert req.verifier.role == UserRole.EMPLOYEE
    assert len(employee.verified_requests) == 1
    assert employee.verified_requests[0].id == req.id
