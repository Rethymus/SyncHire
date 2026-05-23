from pydantic import BaseModel
from datetime import datetime
import uuid


class ApplicationBase(BaseModel):
    resume_id: uuid.UUID
    jd_id: uuid.UUID


class ApplicationCreate(ApplicationBase):
    pass


class ApplicationResponse(ApplicationBase):
    id: uuid.UUID
    user_id: uuid.UUID
    match_score: float | None
    match_details: dict | None
    optimized_resume: dict | None
    status: str
    notes: str | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
