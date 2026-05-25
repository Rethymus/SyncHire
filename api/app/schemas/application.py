from pydantic import BaseModel, Field
from datetime import datetime
import uuid
from typing import List, Dict


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


class BulkDeleteRequest(BaseModel):
    """Request schema for bulk delete operations"""

    ids: List[uuid.UUID] = Field(
        ...,
        min_length=1,
        max_length=100,
        description="List of IDs to delete (max 100 at once)",
    )

    class Config:
        json_schema_extra = {"example": {"ids": ["uuid1", "uuid2", "uuid3"]}}


class BulkDeleteResponse(BaseModel):
    """Response schema for bulk delete operations"""

    success_count: int = Field(..., description="Number of successfully deleted items")
    failed_count: int = Field(..., description="Number of items that failed to delete")
    errors: List[Dict[str, str]] = Field(
        default_factory=list, description="List of errors for failed deletions"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "success_count": 2,
                "failed_count": 1,
                "errors": [{"id": "uuid3", "error": "Application not found"}],
            }
        }
