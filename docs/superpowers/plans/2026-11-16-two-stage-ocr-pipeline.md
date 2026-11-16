# Two-Stage OCR Pipeline & Modular LLM Provider Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Decouple document processing into a modular 2-stage pipeline (Stage 1: Vision OCR transcription; Stage 2: Domain-aware text parsing into structured JSON) and isolate LLM provider initialization into an extensible factory.

**Architecture:** 
1. `app.services.llm.factory`: Provider factory returning LangChain `BaseChatModel` instances (supporting Ollama out-of-the-box, extensible to OpenAI, Anthropic, etc.).
2. `app.services.ocr.prompts`: Separated into `OCR_PROMPTS` (transcribe raw text verbatim preserving line breaks) and `PARSER_PROMPTS` (parse raw text into JSON with Egyptian National ID rules, specifically handling two-line split names and repeated father/son names).
3. `app.services.ocr.extractor`: Two-stage orchestrator calling `extract_raw_text` (Vision LLM) then `parse_document_text` (Text LLM), while maintaining backwards-compatible `extract_document_fields` and `process_request_documents`.

**Tech Stack:** Python 3.12, FastAPI, LangChain Core, LangChain Ollama, Pydantic Settings, Pytest.

---

## Global Constraints
- Preserve existing DB schema and API contracts: `Document.extracted_data` remains a JSON dictionary consumed by validation services and frontend.
- Backwards compatibility: Defaults remain Ollama with `qwen3.5:4b` if no explicit separate models are provided in `.env`.
- Arabic text handling: Explicit instructions in parsing prompts to maintain Arabic letters, line breaks, and repeated names without deduplication.

## Review Focus
1. **Egyptian ID Name Duplication**: Applicant name on line 1 is "محمد" and father's name on line 2 starts with "محمد" -> parsed full name must be "محمد محمد أحمد علي" without deduplicating to "محمد أحمد علي".
2. **Provider Swapping**: `OCR_PROVIDER` and `PARSER_PROVIDER` can be configured independently; invalid provider raises clear, descriptive configuration error.
3. **Empty/Garbage OCR Output**: If Stage 1 returns empty or unreadable text, Stage 2 degrades gracefully and returns `{}` without raising uncaught exceptions.
4. **Markdown Code Fence Stripping**: Stage 2 LLM response wrapped in ` ```json ... ``` ` is cleanly parsed.
5. **No Regression on Existing Validation**: Cross-validator and business rules continue to work with the output of the 2-stage pipeline.

---

### Task 1: Decoupled LLM Factory & Configuration

**Files:**
- Create: `backend/app/services/llm/__init__.py`
- Create: `backend/app/services/llm/factory.py`
- Modify: `backend/app/config.py`
- Modify: `docker-compose.yml`
- Test: `backend/tests/test_llm_factory.py`

- [ ] **Step 1: Write failing test for LLM factory**
  - Test `get_llm(provider="ollama", model_name="qwen3.5:4b", base_url="...")` returns `ChatOllama` instance.
  - Test `get_ocr_llm()` and `get_parser_llm()` read configuration defaults.
  - Test unsupported provider raises `ValueError("Unsupported LLM provider: ...")`.

- [ ] **Step 2: Update configuration in `app/config.py`**
  - Add:
    ```python
    OCR_PROVIDER: str = "ollama"
    OCR_MODEL: str = "qwen3.5:4b"
    PARSER_PROVIDER: str = "ollama"
    PARSER_MODEL: str = "qwen3.5:4b"
    ```
  - Update `docker-compose.yml` environment variables.

- [ ] **Step 3: Implement `app/services/llm/factory.py`**
  - Implement `create_chat_model(provider: str, model_name: str, **kwargs) -> BaseChatModel`.
  - Implement helper functions `get_ocr_llm()` and `get_parser_llm()`.
  - Support lazy loading / dynamic provider dispatch (Ollama default; pluggable slots for OpenAI, etc.).

- [ ] **Step 4: Run tests and verify**
  - Run `pytest tests/test_llm_factory.py`.

---

### Task 2: Two-Stage Prompts with Egyptian ID Naming Rules

**Files:**
- Modify: `backend/app/services/ocr/prompts.py`
- Test: `backend/tests/test_ocr_prompts.py`

- [ ] **Step 1: Write tests for separate OCR and Parser prompts**
  - Test that every OCR document type has an `OCR_TRANSCRIPTION_PROMPT`.
  - Test that every OCR document type has a `PARSER_PROMPT`.
  - Test that `NATIONAL_ID_FRONT` parser prompt contains explicit instructions for:
    - Egyptian National ID name split across two lines.
    - Handling repeated father/son names (e.g. "محمد محمد") without deduplication.
    - 14-digit National ID extraction.

- [ ] **Step 2: Update `backend/app/services/ocr/prompts.py`**
  - Define `OCR_PROMPTS`: Instructs vision model to transcribe text verbatim preserving line breaks and layout.
  - Define `PARSER_PROMPTS`: Instructs text LLM to extract target schema as JSON, embedding Egyptian ID domain knowledge:
    ```text
    In Egyptian National IDs (بطاقة الرقم القومي المصرية):
    - The person's full name is printed across TWO lines: Line 1 has the first name(s), and Line 2 has the father, grandfather, and family name.
    - Concatenate both lines in order to form the complete full name.
    - CRITICAL: If the person shares the same name as their father (e.g., 'محمد' on line 1 and 'محمد أحمد علي' on line 2), keep BOTH names ('محمد محمد أحمد علي'). Never omit or deduplicate repeated names.
    ```
  - Provide `get_ocr_prompt(doc_type)` and `get_parser_prompt(doc_type)`.

- [ ] **Step 3: Run tests and verify**
  - Run `pytest tests/test_ocr_prompts.py`.

---

### Task 3: Two-Stage Extractor Pipeline Implementation

**Files:**
- Modify: `backend/app/services/ocr/extractor.py`
- Modify: `backend/tests/test_ocr_service.py`

- [ ] **Step 1: Write tests for two-stage execution in `test_ocr_service.py`**
  - Test `extract_raw_text`: verifies vision LLM is called with image base64 and transcription prompt.
  - Test `parse_document_text`: verifies text LLM is called with transcribed text and parser prompt.
  - Test two-line name parsing with repeated name:
    - Input raw text: `"محمد\nمحمد أحمد حسنين\nبطاقة تحقيق الشخصية\n29805141234567"`
    - Expected output JSON: `{"name": "محمد محمد أحمد حسنين", "national_id": "29805141234567", ...}`
  - Test graceful fallback when `extract_raw_text` returns empty string.

- [ ] **Step 2: Implement two-stage pipeline in `app/services/ocr/extractor.py`**
  - Refactor `extractor.py` to use `get_ocr_llm()` for Stage 1 and `get_parser_llm()` for Stage 2.
  - Implement `extract_raw_text(image_path: str, document_type: DocumentType) -> str`.
  - Implement `parse_document_text(raw_text: str, document_type: DocumentType) -> Dict[str, Any]`.
  - Update `extract_document_fields` to chain Stage 1 -> Stage 2.
  - Ensure `process_request_documents` remains intact and functioning with database transactions.

- [ ] **Step 3: Run full backend test suite**
  - Run `docker compose exec backend pytest` to confirm all 78+ tests pass with zero regressions.

---

### Task 4: Integration Verification & Container Update

**Files:**
- Modify: `docker-compose.yml` (environment variables for OCR & Parser models)
- Rebuild & test in Docker environment

- [ ] **Step 1: Verify end-to-end processing with sample documents**
  - Run synthetic test script or test case with sample Egyptian ID (`national_id_front.png`).
- [ ] **Step 2: Rebuild backend container**
  - Run `docker compose up -d --build backend`.
- [ ] **Step 3: Commit and push changes to master**
