"""
Request/Response Schemas - Lightweight Version

Pydantic models for API request/response validation without user dependencies.
"""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field

# Resume Schemas


class ResumeBase(BaseModel):
    """Base resume schema."""

    title: str = Field(..., min_length=1, max_length=255)
    content: str | None = None


class ResumeCreate(ResumeBase):
    """Schema for creating a resume."""


class ResumeUpdate(BaseModel):
    """Schema for updating a resume."""

    title: str | None = Field(None, min_length=1, max_length=255)
    content: str | None = None


class ResumeOptimizeRequest(BaseModel):
    """Schema for POST /resumes/{id}/optimize (lite).

    The body is optional for backwards compatibility with callers that
    optimize without a target JD.
    """

    jd_content: str | None = None


class ResumeResponse(BaseModel):
    """Schema for resume response."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    content: str
    file_name: str | None = None
    created_at: datetime
    updated_at: datetime


# Job Description Schemas


class JobDescriptionBase(BaseModel):
    """Base job description schema."""

    company: str = Field(..., min_length=1, max_length=255)
    title: str = Field(..., min_length=1, max_length=255)
    description: str = Field(..., min_length=1)
    url: str | None = None
    platform: str = "manual"
    source_url: str | None = None
    raw_text: str | None = None
    source: str | None = None
    external_id: str | None = None
    location: str | None = None
    salary_min: float | None = None
    salary_max: float | None = None
    currency: str = "USD"
    employment_type: str | None = None
    remote: str = "onsite"
    parsed_json: dict | None = None
    language: str = "auto"
    deadline: datetime | None = None
    notes: str | None = None


class JobDescriptionCreate(JobDescriptionBase):
    """Schema for creating a job description."""


class JobDescriptionUpdate(BaseModel):
    """Schema for updating a job description."""

    company: str | None = Field(None, min_length=1, max_length=255)
    title: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    url: str | None = None
    platform: str | None = None
    source_url: str | None = None
    raw_text: str | None = None
    source: str | None = None
    external_id: str | None = None
    location: str | None = None
    salary_min: float | None = None
    salary_max: float | None = None
    currency: str | None = None
    employment_type: str | None = None
    remote: str | None = None
    parsed_json: dict | None = None
    language: str | None = None
    deadline: datetime | None = None
    notes: str | None = None


class JobDescriptionParseRequest(BaseModel):
    """Schema for parsing a raw job description."""

    content: str = Field(..., min_length=1)
    url: str | None = None


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
    url: str | None = None
    platform: str = "manual"
    source_url: str | None = None
    raw_text: str | None = None
    source: str | None = None
    external_id: str | None = None
    location: str | None = None
    salary_min: float | None = None
    salary_max: float | None = None
    currency: str
    employment_type: str | None = None
    remote: str
    parsed_json: dict | None = None
    match_score: float | None = None
    match_detail: dict | None = None
    language: str = "auto"
    deadline: datetime | None = None
    notes: str | None = None
    created_at: datetime
    updated_at: datetime


# Job Source Schemas (ATS job board subscriptions)


class JobSourceCreate(BaseModel):
    """Schema for subscribing to an ATS-backed recruiting page."""

    url: str | None = Field(
        None, description="Recruiting page URL; ATS type auto-detected"
    )
    ats_type: str | None = None
    org_key: str | None = None
    name: str | None = Field(None, description="Company display name")


class JobSourceUpdate(BaseModel):
    """Schema for updating a job source."""

    name: str | None = Field(None, min_length=1, max_length=255)
    enabled: bool | None = None


class JobSourceDetectRequest(BaseModel):
    """Schema for detecting the ATS behind a recruiting page URL."""

    url: str = Field(..., min_length=1)


class JobSourceDetectResponse(BaseModel):
    """Detected ATS metadata for a recruiting page URL."""

    ats_type: str
    org_key: str
    suggested_name: str
    portal_url: str


class JobSourceResponse(BaseModel):
    """Job source response schema."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    ats_type: str
    org_key: str
    portal_url: str | None = None
    enabled: bool
    last_synced_at: datetime | None = None
    last_sync_status: str | None = None
    last_sync_message: str | None = None
    last_new_count: int = 0
    last_total_count: int = 0
    created_at: datetime
    updated_at: datetime


class JobSourceSyncResponse(BaseModel):
    """Result of syncing one or more job sources."""

    source_id: str
    source_name: str
    status: str  # ok | error | empty
    new_count: int = 0
    updated_count: int = 0
    total_count: int = 0
    message: str | None = None


class JobSourceScoreResponse(BaseModel):
    """Result of scoring feed jobs against the local resume."""

    scored_count: int = 0
    resume_title: str | None = None


class JobSourceImportRequest(BaseModel):
    """Bulk-subscribe a batch of ATS boards."""

    ats_type: str
    org_keys: list[str] = Field(..., min_length=1, max_length=20000)
    enabled: bool = False


class JobSourceImportResponse(BaseModel):
    """Result of a bulk job-source import."""

    created: int
    skipped: int


class JobSourceCatalogRequest(BaseModel):
    """Search the bundled ATS board catalog."""

    query: str = ""
    ats_type: str | None = None
    limit: int = Field(20, ge=1, le=200)


class JobSourceCatalogResult(BaseModel):
    """One catalog hit."""

    ats_type: str
    org_key: str


class JobSourceCatalogResponse(BaseModel):
    """Catalog search results."""

    total: int
    results: list[JobSourceCatalogResult]
    truncated: bool


# Signal Feed Schemas (RSS → automatic radar signals)


class SignalFeedCreate(BaseModel):
    """Subscribe an RSS feed as a signal source."""

    rss_url: str = Field(..., min_length=1)
    name: str | None = Field(None, max_length=255)


class SignalFeedUpdate(BaseModel):
    """Update a signal feed."""

    name: str | None = Field(None, min_length=1, max_length=255)
    enabled: bool | None = None


class SignalFeedResponse(BaseModel):
    """Signal feed response."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    rss_url: str
    enabled: bool
    last_fetched_at: datetime | None = None
    last_status: str | None = None
    last_new_signals: int = 0
    last_message: str | None = None
    created_at: datetime
    updated_at: datetime


class SignalFeedSyncResponse(BaseModel):
    """Result of syncing one signal feed."""

    feed_id: str
    feed_name: str
    status: str  # ok | empty | error
    items_seen: int = 0
    signals: list[str] = []
    message: str | None = None


class JobSourceLogApplicationRequest(BaseModel):
    """Log an application submitted through the job browser."""

    url: str = Field(..., min_length=1)
    title: str | None = None
    company: str | None = None


class JobSourceLogApplicationResponse(BaseModel):
    """Created/updated application plus the linked job description."""

    application_id: str
    jd_id: str
    jd_created: bool
    status: str
    applied_at: datetime


# Company Directory Schemas (recruiting site radar)


class CompanyCreate(BaseModel):
    """Add a company to the directory."""

    name: str = Field(..., min_length=1, max_length=255)
    career_url: str | None = None
    aliases: list[str] | None = None
    career_type: str = "both"
    industry: str | None = None


class CompanyUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    career_url: str | None = None
    aliases: list[str] | None = None
    career_type: str | None = None
    industry: str | None = None
    verified: bool | None = None


class CompanyResponse(BaseModel):
    """Directory entry with its latest hiring signal."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    aliases: list[str] | None = None
    career_url: str | None = None
    career_type: str = "both"
    industry: str | None = None
    verified: bool = False
    signal_batch: str | None = None
    signal_title: str | None = None
    signal_url: str | None = None
    signal_detected_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class SignalDetectRequest(BaseModel):
    """An article title (or URL to fetch it from) to scan for signals."""

    title: str | None = None
    url: str | None = None


class SignalDetectResponse(BaseModel):
    matched: list[CompanyResponse]
    used_title: str | None = None


class ManualSignalRequest(BaseModel):
    """Pin a signal on one company by hand."""

    batch: str = Field(..., min_length=1, max_length=50)
    title: str | None = None
    url: str | None = None
    detected_at: datetime | None = None


class CompanyImportItem(BaseModel):
    """One company in a bulk import payload."""

    name: str = Field(..., min_length=1, max_length=255)
    career_url: str | None = None
    aliases: list[str] | None = None
    industry: str | None = None
    verified: bool = False


class CompanyImportRequest(BaseModel):
    """Bulk-import companies (deduped by name)."""

    companies: list[CompanyImportItem] = Field(..., min_length=1, max_length=10000)


class CompanyImportResponse(BaseModel):
    """Result of a bulk import."""

    created: int
    skipped: int


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
    resume_variant_id: str | None = None
    materials_id: str | None = None
    platform: str = "manual"
    source_url: str | None = None
    notes: str | None = None


class ApplicationCreate(ApplicationBase):
    """Schema for creating an application."""


class ApplicationUpdate(BaseModel):
    """Schema for updating an application."""

    status: ApplicationStatus | None = None
    resume_variant_id: str | None = None
    materials_id: str | None = None
    platform: str | None = None
    source_url: str | None = None
    notes: str | None = None
    match_score: float | None = None
    applied_date: datetime | None = None
    submitted_manually_at: datetime | None = None
    next_action: str | None = None
    next_action_at: datetime | None = None
    contact_name: str | None = None
    contact_channel: str | None = None
    timeline: list[dict] | None = None


class ApplicationStatusUpdateRequest(BaseModel):
    """Schema for PATCH /applications/{id}/status (lite).

    Mirrors the full-stack ``ApplicationStatusUpdate`` contract so the
    frontend status-transition loop works identically in both modes.
    """

    status: str
    notes: str | None = None


class ApplicationBatchUpdateRequest(BaseModel):
    """Schema for batch-updating applications."""

    application_ids: list[str]
    status: ApplicationStatus | None = None


class ApplicationResponse(BaseModel):
    """Schema for application response."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    resume_id: str
    jd_id: str
    status: str
    resume_variant_id: str | None = None
    materials_id: str | None = None
    platform: str = "manual"
    source_url: str | None = None
    notes: str | None = None
    match_score: float | None = None
    applied_date: datetime | None = None
    submitted_manually_at: datetime | None = None
    next_action: str | None = None
    next_action_at: datetime | None = None
    contact_name: str | None = None
    contact_channel: str | None = None
    timeline: list[dict] | None = None
    last_updated: datetime | None = None
    created_at: datetime
    updated_at: datetime


# Local-First Resume Generation Schemas


class CandidateProfileBase(BaseModel):
    """Base candidate profile schema."""

    display_name: str = Field(..., min_length=1, max_length=255)
    target_title: str | None = None
    email: str | None = None
    phone: str | None = None
    location: str | None = None
    links: list[dict] | None = None
    summary: str | None = None
    privacy_settings: dict | None = None


class CandidateProfileCreate(CandidateProfileBase):
    """Schema for creating a candidate profile."""


class CandidateProfileUpdate(BaseModel):
    """Schema for updating a candidate profile."""

    display_name: str | None = Field(None, min_length=1, max_length=255)
    target_title: str | None = None
    email: str | None = None
    phone: str | None = None
    location: str | None = None
    links: list[dict] | None = None
    summary: str | None = None
    privacy_settings: dict | None = None


class CandidateProfileResponse(BaseModel):
    """Schema for candidate profile response."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    display_name: str
    target_title: str | None = None
    email: str | None = None
    phone: str | None = None
    location: str | None = None
    links: list[dict] | None = None
    summary: str | None = None
    privacy_settings: dict | None = None
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
    organization: str | None = None
    role: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    description: str | None = None
    highlights: list[str] | None = None
    skills: list[str] | None = None
    metrics: dict | None = None
    visibility: CandidateProfileItemVisibility = CandidateProfileItemVisibility.RESUME
    sort_order: int = 0


class CandidateProfileItemCreate(CandidateProfileItemBase):
    """Schema for creating a candidate profile item."""


class CandidateProfileItemUpdate(BaseModel):
    """Schema for updating a candidate profile item."""

    item_type: CandidateProfileItemType | None = None
    title: str | None = Field(None, min_length=1, max_length=255)
    organization: str | None = None
    role: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    description: str | None = None
    highlights: list[str] | None = None
    skills: list[str] | None = None
    metrics: dict | None = None
    visibility: CandidateProfileItemVisibility | None = None
    sort_order: int | None = None


class CandidateProfileItemResponse(BaseModel):
    """Schema for candidate profile item response."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    profile_id: str
    item_type: str
    title: str
    organization: str | None = None
    role: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    description: str | None = None
    highlights: list[str] | None = None
    skills: list[str] | None = None
    metrics: dict | None = None
    visibility: str
    sort_order: int
    created_at: datetime
    updated_at: datetime


class CandidateRoleCardBase(BaseModel):
    """Base candidate role card schema."""

    profile_id: str
    name: str = Field(..., min_length=1, max_length=255)
    target_roles: list[str] | None = None
    strengths: list[str] | None = None
    weaknesses: list[str] | None = None
    core_skills: list[str] | None = None
    proof_points: list[dict] | None = None
    tone_preferences: dict | None = None
    generated_from: dict | None = None
    model_provider: str | None = None
    model_name: str | None = None


class CandidateRoleCardCreate(CandidateRoleCardBase):
    """Schema for creating a candidate role card."""


class CandidateRoleCardUpdate(BaseModel):
    """Schema for updating a candidate role card."""

    name: str | None = Field(None, min_length=1, max_length=255)
    target_roles: list[str] | None = None
    strengths: list[str] | None = None
    weaknesses: list[str] | None = None
    core_skills: list[str] | None = None
    proof_points: list[dict] | None = None
    tone_preferences: dict | None = None
    generated_from: dict | None = None
    model_provider: str | None = None
    model_name: str | None = None


class CandidateRoleCardResponse(BaseModel):
    """Schema for candidate role card response."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    profile_id: str
    name: str
    target_roles: list[str] | None = None
    strengths: list[str] | None = None
    weaknesses: list[str] | None = None
    core_skills: list[str] | None = None
    proof_points: list[dict] | None = None
    tone_preferences: dict | None = None
    generated_from: dict | None = None
    model_provider: str | None = None
    model_name: str | None = None
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
    display_name: str | None = None
    base_url: str | None = None
    model_name: str | None = None
    api_key_ref: str | None = None
    api_key: str | None = None
    enabled: bool = False
    send_confirmation_required: bool = True


class AIProviderSettingsCreate(AIProviderSettingsBase):
    """Schema for creating AI provider settings."""


class AIProviderSettingsUpdate(BaseModel):
    """Schema for updating AI provider settings."""

    provider: str | None = Field(None, min_length=1, max_length=100)
    mode: AIProviderMode | None = None
    display_name: str | None = None
    base_url: str | None = None
    model_name: str | None = None
    api_key_ref: str | None = None
    api_key: str | None = None
    enabled: bool | None = None
    send_confirmation_required: bool | None = None


class AIProviderSettingsResponse(BaseModel):
    """Schema for AI provider settings response without plaintext secrets."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    provider: str
    mode: str
    display_name: str | None = None
    base_url: str | None = None
    model_name: str | None = None
    enabled: bool
    send_confirmation_required: bool
    has_api_key: bool
    created_at: datetime
    updated_at: datetime


class ResumeVariantBase(BaseModel):
    """Base resume variant schema."""

    profile_id: str
    role_card_id: str | None = None
    jd_id: str
    application_id: str | None = None
    title: str = Field(..., min_length=1, max_length=255)
    language: str = "auto"
    template_id: str | None = None
    content_markdown: str = Field(..., min_length=1)
    content_json: dict | None = None
    match_score: float | None = None
    keyword_hits: list[str] | None = None
    gap_warnings: list[str] | None = None
    generation_rationale: str | None = None
    ai_provider: str | None = None
    ai_model: str | None = None
    status: str = "draft"


class ResumeVariantCreate(ResumeVariantBase):
    """Schema for creating a resume variant."""


class ResumeVariantUpdate(BaseModel):
    """Schema for updating a resume variant."""

    role_card_id: str | None = None
    application_id: str | None = None
    title: str | None = Field(None, min_length=1, max_length=255)
    language: str | None = None
    template_id: str | None = None
    content_markdown: str | None = Field(None, min_length=1)
    content_json: dict | None = None
    match_score: float | None = None
    keyword_hits: list[str] | None = None
    gap_warnings: list[str] | None = None
    generation_rationale: str | None = None
    ai_provider: str | None = None
    ai_model: str | None = None
    status: str | None = None


class ResumeVariantResponse(BaseModel):
    """Schema for resume variant response."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    profile_id: str
    role_card_id: str | None = None
    jd_id: str
    application_id: str | None = None
    title: str
    language: str
    template_id: str | None = None
    content_markdown: str
    content_json: dict | None = None
    match_score: float | None = None
    keyword_hits: list[str] | None = None
    gap_warnings: list[str] | None = None
    generation_rationale: str | None = None
    ai_provider: str | None = None
    ai_model: str | None = None
    status: str
    created_at: datetime
    updated_at: datetime


class ResumeExportBase(BaseModel):
    """Base resume export schema."""

    resume_variant_id: str
    export_format: str = "pdf"
    file_path: str = Field(..., min_length=1)
    file_name: str = Field(..., min_length=1, max_length=255)
    checksum: str | None = None
    byte_size: int | None = None
    status: str = "created"


class ResumeExportCreate(ResumeExportBase):
    """Schema for creating a resume export."""


class ResumeExportUpdate(BaseModel):
    """Schema for updating a resume export."""

    export_format: str | None = None
    file_path: str | None = Field(None, min_length=1)
    file_name: str | None = Field(None, min_length=1, max_length=255)
    checksum: str | None = None
    byte_size: int | None = None
    status: str | None = None


class ResumeExportResponse(BaseModel):
    """Schema for resume export response."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    resume_variant_id: str
    export_format: str
    file_path: str
    file_name: str
    checksum: str | None = None
    byte_size: int | None = None
    status: str
    created_at: datetime
    updated_at: datetime


class ApplicationMaterialBase(BaseModel):
    """Base application material pack schema."""

    profile_id: str
    jd_id: str
    resume_variant_id: str | None = None
    application_id: str | None = None
    language: str = "auto"
    platform: str = "manual"
    form_fields: dict | None = None
    cover_letter: str | None = None
    opening_message: str | None = None
    self_introduction: str | None = None
    checklist: list[dict] | None = None
    review_status: str = "draft"


class ApplicationMaterialCreate(ApplicationMaterialBase):
    """Schema for creating an application material pack."""


class ApplicationMaterialUpdate(BaseModel):
    """Schema for updating an application material pack."""

    resume_variant_id: str | None = None
    application_id: str | None = None
    language: str | None = None
    platform: str | None = None
    form_fields: dict | None = None
    cover_letter: str | None = None
    opening_message: str | None = None
    self_introduction: str | None = None
    checklist: list[dict] | None = None
    review_status: str | None = None


class ApplicationMaterialResponse(BaseModel):
    """Schema for application material pack response."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    profile_id: str
    jd_id: str
    resume_variant_id: str | None = None
    application_id: str | None = None
    language: str
    platform: str
    form_fields: dict | None = None
    cover_letter: str | None = None
    opening_message: str | None = None
    self_introduction: str | None = None
    checklist: list[dict] | None = None
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
    results: list[dict]
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
    insights: list[str]


# Data Portability Schemas


class ExportResponse(BaseModel):
    """Schema for export response."""

    format: str  # json, csv
    data: dict | None = None
    file_url: str | None = None
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
    errors: list[str]


# Local Profile Schemas


class LocalProfileBase(BaseModel):
    """Base local profile schema."""

    name: str | None = None
    email: str | None = None
    phone: str | None = None
    preferences: dict | None = None


class LocalProfileUpdate(LocalProfileBase):
    """Schema for updating local profile."""

    default_resume_id: str | None = None


class LocalProfileResponse(BaseModel):
    """Schema for local profile response."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str | None = None
    email: str | None = None
    phone: str | None = None
    preferences: dict | None = None
    default_resume_id: str | None = None
    created_at: datetime
    updated_at: datetime


# Extension Schemas


class ExtensionBase(BaseModel):
    """Base extension schema."""

    name: str = Field(..., min_length=1, max_length=255)
    display_name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    version: str | None = None


class ExtensionCreate(ExtensionBase):
    """Schema for creating an extension."""

    config: dict | None = None


class ExtensionUpdate(BaseModel):
    """Schema for updating an extension."""

    enabled: bool | None = None
    config: dict | None = None


class ExtensionResponse(BaseModel):
    """Schema for extension response."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    display_name: str
    description: str | None = None
    version: str | None = None
    enabled: bool
    config: dict | None = None
    last_sync: datetime | None = None
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
