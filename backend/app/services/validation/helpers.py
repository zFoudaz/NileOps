from datetime import date, datetime
from typing import Any, Optional

from app.models.document import Document

ARABIC_INDIC_TO_ASCII = str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789")


def normalize_digits(value: str) -> str:
    """Convert Arabic-Indic digits to standard ASCII digits and strip whitespace."""
    return value.strip().translate(ARABIC_INDIC_TO_ASCII)


def parse_date(date_val: Any) -> Optional[date]:
    """Parse date from date, datetime, or various common date string formats."""
    if not date_val:
        return None
    if isinstance(date_val, datetime):
        return date_val.date()
    if isinstance(date_val, date):
        return date_val
    if isinstance(date_val, str):
        date_str = normalize_digits(date_val)
        formats = [
            "%Y-%m-%d",
            "%d/%m/%Y",
            "%Y/%m/%d",
            "%d-%m-%Y",
            "%m/%d/%Y",
            "%d.%m.%Y",
            "%Y.%m.%d",
        ]
        for fmt in formats:
            try:
                return datetime.strptime(date_str, fmt).date()
            except ValueError:
                continue
        try:
            return date.fromisoformat(date_str)
        except ValueError:
            pass
    return None


def compute_age(birth_date: date, as_of: Optional[date] = None) -> int:
    """Compute age in full years between birth_date and as_of date."""
    if as_of is None:
        as_of = date.today()
    return as_of.year - birth_date.year - ((as_of.month, as_of.day) < (birth_date.month, birth_date.day))


def get_doc_data(doc: Optional[Document]) -> dict[str, Any]:
    """Get corrected data if present, otherwise extracted data from a document."""
    if not doc:
        return {}
    if doc.corrected_data is not None:
        return doc.corrected_data
    if doc.extracted_data is not None:
        return doc.extracted_data
    return {}


def index_documents_by_type(documents: list[Document]) -> dict[str, Document]:
    """Index a list of documents by their normalized lowercase document_type."""
    docs_by_type: dict[str, Document] = {}
    for d in documents:
        dtype = d.document_type.value if hasattr(d.document_type, "value") else str(d.document_type)
        docs_by_type[dtype.lower()] = d
    return docs_by_type
