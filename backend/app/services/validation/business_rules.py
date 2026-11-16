from typing import Optional

from app.models.enums import AutoDecision
from app.models.validation_result import ValidationResult


def compute_auto_decision(validations: list[ValidationResult]) -> Optional[AutoDecision]:
    """Compute automated decision based on validation results.

    Rules:
    - If any validation with rule_name in ['id_expiry', 'age_check'] has passed=False -> AUTO_REJECTED
    - If all validations in the list have passed=True -> AUTO_APPROVED
    - Otherwise -> None
    """
    if not validations:
        return None

    # Auto-rejection rule check
    auto_reject_rules = {"id_expiry", "age_check"}
    for validation in validations:
        if validation.rule_name in auto_reject_rules and not validation.passed:
            return AutoDecision.AUTO_REJECTED

    # If all validations passed
    if all(validation.passed for validation in validations):
        return AutoDecision.AUTO_APPROVED

    return None
