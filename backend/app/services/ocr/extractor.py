import base64
import json
import logging
from pathlib import Path
from typing import Any, Dict, Optional
from uuid import UUID

from langchain_core.messages import HumanMessage
from langchain_ollama import ChatOllama
from sqlalchemy.orm import Session

from app.config import settings
from app.database import SessionLocal
from app.models.document import Document
from app.models.enums import DocumentType
from app.services.ocr.prompts import get_prompt

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


def extract_document_fields(image_path: str, document_type: DocumentType) -> Dict[str, Any]:
    """Extract fields from a document image using ChatOllama vision model."""
    prompt = get_prompt(document_type)
    if not prompt:
        logger.warning("No OCR prompt found for document type %s", document_type)
        return {}

    path = Path(image_path)
    if not path.is_file():
        logger.warning("Image file does not exist: %s", image_path)
        return {}

    try:
        image_bytes = path.read_bytes()
        b64_image = base64.b64encode(image_bytes).decode("utf-8")
    except Exception as e:
        logger.error("Error reading image file %s: %s", image_path, e)
        return {}

    try:
        llm = ChatOllama(
            base_url=settings.OLLAMA_BASE_URL,
            model=settings.OLLAMA_MODEL,
        )
        message = HumanMessage(
            content=[
                {"type": "text", "text": prompt},
                {
                    "type": "image_url",
                    "image_url": f"data:image/jpeg;base64,{b64_image}",
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

        return _parse_llm_json(content_str)
    except Exception as e:
        logger.error("OCR extraction failed for %s (%s): %s", image_path, document_type, e)
        return {}


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

        db.commit()
    except Exception as e:
        db.rollback()
        logger.error("Failed to process documents for request %s: %s", request_id, e)
        raise
    finally:
        if should_close:
            db.close()
