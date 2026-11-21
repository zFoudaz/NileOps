import pytest
from pydantic import ValidationError

from app.models.enums import AutoDecision, DocumentType, RequestType
from app.models.validation_result import ValidationResult
from app.schemas.request import RequestCreate
from app.services.request_types import (
    AccountOpeningHandler,
    RequestTypeHandler,
    get_handler,
    list_handlers,
    register_handler,
)
from app.services.request_types.registry import _REGISTRY
from app.services.validation.business_rules import compute_auto_decision


def test_account_opening_handler_registered():
    handler = get_handler(RequestType.ACCOUNT_OPENING)
    assert isinstance(handler, AccountOpeningHandler)
    assert handler in list_handlers()
    assert handler.is_valid_sub_type("individual") is True
    assert handler.is_valid_sub_type("YOUTH") is True
    assert handler.is_valid_sub_type("minor") is True
    assert handler.is_valid_sub_type("credit_card") is False
    assert handler.requires_ocr(DocumentType.NATIONAL_ID_FRONT) is True
    assert handler.requires_ocr(DocumentType.PROOF_OF_INCOME) is False
    assert "expiry_date" in handler.non_editable_fields


def test_get_handler_unknown_raises():
    with pytest.raises(ValueError, match="Unsupported request type"):
        get_handler("non_existent_type")


def test_request_create_validates_sub_type_via_handler():
    req = RequestCreate(request_type=RequestType.ACCOUNT_OPENING, sub_type="  Individual ")
    assert req.sub_type == "individual"

    with pytest.raises(ValidationError):
        RequestCreate(request_type=RequestType.ACCOUNT_OPENING, sub_type="invalid_sub_type")


def test_custom_handler_registration_and_auto_decision():
    class DummyKycHandler(RequestTypeHandler):
        request_type = "kyc_update"  # type: ignore[assignment]
        sub_types = {"address", "employment"}
        ocr_documents = {DocumentType.NATIONAL_ID_FRONT}
        auto_reject_rules = {"kyc_expiry"}
        non_editable_fields = {"expiry_date", "salary"}

        def get_required_documents(self, sub_type: str):
            if sub_type.lower() == "employment":
                return [DocumentType.NATIONAL_ID_FRONT, DocumentType.PROOF_OF_INCOME]
            return [DocumentType.NATIONAL_ID_FRONT]

        def validate(self, request, documents):
            return [
                ValidationResult(
                    request_id=request.id,
                    rule_name="kyc_expiry",
                    passed=False,
                    details={"reason": "expired"},
                )
            ]

    register_handler(DummyKycHandler())
    try:
        handler = get_handler("kyc_update")
        assert handler.is_valid_sub_type("employment") is True
        assert handler.get_required_documents("employment") == [
            DocumentType.NATIONAL_ID_FRONT,
            DocumentType.PROOF_OF_INCOME,
        ]
        assert handler.requires_ocr(DocumentType.NATIONAL_ID_FRONT) is True
        assert handler.requires_ocr(DocumentType.PROOF_OF_INCOME) is False

        failed_kyc = [ValidationResult(rule_name="kyc_expiry", passed=False)]
        assert compute_auto_decision(failed_kyc, request_type="kyc_update") == AutoDecision.AUTO_REJECTED

        # Non-auto-reject rule failure returns None
        failed_other = [ValidationResult(rule_name="address_check", passed=False)]
        assert compute_auto_decision(failed_other, request_type="kyc_update") is None

        # All passed returns AUTO_APPROVED
        passed_all = [ValidationResult(rule_name="kyc_expiry", passed=True)]
        assert compute_auto_decision(passed_all, request_type="kyc_update") == AutoDecision.AUTO_APPROVED
    finally:
        _REGISTRY.pop("kyc_update", None)
