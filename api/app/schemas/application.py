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
    tags: List[str] = []
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


class BulkUpdateRequest(BaseModel):
    """Request schema for bulk update operations"""

    updates: List[Dict[str, any]] = Field(
        ...,
        min_length=1,
        max_length=100,
        description="List of updates with id and fields to update",
    )

    class Config:
        json_schema_extra = {
            "example": {
                "updates": [
                    {"id": "uuid1", "status": "interview"},
                    {"id": "uuid2", "status": "applied", "notes": "Updated notes"},
                ]
            }
        }


class BulkStatusUpdateRequest(BaseModel):
    """Request schema for bulk status update operations"""

    ids: List[uuid.UUID] = Field(
        ...,
        min_length=1,
        max_length=100,
        description="List of application IDs to update",
    )
    status: str = Field(..., description="New status to set for all applications")
    notes: str | None = Field(None, description="Optional notes to add to all applications")

    class Config:
        json_schema_extra = {
            "example": {
                "ids": ["uuid1", "uuid2", "uuid3"],
                "status": "interview",
                "notes": "Scheduled for technical interview",
            }
        }


class BulkNotesUpdateRequest(BaseModel):
    """Request schema for bulk notes update operations"""

    ids: List[uuid.UUID] = Field(
        ...,
        min_length=1,
        max_length=100,
        description="List of application IDs to update",
    )
    notes: str = Field(..., description="Notes to add to all applications")
    append: bool = Field(
        default=True,
        description="If true, append to existing notes. If false, replace existing notes.",
    )

    class Config:
        json_schema_extra = {
            "example": {
                "ids": ["uuid1", "uuid2", "uuid3"],
                "notes": "Follow up scheduled for next week",
                "append": True,
            }
        }


class BulkUpdateResponse(BaseModel):
    """Response schema for bulk update operations"""

    success_count: int = Field(..., description="Number of successfully updated items")
    failed_count: int = Field(..., description="Number of items that failed to update")
    errors: List[Dict[str, str]] = Field(
        default_factory=list, description="List of errors for failed updates"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "success_count": 2,
                "failed_count": 1,
                "errors": [{"id": "uuid3", "error": "Application not found"}],
            }
        }


class BulkTagRequest(BaseModel):
    """Request schema for bulk tagging operations"""

    ids: List[uuid.UUID] = Field(
        ...,
        min_length=1,
        max_length=100,
        description="List of application IDs to update",
    )
    tags: List[str] = Field(..., description="Tags to add/remove/replace")
    operation: str = Field(
        ...,
        description="Operation type: 'add' to append tags, 'remove' to remove tags, 'replace' to replace all tags",
    )

    class Config:
        json_schema_extra = {
            "example": {
                "ids": ["uuid1", "uuid2", "uuid3"],
                "tags": ["high-priority", "remote"],
                "operation": "add",
            }
        }


class BulkTagResponse(BaseModel):
    """Response schema for bulk tagging operations"""

    success_count: int = Field(
        ..., description="Number of successfully updated applications"
    )
    failed_count: int = Field(..., description="Number of applications that failed to update")
    errors: List[Dict[str, str]] = Field(
        default_factory=list, description="List of errors for failed updates"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "success_count": 2,
                "failed_count": 1,
                "errors": [{"id": "uuid3", "error": "Application not found"}],
            }
        }
