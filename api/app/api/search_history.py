"""
Search history and saved searches API endpoints.
Provides comprehensive search tracking, management, and analytics.
"""

import uuid
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Query, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, desc, text
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.search import SearchHistory, SavedSearch, SearchAnalytics
from app.schemas.search import (
    SearchHistoryCreate,
    SearchHistoryResponse,
    SearchHistoryListResponse,
    SavedSearchCreate,
    SavedSearchUpdate,
    SavedSearchResponse,
    SavedSearchListResponse,
    SearchAnalyticsResponse,
    SearchAnalyticsSummary,
    SearchSuggestion,
    SearchSuggestionsResponse,
    SearchExport,
    SearchImport,
)
from app.middleware.rate_limit import rate_limit, RateLimitType
import json

router = APIRouter(prefix="/search/history", tags=["search-history"])

# Constants
MAX_HISTORY_ITEMS = 10  # Auto-maintain last 10 searches per type
MAX_SAVED_SEARCHES = 100  # Maximum saved searches per user


@router.post("", response_model=SearchHistoryResponse, status_code=201)
@rate_limit(RateLimitType.SEARCH)
async def create_search_history(
    search_data: SearchHistoryCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new search history entry.
    Automatically maintains only the last 10 searches per type.
    """
    try:
        # Create new search history entry
        new_history = SearchHistory(
            user_id=current_user.id,
            query=search_data.query,
            search_type=search_data.search_type,
            filters=search_data.filters,
            result_count=search_data.result_count,
            is_sensitive=search_data.is_sensitive,
            search_timestamp=datetime.utcnow(),
        )

        db.add(new_history)

        # Auto-cleanup: Keep only last MAX_HISTORY_ITEMS per type
        cleanup_query = (
            select(SearchHistory.id)
            .where(
                and_(
                    SearchHistory.user_id == current_user.id,
                    SearchHistory.search_type == search_data.search_type,
                )
            )
            .order_by(desc(SearchHistory.search_timestamp))
        )

        result = await db.execute(cleanup_query)
        all_ids = [row[0] for row in result.fetchall()]

        # Delete excess entries (keep only MAX_HISTORY_ITEMS)
        if len(all_ids) > MAX_HISTORY_ITEMS:
            ids_to_delete = all_ids[MAX_HISTORY_ITEMS:]
            for history_id in ids_to_delete:
                await db.execute(
                    select(SearchHistory).where(SearchHistory.id == history_id)
                )
                history_obj = await db.get(SearchHistory, history_id)
                if history_obj:
                    await db.delete(history_obj)

        await db.commit()
        await db.refresh(new_history)

        # Update analytics asynchronously (non-blocking)
        _update_search_analytics(db, current_user.id, search_data)

        return SearchHistoryResponse(
            id=new_history.id,
            query=new_history.query,
            search_type=new_history.search_type,
            filters=new_history.filters,
            result_count=new_history.result_count,
            search_timestamp=new_history.search_timestamp,
            is_sensitive=new_history.is_sensitive,
        )

    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=500, detail=f"Failed to create search history: {str(e)}"
        )


@router.get("", response_model=SearchHistoryListResponse)
@rate_limit(RateLimitType.SEARCH)
async def get_search_history(
    search_type: Optional[str] = Query(None, regex="^(resume|jd|application)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get paginated search history for the current user."""
    conditions = [SearchHistory.user_id == current_user.id]

    if search_type:
        conditions.append(SearchHistory.search_type == search_type)

    # Get total count
    count_stmt = (
        select(func.count()).select_from(SearchHistory).where(and_(*conditions))
    )
    total_result = await db.execute(count_stmt)
    total = total_result.scalar() or 0

    # Get paginated results
    query_stmt = (
        select(SearchHistory)
        .where(and_(*conditions))
        .order_by(desc(SearchHistory.search_timestamp))
        .limit(page_size)
        .offset((page - 1) * page_size)
    )

    result = await db.execute(query_stmt)
    items = result.scalars().all()

    return SearchHistoryListResponse(
        items=[
            SearchHistoryResponse(
                id=item.id,
                query=item.query,
                search_type=item.search_type,
                filters=item.filters,
                result_count=item.result_count,
                search_timestamp=item.search_timestamp,
                is_sensitive=item.is_sensitive,
            )
            for item in items
        ],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.delete("/{history_id}", status_code=204)
@rate_limit(RateLimitType.SEARCH)
async def delete_search_history(
    history_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a specific search history entry."""
    query = select(SearchHistory).where(
        and_(SearchHistory.id == history_id, SearchHistory.user_id == current_user.id)
    )
    result = await db.execute(query)
    history = result.scalar_one_or_none()

    if not history:
        raise HTTPException(status_code=404, detail="Search history not found")

    await db.delete(history)
    await db.commit()

    return None


@router.delete("", status_code=204)
@rate_limit(RateLimitType.SEARCH)
async def clear_search_history(
    search_type: Optional[str] = Query(None, regex="^(resume|jd|application)$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Clear all search history (optionally filtered by type)."""
    conditions = [SearchHistory.user_id == current_user.id]

    if search_type:
        conditions.append(SearchHistory.search_type == search_type)

    query = select(SearchHistory).where(and_(*conditions))
    result = await db.execute(query)
    items = result.scalars().all()

    for item in items:
        await db.delete(item)

    await db.commit()

    return None


# Saved Searches Endpoints


@router.post("/saved", response_model=SavedSearchResponse, status_code=201)
@rate_limit(RateLimitType.SEARCH)
async def create_saved_search(
    search_data: SavedSearchCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new saved search."""
    try:
        # Check if user has reached maximum saved searches
        count_stmt = select(func.count()).where(SavedSearch.user_id == current_user.id)
        count_result = await db.execute(count_stmt)
        current_count = count_result.scalar() or 0

        if current_count >= MAX_SAVED_SEARCHES:
            raise HTTPException(
                status_code=400,
                detail=f"Maximum saved searches limit ({MAX_SAVED_SEARCHES}) reached",
            )

        new_saved = SavedSearch(
            user_id=current_user.id,
            name=search_data.name,
            description=search_data.description,
            query=search_data.query,
            search_type=search_data.search_type,
            filters=search_data.filters,
            tags=search_data.tags or [],
            is_favorite=search_data.is_favorite,
            usage_count=0,
        )

        db.add(new_saved)
        await db.commit()
        await db.refresh(new_saved)

        return SavedSearchResponse(
            id=new_saved.id,
            name=new_saved.name,
            description=new_saved.description,
            query=new_saved.query,
            search_type=new_saved.search_type,
            filters=new_saved.filters,
            usage_count=new_saved.usage_count,
            last_used_at=new_saved.last_used_at,
            tags=new_saved.tags,
            is_favorite=new_saved.is_favorite,
            created_at=new_saved.created_at,
            updated_at=new_saved.updated_at,
        )

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=500, detail=f"Failed to create saved search: {str(e)}"
        )


@router.get("/saved", response_model=SavedSearchListResponse)
@rate_limit(RateLimitType.SEARCH)
async def get_saved_searches(
    search_type: Optional[str] = Query(None, regex="^(resume|jd|application)$"),
    favorite_only: bool = Query(False),
    tag: Optional[str] = Query(None),
    sort_by: str = Query(
        "created_at", regex="^(created_at|usage_count|name|last_used_at)$"
    ),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get paginated saved searches with filtering and sorting."""
    conditions = [SavedSearch.user_id == current_user.id]

    if search_type:
        conditions.append(SavedSearch.search_type == search_type)
    if favorite_only:
        conditions.append(SavedSearch.is_favorite == True)
    if tag:
        conditions.append(SavedSearch.tags.contains([tag]))

    # Get total count
    count_stmt = select(func.count()).select_from(SavedSearch).where(and_(*conditions))
    total_result = await db.execute(count_stmt)
    total = total_result.scalar() or 0

    # Build order by clause
    order_column = {
        "created_at": SavedSearch.created_at,
        "usage_count": SavedSearch.usage_count,
        "name": SavedSearch.name,
        "last_used_at": SavedSearch.last_used_at,
    }[sort_by]

    # Get paginated results
    query_stmt = (
        select(SavedSearch)
        .where(and_(*conditions))
        .order_by(desc(order_column))
        .limit(page_size)
        .offset((page - 1) * page_size)
    )

    result = await db.execute(query_stmt)
    items = result.scalars().all()

    return SavedSearchListResponse(
        items=[
            SavedSearchResponse(
                id=item.id,
                name=item.name,
                description=item.description,
                query=item.query,
                search_type=item.search_type,
                filters=item.filters,
                usage_count=item.usage_count,
                last_used_at=item.last_used_at,
                tags=item.tags,
                is_favorite=item.is_favorite,
                created_at=item.created_at,
                updated_at=item.updated_at,
            )
            for item in items
        ],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/saved/{saved_id}", response_model=SavedSearchResponse)
@rate_limit(RateLimitType.SEARCH)
async def get_saved_search(
    saved_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific saved search."""
    query = select(SavedSearch).where(
        and_(SavedSearch.id == saved_id, SavedSearch.user_id == current_user.id)
    )
    result = await db.execute(query)
    saved = result.scalar_one_or_none()

    if not saved:
        raise HTTPException(status_code=404, detail="Saved search not found")

    return SavedSearchResponse(
        id=saved.id,
        name=saved.name,
        description=saved.description,
        query=saved.query,
        search_type=saved.search_type,
        filters=saved.filters,
        usage_count=saved.usage_count,
        last_used_at=saved.last_used_at,
        tags=saved.tags,
        is_favorite=saved.is_favorite,
        created_at=saved.created_at,
        updated_at=saved.updated_at,
    )


@router.put("/saved/{saved_id}", response_model=SavedSearchResponse)
@rate_limit(RateLimitType.SEARCH)
async def update_saved_search(
    saved_id: uuid.UUID,
    update_data: SavedSearchUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a saved search."""
    query = select(SavedSearch).where(
        and_(SavedSearch.id == saved_id, SavedSearch.user_id == current_user.id)
    )
    result = await db.execute(query)
    saved = result.scalar_one_or_none()

    if not saved:
        raise HTTPException(status_code=404, detail="Saved search not found")

    # Update fields
    update_dict = update_data.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(saved, field, value)

    saved.updated_at = datetime.utcnow()

    await db.commit()
    await db.refresh(saved)

    return SavedSearchResponse(
        id=saved.id,
        name=saved.name,
        description=saved.description,
        query=saved.query,
        search_type=saved.search_type,
        filters=saved.filters,
        usage_count=saved.usage_count,
        last_used_at=saved.last_used_at,
        tags=saved.tags,
        is_favorite=saved.is_favorite,
        created_at=saved.created_at,
        updated_at=saved.updated_at,
    )


@router.delete("/saved/{saved_id}", status_code=204)
@rate_limit(RateLimitType.SEARCH)
async def delete_saved_search(
    saved_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a saved search."""
    query = select(SavedSearch).where(
        and_(SavedSearch.id == saved_id, SavedSearch.user_id == current_user.id)
    )
    result = await db.execute(query)
    saved = result.scalar_one_or_none()

    if not saved:
        raise HTTPException(status_code=404, detail="Saved search not found")

    await db.delete(saved)
    await db.commit()

    return None


@router.post("/saved/{saved_id}/run", response_model=SearchHistoryResponse)
@rate_limit(RateLimitType.SEARCH)
async def run_saved_search(
    saved_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Re-run a saved search and track usage.
    Creates a new search history entry and updates usage count.
    """
    query = select(SavedSearch).where(
        and_(SavedSearch.id == saved_id, SavedSearch.user_id == current_user.id)
    )
    result = await db.execute(query)
    saved = result.scalar_one_or_none()

    if not saved:
        raise HTTPException(status_code=404, detail="Saved search not found")

    # Update usage tracking
    saved.usage_count += 1
    saved.last_used_at = datetime.utcnow()

    # Create search history entry
    history_data = SearchHistoryCreate(
        query=saved.query,
        search_type=saved.search_type,
        filters=saved.filters,
        result_count=0,  # Will be updated when actual search runs
        is_sensitive=False,
    )

    history_entry = SearchHistory(
        user_id=current_user.id,
        query=history_data.query,
        search_type=history_data.search_type,
        filters=history_data.filters,
        result_count=history_data.result_count,
        is_sensitive=history_data.is_sensitive,
        search_timestamp=datetime.utcnow(),
    )

    db.add(history_entry)
    await db.commit()
    await db.refresh(history_entry)

    return SearchHistoryResponse(
        id=history_entry.id,
        query=history_entry.query,
        search_type=history_entry.search_type,
        filters=history_entry.filters,
        result_count=history_entry.result_count,
        search_timestamp=history_entry.search_timestamp,
        is_sensitive=history_entry.is_sensitive,
    )


# Analytics and Suggestions


@router.get("/analytics", response_model=SearchAnalyticsSummary)
@rate_limit(RateLimitType.SEARCH)
async def get_search_analytics(
    days: int = Query(30, ge=1, le=365, description="Number of days to analyze"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get comprehensive search analytics and insights."""
    cutoff_date = datetime.utcnow() - timedelta(days=days)

    # Total searches in period
    total_stmt = select(func.count()).where(
        and_(
            SearchHistory.user_id == current_user.id,
            SearchHistory.search_timestamp >= cutoff_date,
        )
    )
    total_result = await db.execute(total_stmt)
    total_searches = total_result.scalar() or 0

    # Most common search terms
    common_terms_stmt = (
        select(
            SearchHistory.query,
            SearchHistory.search_type,
            func.count(SearchHistory.id).label("count"),
            func.max(SearchHistory.search_timestamp).label("last_searched"),
            func.avg(SearchHistory.result_count).label("avg_results"),
        )
        .where(
            and_(
                SearchHistory.user_id == current_user.id,
                SearchHistory.search_timestamp >= cutoff_date,
            )
        )
        .group_by(SearchHistory.query, SearchHistory.search_type)
        .order_by(desc("count"))
        .limit(10)
    )

    common_result = await db.execute(common_terms_stmt)
    most_common_terms = [
        SearchAnalyticsResponse(
            search_term=row.query,
            search_type=row.search_type,
            search_count=row.count,
            last_searched_at=row.last_searched,
            avg_result_count=int(row.avg_results) if row.avg_results else None,
            avg_search_duration=None,
        )
        for row in common_result.fetchall()
    ]

    # Search type breakdown
    type_breakdown_stmt = (
        select(SearchHistory.search_type, func.count(SearchHistory.id).label("count"))
        .where(
            and_(
                SearchHistory.user_id == current_user.id,
                SearchHistory.search_timestamp >= cutoff_date,
            )
        )
        .group_by(SearchHistory.search_type)
    )

    type_result = await db.execute(type_breakdown_stmt)
    search_type_breakdown = {
        row.search_type: row.count for row in type_result.fetchall()
    }

    # Recent activity
    recent_stmt = (
        select(SearchHistory)
        .where(SearchHistory.user_id == current_user.id)
        .order_by(desc(SearchHistory.search_timestamp))
        .limit(10)
    )

    recent_result = await db.execute(recent_stmt)
    recent_activity = [
        SearchHistoryResponse(
            id=item.id,
            query=item.query,
            search_type=item.search_type,
            filters=item.filters,
            result_count=item.result_count,
            search_timestamp=item.search_timestamp,
            is_sensitive=item.is_sensitive,
        )
        for item in recent_result.scalars().all()
    ]

    # Top saved searches
    top_saved_stmt = (
        select(SavedSearch)
        .where(SavedSearch.user_id == current_user.id)
        .order_by(desc(SavedSearch.usage_count))
        .limit(5)
    )

    top_saved_result = await db.execute(top_saved_stmt)
    top_saved_searches = [
        SavedSearchResponse(
            id=item.id,
            name=item.name,
            description=item.description,
            query=item.query,
            search_type=item.search_type,
            filters=item.filters,
            usage_count=item.usage_count,
            last_used_at=item.last_used_at,
            tags=item.tags,
            is_favorite=item.is_favorite,
            created_at=item.created_at,
            updated_at=item.updated_at,
        )
        for item in top_saved_result.scalars().all()
    ]

    return SearchAnalyticsSummary(
        total_searches=total_searches,
        most_common_terms=most_common_terms,
        search_type_breakdown=search_type_breakdown,
        recent_activity=recent_activity,
        top_saved_searches=top_saved_searches,
    )


@router.get("/suggestions", response_model=SearchSuggestionsResponse)
@rate_limit(RateLimitType.SEARCH)
async def get_search_suggestions(
    q: str = Query(..., min_length=2, description="Partial search query"),
    limit: int = Query(10, ge=1, le=20),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get search suggestions based on history, saved searches, and analytics.
    Returns ranked suggestions for autocomplete functionality.
    """
    search_pattern = f"%{q}%"

    # Get matching history
    history_query = (
        select(SearchHistory)
        .where(
            and_(
                SearchHistory.user_id == current_user.id,
                SearchHistory.query.ilike(search_pattern),
            )
        )
        .order_by(desc(SearchHistory.search_timestamp))
        .limit(5)
    )

    history_result = await db.execute(history_query)
    history_items = history_result.scalars().all()

    # Get matching saved searches
    saved_query = (
        select(SavedSearch)
        .where(
            and_(
                SavedSearch.user_id == current_user.id,
                SavedSearch.query.ilike(search_pattern),
            )
        )
        .order_by(desc(SavedSearch.usage_count))
        .limit(5)
    )

    saved_result = await db.execute(saved_query)
    saved_items = saved_result.scalars().all()

    # Get matching analytics
    analytics_query = (
        select(SearchAnalytics)
        .where(
            and_(
                SearchAnalytics.user_id == current_user.id,
                SearchAnalytics.search_term.ilike(search_pattern),
            )
        )
        .order_by(desc(SearchAnalytics.search_count))
        .limit(5)
    )

    analytics_result = await db.execute(analytics_query)
    analytics_items = analytics_result.scalars().all()

    # Build suggestions
    suggestions = []

    # Add from history
    for item in history_items:
        suggestions.append(
            SearchSuggestion(
                term=item.query,
                type="history",
                frequency=None,
                filters=item.filters,
                last_used=item.search_timestamp,
            )
        )

    # Add from saved searches
    for item in saved_items:
        suggestions.append(
            SearchSuggestion(
                term=item.query,
                type="saved",
                frequency=item.usage_count,
                filters=item.filters,
                last_used=item.last_used_at,
            )
        )

    # Add from analytics
    for item in analytics_items:
        suggestions.append(
            SearchSuggestion(
                term=item.search_term,
                type="analytic",
                frequency=item.search_count,
                filters=None,
                last_used=item.last_searched_at,
            )
        )

    # Sort by relevance (frequency and recency) and limit
    suggestions = sorted(
        suggestions,
        key=lambda x: (
            -(x.frequency or 0),  # Negative for descending sort
            -(x.last_used.timestamp() if x.last_used else 0),
        ),
    )[:limit]

    return SearchSuggestionsResponse(suggestions=suggestions, query=q)


# Export/Import


@router.get("/saved/export", response_model=SearchExport)
@rate_limit(RateLimitType.SEARCH)
async def export_saved_searches(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Export all saved searches for backup or sharing."""
    query = (
        select(SavedSearch)
        .where(SavedSearch.user_id == current_user.id)
        .order_by(SavedSearch.created_at)
    )

    result = await db.execute(query)
    items = result.scalars().all()

    searches = [
        SavedSearchResponse(
            id=item.id,
            name=item.name,
            description=item.description,
            query=item.query,
            search_type=item.search_type,
            filters=item.filters,
            usage_count=item.usage_count,
            last_used_at=item.last_used_at,
            tags=item.tags,
            is_favorite=item.is_favorite,
            created_at=item.created_at,
            updated_at=item.updated_at,
        )
        for item in items
    ]

    return SearchExport(searches=searches, exported_at=datetime.utcnow())


@router.post("/saved/import", response_model=Dict[str, int])
@rate_limit(RateLimitType.SEARCH)
async def import_saved_searches(
    import_data: SearchImport,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Import saved searches from export.
    Supports different merge strategies: replace, merge, skip_existing.
    """
    # Check current count
    count_stmt = select(func.count()).where(SavedSearch.user_id == current_user.id)
    count_result = await db.execute(count_stmt)
    current_count = count_result.scalar() or 0

    imported = 0
    skipped = 0
    failed = 0

    if import_data.merge_strategy == "replace":
        # Delete all existing saved searches
        delete_query = select(SavedSearch).where(SavedSearch.user_id == current_user.id)
        delete_result = await db.execute(delete_query)
        items_to_delete = delete_result.scalars().all()

        for item in items_to_delete:
            await db.delete(item)

    for search_data in import_data.searches:
        # Check limit
        count_result = await db.execute(count_stmt)
        current_count = count_result.scalar() or 0

        if current_count >= MAX_SAVED_SEARCHES:
            failed += 1
            continue

        try:
            if import_data.merge_strategy == "skip_existing":
                # Check if search with same name exists
                exists_query = select(SavedSearch).where(
                    and_(
                        SavedSearch.user_id == current_user.id,
                        SavedSearch.name == search_data.name,
                    )
                )
                exists_result = await db.execute(exists_query)
                if exists_result.scalar_one_or_none():
                    skipped += 1
                    continue

            new_saved = SavedSearch(
                user_id=current_user.id,
                name=search_data.name,
                description=search_data.description,
                query=search_data.query,
                search_type=search_data.search_type,
                filters=search_data.filters,
                tags=search_data.tags or [],
                is_favorite=search_data.is_favorite,
                usage_count=0,
            )

            db.add(new_saved)
            imported += 1

        except Exception:
            failed += 1

    await db.commit()

    return {"imported": imported, "skipped": skipped, "failed": failed}


# Helper function for async analytics updates
async def _update_search_analytics(
    db: AsyncSession, user_id: uuid.UUID, search_data: SearchHistoryCreate
):
    """Update search analytics asynchronously."""
    try:
        # Check if analytics entry exists
        query = select(SearchAnalytics).where(
            and_(
                SearchAnalytics.user_id == user_id,
                SearchAnalytics.search_term == search_data.query,
                SearchAnalytics.search_type == search_data.search_type,
            )
        )

        result = await db.execute(query)
        analytics = result.scalar_one_or_none()

        if analytics:
            # Update existing analytics
            analytics.search_count += 1
            analytics.last_searched_at = datetime.utcnow()

            # Update average result count
            if search_data.result_count > 0:
                current_avg = analytics.avg_result_count or 0
                new_avg = int(
                    (
                        current_avg * (analytics.search_count - 1)
                        + search_data.result_count
                    )
                    / analytics.search_count
                )
                analytics.avg_result_count = new_avg

            analytics.updated_at = datetime.utcnow()
        else:
            # Create new analytics entry
            new_analytics = SearchAnalytics(
                user_id=user_id,
                search_term=search_data.query,
                search_type=search_data.search_type,
                search_count=1,
                last_searched_at=datetime.utcnow(),
                avg_result_count=(
                    search_data.result_count if search_data.result_count > 0 else None
                ),
            )
            db.add(new_analytics)

        await db.commit()

    except Exception as e:
        # Don't fail the main request if analytics update fails
        print(f"Failed to update search analytics: {str(e)}")
        await db.rollback()
