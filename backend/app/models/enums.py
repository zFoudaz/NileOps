import enum


class UserRole(str, enum.Enum):
    CUSTOMER = "customer"
    EMPLOYEE = "employee"
    customer = "customer"
    employee = "employee"


class RequestStatus(str, enum.Enum):
    PENDING_UPLOAD = "pending_upload"
    PROCESSING = "processing"
    PENDING_CORRECTION = "pending_correction"
    PENDING_REVIEW = "pending_review"
    APPROVED = "approved"
    REJECTED = "rejected"


class RequestType(str, enum.Enum):
    ACCOUNT_OPENING = "account_opening"


class AccountType(str, enum.Enum):
    INDIVIDUAL = "individual"
    YOUTH = "youth"
    MINOR = "minor"


class DocumentType(str, enum.Enum):
    NATIONAL_ID_FRONT = "national_id_front"
    NATIONAL_ID_BACK = "national_id_back"
    PROOF_OF_RESIDENCE = "proof_of_residence"
    PROOF_OF_INCOME = "proof_of_income"
    BIRTH_CERTIFICATE = "birth_certificate"
    GUARDIAN_NATIONAL_ID_FRONT = "guardian_national_id_front"
    GUARDIAN_NATIONAL_ID_BACK = "guardian_national_id_back"


class AutoDecision(str, enum.Enum):
    AUTO_APPROVED = "auto_approved"
    AUTO_REJECTED = "auto_rejected"
