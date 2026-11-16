import pytest
from unittest.mock import patch, MagicMock
from langchain_ollama import ChatOllama

from app.config import settings
from app.services.llm.factory import (
    create_chat_model,
    get_llm,
    get_ocr_llm,
    get_parser_llm,
)


def test_create_chat_model_ollama_default():
    """Verify create_chat_model returns ChatOllama with default base_url and specified model."""
    llm = create_chat_model("ollama", "qwen3.5:4b")
    assert isinstance(llm, ChatOllama)
    assert llm.model == "qwen3.5:4b"
    assert llm.base_url == settings.OLLAMA_BASE_URL


def test_create_chat_model_ollama_custom_kwargs():
    """Verify kwargs like base_url and temperature are forwarded."""
    custom_url = "http://remote-ollama:11434"
    llm = create_chat_model("ollama", "custom-model", base_url=custom_url, temperature=0.2)
    assert isinstance(llm, ChatOllama)
    assert llm.model == "custom-model"
    assert llm.base_url == custom_url
    assert llm.temperature == 0.2


def test_get_llm_alias():
    """Verify get_llm acts as an alias to create_chat_model."""
    llm = get_llm("ollama", "qwen3.5:4b")
    assert isinstance(llm, ChatOllama)
    assert llm.model == "qwen3.5:4b"


def test_get_ocr_llm_uses_settings():
    """Verify get_ocr_llm uses OCR_PROVIDER and OCR_MODEL from settings."""
    with patch("app.services.llm.factory.settings") as mock_settings:
        mock_settings.OCR_PROVIDER = "ollama"
        mock_settings.OCR_MODEL = "ocr-vision-model"
        mock_settings.OLLAMA_BASE_URL = "http://localhost:11434"

        llm = get_ocr_llm()
        assert isinstance(llm, ChatOllama)
        assert llm.model == "ocr-vision-model"


def test_get_parser_llm_uses_settings():
    """Verify get_parser_llm uses PARSER_PROVIDER and PARSER_MODEL from settings."""
    with patch("app.services.llm.factory.settings") as mock_settings:
        mock_settings.PARSER_PROVIDER = "ollama"
        mock_settings.PARSER_MODEL = "parser-text-model"
        mock_settings.OLLAMA_BASE_URL = "http://localhost:11434"

        llm = get_parser_llm()
        assert isinstance(llm, ChatOllama)
        assert llm.model == "parser-text-model"


def test_unsupported_provider_raises_value_error():
    """Verify passing an unsupported provider raises ValueError."""
    with pytest.raises(ValueError, match="Unsupported LLM provider: unknown"):
        create_chat_model("unknown", "some-model")


def test_openai_provider_mocked():
    """Verify openai provider instantiates ChatOpenAI dynamically."""
    mock_chat_openai_cls = MagicMock()
    with patch.dict("sys.modules", {"langchain_openai": MagicMock(ChatOpenAI=mock_chat_openai_cls)}):
        llm = create_chat_model("openai", "gpt-4o", api_key="sk-test", temperature=0.1)
        mock_chat_openai_cls.assert_called_once_with(model="gpt-4o", api_key="sk-test", temperature=0.1)
        assert llm == mock_chat_openai_cls.return_value
