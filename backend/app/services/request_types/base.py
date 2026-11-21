from abc import ABC, abstractmethod
from typing import TYPE_CHECKING, List, Optional, Set, Union

from app.models.enums import AutoDecision, DocumentType, RequestType

if TYPE_CHECKING:
    from sqlalchemy.orm import Session

    from app.models.document import Document
    from app.models.request import Request
    from app.models.user import User
    from app.models.validation_result import ValidationResult


class RequestTypeHandler(ABC):
    """Base contract for a modular banking request type.

    To add a new request type (e.g., card issuance, KYC update):
    1. Subclass RequestTypeHandler in a new module under services/request_types/.
    2. Define its sub_types, required documents, OCR documents, validation rules,
       auto_reject_rules, and non_editable_fields.
    3. Register an instance in services/request_types/registry.py.
    """

    request_type: RequestType
    sub_types: Set[str] = set()
    ocr_documents: Set[DocumentType] = set()
    auto_reject_rules: Set[str] = set()
    non_editable_fields: Set[str] = {"expiry_date"}

    def is_valid_sub_type(self, sub_type: str) -> bool:
        """Check whether sub_type is valid for this request type."""
        if not isinstance(sub_type, str):
            return False
        return sub_type.strip().lower() in self.sub_types

    @abstractmethod
    def get_required_documents(self, sub_type: str) -> List[DocumentType]:
        """Return the ordered list of required documents for a given sub_type."""

    def requires_ocr(self, document_type: Union[DocumentType, str]) -> bool:
        """Return whether a document type should be processed by OCR."""
        if isinstance(document_type, str):
            try:
                document_type = DocumentType(document_type.strip().lower())
            except ValueError:
                return False
        return document_type in self.ocr_documents

    @abstractmethod
    def validate(
        self,
        request: "Request",
        documents: List["Document"],
    ) -> List["ValidationResult"]:
        """Run cross-validation rules for this request and return ValidationResult objects."""

    def check_prerequisites(
        self,
        user: "User",
        sub_type: str,
        db: "Session",
    ) -> Optional[str]:
        """Optional prerequisite check before creating a request.

        Returns an error message string if the user cannot create this request,
        or None if all prerequisites are met.
        """
        return None

    def on_approved(
        self,
        request: "Request",
        db: "Session",
    ) -> None:
        """Optional hook invoked when an employee approves a request of this type."""
        return None

    def compute_auto_decision(
        self,
        validations: List["ValidationResult"],
    ) -> Optional[AutoDecision]:
        """Compute automated decision based on validation results and auto_reject_rules."""
        if not validations:
            return None

        for validation in validations:
            if validation.rule_name in self.auto_reject_rules and not validation.passed:
                return AutoDecision.AUTO_REJECTED

        if all(validation.passed for validation in validations):
            return AutoDecision.AUTO_APPROVED

        return None
