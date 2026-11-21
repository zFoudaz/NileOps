from typing import Dict, List, Optional, Set, Union

from sqlalchemy.orm import Session

from app.models.bank_account import BankAccount
from app.models.document import Document
from app.models.enums import CardType, DocumentType, RequestType
from app.models.request import Request
from app.models.user import User
from app.models.validation_result import ValidationResult
from app.services.request_types.base import RequestTypeHandler
from app.services.validation.helpers import (
    get_doc_data,
    index_documents_by_type,
    normalize_digits,
    validate_id_expiry,
)

CARD_REQUIRED_DOCUMENTS: Dict[CardType, List[DocumentType]] = {
    CardType.PREPAID: [
        DocumentType.NATIONAL_ID_FRONT,
        DocumentType.NATIONAL_ID_BACK,
    ],
    CardType.DEBIT: [
        DocumentType.NATIONAL_ID_FRONT,
        DocumentType.NATIONAL_ID_BACK,
        DocumentType.PROOF_OF_RESIDENCE,
    ],
    CardType.CREDIT: [
        DocumentType.NATIONAL_ID_FRONT,
        DocumentType.NATIONAL_ID_BACK,
        DocumentType.PROOF_OF_RESIDENCE,
        DocumentType.PROOF_OF_INCOME,
        DocumentType.GUARANTEE_PROOF,
    ],
}

CARD_OCR_DOCUMENTS: Set[DocumentType] = {
    DocumentType.NATIONAL_ID_FRONT,
    DocumentType.NATIONAL_ID_BACK,
    DocumentType.PROOF_OF_RESIDENCE,
}

DEBIT_ACCOUNT_REQUIRED_MSG = (
    "يجب أن يكون لديك حساب بنكي مفعل أولاً للتقديم على بطاقة الخصم المباشر. "
    "يرجى تقديم طلب فتح حساب وانتظار موافقة البنك عليه."
)


class CardIssuanceHandler(RequestTypeHandler):
    """Request type handler for Bank Card Issuance (prepaid, debit, credit)."""

    request_type = RequestType.CARD_ISSUANCE
    sub_types = {CardType.PREPAID.value, CardType.DEBIT.value, CardType.CREDIT.value}
    ocr_documents = CARD_OCR_DOCUMENTS
    auto_reject_rules = {"id_expiry", "bank_account_check"}
    non_editable_fields = {"expiry_date"}

    def get_required_documents(self, sub_type: Union[CardType, str]) -> List[DocumentType]:
        if isinstance(sub_type, str):
            try:
                sub_type = CardType(sub_type.strip().lower())
            except ValueError:
                return []
        return CARD_REQUIRED_DOCUMENTS.get(sub_type, [])

    def check_prerequisites(
        self,
        user: User,
        sub_type: str,
        db: Session,
    ) -> Optional[str]:
        """Debit card requests require an active bank account for the customer."""
        if sub_type.strip().lower() == CardType.DEBIT.value:
            active_account = (
                db.query(BankAccount)
                .filter(
                    BankAccount.user_id == user.id,
                    BankAccount.status == "active",
                )
                .first()
            )
            if not active_account:
                return DEBIT_ACCOUNT_REQUIRED_MSG
        return None

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

        # 1. ID Expiry Check (applies to all card types)
        back_doc = docs_by_type.get(DocumentType.NATIONAL_ID_BACK.value.lower())
        results.append(validate_id_expiry(request.id, back_doc))

        # 2. Active Bank Account & National ID Match Check (debit cards only)
        if sub_type == CardType.DEBIT.value:
            active_accounts = [
                acc
                for acc in (request.customer.bank_accounts if request.customer else [])
                if acc.status == "active"
            ]
            if not active_accounts:
                results.append(
                    ValidationResult(
                        request_id=request.id,
                        rule_name="bank_account_check",
                        passed=False,
                        details={
                            "reason": "No active bank account found for customer",
                        },
                    )
                )
            else:
                front_doc = docs_by_type.get(DocumentType.NATIONAL_ID_FRONT.value.lower())
                front_data = get_doc_data(front_doc)
                raw_req_nid = front_data.get("national_id")
                req_nid = normalize_digits(str(raw_req_nid)) if raw_req_nid else ""

                accounts_with_nid = [a for a in active_accounts if a.national_id]
                if not accounts_with_nid:
                    # Active account exists without stored NID (e.g. minimal seed)
                    acc = active_accounts[0]
                    results.append(
                        ValidationResult(
                            request_id=request.id,
                            rule_name="bank_account_check",
                            passed=True,
                            details={
                                "account_number": acc.account_number,
                                "account_type": acc.account_type,
                            },
                        )
                    )
                elif not req_nid:
                    results.append(
                        ValidationResult(
                            request_id=request.id,
                            rule_name="bank_account_check",
                            passed=False,
                            details={
                                "reason": "National ID missing from front document to match bank account",
                            },
                        )
                    )
                else:
                    matching_acc = next(
                        (
                            a
                            for a in accounts_with_nid
                            if normalize_digits(str(a.national_id)) == req_nid
                        ),
                        None,
                    )
                    if matching_acc:
                        results.append(
                            ValidationResult(
                                request_id=request.id,
                                rule_name="bank_account_check",
                                passed=True,
                                details={
                                    "account_number": matching_acc.account_number,
                                    "account_type": matching_acc.account_type,
                                    "national_id": req_nid,
                                },
                            )
                        )
                    else:
                        results.append(
                            ValidationResult(
                                request_id=request.id,
                                rule_name="bank_account_check",
                                passed=False,
                                details={
                                    "request_national_id": req_nid,
                                    "account_national_ids": [
                                        normalize_digits(str(a.national_id))
                                        for a in accounts_with_nid
                                    ],
                                    "reason": "National ID does not match customer's active bank account",
                                },
                            )
                        )

        return results
