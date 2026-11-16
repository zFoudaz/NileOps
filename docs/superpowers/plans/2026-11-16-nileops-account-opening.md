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

- [x] **Step 1: Create `requirements.txt`**
- [x] **Step 2: Create `backend/app/config.py`**
- [x] **Step 3: Create `backend/app/database.py`**
- [x] **Step 4: Create ORM models**
- [x] **Step 5: Create `backend/app/main.py`**
- [x] **Step 6: Set up Alembic**
- [x] **Step 7: Write model tests**
- [x] **Step 8: Run tests to verify they pass**
- [x] **Step 9: Generate initial migration and verify**
- [x] **Step 10: Commit**

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

- [x] **Step 1: Create user schemas in `backend/app/schemas/user.py`**
- [x] **Step 2: Create `backend/app/api/deps.py`**
- [x] **Step 3: Create `backend/app/api/routes/auth.py`**
- [x] **Step 4: Create `backend/seed_employee.py`**
- [x] **Step 5: Write auth tests**
- [x] **Step 6: Run tests**
- [x] **Step 7: Commit**

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

- [x] **Step 1: Define required documents config in `account_opening.py`**
- [x] **Step 2: Create `backend/app/utils/file_storage.py`**
- [x] **Step 3: Create request schemas and routes**
- [x] **Step 4: Create document upload route**
- [x] **Step 5: Write request tests**
- [x] **Step 6: Write document upload tests**
- [x] **Step 7: Run tests**
- [x] **Step 8: Commit**

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

- [x] **Step 1: Write failing tests**
- [x] **Step 2: Run tests to verify they fail**
- [x] **Step 3: Implement `decode_national_id` in `national_id_decoder.py`**
- [x] **Step 4: Run tests to verify they pass**
- [x] **Step 5: Commit**

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

- [x] **Step 1: Create prompt templates in `prompts.py`**
- [x] **Step 2: Implement `extractor.py`**
- [x] **Step 3: Add process endpoint to documents route**
- [x] **Step 4: Write OCR tests (mocked model)**
- [x] **Step 5: Run tests**
- [x] **Step 6: Commit**

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

- [x] **Step 1: Write failing tests**
- [x] **Step 2: Run tests to verify they fail**
- [x] **Step 3: Implement `cross_validator.py`**
- [x] **Step 4: Implement `business_rules.py`**
- [x] **Step 5: Wire validation into OCR completion**
- [x] **Step 6: Run tests**
- [x] **Step 7: Commit**

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
