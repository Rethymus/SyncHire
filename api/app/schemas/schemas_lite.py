"""
Request/Response Schemas - Lightweight Version

Pydantic models for API request/response validation without user dependencies.
"""

from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List

# Resume Schemas


class ResumeBase(BaseModel):
    """Base resume schema."""

    title: str = Field(..., min_length=1, max_length=255)
    content: Optional[str] = None


class ResumeCreate(ResumeBase):
    """Schema for creating a resume."""

    pass


class ResumeUpdate(BaseModel):
    """Schema for updating a resume."""

    title: Optional[str] = Field(None, min_length=1, max_length=255)
    content: Optional[str] = None


class ResumeResponse(BaseModel):
    """Schema for resume response."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    content: str
    file_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime


# Job Description Schemas


class JobDescriptionBase(BaseModel):
    """Base job description schema."""

    company: str = Field(..., min_length=1, max_length=255)
    title: str = Field(..., min_length=1, max_length=255)
    description: str = Field(..., min_length=1)
    url: Optional[str] = None
    location: Optional[str] = None
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    currency: str = "USD"
    employment_type: Optional[str] = None
    remote: str = "onsite"


class JobDescriptionCreate(JobDescriptionBase):
    """Schema for creating a job description."""

    pass


class JobDescriptionUpdate(BaseModel):
    """Schema for updating a job description."""

    company: Optional[str] = Field(None, min_length=1, max_length=255)
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    url: Optional[str] = None
    location: Optional[str] = None
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    currency: Optional[str] = None
    employment_type: Optional[str] = None
    remote: Optional[str] = None


class JobDescriptionResponse(BaseModel):
    """Schema for job description response."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    company: str
    title: str
    description: str
    url: Optional[str] = None
    location: Optional[str] = None
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    currency: str
    employment_type: Optional[str] = None
    remote: str
    created_at: datetime
    updated_at: datetime


# Application Schemas


class ApplicationStatus(str):
    """Application status enum."""

    SAVED = "saved"
    APPLIED = "applied"
    SCREENING = "screening"
    INTERVIEW = "interview"
    TECHNICAL = "technical"
    OFFER = "offer"
    HIRED = "hired"
    REJECTED = "rejected"
    WITHDRAWN = "withdrawn"


class ApplicationBase(BaseModel):
    """Base application schema."""

    resume_id: str
    jd_id: str
    status: ApplicationStatus = ApplicationStatus.SAVED
    notes: Optional[str] = None


class ApplicationCreate(ApplicationBase):
    """Schema for creating an application."""

    pass


class ApplicationUpdate(BaseModel):
    """Schema for updating an application."""

    status: Optional[ApplicationStatus] = None
    notes: Optional[str] = None
    match_score: Optional[float] = None
    applied_date: Optional[datetime] = None


class ApplicationResponse(BaseModel):
    """Schema for application response."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    resume_id: str
    jd_id: str
    status: str
    notes: Optional[str] = None
    match_score: Optional[float] = None
    applied_date: Optional[datetime] = None
    last_updated: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


# Search Schemas


class SearchRequest(BaseModel):
    """Schema for search request."""

    query: str = Field(..., min_length=1)
    type: str = "all"  # all, resumes, jds, applications
    limit: int = Field(20, ge=1, le=100)
    offset: int = Field(0, ge=0)


class SearchResponse(BaseModel):
    """Schema for search response."""

    total: int
    results: List[dict]
    query: str
    type: str


class MatchRequest(BaseModel):
    """Schema for match request."""

    resume_id: str
    jd_id: str


class MatchResponse(BaseModel):
    """Schema for match response."""

    resume_id: str
    jd_id: str
    match_score: float
    insights: List[str]


# Data Portability Schemas


class ExportResponse(BaseModel):
    """Schema for export response."""

    format: str  # json, csv
    data: Optional[dict] = None
    file_url: Optional[str] = None
    created_at: datetime


class ImportRequest(BaseModel):
    """Schema for import request."""

    format: str  # json
    data: dict
    overwrite: bool = False


class ImportResponse(BaseModel):
    """Schema for import response."""

    imported: int
    skipped: int
    failed: int
    errors: List[str]


# Local Profile Schemas


class LocalProfileBase(BaseModel):
    """Base local profile schema."""

    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    preferences: Optional[dict] = None


class LocalProfileUpdate(LocalProfileBase):
    """Schema for updating local profile."""

    default_resume_id: Optional[str] = None


class LocalProfileResponse(BaseModel):
    """Schema for local profile response."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    preferences: Optional[dict] = None
    default_resume_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime


# Extension Schemas


class ExtensionBase(BaseModel):
    """Base extension schema."""

    name: str = Field(..., min_length=1, max_length=255)
    display_name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    version: Optional[str] = None


class ExtensionCreate(ExtensionBase):
    """Schema for creating an extension."""

    config: Optional[dict] = None


class ExtensionUpdate(BaseModel):
    """Schema for updating an extension."""

    enabled: Optional[bool] = None
    config: Optional[dict] = None


class ExtensionResponse(BaseModel):
    """Schema for extension response."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    display_name: str
    description: Optional[str] = None
    version: Optional[str] = None
    enabled: bool
    config: Optional[dict] = None
    last_sync: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


# Health Check Schema


class HealthResponse(BaseModel):
    """Schema for health check response."""

    status: str
    version: str
    mode: str
    database: str
    storage: str
    ai_enabled: bool
