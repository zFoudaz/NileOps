from typing import Dict, List, Union

from app.models.enums import RequestType
from app.services.request_types.account_opening import AccountOpeningHandler
from app.services.request_types.base import RequestTypeHandler

_REGISTRY: Dict[str, RequestTypeHandler] = {}


def _normalize_key(request_type: Union[RequestType, str]) -> str:
    if hasattr(request_type, "value"):
        return str(request_type.value).strip().lower()
    return str(request_type).strip().lower()


def register_handler(handler: RequestTypeHandler) -> None:
    """Register a RequestTypeHandler by its request_type."""
    key = _normalize_key(handler.request_type)
    _REGISTRY[key] = handler


def get_handler(request_type: Union[RequestType, str]) -> RequestTypeHandler:
    """Look up the registered handler for a given request_type."""
    key = _normalize_key(request_type)
    handler = _REGISTRY.get(key)
    if handler is None:
        raise ValueError(f"Unsupported request type: {request_type}")
    return handler


def list_handlers() -> List[RequestTypeHandler]:
    """Return all registered request type handlers."""
    return list(_REGISTRY.values())


# Register built-in request types
register_handler(AccountOpeningHandler())
