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
        base_url = kwargs.pop("base_url", settings.OLLAMA_BASE_URL)
        return ChatOllama(base_url=base_url, model=model_name, **kwargs)
    elif provider_clean == "openai":
        try:
            from langchain_openai import ChatOpenAI
        except ImportError as exc:
            raise ImportError(
                "OpenAI provider requested but `langchain-openai` is not installed. "
                "Install it using `pip install langchain-openai`."
            ) from exc
        return ChatOpenAI(model=model_name, **kwargs)
    else:
        raise ValueError(f"Unsupported LLM provider: {provider}")


get_llm = create_chat_model


def get_ocr_llm(**kwargs: Any) -> BaseChatModel:
    """Instantiate the chat model configured for OCR processing."""
    return create_chat_model(settings.OCR_PROVIDER, settings.OCR_MODEL, **kwargs)


def get_parser_llm(**kwargs: Any) -> BaseChatModel:
    """Instantiate the chat model configured for document parsing."""
    return create_chat_model(settings.PARSER_PROVIDER, settings.PARSER_MODEL, **kwargs)
