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
    pending_upload = "pending_upload"
    processing = "processing"
    pending_correction = "pending_correction"
    pending_review = "pending_review"
    approved = "approved"
    rejected = "rejected"


class RequestType(str, enum.Enum):
    ACCOUNT_OPENING = "account_opening"
    CARD_ISSUANCE = "card_issuance"
    account_opening = "account_opening"
    card_issuance = "card_issuance"


class AccountType(str, enum.Enum):
    INDIVIDUAL = "individual"
    YOUTH = "youth"
    MINOR = "minor"
    individual = "individual"
    youth = "youth"
    minor = "minor"


class CardType(str, enum.Enum):
    PREPAID = "prepaid"
    DEBIT = "debit"
    CREDIT = "credit"
    prepaid = "prepaid"
    debit = "debit"
    credit = "credit"


class DocumentType(str, enum.Enum):
    NATIONAL_ID_FRONT = "national_id_front"
    NATIONAL_ID_BACK = "national_id_back"
    PROOF_OF_RESIDENCE = "proof_of_residence"
    PROOF_OF_INCOME = "proof_of_income"
    BIRTH_CERTIFICATE = "birth_certificate"
    GUARDIAN_NATIONAL_ID_FRONT = "guardian_national_id_front"
    GUARDIAN_NATIONAL_ID_BACK = "guardian_national_id_back"
    GUARANTEE_PROOF = "guarantee_proof"
    national_id_front = "national_id_front"
    national_id_back = "national_id_back"
    proof_of_residence = "proof_of_residence"
    proof_of_income = "proof_of_income"
    birth_certificate = "birth_certificate"
    guardian_national_id_front = "guardian_national_id_front"
    guardian_national_id_back = "guardian_national_id_back"
    guarantee_proof = "guarantee_proof"


class AutoDecision(str, enum.Enum):
    AUTO_APPROVED = "auto_approved"
    AUTO_REJECTED = "auto_rejected"
    auto_approved = "auto_approved"
    auto_rejected = "auto_rejected"
