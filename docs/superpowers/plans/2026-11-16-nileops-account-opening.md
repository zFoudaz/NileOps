# NileOps Account Opening — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a banking request processing system — Phase 1: Account Opening with OCR extraction, cross-validation, and employee review.

**Architecture:** FastAPI backend with modular request-type services, LangChain-abstracted OCR via Ollama (Qwen vision model), PostgreSQL for persistence, React (Vite) frontend with role-based views for customers and employees.

**Tech Stack:** Python 3.11+, FastAPI, SQLAlchemy 2.0, Alembic, LangChain, Ollama, PostgreSQL, React 18, Vite, Tailwind CSS, shadcn/ui, React Router

**Spec:** `docs/superpowers/specs/2026-11-16-nileops-account-opening-design.md`

## Global Constraints

- Python 3.11+ required
- All API responses follow a consistent JSON envelope
- UUIDs for all primary keys
- Arabic text support throughout (database, OCR, frontend)
- Role-based access: `customer` and `employee`
- Customers self-register; employees are seeded
- OCR runs asynchronously (FastAPI background tasks)
- Expiry date is never customer-editable

## Review Focus

1. **National ID with leading-zero century digit (e.g., someone born in 2000s with century=3)** — age calculation must handle both century codes correctly; a wrong century flips the age by 100 years and breaks every account-type gate.
2. **Concurrent OCR processing on multiple documents** — if two background tasks write to the same request's status simultaneously, the final status may be wrong; expect the system to handle completion atomically.
3. **Uploaded file that is not an image (PDF, corrupt file, text file)** — the OCR service receives it and the model may fail silently or hallucinate fields; the user expects a clear error.
4. **Employee verifying a request that another employee is also viewing** — no locking is specified; the second approval/rejection should not overwrite the first without warning.
5. **National ID number that is exactly 14 digits but has an invalid governorate code or impossible date** — the decoder should reject it rather than produce silently wrong DOB/gender.

---

## File Structure

### Backend

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                         # FastAPI app, CORS, lifespan
│   ├── config.py                       # Pydantic Settings
│   ├── database.py                     # Engine, SessionLocal, Base
│   ├── models/
│   │   ├── __init__.py
│   │   ├── user.py                     # User model
│   │   ├── request.py                  # Request model
│   │   ├── document.py                 # Document model
│   │   └── validation_result.py        # ValidationResult model
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── user.py                     # User Pydantic schemas
│   │   ├── request.py                  # Request schemas
│   │   ├── document.py                 # Document schemas
│   │   └── validation_result.py        # Validation schemas
│   ├── api/
│   │   ├── __init__.py
│   │   ├── deps.py                     # get_db, get_current_user, require_role
│   │   └── routes/
│   │       ├── __init__.py
│   │       ├── auth.py                 # Register, login, me
│   │       ├── requests.py             # Customer request CRUD
│   │       ├── documents.py            # Upload, process OCR
│   │       └── employee.py             # Employee list, review, verify
│   ├── services/
│   │   ├── __init__.py
│   │   ├── ocr/
│   │   │   ├── __init__.py
│   │   │   ├── extractor.py            # LangChain + Ollama OCR
│   │   │   └── prompts.py              # Prompt templates per doc type
│   │   ├── validation/
│   │   │   ├── __init__.py
│   │   │   ├── national_id_decoder.py  # 14-digit ID parser
│   │   │   ├── cross_validator.py      # Cross-document checks
│   │   │   └── business_rules.py       # Age, expiry, auto-decision
│   │   └── request_types/
│   │       ├── __init__.py
│   │       └── account_opening.py      # Account opening config + orchestrator
│   └── utils/
│       ├── __init__.py
│       └── file_storage.py             # Save/serve uploaded files
├── alembic/
│   ├── env.py
│   └── versions/
├── alembic.ini
├── requirements.txt
├── seed_employee.py                    # CLI script to create employee accounts
├── tests/
│   ├── conftest.py                     # Fixtures: test DB, test client, auth helpers
│   ├── test_auth.py
│   ├── test_requests.py
│   ├── test_documents.py
│   ├── test_national_id_decoder.py
│   ├── test_ocr_service.py
│   ├── test_validation.py
│   └── test_employee.py
└── .env.example
```

### Frontend

```
frontend/
├── src/
│   ├── main.tsx
│   ├── App.tsx                          # Router + AuthProvider
│   ├── lib/
│   │   ├── api.ts                       # Axios instance + interceptors
│   │   └── utils.ts                     # Helpers
│   ├── hooks/
│   │   ├── useAuth.ts                   # Auth context hook
│   │   └── useRequests.ts               # Request data hooks
│   ├── components/
│   │   ├── ui/                          # shadcn/ui components
│   │   ├── layout/
│   │   │   ├── AppLayout.tsx            # Shell with header + sidebar
│   │   │   ├── Header.tsx
│   │   │   └── ProtectedRoute.tsx       # Role guard wrapper
│   │   ├── documents/
│   │   │   ├── FileUpload.tsx           # Drag & drop upload
│   │   │   └── DocumentViewer.tsx       # Image viewer for employee
│   │   └── requests/
│   │       ├── RequestCard.tsx          # Summary card with status badge
│   │       ├── ExtractedDataForm.tsx    # Editable fields from OCR
│   │       └── ValidationBadge.tsx      # Pass/fail indicators
│   ├── pages/
│   │   ├── auth/
│   │   │   ├── LoginPage.tsx
│   │   │   └── RegisterPage.tsx
│   │   ├── customer/
│   │   │   ├── DashboardPage.tsx        # My requests list
│   │   │   ├── NewRequestPage.tsx       # Select type + account type
│   │   │   ├── UploadDocumentsPage.tsx  # Upload per account type
│   │   │   ├── ReviewDataPage.tsx       # OCR results + corrections
│   │   │   └── RequestStatusPage.tsx    # Track single request
│   │   └── employee/
│   │       ├── DashboardPage.tsx        # All requests table
│   │       └── RequestDetailPage.tsx    # Review + verify
│   └── types/
│       └── index.ts                     # TypeScript interfaces
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── index.html
```

---

### Task 1: Backend Scaffolding + Database Models

**Files:**
- Create: `backend/app/__init__.py`, `backend/app/main.py`, `backend/app/config.py`, `backend/app/database.py`
- Create: `backend/app/models/__init__.py`, `backend/app/models/user.py`, `backend/app/models/request.py`, `backend/app/models/document.py`, `backend/app/models/validation_result.py`
- Create: `backend/requirements.txt`, `backend/.env.example`, `backend/alembic.ini`, `backend/alembic/env.py`
- Test: `backend/tests/conftest.py`, `backend/tests/test_models.py`

**Interfaces:**
- Produces: `Base` (declarative base), `get_db()` session dependency, `User`, `Request`, `Document`, `ValidationResult` ORM models, `Settings` config class

- [ ] **Step 1: Create `requirements.txt`**

```
fastapi[standard]==0.115.*
sqlalchemy[asyncio]==2.0.*
alembic==1.13.*
psycopg2-binary==2.9.*
python-jose[cryptography]==3.3.*
passlib[bcrypt]==1.7.*
python-multipart==0.0.*
python-dotenv==1.0.*
langchain==0.3.*
langchain-ollama==0.3.*
pydantic-settings==2.6.*
pytest==8.3.*
httpx==0.27.*
```

- [ ] **Step 2: Create `backend/app/config.py`**

`Settings(BaseSettings)` with fields: `DATABASE_URL`, `SECRET_KEY`, `ALGORITHM="HS256"`, `ACCESS_TOKEN_EXPIRE_MINUTES=1440`, `OLLAMA_BASE_URL="http://localhost:11434"`, `OLLAMA_MODEL="qwen3.5:4b"`, `UPLOAD_DIR="uploads"`. Load from `.env`.

- [ ] **Step 3: Create `backend/app/database.py`**

SQLAlchemy engine from `Settings.DATABASE_URL`, `SessionLocal` factory, `Base = declarative_base()`.

- [ ] **Step 4: Create ORM models**

All four models as specified in the design doc — User, Request, Document, ValidationResult. Use `UUID` PKs, proper `Enum` types for role/status/document_type, `JSONB` for `extracted_data` and `corrected_data`, relationships between models.

Enums:
- `UserRole`: customer, employee
- `RequestStatus`: pending_upload, processing, pending_correction, pending_review, approved, rejected
- `RequestType`: account_opening
- `AccountType`: individual, youth, minor
- `DocumentType`: national_id_front, national_id_back, proof_of_residence, proof_of_income, birth_certificate, guardian_national_id_front, guardian_national_id_back
- `AutoDecision`: auto_approved, auto_rejected (nullable)

- [ ] **Step 5: Create `backend/app/main.py`**

FastAPI app with CORS (allow all origins for dev), include routers (empty for now), lifespan that creates upload dir.

- [ ] **Step 6: Set up Alembic**

`alembic init alembic`, configure `env.py` to import `Base` and all models, use `Settings.DATABASE_URL`.

- [ ] **Step 7: Write model tests**

```python
# tests/conftest.py — SQLite in-memory test DB, TestClient fixture, override get_db
# tests/test_models.py
def test_create_user()         # create customer, assert fields
def test_create_request()      # create request with sub_type, assert status=pending_upload
def test_create_document()     # create document linked to request, assert extracted_data stores JSONB
def test_create_validation()   # create validation_result, assert passed field
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `cd backend && pytest tests/test_models.py -v`
Expected: 4 PASS

- [ ] **Step 9: Generate initial migration and verify**

Run: `cd backend && alembic revision --autogenerate -m "initial models"` then `alembic upgrade head`
Expected: Migration created, tables exist in DB

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: backend scaffolding with database models and migrations"
```

---

### Task 2: Authentication System

**Files:**
- Create: `backend/app/schemas/user.py`, `backend/app/api/__init__.py`, `backend/app/api/deps.py`, `backend/app/api/routes/__init__.py`, `backend/app/api/routes/auth.py`, `backend/seed_employee.py`
- Modify: `backend/app/main.py` (include auth router)
- Test: `backend/tests/test_auth.py`

**Interfaces:**
- Consumes: `User` model, `get_db()`, `Settings`
- Produces: `get_current_user(token) -> User`, `require_role(role) -> Dependency`, `create_access_token(data) -> str`, schemas `UserRegister`, `UserLogin`, `UserResponse`, `Token`

- [ ] **Step 1: Create user schemas in `backend/app/schemas/user.py`**

`UserRegister(name, email, password)`, `UserLogin(email, password)`, `UserResponse(id, name, email, role)`, `Token(access_token, token_type)`

- [ ] **Step 2: Create `backend/app/api/deps.py`**

`get_db()` — yields DB session. `get_current_user(token: str = Depends(oauth2_scheme), db = Depends(get_db)) -> User` — decodes JWT, fetches user. `require_role(role: UserRole)` — returns a dependency that raises 403 if user.role != role.

- [ ] **Step 3: Create `backend/app/api/routes/auth.py`**

- `POST /api/auth/register` — creates customer (role always = customer), hashes password, returns Token
- `POST /api/auth/login` — verifies email + password, returns Token
- `GET /api/auth/me` — returns UserResponse (requires auth)

- [ ] **Step 4: Create `backend/seed_employee.py`**

CLI script: `python seed_employee.py --name "Admin" --email admin@bank.com --password secret` — creates user with role=employee.

- [ ] **Step 5: Write auth tests**

```python
def test_register_customer()              # POST /register → 201, token returned, role=customer
def test_register_duplicate_email()       # POST /register same email → 400
def test_login_success()                  # POST /login → 200, valid token
def test_login_wrong_password()           # POST /login wrong pw → 401
def test_me_authenticated()               # GET /me with token → 200, correct user
def test_me_unauthenticated()             # GET /me no token → 401
def test_require_employee_as_customer()   # Access employee endpoint as customer → 403
```

- [ ] **Step 6: Run tests**

Run: `cd backend && pytest tests/test_auth.py -v`
Expected: 7 PASS

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: JWT auth with customer registration and employee seeding"
```

---

### Task 3: Request & Document Management

**Files:**
- Create: `backend/app/schemas/request.py`, `backend/app/schemas/document.py`, `backend/app/api/routes/requests.py`, `backend/app/api/routes/documents.py`, `backend/app/utils/file_storage.py`, `backend/app/services/request_types/__init__.py`, `backend/app/services/request_types/account_opening.py`
- Modify: `backend/app/main.py` (include routers)
- Test: `backend/tests/test_requests.py`, `backend/tests/test_documents.py`

**Interfaces:**
- Consumes: `Request`, `Document` models, `get_current_user`, `require_role("customer")`
- Produces: `RequestCreate(request_type, sub_type)`, `RequestResponse(id, status, sub_type, documents, ...)`, `REQUIRED_DOCUMENTS: dict[AccountType, list[DocumentType]]` (from account_opening module), `save_upload(file, request_id) -> file_path`

- [ ] **Step 1: Define required documents config in `account_opening.py`**

```python
REQUIRED_DOCUMENTS = {
    AccountType.individual: [
        DocumentType.national_id_front, DocumentType.national_id_back,
        DocumentType.proof_of_residence, DocumentType.proof_of_income,
    ],
    AccountType.youth: [
        DocumentType.national_id_front, DocumentType.national_id_back,
    ],
    AccountType.minor: [
        DocumentType.birth_certificate,
        DocumentType.guardian_national_id_front, DocumentType.guardian_national_id_back,
    ],
}

OCR_DOCUMENTS = {  # documents that need OCR (excludes proof_of_income)
    ...
}
```

- [ ] **Step 2: Create `backend/app/utils/file_storage.py`**

`save_upload(file: UploadFile, request_id: UUID) -> str` — saves to `uploads/{request_id}/{document_type}_{uuid}.{ext}`, returns relative path. Validates file is an image (check content type).

- [ ] **Step 3: Create request schemas and routes**

- `POST /api/requests/` — body: `{request_type, sub_type}`, creates request with status=pending_upload, returns request with its required document list
- `GET /api/requests/` — list current customer's requests
- `GET /api/requests/{id}` — get single request with documents and validation results

- [ ] **Step 4: Create document upload route**

- `POST /api/requests/{id}/documents` — multipart upload, fields: `document_type` + `file`. Validates: request belongs to customer, document_type is in required list for this account type, file is an image. Saves file, creates Document record.

- [ ] **Step 5: Write request tests**

```python
def test_create_request()                  # POST → 201, status=pending_upload
def test_create_request_invalid_type()     # invalid sub_type → 422
def test_list_my_requests()                # GET list → only my requests
def test_get_request_detail()              # GET by id → includes documents list
def test_get_other_customer_request()      # GET another customer's → 404
```

- [ ] **Step 6: Write document upload tests**

```python
def test_upload_document()                 # upload image → 201, file saved
def test_upload_wrong_document_type()      # type not in required list → 400
def test_upload_non_image()                # upload .txt → 400
def test_upload_to_other_request()         # not my request → 404
def test_upload_corrupt_file()             # Review Focus #3: file with image mimetype but corrupt content → 400
```

- [ ] **Step 7: Run tests**

Run: `cd backend && pytest tests/test_requests.py tests/test_documents.py -v`
Expected: 9 PASS

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: request creation, document upload with type validation"
```

---

### Task 4: National ID Decoder

**Files:**
- Create: `backend/app/services/validation/national_id_decoder.py`
- Test: `backend/tests/test_national_id_decoder.py`

**Interfaces:**
- Consumes: nothing
- Produces: `decode_national_id(national_id: str) -> NationalIdInfo` where `NationalIdInfo` has `date_of_birth: date`, `gender: str`, `governorate: str`, `is_valid: bool`, `error: str | None`

- [ ] **Step 1: Write failing tests**

```python
def test_decode_valid_male_1900s():
    # Century=2, known DOB, odd serial → male
    result = decode_national_id("29001011234567")
    assert result.date_of_birth == date(1990, 1, 1)
    assert result.gender == "male"
    assert result.is_valid is True

def test_decode_valid_female_2000s():
    # Century=3, known DOB, even serial → female
    result = decode_national_id("30506152345678")
    assert result.date_of_birth == date(2005, 6, 15)
    assert result.gender == "female"

def test_decode_invalid_length():
    result = decode_national_id("123")
    assert result.is_valid is False

def test_decode_invalid_date():
    # Month=13 is impossible
    result = decode_national_id("29013011234567")
    assert result.is_valid is False

def test_decode_invalid_governorate():
    result = decode_national_id("29001019934567")
    assert result.is_valid is False

def test_decode_extracts_governorate():
    # Governorate code 01 = Cairo
    result = decode_national_id("29001010112345")
    assert result.governorate == "القاهرة"

def test_decode_2000s_century():
    # Review Focus #1: century=3 must produce 2000s date, not 1900s
    result = decode_national_id("30506150112345")
    assert result.date_of_birth.year == 2005  # not 1905

def test_decode_impossible_date_valid_format():
    # Review Focus #5: 14 digits, valid governorate, but Feb 30 → invalid
    result = decode_national_id("29002300112345")
    assert result.is_valid is False
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && pytest tests/test_national_id_decoder.py -v`
Expected: FAIL — module not found

- [ ] **Step 3: Implement `decode_national_id` in `national_id_decoder.py`**

Parse the 14-digit string: extract century (digit 0), DOB (digits 1-6), governorate code (digits 7-8), serial (digits 9-12), check digit (digit 13). Validate date is real, governorate code maps to a known name. Gender from serial's last digit (odd=male, even=female).

Governorate codes map (01=القاهرة, 02=الإسكندرية, 03=بورسعيد, 04=السويس, ...).

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && pytest tests/test_national_id_decoder.py -v`
Expected: 8 PASS

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: Egyptian national ID decoder with DOB, gender, governorate extraction"
```

---

### Task 5: OCR Service

**Files:**
- Create: `backend/app/services/ocr/__init__.py`, `backend/app/services/ocr/extractor.py`, `backend/app/services/ocr/prompts.py`
- Modify: `backend/app/api/routes/documents.py` (add process endpoint)
- Test: `backend/tests/test_ocr_service.py`

**Interfaces:**
- Consumes: `Document` model, `Settings` (OLLAMA_BASE_URL, OLLAMA_MODEL), `DocumentType` enum
- Produces: `extract_document_fields(image_path: str, document_type: DocumentType) -> dict` — returns extracted fields as dict. `process_request_documents(request_id: UUID, db: Session)` — processes all OCR-required documents for a request.

- [ ] **Step 1: Create prompt templates in `prompts.py`**

One prompt per document type. Each instructs the model to extract specific fields as JSON. Example for `national_id_front`:

```python
PROMPTS = {
    DocumentType.national_id_front: """Extract the following fields from this Egyptian National ID card (front side) as JSON:
- name (Arabic full name)
- national_id (14-digit number)
- address (Arabic)

Return ONLY valid JSON: {"name": "...", "national_id": "...", "address": "..."}""",
    DocumentType.national_id_back: """...""",  # expiry_date, job, marital_status
    DocumentType.proof_of_residence: """...""",  # holder_name, address
    DocumentType.birth_certificate: """...""",  # child_name, date_of_birth, father_name, mother_name, father_national_id
    DocumentType.guardian_national_id_front: # same as national_id_front
    DocumentType.guardian_national_id_back: # same as national_id_back
}
```

- [ ] **Step 2: Implement `extractor.py`**

Use `ChatOllama` from `langchain_ollama` with vision support. `extract_document_fields()` loads the image, sends it with the prompt via LangChain's `HumanMessage` with image content, parses the JSON response. `process_request_documents()` iterates documents where `ocr_required=True` and `ocr_completed=False`, calls `extract_document_fields`, stores result in `extracted_data`, marks `ocr_completed=True`.

- [ ] **Step 3: Add process endpoint to documents route**

`POST /api/requests/{id}/process` — validates all required docs are uploaded, launches `process_request_documents` as a FastAPI `BackgroundTask`, sets request status to `processing`, returns 202 Accepted.

- [ ] **Step 4: Write OCR tests (mocked model)**

```python
# Mock the ChatOllama to return known JSON responses
def test_extract_national_id_front()    # mock returns valid JSON → fields parsed correctly
def test_extract_returns_invalid_json() # mock returns garbage → raises/handles gracefully
def test_process_request_documents()    # mock OCR, process 2 docs → both get extracted_data
def test_process_skips_non_ocr_docs()   # proof_of_income → not processed
def test_process_endpoint_returns_202() # POST /process → 202, status becomes processing
```

- [ ] **Step 5: Run tests**

Run: `cd backend && pytest tests/test_ocr_service.py -v`
Expected: 5 PASS

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: OCR service with LangChain + Ollama and async processing"
```

---

### Task 6: Validation & Auto-Decision

**Files:**
- Create: `backend/app/services/validation/__init__.py`, `backend/app/services/validation/cross_validator.py`, `backend/app/services/validation/business_rules.py`
- Modify: `backend/app/services/ocr/extractor.py` (call validation after OCR completes)
- Test: `backend/tests/test_validation.py`

**Interfaces:**
- Consumes: `decode_national_id()`, `Document` model (extracted_data), `Request` model (sub_type), `ValidationResult` model
- Produces: `validate_request(request_id, db) -> list[ValidationResult]`, `compute_auto_decision(validations) -> AutoDecision | None`

- [ ] **Step 1: Write failing tests**

```python
# cross_validator tests
def test_cross_validate_id_expiry_valid()       # future date → passed=True
def test_cross_validate_id_expiry_expired()     # past date → passed=False
def test_cross_validate_age_individual_valid()  # age 25 + individual → passed=True
def test_cross_validate_age_individual_young()  # age 18 + individual → passed=False
def test_cross_validate_age_youth_valid()       # age 17 + youth → passed=True
def test_cross_validate_age_minor_valid()       # age 10 + minor → passed=True
def test_cross_validate_guardian_id_match()     # father_national_id matches guardian's → passed=True
def test_cross_validate_guardian_id_mismatch()  # different IDs → passed=False

# auto-decision tests
def test_auto_approve_all_pass()     # all validations pass → auto_approved
def test_auto_reject_expired_id()    # expiry fails → auto_rejected
def test_auto_reject_wrong_age()     # age fails → auto_rejected
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && pytest tests/test_validation.py -v`
Expected: FAIL

- [ ] **Step 3: Implement `cross_validator.py`**

`validate_request(request_id, db)`:
1. Load request + documents with extracted_data
2. If national_id: decode national_id number → get DOB, gender, governorate. Check expiry date. Check age vs account type.
3. If minor account: compare father_national_id from birth certificate with national_id from guardian's front ID.
4. Store each check as a `ValidationResult` row.
5. Return the list.

- [ ] **Step 4: Implement `business_rules.py`**

`compute_auto_decision(validations: list[ValidationResult]) -> AutoDecision | None`:
- If any validation with `rule_name` in `["id_expiry", "age_check"]` has `passed=False` → `auto_rejected`
- If all validations pass → `auto_approved`
- Otherwise → None

- [ ] **Step 5: Wire validation into OCR completion**

In `process_request_documents()`, after all OCR is done: call `validate_request()`, then `compute_auto_decision()`, update request's `auto_decision` and `status` to `pending_review`.

- [ ] **Step 6: Run tests**

Run: `cd backend && pytest tests/test_validation.py -v`
Expected: 11 PASS

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: cross-validation, age/expiry checks, and auto-decision logic"
```

---

### Task 7: Customer Corrections & Employee Review

**Files:**
- Create: `backend/app/schemas/validation_result.py`, `backend/app/api/routes/employee.py`
- Modify: `backend/app/api/routes/requests.py` (add correction + submit endpoints), `backend/app/schemas/request.py` (add correction schemas), `backend/app/main.py` (include employee router)
- Test: `backend/tests/test_corrections.py`, `backend/tests/test_employee.py`

**Interfaces:**
- Consumes: `get_current_user`, `require_role`, `Request`, `Document`, `ValidationResult` models
- Produces: Customer endpoints for corrections and submission. Employee endpoints for listing, reviewing, and verifying requests.

- [ ] **Step 1: Add correction endpoints to requests route**

- `GET /api/requests/{id}/extracted-data` — returns all documents' extracted_data + corrected_data + validation results. Marks expiry_date as non-editable.
- `PATCH /api/requests/{id}/corrections` — body: `{document_id: UUID, corrected_fields: dict}`. Validates expiry_date not in corrected_fields. Stores in document's `corrected_data`.
- `POST /api/requests/{id}/submit` — sets status to `pending_review`. Validates status is not `processing`.

- [ ] **Step 2: Create employee routes**

- `GET /api/employee/requests` — list all requests with status `pending_review` (filterable by sub_type, status, date range). Paginated.
- `GET /api/employee/requests/{id}` — full detail: extracted_data, corrected_data, validation results, document image URLs, auto_decision.
- `POST /api/employee/requests/{id}/verify` — body: `{decision: "approved"|"rejected", reason?: string}`. Sets status, records `verified_by` and `verified_at`. Returns 409 if already verified.

- [ ] **Step 3: Write correction tests**

```python
def test_get_extracted_data()                  # returns fields with editable flags
def test_submit_correction()                   # PATCH → corrected_data updated
def test_correction_rejects_expiry_date()      # try to correct expiry_date → 400
def test_submit_request_for_review()           # POST /submit → status=pending_review
def test_submit_already_processing()           # submit while processing → 400
```

- [ ] **Step 4: Write employee tests**

```python
def test_employee_list_requests()              # GET → returns pending requests
def test_employee_list_filter_by_type()        # filter by sub_type → correct results
def test_employee_get_request_detail()         # GET detail → includes all data + images
def test_employee_approve_request()            # POST verify approved → status=approved, verified_by set
def test_employee_reject_with_reason()         # POST verify rejected → reason stored
def test_employee_verify_already_verified()    # Review Focus #4: verify again → 409
def test_customer_cannot_access_employee()     # customer hits employee endpoint → 403
```

- [ ] **Step 5: Run tests**

Run: `cd backend && pytest tests/test_corrections.py tests/test_employee.py -v`
Expected: 12 PASS

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: customer corrections and employee review endpoints"
```

---

### Task 8: Frontend Setup + Auth Pages

**Files:**
- Create: all files under `frontend/` — project scaffold, config files, layout components, auth pages, API client, auth context, types
- Test: manual — app runs, register + login work

**Interfaces:**
- Consumes: Backend auth API (`/api/auth/*`)
- Produces: `useAuth()` hook (login, register, logout, user, isAuthenticated, role), `ProtectedRoute` component, `api` Axios instance with JWT interceptor, `AppLayout` with header + role-based sidebar

- [ ] **Step 1: Initialize React project**

Run: `npm create vite@latest frontend -- --template react-ts`, install deps: `tailwindcss`, `@tailwindcss/vite`, `react-router-dom`, `axios`, `lucide-react`. Set up shadcn/ui with `npx shadcn@latest init`.

- [ ] **Step 2: Add shadcn components**

Run: `npx shadcn@latest add button card input label form table badge dialog select tabs toast dropdown-menu separator`

- [ ] **Step 3: Create TypeScript types in `types/index.ts`**

Interfaces for: `User`, `Token`, `BankRequest`, `Document`, `ValidationResult`, `ExtractedData` — matching backend schemas.

- [ ] **Step 4: Create API client in `lib/api.ts`**

Axios instance with `baseURL: "http://localhost:8000/api"`. Request interceptor adds `Authorization: Bearer <token>` from localStorage. Response interceptor handles 401 → redirect to login.

- [ ] **Step 5: Create auth context in `hooks/useAuth.ts`**

React context + provider: `login(email, password)`, `register(name, email, password)`, `logout()`, exposes `user`, `isAuthenticated`, `role`. Stores JWT in localStorage, decodes user info from `/auth/me` on mount.

- [ ] **Step 6: Create layout components**

`AppLayout.tsx` — header with app name + user dropdown (logout), sidebar with navigation links based on role (customer: "طلباتي", "طلب جديد" / employee: "الطلبات"). `ProtectedRoute.tsx` — redirects to login if not authenticated, shows 403 if wrong role.

- [ ] **Step 7: Create Login + Register pages**

`LoginPage.tsx` — email + password form, calls `login()`, redirects to dashboard. `RegisterPage.tsx` — name + email + password form, calls `register()`, redirects to dashboard. Both use shadcn form components, show error toasts.

- [ ] **Step 8: Set up routing in `App.tsx`**

```
/login → LoginPage
/register → RegisterPage
/dashboard → ProtectedRoute(customer) → CustomerDashboard
/requests/new → ProtectedRoute(customer) → NewRequestPage
/requests/:id/upload → ProtectedRoute(customer) → UploadDocumentsPage
/requests/:id/review → ProtectedRoute(customer) → ReviewDataPage
/requests/:id → ProtectedRoute(customer) → RequestStatusPage
/employee → ProtectedRoute(employee) → EmployeeDashboard
/employee/requests/:id → ProtectedRoute(employee) → EmployeeRequestDetail
```

- [ ] **Step 9: Verify manually**

Run backend: `cd backend && uvicorn app.main:app --reload`
Run frontend: `cd frontend && npm run dev`
Test: register a customer, login, see dashboard (empty). Seed employee, login as employee, see employee dashboard (empty).

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: frontend setup with auth, routing, and layout"
```

---

### Task 9: Customer Pages

**Files:**
- Create: `frontend/src/pages/customer/DashboardPage.tsx`, `NewRequestPage.tsx`, `UploadDocumentsPage.tsx`, `ReviewDataPage.tsx`, `RequestStatusPage.tsx`
- Create: `frontend/src/components/documents/FileUpload.tsx`, `frontend/src/components/requests/RequestCard.tsx`, `frontend/src/components/requests/ExtractedDataForm.tsx`, `frontend/src/components/requests/ValidationBadge.tsx`
- Create: `frontend/src/hooks/useRequests.ts`
- Test: manual — full customer flow works end-to-end

**Interfaces:**
- Consumes: Backend request/document APIs, `useAuth()`, `api` client, shadcn components
- Produces: Complete customer-facing UI

- [ ] **Step 1: Create `useRequests` hook**

Custom hook wrapping API calls: `createRequest(type, subType)`, `getMyRequests()`, `getRequest(id)`, `uploadDocument(requestId, docType, file)`, `processDocuments(requestId)`, `getExtractedData(requestId)`, `submitCorrection(requestId, docId, fields)`, `submitForReview(requestId)`.

- [ ] **Step 2: Build DashboardPage**

List of customer's requests as cards. Each `RequestCard` shows: request type, account type (Arabic labels), status badge (color-coded), created date. Click navigates to status page. "طلب جديد" button at top.

- [ ] **Step 3: Build NewRequestPage**

Step 1: Select request type (only "فتح حساب" for now). Step 2: Select account type (أفراد / شباب / قصّر) with Arabic descriptions. On submit → `createRequest()` → redirect to upload page.

- [ ] **Step 4: Build FileUpload component**

Drag-and-drop zone with click-to-browse fallback. Shows preview thumbnail after upload. Accepts images only. Shows upload progress.

- [ ] **Step 5: Build UploadDocumentsPage**

Shows checklist of required documents for the selected account type (Arabic labels). Each item has a `FileUpload` component. Tracks which documents are uploaded. "معالجة المستندات" button enabled when all required docs uploaded → calls `processDocuments()` → shows processing spinner → polls request status → redirects to review page when done.

- [ ] **Step 6: Build ExtractedDataForm component**

Renders extracted fields as labeled text inputs. Receives field definitions with `editable` flag. `expiry_date` shown as read-only. Highlighted border on fields that had validation mismatches. "حفظ التعديلات" button calls `submitCorrection()`.

- [ ] **Step 7: Build ReviewDataPage**

Fetches extracted data for all documents. Groups by document (tabs or sections). Shows `ExtractedDataForm` for each OCR'd document. Shows decoded fields (DOB, gender, governorate from ID number) as read-only info. Shows `ValidationBadge` for each validation rule. Shows auto-decision result. "إرسال للمراجعة" button → `submitForReview()` → redirect to status page.

- [ ] **Step 8: Build RequestStatusPage**

Shows request details: type, account type, status with timeline/stepper visualization, auto-decision, employee decision (if reviewed), rejection reason (if rejected). Shows document images. Links back to review page if status allows corrections.

- [ ] **Step 9: Verify end-to-end**

Full flow: register → new request → select أفراد → upload 4 documents → process → review extracted data → correct a field → submit → see status as pending_review.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: customer pages — request creation, upload, OCR review, and status tracking"
```

---

### Task 10: Employee Dashboard

**Files:**
- Create: `frontend/src/pages/employee/DashboardPage.tsx`, `frontend/src/pages/employee/RequestDetailPage.tsx`
- Create: `frontend/src/components/documents/DocumentViewer.tsx`
- Test: manual — employee flow works end-to-end

**Interfaces:**
- Consumes: Backend employee APIs, `useAuth()`, `api` client, shadcn components (Table, Badge, Dialog, Select)
- Produces: Complete employee-facing UI

- [ ] **Step 1: Build EmployeeDashboardPage**

Table of all requests using shadcn Table. Columns: request ID (short), customer name, request type, account type, auto-decision badge, status badge, created date, verified by. Filters at top: status dropdown, account type dropdown, date range. Pagination. Click row → navigate to detail page.

- [ ] **Step 2: Build DocumentViewer component**

Displays uploaded document image with zoom and pan. Used in employee detail page to show original documents side-by-side with extracted data.

- [ ] **Step 3: Build RequestDetailPage**

Two-column layout:
- **Left:** Extracted data grouped by document. For each field: label, OCR original value, corrected value (if any, highlighted). Validation results with pass/fail badges. Auto-decision banner.
- **Right:** Document images using `DocumentViewer`. Tabs for each document.
- **Bottom:** Action bar — "موافقة" (approve) button (green), "رفض" (reject) button (red) with required reason text input. Confirmation dialog before action. Shows "تم التحقق بواسطة: [employee name]" if already verified.

- [ ] **Step 4: Wire up verify action**

Approve → POST `/employee/requests/{id}/verify` with `{decision: "approved"}`. Reject → dialog asks for reason → POST with `{decision: "rejected", reason: "..."}`. On success → toast notification + redirect to dashboard. On 409 (already verified) → show warning.

- [ ] **Step 5: Verify end-to-end**

Full flow: login as employee → see pending requests → open one → review data + images → approve → request status updates. Test reject with reason. Verify employee name recorded.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: employee dashboard with request review and verification"
```
