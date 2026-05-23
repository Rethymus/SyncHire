from pydantic import BaseModel, Field
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
    id: uuid.UUID
    user_id: uuid.UUID
    content: str | None
    parsed_data: dict | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ResumeExportRequest(BaseModel):
    """Request schema for PDF export"""

    template: str = Field(
        default="minimal",
        description="Template to use: minimal, professional, creative, executive"
    )
    dpi: int | None = Field(
        default=300,
        ge=72,
        le=600,
        description="DPI for PDF generation (72-600)"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "template": "professional",
                "dpi": 300
            }
        }


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
