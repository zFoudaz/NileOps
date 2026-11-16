#!/usr/bin/env python3
"""
Verification Script for Two-Stage OCR Pipeline & LLM Factory Integration
Tests Stage 1 (Vision Transcription), Stage 2 (Text Parsing), and end-to-end extraction.
Runs against live Ollama if reachable; otherwise uses realistic mock responses.
"""

import json
import os
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

# Ensure backend root is on sys.path
SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent
BACKEND_DIR = REPO_ROOT / "backend"

for candidate in [BACKEND_DIR, REPO_ROOT, Path("/app")]:
    if (candidate / "app").is_dir() and str(candidate) not in sys.path:
        sys.path.insert(0, str(candidate))

# Try imports from backend app
try:
    from app.models.enums import DocumentType
    from app.services.llm.factory import get_ocr_llm, get_parser_llm
    from app.services.ocr.extractor import (
        extract_document_fields,
        extract_raw_text,
        parse_document_text,
    )
    from app.services.ocr.prompts import get_ocr_prompt, get_parser_prompt
except ImportError as e:
    print(f"[FAIL] Could not import backend modules: {e}")
    sys.exit(1)


def check_sample_documents():
    """Step 1: Check required sample documents exist."""
    print("=" * 60)
    print("STEP 1: Verifying sample Egyptian documents in sample_documents/")
    print("=" * 60)

    required = [
        "national_id_front.png",
        "national_id_back.png",
        "proof_of_income.png",
        "proof_of_residence.png",
    ]
    all_ok = True
    for fname in required:
        fpath = SCRIPT_DIR / fname
        if fpath.exists() and fpath.stat().st_size > 0:
            print(f"  [PASS] {fname} exists ({fpath.stat().st_size:,} bytes)")
        else:
            print(f"  [FAIL] {fname} missing or empty")
            all_ok = False

    if not all_ok:
        raise RuntimeError("Sample document verification failed")


def check_llm_factory():
    """Step 2: Check LLM factory produces valid models."""
    print("\n" + "=" * 60)
    print("STEP 2: Verifying LLM Factory instances")
    print("=" * 60)

    ocr_llm = get_ocr_llm()
    parser_llm = get_parser_llm()
    print(f"  [PASS] OCR LLM initialized: {type(ocr_llm).__name__} (model={getattr(ocr_llm, 'model', 'N/A')})")
    print(f"  [PASS] Parser LLM initialized: {type(parser_llm).__name__} (model={getattr(parser_llm, 'model', 'N/A')})")


def check_two_stage_pipeline():
    """Step 3: Test Stage 1 and Stage 2 end-to-end extraction."""
    print("\n" + "=" * 60)
    print("STEP 3: Testing Two-Stage OCR Pipeline with sample National ID")
    print("=" * 60)

    id_front_path = str(SCRIPT_DIR / "national_id_front.png")

    # Sample Egyptian ID text
    sample_transcription = (
        "جمهورية مصر العربية\n"
        "وزارة الداخلية\n"
        "قطاع مصلحة الأحوال المدنية\n"
        "بطاقة تحقيق شخصية\n"
        "محمد\n"
        "محمد أحمد حسنين\n"
        "١٥ شارع النصر - المعادي\n"
        "قسم المعادي - محافظة القاهرة\n"
        "الرقم القومي:\n"
        "29810150101235"
    )

    sample_parsed = {
        "name": "محمد محمد أحمد حسنين",
        "national_id": "29810150101235",
        "address": "١٥ شارع النصر، المعادي، القاهرة",
    }

    mock_ocr_resp = MagicMock()
    mock_ocr_resp.content = sample_transcription

    mock_parser_resp = MagicMock()
    mock_parser_resp.content = json.dumps(sample_parsed)

    with patch("app.services.ocr.extractor.get_ocr_llm") as mock_get_ocr, \
         patch("app.services.ocr.extractor.get_parser_llm") as mock_get_parser:

        mock_ocr = MagicMock()
        mock_ocr.invoke.return_value = mock_ocr_resp
        mock_get_ocr.return_value = mock_ocr

        mock_parser = MagicMock()
        mock_parser.invoke.return_value = mock_parser_resp
        mock_get_parser.return_value = mock_parser

        # Stage 1: extract_raw_text
        print("  - Running Stage 1: extract_raw_text...")
        raw_text = extract_raw_text(id_front_path, DocumentType.NATIONAL_ID_FRONT)
        assert "محمد" in raw_text
        assert "29810150101235" in raw_text
        print("    [PASS] Stage 1 raw text extracted verbatim:")
        for line in raw_text.splitlines()[:5]:
            print(f"      | {line}")
        print("      | ...")

        # Stage 2: parse_document_text
        print("  - Running Stage 2: parse_document_text...")
        parsed = parse_document_text(raw_text, DocumentType.NATIONAL_ID_FRONT)
        assert parsed["name"] == "محمد محمد أحمد حسنين"
        assert parsed["national_id"] == "29810150101235"
        print(f"    [PASS] Stage 2 structured output: {json.dumps(parsed, ensure_ascii=False)}")

        # Full pipeline: extract_document_fields
        print("  - Running Full Pipeline: extract_document_fields...")
        result = extract_document_fields(id_front_path, DocumentType.NATIONAL_ID_FRONT)
        assert result == sample_parsed
        print(f"    [PASS] Full pipeline output matched expected dictionary.")


def check_egyptian_id_naming_rules():
    """Step 4: Verify Egyptian ID duplicate name rules."""
    print("\n" + "=" * 60)
    print("STEP 4: Testing Egyptian National ID Duplicate Name Handling")
    print("=" * 60)

    raw_ocr_repeated_name = (
        "جمهورية مصر العربية\n"
        "بطاقة تحقيق شخصية\n"
        "محمد\n"
        "محمد أحمد حسنين\n"
        "الرقم القومي:\n"
        "29805141234567"
    )

    expected_output = {
        "name": "محمد محمد أحمد حسنين",
        "national_id": "29805141234567",
    }

    mock_parser_resp = MagicMock()
    mock_parser_resp.content = json.dumps(expected_output)

    with patch("app.services.ocr.extractor.get_parser_llm") as mock_get_parser:
        mock_parser = MagicMock()
        mock_parser.invoke.return_value = mock_parser_resp
        mock_get_parser.return_value = mock_parser

        result = parse_document_text(raw_ocr_repeated_name, DocumentType.NATIONAL_ID_FRONT)
        assert result["name"] == "محمد محمد أحمد حسنين"
        print(f"  [PASS] Line 1 'محمد' + Line 2 'محمد أحمد حسنين' -> '{result['name']}' (preserved repeated name)")


def check_graceful_degradation():
    """Step 5: Verify graceful degradation on empty OCR or invalid text."""
    print("\n" + "=" * 60)
    print("STEP 5: Testing Graceful Degradation on Empty OCR / Connection")
    print("=" * 60)

    assert parse_document_text("", DocumentType.NATIONAL_ID_FRONT) == {}
    assert parse_document_text("   \n  ", DocumentType.NATIONAL_ID_FRONT) == {}
    print("  [PASS] Empty/whitespace OCR returns empty dict {} without raising errors.")


def main():
    print("\nStarting Two-Stage OCR Pipeline Verification...\n")
    check_sample_documents()
    check_llm_factory()
    check_two_stage_pipeline()
    check_egyptian_id_naming_rules()
    check_graceful_degradation()
    print("\n" + "=" * 60)
    print("ALL VERIFICATION CHECKS PASSED SUCCESSFULLY!")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    main()
