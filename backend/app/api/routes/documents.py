import uuid
from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_role
from app.models.document import Document
from app.models.enums import DocumentType, RequestStatus, UserRole
from app.models.request import Request
from app.models.user import User
from app.schemas.document import DocumentResponse
from app.schemas.request import ProcessResponse
from app.services.ocr.extractor import process_request_documents
from app.services.request_types.account_opening import OCR_DOCUMENTS, get_required_documents
from app.utils.file_storage import save_upload

router = APIRouter()


@router.post(
    "/{id}/documents",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload document for request",
)
@router.post(
    "/{id}/documents/",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload document for request",
    include_in_schema=False,
)
def upload_document(
    id: uuid.UUID,
    document_type: str = Form(..., description="Document type to upload"),
    file: UploadFile = File(..., description="Image file to upload"),
    current_user: User = Depends(require_role(UserRole.CUSTOMER)),
    db: Session = Depends(get_db),
) -> Document:
    # 1. Fetch request and check customer ownership
    req = db.query(Request).filter(Request.id == id).first()
    if not req or req.customer_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Request not found",
        )

    # 2. Parse and validate document type
    try:
        doc_type_enum = DocumentType(document_type.strip().lower())
    except (ValueError, AttributeError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid document type: '{document_type}'",
        )

    # 3. Validate document type is in required list for this account type
    required_docs = get_required_documents(req.sub_type)
    if doc_type_enum not in required_docs:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Document type '{doc_type_enum.value}' is not required for account type '{req.sub_type}'",
        )

    # 4. Save and validate image file
    file_path = save_upload(file=file, request_id=req.id, document_type=doc_type_enum)

    # 5. Check if OCR is required
    ocr_required = doc_type_enum in OCR_DOCUMENTS

    # 6. Create Document record
    doc = Document(
        request_id=req.id,
        document_type=doc_type_enum,
        file_path=file_path,
        ocr_required=ocr_required,
        ocr_completed=False,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


@router.post(
    "/{id}/process",
    response_model=ProcessResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Process request documents with OCR",
)
@router.post(
    "/{id}/process/",
    response_model=ProcessResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Process request documents with OCR",
    include_in_schema=False,
)
def process_request(
    id: uuid.UUID,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_role(UserRole.CUSTOMER)),
    db: Session = Depends(get_db),
) -> ProcessResponse:
    # 1. Fetch request and check customer ownership
    req = db.query(Request).filter(Request.id == id).first()
    if not req or req.customer_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Request not found",
        )

    # 2. Verify all required documents for req.sub_type are uploaded
    required_docs = get_required_documents(req.sub_type)
    uploaded_doc_types = {doc.document_type for doc in req.documents}
    missing_docs = [doc_type for doc_type in required_docs if doc_type not in uploaded_doc_types]
    if missing_docs:
        missing_names = [d.value if hasattr(d, "value") else str(d) for d in missing_docs]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Missing required documents: {missing_names}",
        )

    # 3. Update request status to processing
    req.status = RequestStatus.PROCESSING
    db.commit()
    db.refresh(req)

    # 4. Enqueue background processing task
    background_tasks.add_task(process_request_documents, req.id)

    # 5. Return 202 Accepted
    return ProcessResponse(
        message="Processing started",
        request_id=req.id,
        status=req.status,
    )

