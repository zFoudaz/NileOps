from typing import Optional, Union

from app.models.enums import AutoDecision, RequestType
from app.models.validation_result import ValidationResult
from app.services.request_types import get_handler


def compute_auto_decision(
    validations: list[ValidationResult],
    request_type: Optional[Union[RequestType, str]] = None,
) -> Optional[AutoDecision]:
    """Compute automated decision based on validation results via the request type handler."""
    handler = get_handler(request_type or RequestType.ACCOUNT_OPENING)
    return handler.compute_auto_decision(validations)
