from typing import Dict, Union
from app.models.enums import DocumentType

_NATIONAL_ID_FRONT_PROMPT = """Extract the following fields from this Egyptian National ID card (front side) as JSON:
- name (Arabic full name)
- national_id (14-digit number)
- address (Arabic)

Return ONLY valid JSON: {"name": "...", "national_id": "...", "address": "..."}"""

_NATIONAL_ID_BACK_PROMPT = """Extract the following fields from this Egyptian National ID card (back side) as JSON:
- expiry_date (expiry date as string or YYYY-MM-DD)
- job (occupation / profession in Arabic)
- marital_status (marital status in Arabic)

Return ONLY valid JSON: {"expiry_date": "...", "job": "...", "marital_status": "..."}"""

_PROOF_OF_RESIDENCE_PROMPT = """Extract the following fields from this Egyptian Proof of Residence document (utility bill or tenancy contract) as JSON:
- holder_name (name of the resident or account holder)
- address (residence address)

Return ONLY valid JSON: {"holder_name": "...", "address": "..."}"""

_BIRTH_CERTIFICATE_PROMPT = """Extract the following fields from this Egyptian Birth Certificate as JSON:
- child_name (child's full name in Arabic)
- date_of_birth (child's date of birth)
- father_name (father's full name in Arabic)
- mother_name (mother's full name in Arabic)
- father_national_id (father's 14-digit national ID)

Return ONLY valid JSON: {"child_name": "...", "date_of_birth": "...", "father_name": "...", "mother_name": "...", "father_national_id": "..."}"""

PROMPTS: Dict[DocumentType, str] = {
    DocumentType.NATIONAL_ID_FRONT: _NATIONAL_ID_FRONT_PROMPT,
    DocumentType.NATIONAL_ID_BACK: _NATIONAL_ID_BACK_PROMPT,
    DocumentType.PROOF_OF_RESIDENCE: _PROOF_OF_RESIDENCE_PROMPT,
    DocumentType.BIRTH_CERTIFICATE: _BIRTH_CERTIFICATE_PROMPT,
    DocumentType.GUARDIAN_NATIONAL_ID_FRONT: _NATIONAL_ID_FRONT_PROMPT,
    DocumentType.GUARDIAN_NATIONAL_ID_BACK: _NATIONAL_ID_BACK_PROMPT,
}


def get_prompt(document_type: Union[DocumentType, str]) -> str:
    """Retrieve prompt for document type, supporting either enum or string."""
    if isinstance(document_type, str):
        try:
            document_type = DocumentType(document_type.strip().lower())
        except ValueError:
            return ""
    return PROMPTS.get(document_type, "")
