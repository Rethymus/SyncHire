from pydantic import BaseModel, Field
from datetime import datetime
import uuid
from typing import List, Dict


class JDBase(BaseModel):
    title: str
    company: str | None = None
    content: str


class JDParse(BaseModel):
    content: str


class JDCreate(JDBase):
    pass


class JDUpdate(BaseModel):
    title: str | None = None
    company: str | None = None
    content: str | None = None


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


class JDFileUploadResponse(BaseModel):
    id: uuid.UUID
    title: str
    company: str | None
    content: str
    parsed_data: dict | None
    created_at: datetime
    updated_at: datetime
    message: str


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
                "errors": [{"id": "uuid3", "error": "JD not found"}],
            }
        }
