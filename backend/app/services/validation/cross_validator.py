from uuid import UUID

from sqlalchemy.orm import Session

from app.models.document import Document
from app.models.request import Request
from app.models.validation_result import ValidationResult
from app.services.request_types import get_handler
from app.services.validation.helpers import (
    compute_age as _compute_age,
    get_doc_data as _get_doc_data,
    parse_date as _parse_date,
)

__all__ = [
    "_compute_age",
    "_get_doc_data",
    "_parse_date",
    "validate_request",
]


def validate_request(request_id: UUID, db: Session) -> list[ValidationResult]:
    """Validate documents and business rules for a request via its registered handler."""
    req = db.query(Request).filter(Request.id == request_id).first()
    if not req:
        raise ValueError(f"Request with id {request_id} not found")

    docs = db.query(Document).filter(Document.request_id == request_id).all()
    handler = get_handler(req.request_type)
    results = handler.validate(req, docs)

    db.query(ValidationResult).filter(ValidationResult.request_id == request_id).delete()
    for res in results:
        db.add(res)
    db.flush()

    return results
