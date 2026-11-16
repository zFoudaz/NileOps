import uuid
from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel, ConfigDict


class ValidationResultResponse(BaseModel):
    id: uuid.UUID
    request_id: Optional[uuid.UUID] = None
    rule_name: str
    passed: bool
    details: Optional[Any] = None
    user_corrected: bool = False
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
