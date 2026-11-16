import io
import uuid
from pathlib import Path
from typing import Optional, Union
from fastapi import HTTPException, UploadFile, status
from PIL import Image

from app.config import settings
from app.models.enums import DocumentType

ALLOWED_MIME_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/bmp",
    "image/gif",
}

ALLOWED_EXTENSIONS = {
    "JPEG": ".jpg",
    "PNG": ".png",
    "WEBP": ".webp",
    "BMP": ".bmp",
    "GIF": ".gif",
}


def _check_image_magic_bytes(header: bytes) -> bool:
    if header.startswith(b"\xff\xd8\xff"):
        return True
    if header.startswith(b"\x89PNG\r\n\x1a\n"):
        return True
    if header.startswith(b"GIF87a") or header.startswith(b"GIF89a"):
        return True
    if header[:4] == b"RIFF" and len(header) >= 12 and header[8:12] == b"WEBP":
        return True
    if header.startswith(b"BM"):
        return True
    return False


def validate_image_file(file: UploadFile, content: bytes) -> str:
    """
    Validates that the uploaded file is a real image.
    Checks MIME type, header magic bytes, and PIL image verification.
    Returns normalized file extension (e.g. '.jpg', '.png').
    Raises HTTPException(400) if invalid or corrupt.
    """
    content_type = (file.content_type or "").lower().strip()
    if not (content_type.startswith("image/") or content_type in ALLOWED_MIME_TYPES):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Only image files are allowed.",
        )

    if not content or len(content) < 12:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Corrupted or empty image file.",
        )

    if not _check_image_magic_bytes(content[:32]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Corrupted or invalid image header.",
        )

    try:
        img = Image.open(io.BytesIO(content))
        img.verify()
        format_name = (img.format or "").upper()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Corrupted or invalid image file.",
        )

    ext = ALLOWED_EXTENSIONS.get(format_name)
    if not ext:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported image format: {format_name}",
        )

    return ext


def save_upload(
    file: UploadFile,
    request_id: Union[uuid.UUID, str],
    document_type: Optional[Union[DocumentType, str]] = None,
) -> str:
    """
    Saves an uploaded image file to uploads/{request_id}/{document_type}_{uuid}.{ext}.
    Validates MIME type and content integrity.
    Returns the relative path formatted with forward slashes.
    """
    try:
        file.file.seek(0)
    except Exception:
        pass
    content = file.file.read()

    ext = validate_image_file(file, content)

    if document_type is not None:
        doc_prefix = document_type.value if hasattr(document_type, "value") else str(document_type)
    else:
        doc_prefix = "document"

    file_uuid = uuid.uuid4()
    filename = f"{doc_prefix}_{file_uuid}{ext}"

    req_str = str(request_id)
    upload_dir = Path(settings.UPLOAD_DIR) / req_str
    upload_dir.mkdir(parents=True, exist_ok=True)

    dest_file = upload_dir / filename
    with open(dest_file, "wb") as f:
        f.write(content)

    try:
        file.file.seek(0)
    except Exception:
        pass

    return f"{settings.UPLOAD_DIR}/{req_str}/{filename}"
