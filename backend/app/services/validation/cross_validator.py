from datetime import date, datetime
from typing import Any, Optional
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.document import Document
from app.models.enums import DocumentType
from app.models.request import Request
from app.models.validation_result import ValidationResult
from app.services.validation.national_id_decoder import decode_national_id


def _parse_date(date_val: Any) -> Optional[date]:
    """Parse date from date, datetime, or various common date string formats."""
    if not date_val:
        return None
    if isinstance(date_val, datetime):
        return date_val.date()
    if isinstance(date_val, date):
        return date_val
    if isinstance(date_val, str):
        date_str = date_val.strip().translate(str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789"))
        formats = [
            "%Y-%m-%d",
            "%d/%m/%Y",
            "%Y/%m/%d",
            "%d-%m-%Y",
            "%m/%d/%Y",
            "%d.%m.%Y",
            "%Y.%m.%d",
        ]
        for fmt in formats:
            try:
                return datetime.strptime(date_str, fmt).date()
            except ValueError:
                continue
        try:
            return date.fromisoformat(date_str)
        except ValueError:
            pass
    return None


def _compute_age(birth_date: date, as_of: Optional[date] = None) -> int:
    """Compute age in full years between birth_date and as_of date."""
    if as_of is None:
        as_of = date.today()
    return as_of.year - birth_date.year - ((as_of.month, as_of.day) < (birth_date.month, birth_date.day))


def _get_doc_data(doc: Optional[Document]) -> dict[str, Any]:
    """Get extracted or corrected data from document."""
    if not doc:
        return {}
    if doc.corrected_data is not None:
        return doc.corrected_data
    if doc.extracted_data is not None:
        return doc.extracted_data
    return {}


def validate_request(request_id: UUID, db: Session) -> list[ValidationResult]:
    """Validate documents and business rules for an account opening request."""
    req = db.query(Request).filter(Request.id == request_id).first()
    if not req:
        raise ValueError(f"Request with id {request_id} not found")

    docs = db.query(Document).filter(Document.request_id == request_id).all()
    docs_by_type: dict[str, Document] = {}
    for d in docs:
        dtype = d.document_type.value if hasattr(d.document_type, "value") else str(d.document_type)
        docs_by_type[dtype.lower()] = d

    sub_type = (req.sub_type.value if hasattr(req.sub_type, "value") else str(req.sub_type)).lower()
    results: list[ValidationResult] = []

    # -------------------------------------------------------------------------
    # 1. ID Expiry Check
    # -------------------------------------------------------------------------
    if sub_type == "minor":
        back_doc = docs_by_type.get(DocumentType.GUARDIAN_NATIONAL_ID_BACK.value.lower())
        if not back_doc:
            back_doc = docs_by_type.get(DocumentType.NATIONAL_ID_BACK.value.lower())
    else:
        back_doc = docs_by_type.get(DocumentType.NATIONAL_ID_BACK.value.lower())
        if not back_doc:
            back_doc = docs_by_type.get(DocumentType.GUARDIAN_NATIONAL_ID_BACK.value.lower())

    if not back_doc:
        id_expiry_passed = False
        id_expiry_details = {"error": "National ID back document not found"}
    else:
        back_data = _get_doc_data(back_doc)
        raw_expiry = back_data.get("expiry_date")
        if not raw_expiry:
            id_expiry_passed = False
            id_expiry_details = {"error": "Missing expiry date in national ID back"}
        else:
            parsed_expiry = _parse_date(raw_expiry)
            if not parsed_expiry:
                id_expiry_passed = False
                id_expiry_details = {
                    "error": f"Invalid date format for expiry_date: {raw_expiry}",
                    "expiry_date": str(raw_expiry),
                }
            else:
                today = date.today()
                if parsed_expiry < today:
                    id_expiry_passed = False
                    id_expiry_details = {
                        "expiry_date": parsed_expiry.isoformat(),
                        "reason": "ID is expired",
                        "today": today.isoformat(),
                    }
                else:
                    id_expiry_passed = True
                    id_expiry_details = {
                        "expiry_date": parsed_expiry.isoformat(),
                        "today": today.isoformat(),
                    }

    results.append(
        ValidationResult(
            request_id=request_id,
            rule_name="id_expiry",
            passed=id_expiry_passed,
            details=id_expiry_details,
        )
    )

    # -------------------------------------------------------------------------
    # 2. Age Check
    # -------------------------------------------------------------------------
    if sub_type == "minor":
        birth_doc = docs_by_type.get(DocumentType.BIRTH_CERTIFICATE.value.lower())
        if not birth_doc:
            age_passed = False
            age_details = {"error": "Birth certificate document not found"}
        else:
            birth_data = _get_doc_data(birth_doc)
            raw_dob = birth_data.get("date_of_birth") or birth_data.get("dob")
            dob = _parse_date(raw_dob)
            if not dob:
                # Attempt decoding child national ID if present
                child_nid = birth_data.get("child_national_id") or birth_data.get("national_id")
                if child_nid:
                    decoded_child = decode_national_id(str(child_nid))
                    if decoded_child.is_valid and decoded_child.date_of_birth:
                        dob = decoded_child.date_of_birth

            if not dob:
                age_passed = False
                age_details = {
                    "error": "Could not determine date of birth from birth certificate",
                    "raw_dob": raw_dob,
                }
            elif dob > date.today():
                age_passed = False
                age_details = {
                    "error": "Date of birth cannot be in the future",
                    "date_of_birth": dob.isoformat(),
                    "today": date.today().isoformat(),
                }
            else:
                age = _compute_age(dob)
                age_passed = (0 <= age < 15)
                age_details = {
                    "age": age,
                    "date_of_birth": dob.isoformat(),
                    "sub_type": sub_type,
                    "criteria": "0 <= age < 15",
                }
    else:
        front_doc = docs_by_type.get(DocumentType.NATIONAL_ID_FRONT.value.lower())
        if not front_doc:
            age_passed = False
            age_details = {"error": "National ID front document not found"}
        else:
            front_data = _get_doc_data(front_doc)
            nid_str = front_data.get("national_id")
            if not nid_str:
                age_passed = False
                age_details = {"error": "National ID number missing from front document"}
            else:
                decoded = decode_national_id(str(nid_str))
                if not decoded.is_valid or not decoded.date_of_birth:
                    age_passed = False
                    age_details = {
                        "error": decoded.error or "Invalid national ID",
                        "national_id": str(nid_str),
                    }
                else:
                    dob = decoded.date_of_birth
                    age = _compute_age(dob)
                    if sub_type == "individual":
                        age_passed = (age >= 21)
                        age_details = {
                            "age": age,
                            "date_of_birth": dob.isoformat(),
                            "sub_type": sub_type,
                            "criteria": "age >= 21",
                        }
                    elif sub_type == "youth":
                        age_passed = (15 <= age <= 21)
                        age_details = {
                            "age": age,
                            "date_of_birth": dob.isoformat(),
                            "sub_type": sub_type,
                            "criteria": "15 <= age <= 21",
                        }
                    else:
                        age_passed = False
                        age_details = {
                            "age": age,
                            "date_of_birth": dob.isoformat(),
                            "sub_type": sub_type,
                            "error": f"Unsupported account sub_type: {sub_type}",
                        }

    results.append(
        ValidationResult(
            request_id=request_id,
            rule_name="age_check",
            passed=age_passed,
            details=age_details,
        )
    )

    # -------------------------------------------------------------------------
    # 3. Guardian ID Match Check (minor accounts only)
    # -------------------------------------------------------------------------
    if sub_type == "minor":
        birth_doc = docs_by_type.get(DocumentType.BIRTH_CERTIFICATE.value.lower())
        guardian_doc = docs_by_type.get(DocumentType.GUARDIAN_NATIONAL_ID_FRONT.value.lower())
        birth_data = _get_doc_data(birth_doc)
        guardian_data = _get_doc_data(guardian_doc)

        raw_father_nid = birth_data.get("father_national_id") or ""
        raw_guardian_nid = guardian_data.get("national_id") or ""

        father_nid = str(raw_father_nid).strip().translate(str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789"))
        guardian_nid = str(raw_guardian_nid).strip().translate(str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789"))

        if father_nid and guardian_nid and father_nid == guardian_nid:
            guardian_match_passed = True
            guardian_match_details = {
                "father_national_id": father_nid,
                "guardian_national_id": guardian_nid,
            }
        else:
            guardian_match_passed = False
            guardian_match_details = {
                "father_national_id": father_nid or None,
                "guardian_national_id": guardian_nid or None,
                "reason": "Guardian national ID does not match father national ID on birth certificate",
            }

        results.append(
            ValidationResult(
                request_id=request_id,
                rule_name="guardian_id_match",
                passed=guardian_match_passed,
                details=guardian_match_details,
            )
        )

    # -------------------------------------------------------------------------
    # Persist Validation Results
    # -------------------------------------------------------------------------
    db.query(ValidationResult).filter(ValidationResult.request_id == request_id).delete()
    for res in results:
        db.add(res)
    db.flush()

    return results
