from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime
import uuid
from typing import Optional, List, Dict, Any


class ResumeBase(BaseModel):
    title: str


class ResumeCreate(ResumeBase):
    pass


class ResumeUpdate(BaseModel):
    title: str | None = None


class ResumeResponse(ResumeBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    content: str | None
    parsed_data: dict | None
    created_at: datetime
    updated_at: datetime


class ResumeExportRequest(BaseModel):
    """Request schema for PDF export"""

    model_config = ConfigDict(
        json_schema_extra={"example": {"template": "professional", "dpi": 300}}
    )

    template: str = Field(
        default="minimal",
        description="Template to use: minimal, professional, creative, executive",
    )
    dpi: int | None = Field(
        default=300, ge=72, le=600, description="DPI for PDF generation (72-600)"
    )


class ResumeExport(BaseModel):
    """Resume data model for PDF export"""

    # Personal Information
    name: str
    title: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    linkedin: Optional[str] = None
    github: Optional[str] = None
    website: Optional[str] = None

    # Professional Summary
    summary: Optional[str] = None

    # Experience
    experiences: List[Dict[str, Any]] = []

    # Education
    education: List[Dict[str, Any]] = []

    # Skills
    skills: List[Dict[str, Any]] = []

    # Projects
    projects: List[Dict[str, Any]] = []

    # Languages
    languages: List[Dict[str, Any]] = []

    # Awards & Certifications
    awards: List[Dict[str, Any]] = []

    # Custom sections
    custom_sections: Dict[str, List[Dict[str, Any]]] = {}


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
                "errors": [{"id": "uuid3", "error": "Resume not found"}],
            }
        }
    )

    success_count: int = Field(..., description="Number of successfully deleted items")
    failed_count: int = Field(..., description="Number of items that failed to delete")
    errors: List[Dict[str, str]] = Field(
        default_factory=list, description="List of errors for failed deletions"
    )
