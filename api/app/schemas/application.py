from pydantic import BaseModel
from datetime import datetime
import uuid
from typing import List


class ApplicationBase(BaseModel):
    resume_id: uuid.UUID
    jd_id: uuid.UUID


class ApplicationCreate(ApplicationBase):
    pass


class ApplicationUpdate(BaseModel):
    status: str | None = None
    notes: str | None = None


class StatusHistoryEntry(BaseModel):
    id: uuid.UUID
    old_status: str | None
    new_status: str
    notes: str | None
    changed_at: datetime

    class Config:
        from_attributes = True


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
    status_history: List[StatusHistoryEntry] = []

    class Config:
        from_attributes = True


class ApplicationStatusUpdate(BaseModel):
    status: str
    notes: str | None = None
