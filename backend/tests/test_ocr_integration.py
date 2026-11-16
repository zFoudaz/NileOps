import json
from pathlib import Path
from unittest.mock import MagicMock, patch
import pytest

from app.models.enums import DocumentType
from app.services.ocr.extractor import (
    extract_document_fields,
    extract_raw_text,
    parse_document_text,
)
from app.services.ocr.prompts import get_ocr_prompt, get_parser_prompt


def get_sample_documents_dir() -> Path:
    candidates = [
        Path("/app/sample_documents"),
        Path("/sample_documents"),
        Path(__file__).resolve().parent.parent.parent / "sample_documents",
        Path(__file__).resolve().parent.parent / "sample_documents",
        Path.cwd() / "sample_documents",
    ]
    for p in candidates:
        if p.is_dir() and (p / "national_id_front.png").exists():
            return p
    raise FileNotFoundError("sample_documents directory not found")


def test_sample_documents_exist():
    """Verify that sample Egyptian documents exist and are valid non-empty files."""
    sample_dir = get_sample_documents_dir()
    required_files = [
        "national_id_front.png",
        "national_id_back.png",
        "proof_of_income.png",
        "proof_of_residence.png",
    ]
    for filename in required_files:
        file_path = sample_dir / filename
        assert file_path.exists(), f"Missing required sample document: {filename}"
        assert file_path.stat().st_size > 1000, f"Sample document {filename} is too small or empty"


def test_end_to_end_extraction_with_sample_id_front():
    """Verify end-to-end extraction pipeline with sample Egyptian ID front image."""
    sample_dir = get_sample_documents_dir()
    id_front_path = str(sample_dir / "national_id_front.png")

    mock_raw_transcription = (
        "جمهورية مصر العربية\n"
        "وزارة الداخلية\n"
        "قطاع مصلحة الأحوال المدنية\n"
        "بطاقة تحقيق شخصية\n"
        "الاسم:\n"
        "أحمد\n"
        "محمد محمود علي\n"
        "العنوان:\n"
        "١٥ شارع النصر، المعادي، القاهرة\n"
        "الرقم القومي:\n"
        "29810150101235"
    )

    expected_parsed_data = {
        "name": "أحمد محمد محمود علي",
        "national_id": "29810150101235",
        "address": "١٥ شارع النصر، المعادي، القاهرة",
    }

    mock_ocr_resp = MagicMock()
    mock_ocr_resp.content = mock_raw_transcription

    mock_parser_resp = MagicMock()
    mock_parser_resp.content = json.dumps(expected_parsed_data)

    with patch("app.services.ocr.extractor.get_ocr_llm") as mock_get_ocr, \
         patch("app.services.ocr.extractor.get_parser_llm") as mock_get_parser:

        mock_ocr_llm = MagicMock()
        mock_ocr_llm.invoke.return_value = mock_ocr_resp
        mock_get_ocr.return_value = mock_ocr_llm

        mock_parser_llm = MagicMock()
        mock_parser_llm.invoke.return_value = mock_parser_resp
        mock_get_parser.return_value = mock_parser_llm

        # 1. Test Stage 1: extract_raw_text
        raw_text = extract_raw_text(id_front_path, DocumentType.NATIONAL_ID_FRONT)
        assert raw_text == mock_raw_transcription
        mock_ocr_llm.invoke.assert_called_once()
        invoked_msg = mock_ocr_llm.invoke.call_args[0][0][0]
        assert invoked_msg.content[0]["text"] == get_ocr_prompt(DocumentType.NATIONAL_ID_FRONT)
        assert invoked_msg.content[1]["image_url"].startswith("data:image/png;base64,")

        # 2. Test Stage 2: parse_document_text
        parsed_fields = parse_document_text(raw_text, DocumentType.NATIONAL_ID_FRONT)
        assert parsed_fields == expected_parsed_data
        mock_parser_llm.invoke.assert_called_once()
        parser_prompt_content = mock_parser_llm.invoke.call_args[0][0][0].content
        assert get_parser_prompt(DocumentType.NATIONAL_ID_FRONT) in parser_prompt_content
        assert raw_text in parser_prompt_content

        # 3. Test Full Pipeline: extract_document_fields
        result = extract_document_fields(id_front_path, DocumentType.NATIONAL_ID_FRONT)
        assert result == expected_parsed_data


def test_two_line_name_repetition_integration():
    """Verify Stage 2 correctly preserves duplicate father/son names across lines."""
    raw_ocr = (
        "جمهورية مصر العربية\n"
        "بطاقة تحقيق شخصية\n"
        "محمد\n"
        "محمد أحمد حسنين\n"
        "الرقم القومي:\n"
        "29805141234567"
    )

    mock_parser_resp = MagicMock()
    mock_parser_resp.content = json.dumps({
        "name": "محمد محمد أحمد حسنين",
        "national_id": "29805141234567",
        "address": None,
    })

    with patch("app.services.ocr.extractor.get_parser_llm") as mock_get_parser:
        mock_parser_llm = MagicMock()
        mock_parser_llm.invoke.return_value = mock_parser_resp
        mock_get_parser.return_value = mock_parser_llm

        parsed = parse_document_text(raw_ocr, DocumentType.NATIONAL_ID_FRONT)
        assert parsed["name"] == "محمد محمد أحمد حسنين"
        assert parsed["national_id"] == "29805141234567"


def test_graceful_handling_empty_ocr():
    """Verify empty or whitespace OCR transcription gracefully returns empty dict."""
    with patch("app.services.ocr.extractor.get_parser_llm") as mock_get_parser:
        mock_parser_llm = MagicMock()
        mock_get_parser.return_value = mock_parser_llm

        assert parse_document_text("", DocumentType.NATIONAL_ID_FRONT) == {}
        assert parse_document_text("   \n\t  ", DocumentType.NATIONAL_ID_FRONT) == {}
        mock_parser_llm.invoke.assert_not_called()
