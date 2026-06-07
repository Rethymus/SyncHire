from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime
import uuid
from typing import Any, List, Dict


class ApplicationBase(BaseModel):
    resume_id: uuid.UUID | None
    jd_id: uuid.UUID | None


class ApplicationCreate(ApplicationBase):
    pass


class ApplicationUpdate(BaseModel):
    status: str | None = None
    notes: str | None = None


class StatusHistoryEntry(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    old_status: str | None
    new_status: str
    notes: str | None
    changed_at: datetime


class ApplicationResponse(ApplicationBase):
    model_config = ConfigDict(from_attributes=True)

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


class ApplicationStatusUpdate(BaseModel):
    status: str
    notes: str | None = None


class BulkDeleteRequest(BaseModel):
    """Request schema for bulk delete operations"""

    model_config = ConfigDict(
        json_schema_extra={"example": {"ids": ["uuid1", "uuid2", "uuid3"]}}
    )

    ids: List[uuid.UUID] = Field(
        ...,
        min_length=1,
        max_length=100,
        description="List of IDs to delete (max 100 at once)",
    )


class BulkDeleteResponse(BaseModel):
    """Response schema for bulk delete operations"""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "success_count": 2,
                "failed_count": 1,
                "errors": [{"id": "uuid3", "error": "Application not found"}],
            }
        }
    )

    success_count: int = Field(..., description="Number of successfully deleted items")
    failed_count: int = Field(..., description="Number of items that failed to delete")
    errors: List[Dict[str, str]] = Field(
        default_factory=list, description="List of errors for failed deletions"
    )


class BulkUpdateRequest(BaseModel):
    """Request schema for bulk update operations"""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "updates": [
                    {"id": "uuid1", "status": "interview"},
                    {"id": "uuid2", "status": "applied", "notes": "Updated notes"},
                ]
            }
        }
    )

    updates: List[Dict[str, Any]] = Field(
        ...,
        min_length=1,
        max_length=100,
        description="List of updates with id and fields to update",
    )


class BulkStatusUpdateRequest(BaseModel):
    """Request schema for bulk status update operations"""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "ids": ["uuid1", "uuid2", "uuid3"],
                "status": "interview",
                "notes": "Scheduled for technical interview",
            }
        }
    )

    ids: List[uuid.UUID] = Field(
        ...,
        description="List of application IDs to update",
    )
    status: str = Field(..., description="New status to set for all applications")
    notes: str | None = Field(
        None, description="Optional notes to add to all applications"
    )


class BulkNotesUpdateRequest(BaseModel):
    """Request schema for bulk notes update operations"""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "ids": ["uuid1", "uuid2", "uuid3"],
                "notes": "Follow up scheduled for next week",
                "append": True,
            }
        }
    )

    ids: List[uuid.UUID] = Field(
        ...,
        description="List of application IDs to update",
    )
    notes: str = Field(..., description="Notes to add to all applications")
    append: bool = Field(
        default=True,
        description="If true, append to existing notes. If false, replace existing notes.",
    )


class BulkUpdateResponse(BaseModel):
    """Response schema for bulk update operations"""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "success_count": 2,
                "failed_count": 1,
                "errors": [{"id": "uuid3", "error": "Application not found"}],
            }
        }
    )

    success_count: int = Field(..., description="Number of successfully updated items")
    failed_count: int = Field(..., description="Number of items that failed to update")
    errors: List[Dict[str, str]] = Field(
        default_factory=list, description="List of errors for failed updates"
    )


class BulkTagRequest(BaseModel):
    """Request schema for bulk tagging operations"""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "ids": ["uuid1", "uuid2", "uuid3"],
                "tags": ["high-priority", "remote"],
                "operation": "add",
            }
        }
    )

    ids: List[uuid.UUID] = Field(
        ...,
        description="List of application IDs to update",
    )
    tags: List[str] = Field(..., description="Tags to add/remove/replace")
    operation: str = Field(
        ...,
        description="Operation type: 'add' to append tags, 'remove' to remove tags, 'replace' to replace all tags",
    )


class BulkTagResponse(BaseModel):
    """Response schema for bulk tagging operations"""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "success_count": 2,
                "failed_count": 1,
                "errors": [{"id": "uuid3", "error": "Application not found"}],
            }
        }
    )

    success_count: int = Field(
        ..., description="Number of successfully updated applications"
    )
    failed_count: int = Field(
        ..., description="Number of applications that failed to update"
    )
    errors: List[Dict[str, str]] = Field(
        default_factory=list, description="List of errors for failed updates"
    )
