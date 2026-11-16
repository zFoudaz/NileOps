from typing import Dict, List, Set, Union
from app.models.enums import AccountType, DocumentType

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
            sub_type = AccountType(sub_type.lower())
        except ValueError:
            return []
    return REQUIRED_DOCUMENTS.get(sub_type, [])
