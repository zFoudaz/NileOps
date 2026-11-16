import logging
from typing import Any
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_ollama import ChatOllama

from app.config import settings

logger = logging.getLogger(__name__)


def create_chat_model(provider: str, model_name: str, **kwargs: Any) -> BaseChatModel:
    """
    Factory function to instantiate a LangChain BaseChatModel based on provider and model_name.

    Supported providers:
      - 'ollama': Uses ChatOllama with configured base_url.
      - 'openai': Dynamically loads ChatOpenAI from langchain_openai.
    """
    provider_clean = (provider or "").strip().lower()

    if provider_clean == "ollama":
        base_url = kwargs.pop("base_url", None) or settings.OLLAMA_BASE_URL
        return ChatOllama(base_url=base_url, model=model_name, **kwargs)
    elif provider_clean == "openai":
        try:
            from langchain_openai import ChatOpenAI
        except ImportError as exc:
            raise ImportError(
                "OpenAI provider requested but `langchain-openai` is not installed. "
                "Install it using `pip install langchain-openai`."
            ) from exc
        api_key = kwargs.pop("api_key", None) or getattr(settings, "OPENAI_API_KEY", None) or None
        base_url = kwargs.pop("base_url", None) or getattr(settings, "OPENAI_BASE_URL", None) or None

        init_kwargs = dict(kwargs)
        if api_key and isinstance(api_key, str) and api_key.strip():
            init_kwargs["api_key"] = api_key
        if base_url and isinstance(base_url, str) and base_url.strip():
            init_kwargs["base_url"] = base_url

        return ChatOpenAI(model=model_name, **init_kwargs)
    else:
        raise ValueError(f"Unsupported LLM provider: {provider}")


get_llm = create_chat_model


def get_ocr_llm(**kwargs: Any) -> BaseChatModel:
    """Instantiate the chat model configured for OCR processing."""
    base_url = kwargs.pop("base_url", None) or getattr(settings, "OCR_BASE_URL", None)
    if base_url and isinstance(base_url, str):
        kwargs["base_url"] = base_url
    return create_chat_model(settings.OCR_PROVIDER, settings.OCR_MODEL, **kwargs)


def get_parser_llm(**kwargs: Any) -> BaseChatModel:
    """Instantiate the chat model configured for document parsing."""
    base_url = kwargs.pop("base_url", None) or getattr(settings, "PARSER_BASE_URL", None)
    if base_url and isinstance(base_url, str):
        kwargs["base_url"] = base_url
    return create_chat_model(settings.PARSER_PROVIDER, settings.PARSER_MODEL, **kwargs)
