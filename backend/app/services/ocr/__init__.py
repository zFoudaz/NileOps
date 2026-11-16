from app.services.ocr.extractor import extract_document_fields, process_request_documents
from app.services.ocr.prompts import (
    OCR_PROMPTS,
    PARSER_PROMPTS,
    PROMPTS,
    get_ocr_prompt,
    get_parser_prompt,
    get_prompt,
)

__all__ = [
    "OCR_PROMPTS",
    "PARSER_PROMPTS",
    "PROMPTS",
    "get_ocr_prompt",
    "get_parser_prompt",
    "get_prompt",
    "extract_document_fields",
    "process_request_documents",
]
