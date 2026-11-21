export type UserRole = 'customer' | 'employee';

export type RequestStatus =
  | 'pending_upload'
  | 'processing'
  | 'pending_correction'
  | 'pending_review'
  | 'approved'
  | 'rejected';

export type RequestType = 'account_opening';

export type AccountType = 'individual' | 'youth' | 'minor';

export type DocumentType =
  | 'national_id_front'
  | 'national_id_back'
  | 'proof_of_residence'
  | 'proof_of_income'
  | 'birth_certificate'
  | 'guardian_national_id_front'
  | 'guardian_national_id_back';

export type AutoDecision = 'auto_approved' | 'auto_rejected';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface Token {
  access_token: string;
  token_type: string;
}

export interface Document {
  id: string;
  request_id: string;
  document_type: DocumentType;
  file_path: string;
  image_url?: string | null;
  ocr_required: boolean;
  extracted_data?: Record<string, unknown> | null;
  corrected_data?: Record<string, unknown> | null;
  ocr_completed: boolean;
  created_at: string;
}

export interface ValidationResult {
  id: string;
  request_id?: string | null;
  rule_name: string;
  passed: boolean;
  details?: unknown;
  user_corrected: boolean;
  created_at: string;
}

export interface ExtractedFieldInfo {
  name: string;
  value?: unknown;
  editable: boolean;
}

export interface DocumentExtractedData {
  id: string;
  document_id: string;
  document_type: DocumentType;
  file_path: string;
  image_url?: string | null;
  ocr_required: boolean;
  ocr_completed: boolean;
  extracted_data?: Record<string, unknown> | null;
  corrected_data?: Record<string, unknown> | null;
  fields: ExtractedFieldInfo[];
  editable_flags: Record<string, boolean>;
}

export interface ExtractedDataResponse {
  request_id: string;
  status: RequestStatus;
  auto_decision?: AutoDecision | null;
  documents: DocumentExtractedData[];
  validation_results: ValidationResult[];
}

export interface BankRequest {
  id: string;
  customer_id: string;
  request_type: RequestType;
  sub_type: AccountType | string;
  status: RequestStatus;
  auto_decision?: AutoDecision | null;
  rejection_reason?: string | null;
  verified_by?: string | null;
  verified_at?: string | null;
  created_at: string;
  updated_at: string;
  documents: Document[];
  validation_results: ValidationResult[];
  required_documents: DocumentType[];
  customer?: User | null;
  verifier?: User | null;
  customer_name?: string | null;
  customer_email?: string | null;
  verifier_name?: string | null;
}

export interface RequestCreatePayload {
  request_type?: RequestType;
  sub_type: string;
}

export interface SubTypeConfig {
  key: string;
  title: string;
  badge: string;
  ageRange: string;
  description: string;
  requiredDocs: DocumentType[];
}

export interface RequestTypeConfig {
  key: RequestType;
  title: string;
  shortTitle: string;
  description: string;
  subTypes: Record<string, SubTypeConfig>;
}

export interface ProcessResponse {
  message: string;
  request_id: string;
  status: RequestStatus;
}

export interface CorrectionPayload {
  document_id: string;
  corrected_fields: Record<string, unknown>;
}

export interface VerifyPayload {
  decision: 'approved' | 'rejected' | 'approve' | 'reject';
  reason?: string;
  notes?: string;
}
