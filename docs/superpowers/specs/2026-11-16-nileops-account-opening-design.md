# NileOps — Banking Request Processing System

## Intent

A banking feature that automates the intake and initial processing of customer requests. Customers upload required documents, the system extracts structured data via OCR, cross-validates it, and presents a pre-verified request to the bank employee for final approval. The employee reviews data — not paper.

**Phase 1** covers **Account Opening** only. The architecture supports adding KYC Update, Card Request, and Complaint Reception later as independent modules.

**Why:** Reduce manual data entry for bank employees, catch document errors early through automated cross-validation, and speed up request processing while keeping human oversight.

## Goals

- Automate document data extraction for account opening requests
- Cross-validate OCR output using embedded data in documents (e.g., National ID number encodes DOB, gender, governorate)
- Let customers correct mismatched fields before submission
- Give employees a clean, structured view of each request with auto-check results
- Track which employee verified each request
- Make adding new request types straightforward (modular architecture)

## Non-Goals

- Full end-to-end automation without employee review
- Integration with the bank's core banking system (this is a standalone feature)
- Mobile-native app (responsive web is sufficient)
- Real-time OCR (a few seconds of processing is acceptable)

## Anti-Goals

- Approving requests without employee oversight
- Storing documents without encryption (document encryption as a future concern — not Phase 1, but documented)
- Hardcoding OCR to a single model/provider

## Constraints

- OCR model: Qwen 3.5 4B via Ollama (local), abstracted through LangChain
- Backend: FastAPI + Python
- Frontend: React (Vite) + Tailwind CSS + shadcn/ui
- Database: PostgreSQL
- Single web app with role-based views (customer vs. employee)
- Responsive design (desktop + mobile)
- Arabic document support is critical

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (React)                  │
│  ┌──────────────────┐  ┌──────────────────────────┐ │
│  │  Customer Views   │  │    Employee Dashboard    │ │
│  │  - Submit Request │  │    - Request List        │ │
│  │  - Upload Docs    │  │    - Review & Verify     │ │
│  │  - Correct Fields │  │    - Approve/Reject      │ │
│  │  - Track Status   │  │    - Filter & Search     │ │
│  └──────────────────┘  └──────────────────────────┘ │
└─────────────────┬───────────────────────────────────┘
                  │ REST API
┌─────────────────▼───────────────────────────────────┐
│                 Backend (FastAPI)                     │
│  ┌─────────────────────────────────────────────────┐ │
│  │                  API Layer                       │ │
│  │  auth / requests / documents / employees         │ │
│  └──────────────────┬──────────────────────────────┘ │
│  ┌──────────────────▼──────────────────────────────┐ │
│  │               Service Layer                      │ │
│  │  ┌───────────┐ ┌────────────┐ ┌───────────────┐ │ │
│  │  │    OCR    │ │ Validation │ │ Request Types │ │ │
│  │  │ LangChain │ │ Cross-val  │ │  (Modular)    │ │ │
│  │  │ + Ollama  │ │ Age/Expiry │ │  Account Open │ │ │
│  │  └───────────┘ └────────────┘ └───────────────┘ │ │
│  └──────────────────┬──────────────────────────────┘ │
│  ┌──────────────────▼──────────────────────────────┐ │
│  │            Data Layer (SQLAlchemy)                │ │
│  └──────────────────┬──────────────────────────────┘ │
└─────────────────────┼───────────────────────────────┘
                      │
              ┌───────▼───────┐
              │  PostgreSQL   │
              └───────────────┘
```

---

## Account Opening — Request Types

### 1. Individual Account (حساب أفراد) — Age: 21+

| Document                 | OCR | Extracted Fields                                                    |
|--------------------------|-----|---------------------------------------------------------------------|
| National ID (front)      | ✅  | name, national_id, address                                          |
| National ID (back)       | ✅  | expiry_date, job, marital_status                                    |
| Proof of Residence       | ✅  | holder_name, address                                                |
| Proof of Income          | ❌  | Displayed as image for employee review                              |

> date_of_birth, gender, and governorate are decoded from the national_id number, not OCR'd separately.

### 2. Youth Account (حساب شباب) — Age: 15–21

| Document                 | OCR | Extracted Fields                                                    |
|--------------------------|-----|---------------------------------------------------------------------|
| National ID (front)      | ✅  | name, national_id, address                                          |
| National ID (back)       | ✅  | expiry_date, job, marital_status                                    |

> date_of_birth, gender, and governorate are decoded from the national_id number.

### 3. Minor Account (حساب قصّر) — Age: < 15

| Document                       | OCR | Extracted Fields                                                    |
|--------------------------------|-----|---------------------------------------------------------------------|
| Birth Certificate              | ✅  | child_name, date_of_birth, father_name, mother_name, father_national_id |
| Guardian National ID (front)   | ✅  | name, national_id, address                                          |
| Guardian National ID (back)    | ✅  | expiry_date, job, marital_status                                    |

> Guardian's date_of_birth, gender, and governorate are decoded from the national_id number.

---

## Customer Field Correction

After OCR extraction, the customer sees the extracted fields in editable text inputs:

- **Editable fields:** All fields EXCEPT expiry_date (name, national_id, date_of_birth, gender, address, holder_name, child_name, father_name, mother_name, father_national_id)
- **Locked fields:** expiry_date — used for auto-reject logic, cannot be modified by the customer
- **No re-validation after correction:** These are non-sensitive fields; the customer edits freely
- **Audit trail:** The original OCR value is stored alongside any customer correction, so the employee sees both

The cross-validation (below) flags mismatches to alert the customer that OCR may have errors, prompting them to double-check. It is not a blocking gate — the customer can submit after reviewing.

---

## OCR Processing

- OCR runs **asynchronously** (FastAPI background tasks). The customer sees a processing state and is notified when extraction is complete.
- **Pipeline:** Image → Qwen 3.5 4B (via Ollama + LangChain) → Structured JSON
- The model accepts images directly (vision-capable). No separate OCR step needed.
- LangChain abstraction ensures the model/provider can be swapped without changing the pipeline.

---

## OCR Cross-Validation Logic

### Egyptian National ID Number Structure (14 digits)

```
[C][YY][MM][DD][GG][SSSS][K]
 │  │    │    │   │    │    └─ Check digit
 │  │    │    │   │    └────── Serial (odd last digit = male, even = female)
 │  │    │    │   └─────────── Governorate code
 │  │    │    └─────────────── Day of birth
 │  │    └──────────────────── Month of birth
 │  └───────────────────────── Year of birth
 └──────────────────────────── Century (2 = 1900s, 3 = 2000s)
```

### Validation Rules

**National ID (all account types that require it):**
1. OCR extracts national_id from the front image
2. Decode date_of_birth, gender, and governorate from the national_id number
3. These decoded values are added to the extracted data (not OCR'd from the card directly)
4. Check expiry_date from back image — if expired → auto-reject

**Birth Certificate + Guardian ID (Minor Account):**
1. Extract father_national_id from birth certificate
2. Extract national_id from guardian's ID card
3. Compare — if mismatch → flag for user correction

**Age Validation (all account types):**
1. Calculate age from date_of_birth
2. Individual: age must be ≥ 21
3. Youth: age must be 15–21
4. Minor: age must be < 15
5. If age doesn't match account type → auto-reject

**Cross-document (Individual Account):**
1. Compare name from National ID with holder_name from Proof of Residence
2. Compare address from National ID with address from Proof of Residence (informational, not blocking)

### Auto-Decision Logic

| Condition                                | Decision     |
|------------------------------------------|--------------|
| National ID expired                      | Auto-Reject  |
| Age doesn't match account type           | Auto-Reject  |
| All validatable fields pass              | Auto-Approve |

> **Note:** Auto-decisions are preliminary. The employee always has the final say. Customer field corrections (except expiry_date) do not trigger re-validation.

---

## Data Model

### users
| Column         | Type         | Notes                          |
|----------------|--------------|--------------------------------|
| id             | UUID (PK)    |                                |
| name           | VARCHAR      |                                |
| email          | VARCHAR (UQ) |                                |
| password_hash  | VARCHAR      |                                |
| role           | ENUM         | customer, employee             |
| created_at     | TIMESTAMP    |                                |

### requests
| Column           | Type         | Notes                                    |
|------------------|--------------|------------------------------------------|
| id               | UUID (PK)    |                                          |
| customer_id      | UUID (FK)    | → users.id                               |
| request_type     | ENUM         | account_opening (extensible)             |
| sub_type         | VARCHAR      | individual, youth, minor                 |
| status           | ENUM         | pending_upload, processing, pending_correction, pending_review, approved, rejected |
| auto_decision    | ENUM         | auto_approved, auto_rejected, null       |
| rejection_reason | TEXT         | Employee's reason if rejected            |
| verified_by      | UUID (FK)    | → users.id (employee)                   |
| verified_at      | TIMESTAMP    |                                          |
| created_at       | TIMESTAMP    |                                          |
| updated_at       | TIMESTAMP    |                                          |

### documents
| Column          | Type         | Notes                                     |
|-----------------|--------------|-------------------------------------------|
| id              | UUID (PK)    |                                           |
| request_id      | UUID (FK)    | → requests.id                             |
| document_type   | ENUM         | national_id_front, national_id_back, proof_of_residence, proof_of_income, birth_certificate, guardian_national_id_front, guardian_national_id_back |
| file_path       | VARCHAR      | Path to stored file                       |
| ocr_required    | BOOLEAN      |                                           |
| extracted_data  | JSONB        | OCR-extracted fields as JSON (original)   |
| corrected_data  | JSONB        | Customer-corrected fields (null if no corrections) |
| ocr_completed   | BOOLEAN      | default false                             |
| created_at      | TIMESTAMP    |                                           |

### validation_results
| Column          | Type         | Notes                                     |
|-----------------|--------------|-------------------------------------------|
| id              | UUID (PK)    |                                           |
| request_id      | UUID (FK)    | → requests.id                             |
| rule_name       | VARCHAR      | e.g., "id_expiry", "age_check", "cross_val_dob" |
| passed          | BOOLEAN      |                                           |
| details         | JSONB        | { expected: "...", actual: "...", field: "..." } |
| user_corrected  | BOOLEAN      | Did the user correct this field?          |
| created_at      | TIMESTAMP    |                                           |

---

## API Design (High-Level)

### Auth
- `POST /api/auth/register` — Register (customer only)
- `POST /api/auth/login` — Login → JWT token
- `GET  /api/auth/me` — Current user info

> Employee accounts are pre-provisioned via seed script or admin CLI. Self-registration is customer-only.

### Customer Endpoints
- `POST   /api/requests/` — Create new request (type + sub_type)
- `GET    /api/requests/` — List my requests
- `GET    /api/requests/{id}` — Get request details + status
- `POST   /api/requests/{id}/documents` — Upload document(s)
- `POST   /api/requests/{id}/process` — Trigger OCR processing
- `GET    /api/requests/{id}/validation` — Get validation results
- `PATCH  /api/requests/{id}/corrections` — Submit field corrections
- `POST   /api/requests/{id}/submit` — Submit for employee review

### Employee Endpoints
- `GET    /api/employee/requests` — List all pending requests (filterable)
- `GET    /api/employee/requests/{id}` — Get full request details
- `POST   /api/employee/requests/{id}/verify` — Approve or reject (with reason)

---

## Frontend Pages

### Customer Pages
1. **Login / Register**
2. **Dashboard** — List of my requests with status badges
3. **New Request** — Select request type → select account type
4. **Upload Documents** — Upload required files per account type, with checklist
5. **Review Extracted Data** — Show OCR results, highlight mismatches, allow corrections
6. **Request Status** — Track request through pipeline

### Employee Pages
1. **Login**
2. **Dashboard** — Table of all requests, filterable by status/type/date
3. **Request Detail** — View extracted data, validation results, document images, proof of income
4. **Verify** — Approve/Reject with reason, employee name auto-recorded

---

## Project Structure

```
NileOps-Fouda/
├── backend/
│   ├── app/
│   │   ├── main.py                    # FastAPI app + CORS + startup
│   │   ├── config.py                  # Settings (DB, Ollama URL, etc.)
│   │   ├── database.py                # SQLAlchemy engine + session
│   │   ├── models/                    # SQLAlchemy ORM models
│   │   │   ├── user.py
│   │   │   ├── request.py
│   │   │   ├── document.py
│   │   │   └── validation.py
│   │   ├── schemas/                   # Pydantic request/response schemas
│   │   │   ├── user.py
│   │   │   ├── request.py
│   │   │   ├── document.py
│   │   │   └── validation.py
│   │   ├── api/
│   │   │   ├── deps.py                # Dependencies (get_db, get_current_user)
│   │   │   └── routes/
│   │   │       ├── auth.py
│   │   │       ├── requests.py
│   │   │       ├── documents.py
│   │   │       └── employee.py
│   │   ├── services/
│   │   │   ├── ocr/
│   │   │   │   ├── extractor.py       # LangChain + Ollama integration
│   │   │   │   └── prompts.py         # Prompts per document type
│   │   │   ├── validation/
│   │   │   │   ├── national_id.py     # ID number decoder + cross-validation
│   │   │   │   ├── age_validator.py   # Age checks per account type
│   │   │   │   └── cross_validator.py # Cross-document validation
│   │   │   └── request_types/
│   │   │       └── account_opening.py # Account opening orchestrator
│   │   └── utils/
│   │       └── file_storage.py        # File upload handling
│   ├── alembic/                       # Database migrations
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/                    # shadcn/ui components
│   │   │   ├── layout/               # Header, Sidebar, etc.
│   │   │   ├── documents/            # Upload, viewer components
│   │   │   └── requests/             # Request cards, forms, etc.
│   │   ├── pages/
│   │   │   ├── auth/                 # Login, Register
│   │   │   ├── customer/             # Customer views
│   │   │   └── employee/             # Employee dashboard
│   │   ├── hooks/                    # Custom React hooks
│   │   ├── lib/                      # API client, utils
│   │   └── App.tsx
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
└── docs/
```

---

## Approaches Considered

### OCR Approach
| Approach | Verdict |
|----------|---------|
| **LLM with Vision (Qwen via Ollama + LangChain)** — chosen | Simplest, most flexible, good Arabic support, model-agnostic via LangChain |
| Tesseract + LLM post-processing | Weak Arabic support, complex pipeline |
| Cloud Vision API (Google/Azure) | Higher cost, less flexible, vendor lock-in |

### Frontend Architecture
| Approach | Verdict |
|----------|---------|
| **Single app with role-based views** — chosen | One codebase, simpler maintenance, shared design system |
| Two separate apps (customer portal + employee dashboard) | Double the maintenance, duplicated components |

### Data Storage for OCR Results
| Approach | Verdict |
|----------|---------|
| **JSONB column on documents table** — chosen | Flexible for varying fields per document type, easy to query in PostgreSQL |
| Separate extracted_fields table with one row per field | Over-normalized for this use case, more complex queries |

---

## What's Left to the Builder

- JWT secret and auth configuration details
- Exact file storage strategy (local filesystem path structure)
- Exact LangChain prompt engineering for each document type (will need iteration)
- Error handling strategy and retry logic for OCR failures
- Pagination details for employee dashboard
- Exact shadcn/ui component choices per page
