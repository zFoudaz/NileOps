from app.services.request_types.account_opening import (
    AccountOpeningHandler,
    OCR_DOCUMENTS,
    REQUIRED_DOCUMENTS,
    get_required_documents,
)
from app.services.request_types.base import RequestTypeHandler
from app.services.request_types.registry import (
    get_handler,
    list_handlers,
    register_handler,
)

__all__ = [
    "AccountOpeningHandler",
    "OCR_DOCUMENTS",
    "REQUIRED_DOCUMENTS",
    "RequestTypeHandler",
    "get_handler",
    "get_required_documents",
    "list_handlers",
    "register_handler",
]
