import base64
import json
import logging
import mimetypes
from pathlib import Path
from typing import Any, Dict, Optional, Union
from uuid import UUID

from langchain_core.messages import HumanMessage
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.document import Document
from app.models.enums import DocumentType, RequestStatus
from app.models.request import Request
from app.services.llm.factory import get_ocr_llm, get_parser_llm
from app.services.ocr.prompts import get_ocr_prompt, get_parser_prompt
from app.services.validation.business_rules import compute_auto_decision
from app.services.validation.cross_validator import validate_request

logger = logging.getLogger(__name__)


def _parse_llm_json(raw_text: str) -> Dict[str, Any]:
    """Parse JSON from model response, stripping markdown code fences if present."""
    if not raw_text or not raw_text.strip():
        return {}

    text = raw_text.strip()

    # Strip markdown code blocks if wrapped, e.g. ```json ... ``` or ``` ... ```
    if text.startswith("```"):
        lines = text.splitlines()
        # Remove opening fence
        if lines:
            lines = lines[1:]
        # Remove closing fence if present
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        text = "\n".join(lines).strip()

    # Try direct parse
    try:
        parsed = json.loads(text)
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        pass

    # Fallback: extract outermost JSON object { ... }
    first_brace = text.find("{")
    last_brace = text.rfind("}")
    if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
        candidate = text[first_brace : last_brace + 1]
        try:
            parsed = json.loads(candidate)
            if isinstance(parsed, dict):
                return parsed
        except json.JSONDecodeError:
            pass

    logger.warning("Failed to parse OCR response as JSON: %s", raw_text)
    return {}


def extract_raw_text(image_path: str, document_type: Union[DocumentType, str]) -> str:
    """Stage 1: Transcribe raw text verbatim from a document image using Vision LLM."""
    path = Path(image_path)
    if not path.is_file():
        logger.error("Image file does not exist: %s", image_path)
        raise FileNotFoundError(f"Image file does not exist: {image_path}")

    prompt = get_ocr_prompt(document_type)
    if not prompt:
        logger.warning("No OCR prompt found for document type %s", document_type)
        return ""

    image_bytes = path.read_bytes()
    b64_image = base64.b64encode(image_bytes).decode("utf-8")
    mime_type = mimetypes.guess_type(image_path)[0] or "image/jpeg"

    llm = get_ocr_llm()
    message = HumanMessage(
        content=[
            {"type": "text", "text": prompt},
            {
                "type": "image_url",
                "image_url": f"data:{mime_type};base64,{b64_image}",
            },
        ]
    )
    response = llm.invoke([message])
    content = response.content
    if isinstance(content, list):
        content_str = "".join(
            part if isinstance(part, str) else part.get("text", "")
            for part in content
        )
    else:
        content_str = str(content)

    return content_str


def parse_document_text(raw_text: str, document_type: Union[DocumentType, str]) -> Dict[str, Any]:
    """Stage 2: Parse raw transcribed text into structured JSON using Text LLM."""
    if not raw_text or not raw_text.strip():
        return {}

    prompt = get_parser_prompt(document_type)
    if not prompt:
        logger.warning("No parser prompt found for document type %s", document_type)
        return {}

    llm = get_parser_llm()
    user_prompt = f"{prompt}\n\nDocument Text:\n\"\"\"\n{raw_text}\n\"\"\""
    message = HumanMessage(content=user_prompt)
    response = llm.invoke([message])
    content = response.content
    if isinstance(content, list):
        content_str = "".join(
            part if isinstance(part, str) else part.get("text", "")
            for part in content
        )
    else:
        content_str = str(content)

    return _parse_llm_json(content_str)


def extract_document_fields(image_path: str, document_type: Union[DocumentType, str]) -> Dict[str, Any]:
    """Extract fields from a document image via two-stage OCR pipeline (vision transcription + text parsing)."""
    raw_text = extract_raw_text(image_path, document_type)
    if not raw_text or not raw_text.strip():
        return {}
    return parse_document_text(raw_text, document_type)


def process_request_documents(request_id: UUID, db: Optional[Session] = None) -> None:
    """Background task to extract fields for all pending OCR documents of a request."""
    should_close = False
    if db is None:
        db = SessionLocal()
        should_close = True

    try:
        documents = (
            db.query(Document)
            .filter(
                Document.request_id == request_id,
                Document.ocr_required == True,
                Document.ocr_completed == False,
            )
            .all()
        )

        for doc in documents:
            try:
                extracted = extract_document_fields(doc.file_path, doc.document_type)
                doc.extracted_data = extracted
                doc.ocr_completed = True
            except Exception as e:
                logger.error("Error processing document %s for request %s: %s", doc.id, request_id, e)

        # Cross-validation and auto-decision
        validations = validate_request(request_id, db)
        decision = compute_auto_decision(validations)

        req = db.query(Request).filter(Request.id == request_id).first()
        if req:
            req.auto_decision = decision
            req.status = RequestStatus.PENDING_CORRECTION

        db.commit()
    except Exception as e:
        db.rollback()
        logger.error("Failed to process documents for request %s: %s", request_id, e)
        raise
    finally:
        if should_close:
            db.close()
