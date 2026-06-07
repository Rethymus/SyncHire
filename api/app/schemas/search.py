"""
Search history and saved searches schemas.
"""

import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, ConfigDict, Field


class SearchHistoryCreate(BaseModel):
    """Schema for creating a search history entry."""

    query: str = Field(..., min_length=1, max_length=1000)
    search_type: str = Field(..., pattern="^(resume|jd|application)$")
    filters: Optional[Dict[str, Any]] = None
    result_count: int = Field(0, ge=0)
    is_sensitive: bool = False


class SearchHistoryResponse(BaseModel):
    """Schema for search history response."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    query: str
    search_type: str
    filters: Optional[Dict[str, Any]]
    result_count: int
    search_timestamp: datetime
    is_sensitive: bool


class SearchHistoryListResponse(BaseModel):
    """Schema for search history list response."""

    items: List[SearchHistoryResponse]
    total: int
    page: int
    page_size: int


class SavedSearchCreate(BaseModel):
    """Schema for creating a saved search."""

    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    query: str = Field(..., min_length=1, max_length=1000)
    search_type: str = Field(..., pattern="^(resume|jd|application)$")
    filters: Optional[Dict[str, Any]] = None
    tags: Optional[List[str]] = None
    is_favorite: bool = False


class SavedSearchUpdate(BaseModel):
    """Schema for updating a saved search."""

    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    query: Optional[str] = Field(None, min_length=1, max_length=1000)
    filters: Optional[Dict[str, Any]] = None
    tags: Optional[List[str]] = None
    is_favorite: Optional[bool] = None


class SavedSearchResponse(BaseModel):
    """Schema for saved search response."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    description: Optional[str]
    query: str
    search_type: str
    filters: Optional[Dict[str, Any]]
    usage_count: int
    last_used_at: Optional[datetime]
    tags: Optional[List[str]]
    is_favorite: bool
    created_at: datetime
    updated_at: datetime


class SavedSearchListResponse(BaseModel):
    """Schema for saved searches list response."""

    items: List[SavedSearchResponse]
    total: int
    page: int
    page_size: int


class SearchAnalyticsResponse(BaseModel):
    """Schema for search analytics response."""

    search_term: str
    search_type: str
    search_count: int
    last_searched_at: datetime
    avg_result_count: Optional[int]
    avg_search_duration: Optional[int]


class SearchAnalyticsSummary(BaseModel):
    """Schema for search analytics summary."""

    total_searches: int
    most_common_terms: List[SearchAnalyticsResponse]
    search_type_breakdown: Dict[str, int]
    recent_activity: List[SearchHistoryResponse]
    top_saved_searches: List[SavedSearchResponse]


class SearchSuggestion(BaseModel):
    """Schema for search suggestion."""

    term: str
    type: str  # "history", "saved", "analytic"
    frequency: Optional[int] = None
    filters: Optional[Dict[str, Any]] = None
    last_used: Optional[datetime] = None


class SearchSuggestionsResponse(BaseModel):
    """Schema for search suggestions response."""

    suggestions: List[SearchSuggestion]
    query: str


class SearchExport(BaseModel):
    """Schema for exporting saved searches."""

    searches: List[SavedSearchResponse]
    exported_at: datetime
    version: str = "1.0"


class SearchImport(BaseModel):
    """Schema for importing saved searches."""

    searches: List[SavedSearchCreate]
    merge_strategy: str = Field("replace", pattern="^(replace|merge|skip_existing)$")
