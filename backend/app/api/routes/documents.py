import uuid
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_role
from app.models.document import Document
from app.models.enums import DocumentType, UserRole
from app.models.request import Request
from app.models.user import User
from app.schemas.document import DocumentResponse
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
