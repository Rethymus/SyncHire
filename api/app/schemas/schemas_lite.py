"""
Request/Response Schemas - Lightweight Version

Pydantic models for API request/response validation without user dependencies.
"""

from datetime import datetime
from enum import Enum
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
    platform: str = "manual"
    source_url: Optional[str] = None
    raw_text: Optional[str] = None
    location: Optional[str] = None
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    currency: str = "USD"
    employment_type: Optional[str] = None
    remote: str = "onsite"
    parsed_json: Optional[dict] = None
    language: str = "auto"
    deadline: Optional[datetime] = None
    notes: Optional[str] = None


class JobDescriptionCreate(JobDescriptionBase):
    """Schema for creating a job description."""

    pass


class JobDescriptionUpdate(BaseModel):
    """Schema for updating a job description."""

    company: Optional[str] = Field(None, min_length=1, max_length=255)
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    url: Optional[str] = None
    platform: Optional[str] = None
    source_url: Optional[str] = None
    raw_text: Optional[str] = None
    location: Optional[str] = None
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    currency: Optional[str] = None
    employment_type: Optional[str] = None
    remote: Optional[str] = None
    parsed_json: Optional[dict] = None
    language: Optional[str] = None
    deadline: Optional[datetime] = None
    notes: Optional[str] = None


class JobDescriptionParseRequest(BaseModel):
    """Schema for parsing a raw job description."""

    content: str = Field(..., min_length=1)
    url: Optional[str] = None


class UrlImportRequest(BaseModel):
    """Schema for importing content from a URL."""

    url: str = Field(..., min_length=1)


class JobDescriptionResponse(BaseModel):
    """Schema for job description response."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    company: str
    title: str
    description: str
    url: Optional[str] = None
    platform: str = "manual"
    source_url: Optional[str] = None
    raw_text: Optional[str] = None
    location: Optional[str] = None
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    currency: str
    employment_type: Optional[str] = None
    remote: str
    parsed_json: Optional[dict] = None
    language: str = "auto"
    deadline: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime


# Application Schemas


class ApplicationStatus(str, Enum):
    """Application status enum."""

    SAVED = "saved"
    TARGETED = "targeted"
    MATERIALS_READY = "materials_ready"
    SUBMITTED = "submitted"
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
    resume_variant_id: Optional[str] = None
    materials_id: Optional[str] = None
    platform: str = "manual"
    source_url: Optional[str] = None
    notes: Optional[str] = None


class ApplicationCreate(ApplicationBase):
    """Schema for creating an application."""

    pass


class ApplicationUpdate(BaseModel):
    """Schema for updating an application."""

    status: Optional[ApplicationStatus] = None
    resume_variant_id: Optional[str] = None
    materials_id: Optional[str] = None
    platform: Optional[str] = None
    source_url: Optional[str] = None
    notes: Optional[str] = None
    match_score: Optional[float] = None
    applied_date: Optional[datetime] = None
    submitted_manually_at: Optional[datetime] = None
    next_action: Optional[str] = None
    next_action_at: Optional[datetime] = None
    contact_name: Optional[str] = None
    contact_channel: Optional[str] = None
    timeline: Optional[List[dict]] = None


class ApplicationBatchUpdateRequest(BaseModel):
    """Schema for batch-updating applications."""

    application_ids: List[str]
    status: Optional[ApplicationStatus] = None


class ApplicationResponse(BaseModel):
    """Schema for application response."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    resume_id: str
    jd_id: str
    status: str
    resume_variant_id: Optional[str] = None
    materials_id: Optional[str] = None
    platform: str = "manual"
    source_url: Optional[str] = None
    notes: Optional[str] = None
    match_score: Optional[float] = None
    applied_date: Optional[datetime] = None
    submitted_manually_at: Optional[datetime] = None
    next_action: Optional[str] = None
    next_action_at: Optional[datetime] = None
    contact_name: Optional[str] = None
    contact_channel: Optional[str] = None
    timeline: Optional[List[dict]] = None
    last_updated: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


# Local-First Resume Generation Schemas


class CandidateProfileBase(BaseModel):
    """Base candidate profile schema."""

    display_name: str = Field(..., min_length=1, max_length=255)
    target_title: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    links: Optional[List[dict]] = None
    summary: Optional[str] = None
    privacy_settings: Optional[dict] = None


class CandidateProfileCreate(CandidateProfileBase):
    """Schema for creating a candidate profile."""

    pass


class CandidateProfileUpdate(BaseModel):
    """Schema for updating a candidate profile."""

    display_name: Optional[str] = Field(None, min_length=1, max_length=255)
    target_title: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    links: Optional[List[dict]] = None
    summary: Optional[str] = None
    privacy_settings: Optional[dict] = None


class CandidateProfileResponse(BaseModel):
    """Schema for candidate profile response."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    display_name: str
    target_title: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    links: Optional[List[dict]] = None
    summary: Optional[str] = None
    privacy_settings: Optional[dict] = None
    created_at: datetime
    updated_at: datetime


class CandidateProfileItemType(str, Enum):
    """Candidate profile item type enum."""

    EDUCATION = "education"
    WORK = "work"
    PROJECT = "project"
    SKILL = "skill"
    CERTIFICATE = "certificate"
    AWARD = "award"
    LANGUAGE = "language"


class CandidateProfileItemVisibility(str, Enum):
    """Candidate profile item visibility enum."""

    RESUME = "resume"
    FORM = "form"
    INTERNAL = "internal"
    PRIVATE = "private"


class CandidateProfileItemBase(BaseModel):
    """Base candidate profile item schema."""

    profile_id: str
    item_type: CandidateProfileItemType
    title: str = Field(..., min_length=1, max_length=255)
    organization: Optional[str] = None
    role: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    description: Optional[str] = None
    highlights: Optional[List[str]] = None
    skills: Optional[List[str]] = None
    metrics: Optional[dict] = None
    visibility: CandidateProfileItemVisibility = CandidateProfileItemVisibility.RESUME
    sort_order: int = 0


class CandidateProfileItemCreate(CandidateProfileItemBase):
    """Schema for creating a candidate profile item."""

    pass


class CandidateProfileItemUpdate(BaseModel):
    """Schema for updating a candidate profile item."""

    item_type: Optional[CandidateProfileItemType] = None
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    organization: Optional[str] = None
    role: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    description: Optional[str] = None
    highlights: Optional[List[str]] = None
    skills: Optional[List[str]] = None
    metrics: Optional[dict] = None
    visibility: Optional[CandidateProfileItemVisibility] = None
    sort_order: Optional[int] = None


class CandidateProfileItemResponse(BaseModel):
    """Schema for candidate profile item response."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    profile_id: str
    item_type: str
    title: str
    organization: Optional[str] = None
    role: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    description: Optional[str] = None
    highlights: Optional[List[str]] = None
    skills: Optional[List[str]] = None
    metrics: Optional[dict] = None
    visibility: str
    sort_order: int
    created_at: datetime
    updated_at: datetime


class CandidateRoleCardBase(BaseModel):
    """Base candidate role card schema."""

    profile_id: str
    name: str = Field(..., min_length=1, max_length=255)
    target_roles: Optional[List[str]] = None
    strengths: Optional[List[str]] = None
    weaknesses: Optional[List[str]] = None
    core_skills: Optional[List[str]] = None
    proof_points: Optional[List[dict]] = None
    tone_preferences: Optional[dict] = None
    generated_from: Optional[dict] = None
    model_provider: Optional[str] = None
    model_name: Optional[str] = None


class CandidateRoleCardCreate(CandidateRoleCardBase):
    """Schema for creating a candidate role card."""

    pass


class CandidateRoleCardUpdate(BaseModel):
    """Schema for updating a candidate role card."""

    name: Optional[str] = Field(None, min_length=1, max_length=255)
    target_roles: Optional[List[str]] = None
    strengths: Optional[List[str]] = None
    weaknesses: Optional[List[str]] = None
    core_skills: Optional[List[str]] = None
    proof_points: Optional[List[dict]] = None
    tone_preferences: Optional[dict] = None
    generated_from: Optional[dict] = None
    model_provider: Optional[str] = None
    model_name: Optional[str] = None


class CandidateRoleCardResponse(BaseModel):
    """Schema for candidate role card response."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    profile_id: str
    name: str
    target_roles: Optional[List[str]] = None
    strengths: Optional[List[str]] = None
    weaknesses: Optional[List[str]] = None
    core_skills: Optional[List[str]] = None
    proof_points: Optional[List[dict]] = None
    tone_preferences: Optional[dict] = None
    generated_from: Optional[dict] = None
    model_provider: Optional[str] = None
    model_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class AIProviderMode(str, Enum):
    """AI provider mode enum."""

    LOCAL = "local"
    CLOUD = "cloud"
    FALLBACK = "fallback"


class AIProviderSettingsBase(BaseModel):
    """Base AI provider settings schema."""

    provider: str = Field(..., min_length=1, max_length=100)
    mode: AIProviderMode = AIProviderMode.FALLBACK
    display_name: Optional[str] = None
    base_url: Optional[str] = None
    model_name: Optional[str] = None
    api_key_ref: Optional[str] = None
    api_key: Optional[str] = None
    enabled: bool = False
    send_confirmation_required: bool = True


class AIProviderSettingsCreate(AIProviderSettingsBase):
    """Schema for creating AI provider settings."""

    pass


class AIProviderSettingsUpdate(BaseModel):
    """Schema for updating AI provider settings."""

    provider: Optional[str] = Field(None, min_length=1, max_length=100)
    mode: Optional[AIProviderMode] = None
    display_name: Optional[str] = None
    base_url: Optional[str] = None
    model_name: Optional[str] = None
    api_key_ref: Optional[str] = None
    api_key: Optional[str] = None
    enabled: Optional[bool] = None
    send_confirmation_required: Optional[bool] = None


class AIProviderSettingsResponse(BaseModel):
    """Schema for AI provider settings response without plaintext secrets."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    provider: str
    mode: str
    display_name: Optional[str] = None
    base_url: Optional[str] = None
    model_name: Optional[str] = None
    enabled: bool
    send_confirmation_required: bool
    has_api_key: bool
    created_at: datetime
    updated_at: datetime


class ResumeVariantBase(BaseModel):
    """Base resume variant schema."""

    profile_id: str
    role_card_id: Optional[str] = None
    jd_id: str
    application_id: Optional[str] = None
    title: str = Field(..., min_length=1, max_length=255)
    language: str = "auto"
    template_id: Optional[str] = None
    content_markdown: str = Field(..., min_length=1)
    content_json: Optional[dict] = None
    match_score: Optional[float] = None
    keyword_hits: Optional[List[str]] = None
    gap_warnings: Optional[List[str]] = None
    generation_rationale: Optional[str] = None
    ai_provider: Optional[str] = None
    ai_model: Optional[str] = None
    status: str = "draft"


class ResumeVariantCreate(ResumeVariantBase):
    """Schema for creating a resume variant."""

    pass


class ResumeVariantUpdate(BaseModel):
    """Schema for updating a resume variant."""

    role_card_id: Optional[str] = None
    application_id: Optional[str] = None
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    language: Optional[str] = None
    template_id: Optional[str] = None
    content_markdown: Optional[str] = Field(None, min_length=1)
    content_json: Optional[dict] = None
    match_score: Optional[float] = None
    keyword_hits: Optional[List[str]] = None
    gap_warnings: Optional[List[str]] = None
    generation_rationale: Optional[str] = None
    ai_provider: Optional[str] = None
    ai_model: Optional[str] = None
    status: Optional[str] = None


class ResumeVariantResponse(BaseModel):
    """Schema for resume variant response."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    profile_id: str
    role_card_id: Optional[str] = None
    jd_id: str
    application_id: Optional[str] = None
    title: str
    language: str
    template_id: Optional[str] = None
    content_markdown: str
    content_json: Optional[dict] = None
    match_score: Optional[float] = None
    keyword_hits: Optional[List[str]] = None
    gap_warnings: Optional[List[str]] = None
    generation_rationale: Optional[str] = None
    ai_provider: Optional[str] = None
    ai_model: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime


class ResumeExportBase(BaseModel):
    """Base resume export schema."""

    resume_variant_id: str
    export_format: str = "pdf"
    file_path: str = Field(..., min_length=1)
    file_name: str = Field(..., min_length=1, max_length=255)
    checksum: Optional[str] = None
    byte_size: Optional[int] = None
    status: str = "created"


class ResumeExportCreate(ResumeExportBase):
    """Schema for creating a resume export."""

    pass


class ResumeExportUpdate(BaseModel):
    """Schema for updating a resume export."""

    export_format: Optional[str] = None
    file_path: Optional[str] = Field(None, min_length=1)
    file_name: Optional[str] = Field(None, min_length=1, max_length=255)
    checksum: Optional[str] = None
    byte_size: Optional[int] = None
    status: Optional[str] = None


class ResumeExportResponse(BaseModel):
    """Schema for resume export response."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    resume_variant_id: str
    export_format: str
    file_path: str
    file_name: str
    checksum: Optional[str] = None
    byte_size: Optional[int] = None
    status: str
    created_at: datetime
    updated_at: datetime


class ApplicationMaterialBase(BaseModel):
    """Base application material pack schema."""

    profile_id: str
    jd_id: str
    resume_variant_id: Optional[str] = None
    application_id: Optional[str] = None
    language: str = "auto"
    platform: str = "manual"
    form_fields: Optional[dict] = None
    cover_letter: Optional[str] = None
    opening_message: Optional[str] = None
    self_introduction: Optional[str] = None
    checklist: Optional[List[dict]] = None
    review_status: str = "draft"


class ApplicationMaterialCreate(ApplicationMaterialBase):
    """Schema for creating an application material pack."""

    pass


class ApplicationMaterialUpdate(BaseModel):
    """Schema for updating an application material pack."""

    resume_variant_id: Optional[str] = None
    application_id: Optional[str] = None
    language: Optional[str] = None
    platform: Optional[str] = None
    form_fields: Optional[dict] = None
    cover_letter: Optional[str] = None
    opening_message: Optional[str] = None
    self_introduction: Optional[str] = None
    checklist: Optional[List[dict]] = None
    review_status: Optional[str] = None


class ApplicationMaterialResponse(BaseModel):
    """Schema for application material pack response."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    profile_id: str
    jd_id: str
    resume_variant_id: Optional[str] = None
    application_id: Optional[str] = None
    language: str
    platform: str
    form_fields: Optional[dict] = None
    cover_letter: Optional[str] = None
    opening_message: Optional[str] = None
    self_introduction: Optional[str] = None
    checklist: Optional[List[dict]] = None
    review_status: str
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
