from datetime import date
from typing import Dict, List, Set, Union

from app.models.document import Document
from app.models.enums import AccountType, DocumentType, RequestType
from app.models.request import Request
from app.models.validation_result import ValidationResult
from app.services.request_types.base import RequestTypeHandler
from app.services.validation.helpers import (
    compute_age,
    get_doc_data,
    index_documents_by_type,
    normalize_digits,
    parse_date,
)
from app.services.validation.national_id_decoder import decode_national_id

REQUIRED_DOCUMENTS: Dict[AccountType, List[DocumentType]] = {
    AccountType.INDIVIDUAL: [
        DocumentType.NATIONAL_ID_FRONT,
        DocumentType.NATIONAL_ID_BACK,
        DocumentType.PROOF_OF_RESIDENCE,
        DocumentType.PROOF_OF_INCOME,
    ],
    AccountType.YOUTH: [
        DocumentType.NATIONAL_ID_FRONT,
        DocumentType.NATIONAL_ID_BACK,
    ],
    AccountType.MINOR: [
        DocumentType.BIRTH_CERTIFICATE,
        DocumentType.GUARDIAN_NATIONAL_ID_FRONT,
        DocumentType.GUARDIAN_NATIONAL_ID_BACK,
    ],
}

OCR_DOCUMENTS: Set[DocumentType] = {
    DocumentType.NATIONAL_ID_FRONT,
    DocumentType.NATIONAL_ID_BACK,
    DocumentType.PROOF_OF_RESIDENCE,
    DocumentType.BIRTH_CERTIFICATE,
    DocumentType.GUARDIAN_NATIONAL_ID_FRONT,
    DocumentType.GUARDIAN_NATIONAL_ID_BACK,
}


def get_required_documents(sub_type: Union[AccountType, str]) -> List[DocumentType]:
    """Return list of required documents for a given account sub_type."""
    if isinstance(sub_type, str):
        try:
            sub_type = AccountType(sub_type.strip().lower())
        except ValueError:
            return []
    return REQUIRED_DOCUMENTS.get(sub_type, [])


class AccountOpeningHandler(RequestTypeHandler):
    """Request type handler for Account Opening (individual, youth, minor)."""

    request_type = RequestType.ACCOUNT_OPENING
    sub_types = {AccountType.INDIVIDUAL.value, AccountType.YOUTH.value, AccountType.MINOR.value}
    ocr_documents = OCR_DOCUMENTS
    auto_reject_rules = {"id_expiry", "age_check"}
    non_editable_fields = {"expiry_date"}

    def get_required_documents(self, sub_type: Union[AccountType, str]) -> List[DocumentType]:
        return get_required_documents(sub_type)

    def validate(
        self,
        request: Request,
        documents: List[Document],
    ) -> List[ValidationResult]:
        docs_by_type = index_documents_by_type(documents)
        sub_type = (
            request.sub_type.value
            if hasattr(request.sub_type, "value")
            else str(request.sub_type)
        ).lower()
        results: List[ValidationResult] = []

        # 1. ID Expiry Check
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
            back_data = get_doc_data(back_doc)
            raw_expiry = back_data.get("expiry_date")
            if not raw_expiry:
                id_expiry_passed = False
                id_expiry_details = {"error": "Missing expiry date in national ID back"}
            else:
                parsed_expiry = parse_date(raw_expiry)
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
                request_id=request.id,
                rule_name="id_expiry",
                passed=id_expiry_passed,
                details=id_expiry_details,
            )
        )

        # 2. Age Check
        if sub_type == "minor":
            birth_doc = docs_by_type.get(DocumentType.BIRTH_CERTIFICATE.value.lower())
            if not birth_doc:
                age_passed = False
                age_details = {"error": "Birth certificate document not found"}
            else:
                birth_data = get_doc_data(birth_doc)
                raw_dob = birth_data.get("date_of_birth") or birth_data.get("dob")
                dob = parse_date(raw_dob)
                if not dob:
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
                    age = compute_age(dob)
                    age_passed = 0 <= age < 15
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
                front_data = get_doc_data(front_doc)
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
                        age = compute_age(dob)
                        if sub_type == "individual":
                            age_passed = age >= 21
                            age_details = {
                                "age": age,
                                "date_of_birth": dob.isoformat(),
                                "sub_type": sub_type,
                                "criteria": "age >= 21",
                            }
                        elif sub_type == "youth":
                            age_passed = 15 <= age <= 21
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
                request_id=request.id,
                rule_name="age_check",
                passed=age_passed,
                details=age_details,
            )
        )

        # 3. Guardian ID Match Check (minor accounts only)
        if sub_type == "minor":
            birth_doc = docs_by_type.get(DocumentType.BIRTH_CERTIFICATE.value.lower())
            guardian_doc = docs_by_type.get(DocumentType.GUARDIAN_NATIONAL_ID_FRONT.value.lower())
            birth_data = get_doc_data(birth_doc)
            guardian_data = get_doc_data(guardian_doc)

            raw_father_nid = birth_data.get("father_national_id") or ""
            raw_guardian_nid = guardian_data.get("national_id") or ""

            father_nid = normalize_digits(str(raw_father_nid))
            guardian_nid = normalize_digits(str(raw_guardian_nid))

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
                    request_id=request.id,
                    rule_name="guardian_id_match",
                    passed=guardian_match_passed,
                    details=guardian_match_details,
                )
            )

        return results
