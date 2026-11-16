from app.models.enums import DocumentType
from app.services.ocr.prompts import (
    OCR_PROMPTS,
    PARSER_PROMPTS,
    PROMPTS,
    get_ocr_prompt,
    get_parser_prompt,
    get_prompt,
)
from app.services.request_types.account_opening import OCR_DOCUMENTS


def test_ocr_prompts_cover_all_ocr_documents():
    """Verify OCR_PROMPTS defines raw transcription instructions for every OCR document type."""
    assert len(OCR_DOCUMENTS) == 6
    for doc_type in OCR_DOCUMENTS:
        assert doc_type in OCR_PROMPTS
        prompt = OCR_PROMPTS[doc_type]
        assert isinstance(prompt, str) and len(prompt) > 0
        prompt_lower = prompt.lower()
        # Must instruct verbatim transcription preserving line breaks without JSON or summarization
        assert "verbatim" in prompt_lower or "exact" in prompt_lower
        assert "line break" in prompt_lower or "layout" in prompt_lower
        assert "json" in prompt_lower
        assert "summarize" in prompt_lower or "summary" in prompt_lower


def test_parser_prompts_cover_all_ocr_documents():
    """Verify PARSER_PROMPTS defines JSON extraction instructions for every OCR document type."""
    assert len(OCR_DOCUMENTS) == 6
    for doc_type in OCR_DOCUMENTS:
        assert doc_type in PARSER_PROMPTS
        prompt = PARSER_PROMPTS[doc_type]
        assert isinstance(prompt, str) and len(prompt) > 0
        assert "json" in prompt.lower()
        assert "{" in prompt and "}" in prompt


def test_get_ocr_prompt_enum_and_string():
    """Verify get_ocr_prompt works with enum, lowercase string, uppercase string, and handles invalid."""
    prompt_from_enum = get_ocr_prompt(DocumentType.NATIONAL_ID_FRONT)
    assert len(prompt_from_enum) > 0

    prompt_from_str = get_ocr_prompt("national_id_front")
    assert prompt_from_str == prompt_from_enum

    prompt_from_upper = get_ocr_prompt("NATIONAL_ID_FRONT")
    assert prompt_from_upper == prompt_from_enum

    prompt_with_spaces = get_ocr_prompt("  national_id_front  ")
    assert prompt_with_spaces == prompt_from_enum

    assert get_ocr_prompt("non_existent_document") == ""
    assert get_ocr_prompt("") == ""


def test_get_parser_prompt_enum_and_string():
    """Verify get_parser_prompt works with enum, string variants, and handles invalid inputs."""
    prompt_from_enum = get_parser_prompt(DocumentType.NATIONAL_ID_FRONT)
    assert len(prompt_from_enum) > 0

    prompt_from_str = get_parser_prompt("national_id_front")
    assert prompt_from_str == prompt_from_enum

    prompt_from_upper = get_parser_prompt("NATIONAL_ID_FRONT")
    assert prompt_from_upper == prompt_from_enum

    prompt_with_spaces = get_parser_prompt("  national_id_front  ")
    assert prompt_with_spaces == prompt_from_enum

    assert get_parser_prompt("invalid_document_type") == ""
    assert get_parser_prompt("") == ""


def test_national_id_front_rules_egyptian_id():
    """Verify NATIONAL_ID_FRONT & GUARDIAN_NATIONAL_ID_FRONT parser prompts have Egyptian ID naming rules."""
    for doc_type in [
        DocumentType.NATIONAL_ID_FRONT,
        DocumentType.GUARDIAN_NATIONAL_ID_FRONT,
    ]:
        prompt = get_parser_prompt(doc_type)
        prompt_lower = prompt.lower()

        # Two lines rule
        assert "two lines" in prompt_lower or "2 lines" in prompt_lower
        assert "line 1" in prompt_lower
        assert "line 2" in prompt_lower

        # Repeated names / no deduplication rule
        assert "deduplicat" in prompt_lower or "repeated" in prompt_lower
        assert "محمد" in prompt

        # 14-digit national ID and address
        assert "14-digit" in prompt_lower or "14 digit" in prompt_lower
        assert "address" in prompt_lower
        assert "name" in prompt_lower


def test_parser_prompts_target_fields():
    """Verify specific required fields exist in respective parser prompts."""
    # Back ID
    back_prompt = get_parser_prompt(DocumentType.NATIONAL_ID_BACK)
    assert "expiry_date" in back_prompt
    assert "job" in back_prompt
    assert "marital_status" in back_prompt

    # Proof of Residence
    residence_prompt = get_parser_prompt(DocumentType.PROOF_OF_RESIDENCE)
    assert "holder_name" in residence_prompt
    assert "address" in residence_prompt

    # Birth Certificate
    birth_prompt = get_parser_prompt(DocumentType.BIRTH_CERTIFICATE)
    assert "child_name" in birth_prompt
    assert "date_of_birth" in birth_prompt
    assert "father_name" in birth_prompt
    assert "mother_name" in birth_prompt
    assert "father_national_id" in birth_prompt


def test_backward_compatibility():
    """Verify PROMPTS and get_prompt remain fully backward compatible with PARSER_PROMPTS."""
    assert PROMPTS is PARSER_PROMPTS or PROMPTS == PARSER_PROMPTS
    for doc_type in OCR_DOCUMENTS:
        assert get_prompt(doc_type) == get_parser_prompt(doc_type)
        assert PROMPTS[doc_type] == PARSER_PROMPTS[doc_type]

    assert get_prompt("national_id_front") == get_parser_prompt("national_id_front")
    assert get_prompt("unknown_type") == ""
