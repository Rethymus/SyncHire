"""
Advanced Search API with Comprehensive Filtering and Analytics

This API provides:
- Full-text search with boolean operators
- Advanced filters (location, salary, experience, etc.)
- Saved searches with notifications
- Search analytics and suggestions
- Result ranking and pagination
"""

import uuid
import json
from typing import List, Optional, Dict, Any
from datetime import datetime, date
from fastapi import APIRouter, Depends, Query, HTTPException, Body, Path
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field, field_validator

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.middleware.rate_limit import rate_limit, RateLimitType
from app.services.advanced_search import (
    AdvancedSearchService,
    SearchFilters,
)

router = APIRouter(prefix="/advanced-search", tags=["advanced-search"])


# Request/Response Models
class SearchFiltersRequest(BaseModel):
    """Search filters request model"""

    # Location filters
    location_city: Optional[str] = None
    location_state: Optional[str] = None
    location_country: Optional[str] = None
    location_remote: Optional[bool] = None
    location_hybrid: Optional[bool] = None
    location_onsite: Optional[bool] = None
    location_radius: Optional[int] = None

    # Salary filters
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    salary_currency: Optional[str] = "USD"
    salary_period: Optional[str] = None

    # Experience filters
    experience_level: Optional[str] = None

    # Job type filters
    employment_type: Optional[str] = None

    # Industry filters
    industry: Optional[str] = None
    company_size: Optional[str] = None

    # Date filters
    posted_date_from: Optional[str] = None
    posted_date_to: Optional[str] = None
    application_deadline_from: Optional[str] = None
    application_deadline_to: Optional[str] = None

    # Status filters
    status: Optional[str] = None

    # Match score filters
    min_match_score: Optional[float] = None
    max_match_score: Optional[float] = None

    @field_validator(
        "posted_date_from",
        "posted_date_to",
        "application_deadline_from",
        "application_deadline_to",
    )
    @classmethod
    def validate_dates(cls, v, info):
        if v:
            try:
                return date.fromisoformat(v)
            except ValueError:
                raise ValueError(f"Invalid date format: {v}. Use YYYY-MM-DD")
        return v


class SearchResponse(BaseModel):
    """Generic search response model"""

    results: List[Dict[str, Any]]
    total: int
    page: int
    page_size: int
    query: str
    filters_applied: Dict[str, Any]
    search_duration_ms: int


class SavedSearchRequest(BaseModel):
    """Request model for saving a search"""

    name: str = Field(..., min_length=1, max_length=255)
    search_query: str = Field(..., min_length=1)
    filters: SearchFiltersRequest
    notify_matches: bool = False
    notification_frequency: str = Field("daily", pattern="^(immediate|daily|weekly)$")


class SavedSearchResponse(BaseModel):
    """Response model for saved search"""

    id: uuid.UUID
    name: str
    search_query: str
    filters: Dict[str, Any]
    notify_matches: bool
    notification_frequency: str
    last_notified_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime


class SearchSuggestionsResponse(BaseModel):
    """Response model for search suggestions"""

    companies: List[str]
    positions: List[str]
    recent_searches: List[str]


class PopularSearchesResponse(BaseModel):
    """Response model for popular searches"""

    search_term: str
    total_searches: int
    avg_results: float
    zero_result_rate: float


class SearchAnalyticsResponse(BaseModel):
    """Response model for search analytics"""

    total_searches: int
    unique_terms: int
    avg_results_per_search: float
    zero_result_rate: float
    top_searches: List[PopularSearchesResponse]


# Resume Search Endpoints
@router.post("/resumes", response_model=SearchResponse)
@rate_limit(RateLimitType.SEARCH)
async def advanced_search_resumes(
    query: str = Query(..., min_length=1, description="Search query"),
    filters: Optional[SearchFiltersRequest] = None,
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Results per page"),
    sort_by: str = Query("relevance", description="Sort by: relevance, date, title"),
    sort_order: str = Query("desc", description="Sort order: asc, desc"),
    use_semantic_search: bool = Query(True, description="Use semantic search"),
    threshold: float = Query(
        0.3, ge=0, le=1, description="Minimum similarity threshold"
    ),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Advanced resume search with full-text search and comprehensive filters

    **Query Features:**
    - Boolean operators: AND, OR, NOT
    - Phrase search: "exact phrase"
    - Fuzzy matching: word~ (for typos)
    - Grouping: (parentheses)

    **Available Filters:**
    - Location: city, state, country, remote, hybrid, onsite, radius
    - Salary: min, max, currency, period
    - Experience: entry, mid, senior, lead, executive
    - Employment type: full-time, part-time, contract, internship
    - Industry and company size
    - Date ranges: posted date, application deadline
    """
    search_service = AdvancedSearchService(db)

    # Convert filters to SearchFilters object
    search_filters = None
    if filters:
        filter_dict = filters.model_dump(exclude_none=True)
        search_filters = SearchFilters(**filter_dict)

    # Execute search
    results = await search_service.search_resumes(
        user_id=current_user.id,
        query=query,
        filters=search_filters,
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        sort_order=sort_order,
        use_semantic_search=use_semantic_search,
        threshold=threshold,
    )

    return results


# JD Search Endpoints
@router.post("/jds", response_model=SearchResponse)
@rate_limit(RateLimitType.SEARCH)
async def advanced_search_jds(
    query: str = Query(..., min_length=1, description="Search query"),
    filters: Optional[SearchFiltersRequest] = None,
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Results per page"),
    sort_by: str = Query(
        "relevance", description="Sort by: relevance, date, title, salary, posted_date"
    ),
    sort_order: str = Query("desc", description="Sort order: asc, desc"),
    use_semantic_search: bool = Query(True, description="Use semantic search"),
    threshold: float = Query(
        0.3, ge=0, le=1, description="Minimum similarity threshold"
    ),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Advanced job description search with full-text search and comprehensive filters

    **Query Features:**
    - Boolean operators: AND, OR, NOT
    - Phrase search: "exact phrase"
    - Fuzzy matching: word~ (for typos)
    - Grouping: (parentheses)

    **Available Filters:**
    - Location: city, state, country, remote, hybrid, onsite, radius
    - Salary: min, max, currency, period
    - Experience: entry, mid, senior, lead, executive
    - Employment type: full-time, part-time, contract, internship
    - Industry and company size
    - Date ranges: posted date, application deadline
    """
    search_service = AdvancedSearchService(db)

    # Convert filters to SearchFilters object
    search_filters = None
    if filters:
        filter_dict = filters.model_dump(exclude_none=True)
        search_filters = SearchFilters(**filter_dict)

    # Execute search
    results = await search_service.search_jds(
        user_id=current_user.id,
        query=query,
        filters=search_filters,
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        sort_order=sort_order,
        use_semantic_search=use_semantic_search,
        threshold=threshold,
    )

    return results


# Application Search Endpoints
@router.post("/applications", response_model=SearchResponse)
@rate_limit(RateLimitType.SEARCH)
async def advanced_search_applications(
    query: Optional[str] = Query(None, description="Search query"),
    filters: Optional[SearchFiltersRequest] = None,
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Results per page"),
    sort_by: str = Query(
        "updated_at",
        description="Sort by: updated_at, created_at, match_score, company",
    ),
    sort_order: str = Query("desc", description="Sort order: asc, desc"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Advanced application search with comprehensive filters

    **Available Filters:**
    - Status: draft, optimized, applied, interview, offer, rejected
    - Match score: min, max
    - Date ranges: created, updated
    - Location, salary, experience, employment type
    """
    search_service = AdvancedSearchService(db)

    # Convert filters to SearchFilters object
    search_filters = None
    if filters:
        filter_dict = filters.model_dump(exclude_none=True)
        search_filters = SearchFilters(**filter_dict)

    # Execute search
    results = await search_service.search_applications(
        user_id=current_user.id,
        search_query=query,
        filters=search_filters,
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        sort_order=sort_order,
    )

    return results


# Saved Searches Endpoints
@router.post("/saved", response_model=SavedSearchResponse)
@rate_limit(RateLimitType.DEFAULT)
async def save_search(
    request: SavedSearchRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Save a search query for future use and optional notifications

    **Notification Options:**
    - `notify_matches`: Enable/disable notifications for new matching results
    - `notification_frequency`: How often to check for new matches
      - `immediate`: Notify as soon as new matches appear
      - `daily`: Daily digest of new matches
      - `weekly`: Weekly digest of new matches
    """
    search_service = AdvancedSearchService(db)

    # Convert filters to SearchFilters object
    filter_dict = request.filters.model_dump(exclude_none=True)
    search_filters = SearchFilters(**filter_dict)

    # Save the search
    saved_search = await search_service.save_search(
        user_id=current_user.id,
        name=request.name,
        search_query=request.search_query,
        filters=search_filters,
        notify_matches=request.notify_matches,
        notification_frequency=request.notification_frequency,
    )

    return SavedSearchResponse(
        id=saved_search.id,
        name=saved_search.name,
        search_query=saved_search.search_query,
        filters=json.loads(saved_search.filters) if saved_search.filters else {},
        notify_matches=saved_search.notify_matches,
        notification_frequency=saved_search.notification_frequency,
        last_notified_at=saved_search.last_notified_at,
        created_at=saved_search.created_at,
        updated_at=saved_search.updated_at,
    )


@router.get("/saved", response_model=List[SavedSearchResponse])
@rate_limit(RateLimitType.DEFAULT)
async def get_saved_searches(
    notify_only: bool = Query(
        False, description="Only return searches with notifications enabled"
    ),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get user's saved searches"""
    search_service = AdvancedSearchService(db)

    saved_searches = await search_service.get_saved_searches(
        user_id=current_user.id,
        notify_only=notify_only,
    )

    return [
        SavedSearchResponse(
            id=search.id,
            name=search.name,
            search_query=search.search_query,
            filters=json.loads(search.filters) if search.filters else {},
            notify_matches=search.notify_matches,
            notification_frequency=search.notification_frequency,
            last_notified_at=search.last_notified_at,
            created_at=search.created_at,
            updated_at=search.updated_at,
        )
        for search in saved_searches
    ]


@router.delete("/saved/{saved_search_id}")
@rate_limit(RateLimitType.DEFAULT)
async def delete_saved_search(
    saved_search_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a saved search"""
    search_service = AdvancedSearchService(db)

    success = await search_service.delete_saved_search(
        user_id=current_user.id,
        saved_search_id=saved_search_id,
    )

    if not success:
        raise HTTPException(status_code=404, detail="Saved search not found")

    return {"message": "Saved search deleted successfully"}


# Search Suggestions Endpoints
@router.get("/suggestions", response_model=SearchSuggestionsResponse)
@rate_limit(RateLimitType.DEFAULT)
async def get_search_suggestions(
    q: str = Query(..., min_length=2, description="Partial search query"),
    limit: int = Query(10, ge=1, le=50, description="Number of suggestions"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get search suggestions based on:
    - Company names from user's JDs
    - Position titles from user's JDs
    - Recent search history
    """
    search_service = AdvancedSearchService(db)

    suggestions = await search_service.get_search_suggestions(
        user_id=current_user.id,
        partial_query=q,
        limit=limit,
    )

    return suggestions


# Analytics Endpoints
@router.get(
    "/analytics/popular/{search_type}", response_model=List[PopularSearchesResponse]
)
@rate_limit(RateLimitType.DEFAULT)
async def get_popular_searches(
    search_type: str = Path(..., pattern="^(resume|jd|application)$"),
    limit: int = Query(10, ge=1, le=100, description="Number of results"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get popular search terms across all users

    **Search Types:**
    - `resume`: Resume searches
    - `jd`: Job description searches
    - `application`: Application searches
    """
    search_service = AdvancedSearchService(db)

    popular_searches = await search_service.get_popular_searches(
        search_type=search_type,
        limit=limit,
    )

    return popular_searches


@router.post("/track-click/{search_history_id}")
@rate_limit(RateLimitType.DEFAULT)
async def track_search_click(
    search_history_id: uuid.UUID,
    result_id: uuid.UUID = Body(..., embed=True),
    result_type: str = Body(..., embed=True, pattern="^(resume|jd|application)$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Track when a user clicks on a search result for analytics

    This helps improve search relevance and provides insights into user behavior.
    """
    search_service = AdvancedSearchService(db)

    await search_service.track_search_click(
        user_id=current_user.id,
        search_history_id=search_history_id,
        result_id=result_id,
        result_type=result_type,
    )

    return {"message": "Click tracked successfully"}


# Health check endpoint
@router.get("/health")
async def health_check():
    """Health check endpoint for advanced search service"""
    return {
        "status": "healthy",
        "service": "advanced-search",
        "features": [
            "full-text-search",
            "boolean-operators",
            "phrase-search",
            "fuzzy-matching",
            "advanced-filters",
            "saved-searches",
            "search-analytics",
            "search-suggestions",
        ],
    }
