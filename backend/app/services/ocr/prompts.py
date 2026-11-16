from typing import Dict, Union
from app.models.enums import DocumentType

# ---------------------------------------------------------------------------
# Stage 1: Vision Model OCR Prompts (Raw transcription verbatim)
# ---------------------------------------------------------------------------

_OCR_NATIONAL_ID_FRONT_PROMPT = """You are an OCR transcription engine.
Transcribe all visible Arabic and Latin text verbatim from this Egyptian National ID card (front side) image.
Rules:
- Transcribe all text verbatim exactly as written, preserving original spelling, line breaks, line order, and spatial layout.
- Preserve all Arabic words, Latin letters, and numeric digits exactly.
- Do NOT summarize, explain, interpret, reformat, or translate the text.
- Do NOT output JSON, markdown fences, or key-value structures.
- Output ONLY the raw transcribed text exactly as it appears on the card."""

_OCR_NATIONAL_ID_BACK_PROMPT = """You are an OCR transcription engine.
Transcribe all visible Arabic and Latin text verbatim from this Egyptian National ID card (back side) image.
Rules:
- Transcribe all text verbatim exactly as written, preserving original spelling, line breaks, line order, and spatial layout.
- Preserve all Arabic words, Latin letters, and numeric digits exactly.
- Do NOT summarize, explain, interpret, reformat, or translate the text.
- Do NOT output JSON, markdown fences, or key-value structures.
- Output ONLY the raw transcribed text exactly as it appears on the card."""

_OCR_PROOF_OF_RESIDENCE_PROMPT = """You are an OCR transcription engine.
Transcribe all visible Arabic and Latin text verbatim from this Egyptian Proof of Residence document (utility bill or tenancy contract) image.
Rules:
- Transcribe all text verbatim exactly as written, preserving original spelling, line breaks, line order, and spatial layout.
- Preserve all Arabic words, Latin letters, and numeric digits exactly.
- Do NOT summarize, explain, interpret, reformat, or translate the text.
- Do NOT output JSON, markdown fences, or key-value structures.
- Output ONLY the raw transcribed text exactly as it appears on the document."""

_OCR_BIRTH_CERTIFICATE_PROMPT = """You are an OCR transcription engine.
Transcribe all visible Arabic and Latin text verbatim from this Egyptian Birth Certificate image.
Rules:
- Transcribe all text verbatim exactly as written, preserving original spelling, line breaks, line order, and spatial layout.
- Preserve all Arabic words, Latin letters, and numeric digits exactly.
- Do NOT summarize, explain, interpret, reformat, or translate the text.
- Do NOT output JSON, markdown fences, or key-value structures.
- Output ONLY the raw transcribed text exactly as it appears on the certificate."""

OCR_PROMPTS: Dict[DocumentType, str] = {
    DocumentType.NATIONAL_ID_FRONT: _OCR_NATIONAL_ID_FRONT_PROMPT,
    DocumentType.NATIONAL_ID_BACK: _OCR_NATIONAL_ID_BACK_PROMPT,
    DocumentType.PROOF_OF_RESIDENCE: _OCR_PROOF_OF_RESIDENCE_PROMPT,
    DocumentType.BIRTH_CERTIFICATE: _OCR_BIRTH_CERTIFICATE_PROMPT,
    DocumentType.GUARDIAN_NATIONAL_ID_FRONT: _OCR_NATIONAL_ID_FRONT_PROMPT,
    DocumentType.GUARDIAN_NATIONAL_ID_BACK: _OCR_NATIONAL_ID_BACK_PROMPT,
}

# ---------------------------------------------------------------------------
# Stage 2: Text LLM Parser Prompts (Raw text -> Structured JSON)
# ---------------------------------------------------------------------------

_PARSER_NATIONAL_ID_FRONT_PROMPT = """Extract the following fields from the transcribed Egyptian National ID card (front side) text as JSON:
- name (Arabic full name)
- national_id (14-digit number)
- address (full address in Arabic)

Egyptian National ID Domain Rules (بطاقة الرقم القومي المصرية):
- The person's full name is printed across TWO lines: Line 1 has the first name(s), and Line 2 has the father, grandfather, and family name.
- Concatenate both lines in order (Line 1 followed by Line 2 separated by a single space) to form the complete full name.
- CRITICAL: If the person shares the same name as their father (e.g., 'محمد' on line 1 and 'محمد أحمد علي' on line 2), keep BOTH occurrences ('محمد محمد أحمد علي'). Never omit, drop, merge, or deduplicate repeated names.
- national_id must be extracted as a 14-digit number string.
- address must be the complete Arabic address text.

Return ONLY valid JSON: {"name": "...", "national_id": "...", "address": "..."}"""

_PARSER_NATIONAL_ID_BACK_PROMPT = """Extract the following fields from the transcribed Egyptian National ID card (back side) text as JSON:
- expiry_date (expiry date as string or YYYY-MM-DD)
- job (occupation / profession in Arabic)
- marital_status (marital status in Arabic)

Return ONLY valid JSON: {"expiry_date": "...", "job": "...", "marital_status": "..."}"""

_PARSER_PROOF_OF_RESIDENCE_PROMPT = """Extract the following fields from the transcribed Egyptian Proof of Residence document (utility bill or tenancy contract) text as JSON:
- holder_name (name of the resident or account holder in Arabic)
- address (residence address in Arabic)

Return ONLY valid JSON: {"holder_name": "...", "address": "..."}"""

_PARSER_BIRTH_CERTIFICATE_PROMPT = """Extract the following fields from the transcribed Egyptian Birth Certificate text as JSON:
- child_name (child's full name in Arabic)
- date_of_birth (child's date of birth)
- father_name (father's full name in Arabic)
- mother_name (mother's full name in Arabic)
- father_national_id (father's 14-digit national ID)

Return ONLY valid JSON: {"child_name": "...", "date_of_birth": "...", "father_name": "...", "mother_name": "...", "father_national_id": "..."}"""

PARSER_PROMPTS: Dict[DocumentType, str] = {
    DocumentType.NATIONAL_ID_FRONT: _PARSER_NATIONAL_ID_FRONT_PROMPT,
    DocumentType.NATIONAL_ID_BACK: _PARSER_NATIONAL_ID_BACK_PROMPT,
    DocumentType.PROOF_OF_RESIDENCE: _PARSER_PROOF_OF_RESIDENCE_PROMPT,
    DocumentType.BIRTH_CERTIFICATE: _PARSER_BIRTH_CERTIFICATE_PROMPT,
    DocumentType.GUARDIAN_NATIONAL_ID_FRONT: _PARSER_NATIONAL_ID_FRONT_PROMPT,
    DocumentType.GUARDIAN_NATIONAL_ID_BACK: _PARSER_NATIONAL_ID_BACK_PROMPT,
}

# ---------------------------------------------------------------------------
# Prompt Retrieval Functions
# ---------------------------------------------------------------------------

def get_ocr_prompt(document_type: Union[DocumentType, str]) -> str:
    """Retrieve raw OCR transcription prompt for document type, supporting either enum or string."""
    if isinstance(document_type, str):
        try:
            document_type = DocumentType(document_type.strip().lower())
        except ValueError:
            return ""
    return OCR_PROMPTS.get(document_type, "")


def get_parser_prompt(document_type: Union[DocumentType, str]) -> str:
    """Retrieve structured JSON parser prompt for document type, supporting either enum or string."""
    if isinstance(document_type, str):
        try:
            document_type = DocumentType(document_type.strip().lower())
        except ValueError:
            return ""
    return PARSER_PROMPTS.get(document_type, "")


# Backward-compatible aliases
PROMPTS: Dict[DocumentType, str] = PARSER_PROMPTS
get_prompt = get_parser_prompt
