from pydantic import BaseModel
from datetime import datetime
import uuid


class JDBase(BaseModel):
    title: str
    company: str | None = None
    content: str


class JDParse(BaseModel):
    content: str


class JDCreate(JDBase):
    pass


class JDResponse(JDBase):
    id: uuid.UUID
    user_id: uuid.UUID
    parsed_data: dict | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class JDParseResponse(BaseModel):
    parsed_data: dict
