import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class BankAccountResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    request_id: Optional[uuid.UUID] = None
    account_number: str
    account_type: str
    holder_name: str
    national_id: Optional[str] = None
    address: Optional[str] = None
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
