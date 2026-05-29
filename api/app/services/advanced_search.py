"""
Advanced Search Service with PostgreSQL Full-Text Search and Filters

This service provides comprehensive search capabilities including:
- Full-text search with tsvector
- Boolean operators (AND, OR, NOT)
- Phrase search with quotes
- Fuzzy matching for typos
- Advanced filters (location, salary, experience, etc.)
- Search result ranking and scoring
- Search analytics and tracking
"""

import uuid
import re
import time
from typing import List, Optional, Dict, Any
from datetime import datetime, date, date as date_type
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import (
    select,
    func,
    text,
    and_,
    or_,
    desc,
    asc,
    cast,
)
from sqlalchemy.sql import Select
import json

from app.models.resume import Resume
from app.models.jd import JD
from app.models.application import Application
from app.models.search import (
    SavedSearch,
    SearchHistory,
    SearchAnalytics,
)


class SearchFilters:
    """Search filter parameters"""

    def __init__(
        self,
        # Location filters
        location_city: Optional[str] = None,
        location_state: Optional[str] = None,
        location_country: Optional[str] = None,
        location_remote: Optional[bool] = None,
        location_hybrid: Optional[bool] = None,
        location_onsite: Optional[bool] = None,
        location_radius: Optional[int] = None,  # Radius in miles
        # Salary filters
        salary_min: Optional[float] = None,
        salary_max: Optional[float] = None,
        salary_currency: Optional[str] = "USD",
        salary_period: Optional[str] = None,
        # Experience filters
        experience_level: Optional[str] = None,
        # Job type filters
        employment_type: Optional[str] = None,
        # Industry filters
        industry: Optional[str] = None,
        company_size: Optional[str] = None,
        # Date filters
        posted_date_from: Optional[date_type] = None,
        posted_date_to: Optional[date_type] = None,
        application_deadline_from: Optional[date_type] = None,
        application_deadline_to: Optional[date_type] = None,
        # Status filters
        status: Optional[str] = None,
        # Match score filters
        min_match_score: Optional[float] = None,
        max_match_score: Optional[float] = None,
    ):
        self.location_city = location_city
        self.location_state = location_state
        self.location_country = location_country
        self.location_remote = location_remote
        self.location_hybrid = location_hybrid
        self.location_onsite = location_onsite
        self.location_radius = location_radius
        self.salary_min = salary_min
        self.salary_max = salary_max
        self.salary_currency = salary_currency
        self.salary_period = salary_period
        self.experience_level = experience_level
        self.employment_type = employment_type
        self.industry = industry
        self.company_size = company_size
        self.posted_date_from = posted_date_from
        self.posted_date_to = posted_date_to
        self.application_deadline_from = application_deadline_from
        self.application_deadline_to = application_deadline_to
        self.status = status
        self.min_match_score = min_match_score
        self.max_match_score = max_match_score

    def to_dict(self) -> Dict[str, Any]:
        """Convert filters to dictionary for storage"""
        return {
            "location_city": self.location_city,
            "location_state": self.location_state,
            "location_country": self.location_country,
            "location_remote": self.location_remote,
            "location_hybrid": self.location_hybrid,
            "location_onsite": self.location_onsite,
            "location_radius": self.location_radius,
            "salary_min": self.salary_min,
            "salary_max": self.salary_max,
            "salary_currency": self.salary_currency,
            "salary_period": self.salary_period,
            "experience_level": self.experience_level,
            "employment_type": self.employment_type,
            "industry": self.industry,
            "company_size": self.company_size,
            "posted_date_from": (
                self.posted_date_from.isoformat() if self.posted_date_from else None
            ),
            "posted_date_to": (
                self.posted_date_to.isoformat() if self.posted_date_to else None
            ),
            "application_deadline_from": (
                self.application_deadline_from.isoformat()
                if self.application_deadline_from
                else None
            ),
            "application_deadline_to": (
                self.application_deadline_to.isoformat()
                if self.application_deadline_to
                else None
            ),
            "status": self.status,
            "min_match_score": self.min_match_score,
            "max_match_score": self.max_match_score,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "SearchFilters":
        """Create filters from dictionary"""
        # Convert date strings back to date objects
        for key in [
            "posted_date_from",
            "posted_date_to",
            "application_deadline_from",
            "application_deadline_to",
        ]:
            if data.get(key) and isinstance(data[key], str):
                data[key] = date.fromisoformat(data[key])
        return cls(**data)


class AdvancedSearchService:
    """Advanced search service with full-text search and comprehensive filtering"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def search_resumes(
        self,
        user_id: uuid.UUID,
        query: str,
        filters: Optional[SearchFilters] = None,
        page: int = 1,
        page_size: int = 10,
        sort_by: str = "relevance",
        sort_order: str = "desc",
        use_semantic_search: bool = True,
        threshold: float = 0.3,
        track_analytics: bool = True,
    ) -> Dict[str, Any]:
        """
        Advanced resume search with full-text search and filters

        Args:
            user_id: User ID for permission filtering
            query: Search query string
            filters: SearchFilters object with all filter parameters
            page: Page number (1-indexed)
            page_size: Number of results per page
            sort_by: Sort field (relevance, date, title)
            sort_order: Sort order (asc, desc)
            use_semantic_search: Whether to use vector similarity search
            threshold: Minimum similarity threshold for semantic search
            track_analytics: Whether to track search analytics

        Returns:
            Dictionary with search results and metadata
        """
        start_time = time.time()

        # Parse search query for boolean operators and phrases
        search_config = self._parse_search_query(query)

        # Build base query with full-text search
        query_builder = self._build_resume_search_query(
            user_id=user_id,
            search_config=search_config,
            filters=filters,
            use_semantic_search=use_semantic_search,
            threshold=threshold,
        )

        # Apply sorting
        query_builder = self._apply_sorting(
            query_builder, sort_by, sort_order, "resume", use_semantic_search
        )

        # Get total count
        total = await self._get_count(query_builder)

        # Apply pagination
        offset = (page - 1) * page_size
        query_builder = query_builder.limit(page_size).offset(offset)

        # Execute search
        results = await self._execute_resume_search(query_builder)

        # Track analytics
        search_duration = int((time.time() - start_time) * 1000)
        if track_analytics:
            await self._track_search(
                user_id=user_id,
                search_query=query,
                filters=filters,
                results_count=len(results),
                search_type="resume",
                search_duration_ms=search_duration,
            )

        return {
            "results": results,
            "total": total,
            "page": page,
            "page_size": page_size,
            "query": query,
            "filters_applied": filters.to_dict() if filters else {},
            "search_duration_ms": search_duration,
        }

    async def search_jds(
        self,
        user_id: uuid.UUID,
        query: str,
        filters: Optional[SearchFilters] = None,
        page: int = 1,
        page_size: int = 10,
        sort_by: str = "relevance",
        sort_order: str = "desc",
        use_semantic_search: bool = True,
        threshold: float = 0.3,
        track_analytics: bool = True,
    ) -> Dict[str, Any]:
        """
        Advanced job description search with full-text search and filters

        Args:
            user_id: User ID for permission filtering
            query: Search query string
            filters: SearchFilters object with all filter parameters
            page: Page number (1-indexed)
            page_size: Number of results per page
            sort_by: Sort field (relevance, date, title, salary, posted_date)
            sort_order: Sort order (asc, desc)
            use_semantic_search: Whether to use vector similarity search
            threshold: Minimum similarity threshold for semantic search
            track_analytics: Whether to track search analytics

        Returns:
            Dictionary with search results and metadata
        """
        start_time = time.time()

        # Parse search query for boolean operators and phrases
        search_config = self._parse_search_query(query)

        # Build base query with full-text search
        query_builder = self._build_jd_search_query(
            user_id=user_id,
            search_config=search_config,
            filters=filters,
            use_semantic_search=use_semantic_search,
            threshold=threshold,
        )

        # Apply sorting
        query_builder = self._apply_sorting(
            query_builder, sort_by, sort_order, "jd", use_semantic_search
        )

        # Get total count
        total = await self._get_count(query_builder)

        # Apply pagination
        offset = (page - 1) * page_size
        query_builder = query_builder.limit(page_size).offset(offset)

        # Execute search
        results = await self._execute_jd_search(query_builder)

        # Track analytics
        search_duration = int((time.time() - start_time) * 1000)
        if track_analytics:
            await self._track_search(
                user_id=user_id,
                search_query=query,
                filters=filters,
                results_count=len(results),
                search_type="jd",
                search_duration_ms=search_duration,
            )

        return {
            "results": results,
            "total": total,
            "page": page,
            "page_size": page_size,
            "query": query,
            "filters_applied": filters.to_dict() if filters else {},
            "search_duration_ms": search_duration,
        }

    async def search_applications(
        self,
        user_id: uuid.UUID,
        query: Optional[str] = None,
        filters: Optional[SearchFilters] = None,
        page: int = 1,
        page_size: int = 10,
        sort_by: str = "updated_at",
        sort_order: str = "desc",
        track_analytics: bool = True,
    ) -> Dict[str, Any]:
        """
        Advanced application search with filters

        Args:
            user_id: User ID for permission filtering
            query: Optional search query string
            filters: SearchFilters object with all filter parameters
            page: Page number (1-indexed)
            page_size: Number of results per page
            sort_by: Sort field (updated_at, created_at, match_score, company)
            sort_order: Sort order (asc, desc)
            track_analytics: Whether to track search analytics

        Returns:
            Dictionary with search results and metadata
        """
        start_time = time.time()

        # Build base query with joins
        query_builder = self._build_application_search_query(
            user_id=user_id, search_query=query, filters=filters
        )

        # Apply sorting
        query_builder = self._apply_sorting(
            query_builder, sort_by, sort_order, "application", False
        )

        # Get total count
        total = await self._get_count(query_builder)

        # Apply pagination
        offset = (page - 1) * page_size
        query_builder = query_builder.limit(page_size).offset(offset)

        # Execute search
        results = await self._execute_application_search(query_builder)

        # Track analytics
        search_duration = int((time.time() - start_time) * 1000)
        if track_analytics:
            await self._track_search(
                user_id=user_id,
                search_query=query or "",
                filters=filters,
                results_count=len(results),
                search_type="application",
                search_duration_ms=search_duration,
            )

        return {
            "results": results,
            "total": total,
            "page": page,
            "page_size": page_size,
            "query": query or "",
            "filters_applied": filters.to_dict() if filters else {},
            "search_duration_ms": search_duration,
        }

    def _parse_search_query(self, query: str) -> Dict[str, Any]:
        """
        Parse search query for boolean operators and phrases

        Supports:
        - Boolean operators: AND, OR, NOT
        - Phrase search: "exact phrase"
        - Fuzzy matching: word~ (for typos)
        - Grouping: (parentheses)

        Returns:
            Dictionary with parsed search components
        """
        # Remove excessive whitespace
        query = " ".join(query.split())

        # Extract phrases in quotes
        phrases = re.findall(r'"([^"]*)"', query)
        query_without_phrases = re.sub(r'"[^"]*"', "", query)

        # Extract boolean operators
        has_and = " AND " in query.upper()
        has_or = " OR " in query.upper()
        has_not = " NOT " in query.upper()

        # Extract fuzzy search terms (word~)
        fuzzy_terms = re.findall(r"(\w+)~", query)
        query_without_fuzzy = re.sub(r"\w+~", "", query)

        # Get remaining terms
        terms = query_without_phrases.lower().split()
        terms = [t for t in terms if t not in ["AND", "OR", "NOT", ""]]

        return {
            "original_query": query,
            "phrases": phrases,
            "terms": terms,
            "fuzzy_terms": fuzzy_terms,
            "has_and": has_and,
            "has_or": has_or,
            "has_not": has_not,
            "query_without_phrases": query_without_phrases,
            "query_without_fuzzy": query_without_fuzzy,
        }

    def _build_resume_search_query(
        self,
        user_id: uuid.UUID,
        search_config: Dict[str, Any],
        filters: Optional[SearchFilters],
        use_semantic_search: bool,
        threshold: float,
    ) -> Select:
        """Build resume search query with full-text search and filters"""
        # Start with base query
        if use_semantic_search:
            # Will be implemented with semantic search
            query_builder = select(
                Resume.id,
                Resume.title,
                Resume.content,
                Resume.created_at,
                cast(1.0, type(float)).label("relevance_score"),
            ).where(Resume.user_id == user_id)
        else:
            # Use full-text search
            query_builder = select(
                Resume.id,
                Resume.title,
                Resume.content,
                Resume.created_at,
                cast(1.0, type(float)).label("relevance_score"),
            ).where(Resume.user_id == user_id)

        # Apply full-text search if query exists
        if search_config["original_query"]:
            # Build tsquery from search config
            tsquery = self._build_tsquery(search_config)
            if tsquery:
                # Add full-text search condition with ranking
                query_builder = query_builder.where(
                    Resume.search_tsvector.op("@@")(tsquery)
                )
                # Add ranking score
                query_builder = query_builder.add_columns(
                    ts_rank(Resume.search_tsvector, tsquery).label("rank_score")
                )

        # Apply filters
        if filters:
            query_builder = self._apply_resume_filters(query_builder, filters)

        return query_builder

    def _build_jd_search_query(
        self,
        user_id: uuid.UUID,
        search_config: Dict[str, Any],
        filters: Optional[SearchFilters],
        use_semantic_search: bool,
        threshold: float,
    ) -> Select:
        """Build JD search query with full-text search and filters"""
        # Start with base query
        query_builder = select(
            JD.id,
            JD.title,
            JD.company,
            JD.content,
            JD.created_at,
            JD.salary_min,
            JD.salary_max,
            JD.salary_currency,
            JD.salary_period,
            JD.location_city,
            JD.location_state,
            JD.location_country,
            JD.location_remote,
            JD.location_hybrid,
            JD.location_onsite,
            JD.experience_level,
            JD.employment_type,
            JD.industry,
            JD.company_size,
            JD.posted_date,
            JD.application_deadline,
            cast(1.0, type(float)).label("relevance_score"),
        ).where(JD.user_id == user_id)

        # Apply full-text search if query exists
        if search_config["original_query"]:
            # Build tsquery from search config
            tsquery = self._build_tsquery(search_config)
            if tsquery:
                # Add full-text search condition with ranking
                query_builder = query_builder.where(
                    JD.search_tsvector.op("@@")(tsquery)
                )
                # Add ranking score
                query_builder = query_builder.add_columns(
                    func.ts_rank(JD.search_tsvector, tsquery).label("rank_score")
                )

        # Apply filters
        if filters:
            query_builder = self._apply_jd_filters(query_builder, filters)

        return query_builder

    def _build_application_search_query(
        self,
        user_id: uuid.UUID,
        search_query: Optional[str],
        filters: Optional[SearchFilters],
    ) -> Select:
        """Build application search query with filters"""
        # Build query with joins
        query_builder = (
            select(
                Application.id,
                Application.status,
                Application.match_score,
                Application.created_at,
                Application.updated_at,
                Resume.title.label("resume_title"),
                JD.title.label("jd_title"),
                JD.company_name.label("company_name"),
                JD.position.label("position"),
            )
            .join(Resume, Application.resume_id == Resume.id)
            .join(JD, Application.jd_id == JD.id)
            .where(Application.user_id == user_id)
        )

        # Apply search query if provided
        if search_query:
            search_pattern = f"%{search_query}%"
            query_builder = query_builder.where(
                or_(
                    JD.company_name.ilike(search_pattern),
                    JD.position.ilike(search_pattern),
                    Resume.title.ilike(search_pattern),
                )
            )

        # Apply filters
        if filters:
            query_builder = self._apply_application_filters(query_builder, filters)

        return query_builder

    def _build_tsquery(self, search_config: Dict[str, Any]) -> Optional[str]:
        """Build PostgreSQL tsquery from parsed search config"""
        if not search_config["original_query"]:
            return None

        # Start with phrases (exact match)
        query_parts = []

        # Add phrases
        for phrase in search_config["phrases"]:
            query_parts.append(f"'{phrase}'")

        # Add individual terms
        for term in search_config["terms"]:
            if term.lower() not in ["and", "or", "not"]:
                query_parts.append(f"{term}:*")  # Prefix matching

        # Build query string
        if search_config["has_or"]:
            separator = " | "
        elif search_config["has_not"]:
            # Handle NOT logic
            positive_terms = [t for t in query_parts if not t.startswith("-")]
            negative_terms = [t for t in query_parts if t.startswith("-")]
            if positive_terms and negative_terms:
                return (
                    f"({' & '.join(positive_terms)}) & !({' | '.join(negative_terms)})"
                )
            else:
                return " & ".join(query_parts) if query_parts else None
        else:
            separator = " & "

        tsquery_string = separator.join(query_parts) if query_parts else None

        return tsquery_string

    def _apply_resume_filters(
        self, query_builder: Select, filters: SearchFilters
    ) -> Select:
        """Apply filters to resume search query"""
        conditions = []

        # Date filters
        if hasattr(filters, "created_from") and filters.created_from:
            conditions.append(Resume.created_at >= filters.created_from)
        if hasattr(filters, "created_to") and filters.created_to:
            conditions.append(Resume.updated_at <= filters.created_to)

        if conditions:
            query_builder = query_builder.where(and_(*conditions))

        return query_builder

    def _apply_jd_filters(
        self, query_builder: Select, filters: SearchFilters
    ) -> Select:
        """Apply filters to JD search query"""
        conditions = []

        # Location filters
        if filters.location_city:
            conditions.append(JD.location_city.ilike(f"%{filters.location_city}%"))
        if filters.location_state:
            conditions.append(JD.location_state.ilike(f"%{filters.location_state}%"))
        if filters.location_country:
            conditions.append(JD.location_country == filters.location_country)
        if filters.location_remote is not None:
            conditions.append(JD.location_remote == filters.location_remote)
        if filters.location_hybrid is not None:
            conditions.append(JD.location_hybrid == filters.location_hybrid)
        if filters.location_onsite is not None:
            conditions.append(JD.location_onsite == filters.location_onsite)

        # Salary filters
        if filters.salary_min:
            conditions.append(
                (JD.salary_max >= filters.salary_min)
                | (JD.salary_min >= filters.salary_min)
            )
        if filters.salary_max:
            conditions.append(JD.salary_min <= filters.salary_max)
        if filters.salary_currency:
            conditions.append(JD.salary_currency == filters.salary_currency)
        if filters.salary_period:
            conditions.append(JD.salary_period == filters.salary_period)

        # Experience filters
        if filters.experience_level:
            conditions.append(JD.experience_level == filters.experience_level)

        # Employment type filters
        if filters.employment_type:
            conditions.append(JD.employment_type == filters.employment_type)

        # Industry filters
        if filters.industry:
            conditions.append(JD.industry.ilike(f"%{filters.industry}%"))
        if filters.company_size:
            conditions.append(JD.company_size == filters.company_size)

        # Date filters
        if filters.posted_date_from:
            conditions.append(JD.posted_date >= filters.posted_date_from)
        if filters.posted_date_to:
            conditions.append(JD.posted_date <= filters.posted_date_to)
        if filters.application_deadline_from:
            conditions.append(
                JD.application_deadline >= filters.application_deadline_from
            )
        if filters.application_deadline_to:
            conditions.append(
                JD.application_deadline <= filters.application_deadline_to
            )

        if conditions:
            query_builder = query_builder.where(and_(*conditions))

        return query_builder

    def _apply_application_filters(
        self, query_builder: Select, filters: SearchFilters
    ) -> Select:
        """Apply filters to application search query"""
        conditions = []

        # Status filter
        if filters.status:
            conditions.append(Application.status == filters.status)

        # Match score filters
        if filters.min_match_score is not None:
            conditions.append(Application.match_score >= filters.min_match_score)
        if filters.max_match_score is not None:
            conditions.append(Application.match_score <= filters.max_match_score)

        # Date filters
        if hasattr(filters, "created_from") and filters.created_from:
            conditions.append(Application.created_at >= filters.created_from)
        if hasattr(filters, "created_to") and filters.created_to:
            conditions.append(Application.updated_at <= filters.created_to)

        if conditions:
            query_builder = query_builder.where(and_(*conditions))

        return query_builder

    def _apply_sorting(
        self,
        query_builder: Select,
        sort_by: str,
        sort_order: str,
        search_type: str,
        use_semantic: bool,
    ) -> Select:
        """Apply sorting to search query"""
        order_func = desc if sort_order == "desc" else asc

        if sort_by == "relevance" and use_semantic:
            # Sort by relevance score
            query_builder = query_builder.order_by(order_func(text("relevance_score")))
        elif sort_by == "date" or sort_by == "created_at":
            query_builder = query_builder.order_by(order_func(text("created_at")))
        elif sort_by == "title":
            query_builder = query_builder.order_by(order_func(text("title")))
        elif sort_by == "salary" and search_type == "jd":
            query_builder = query_builder.order_by(order_func(text("salary_max")))
        elif sort_by == "posted_date" and search_type == "jd":
            query_builder = query_builder.order_by(order_func(text("posted_date")))
        elif sort_by == "match_score" and search_type == "application":
            query_builder = query_builder.order_by(
                order_func(text("match_score")).nulls_last()
            )
        elif sort_by == "updated_at":
            query_builder = query_builder.order_by(order_func(text("updated_at")))
        else:
            # Default sorting
            query_builder = query_builder.order_by(order_func(text("created_at")))

        return query_builder

    async def _get_count(self, query_builder: Select) -> int:
        """Get total count of results"""
        # Create count subquery
        count_stmt = select(func.count()).select_from(query_builder.subquery())
        result = await self.db.execute(count_stmt)
        return result.scalar() or 0

    async def _execute_resume_search(
        self, query_builder: Select
    ) -> List[Dict[str, Any]]:
        """Execute resume search and format results"""
        result = await self.db.execute(query_builder)
        rows = result.all()

        results = []
        for row in rows:
            results.append(
                {
                    "id": str(row.id),
                    "title": row.title,
                    "content": (
                        row.content[:500] + "..."
                        if len(row.content or "") > 500
                        else row.content
                    ),
                    "created_at": row.created_at.isoformat(),
                    "relevance_score": (
                        float(row.relevance_score)
                        if hasattr(row, "relevance_score")
                        else 0.0
                    ),
                    "type": "resume",
                }
            )

        return results

    async def _execute_jd_search(self, query_builder: Select) -> List[Dict[str, Any]]:
        """Execute JD search and format results"""
        result = await self.db.execute(query_builder)
        rows = result.all()

        results = []
        for row in rows:
            results.append(
                {
                    "id": str(row.id),
                    "title": row.title,
                    "company": row.company,
                    "content": (
                        row.content[:500] + "..."
                        if len(row.content or "") > 500
                        else row.content
                    ),
                    "created_at": row.created_at.isoformat(),
                    "salary": {
                        "min": float(row.salary_min) if row.salary_min else None,
                        "max": float(row.salary_max) if row.salary_max else None,
                        "currency": row.salary_currency,
                        "period": row.salary_period,
                    },
                    "location": {
                        "city": row.location_city,
                        "state": row.location_state,
                        "country": row.location_country,
                        "remote": row.location_remote,
                        "hybrid": row.location_hybrid,
                        "onsite": row.location_onsite,
                    },
                    "experience_level": row.experience_level,
                    "employment_type": row.employment_type,
                    "industry": row.industry,
                    "company_size": row.company_size,
                    "posted_date": (
                        row.posted_date.isoformat() if row.posted_date else None
                    ),
                    "application_deadline": (
                        row.application_deadline.isoformat()
                        if row.application_deadline
                        else None
                    ),
                    "relevance_score": (
                        float(row.relevance_score)
                        if hasattr(row, "relevance_score")
                        else 0.0
                    ),
                    "type": "jd",
                }
            )

        return results

    async def _execute_application_search(
        self, query_builder: Select
    ) -> List[Dict[str, Any]]:
        """Execute application search and format results"""
        result = await self.db.execute(query_builder)
        rows = result.all()

        results = []
        for row in rows:
            results.append(
                {
                    "id": str(row.id),
                    "company_name": row.company_name,
                    "position": row.position,
                    "status": row.status,
                    "match_score": float(row.match_score) if row.match_score else None,
                    "created_at": row.created_at.isoformat(),
                    "updated_at": row.updated_at.isoformat(),
                    "resume_title": row.resume_title,
                    "jd_title": row.jd_title,
                    "type": "application",
                }
            )

        return results

    async def _track_search(
        self,
        user_id: uuid.UUID,
        search_query: str,
        filters: Optional[SearchFilters],
        results_count: int,
        search_type: str,
        search_duration_ms: int,
    ):
        """Track search analytics"""
        # Create search history entry
        history_entry = SearchHistory(
            user_id=user_id,
            query=search_query,
            search_type=search_type,
            filters=json.dumps(filters.to_dict()) if filters else None,
            result_count=results_count,
        )
        self.db.add(history_entry)

        # Update analytics (this would typically be done asynchronously)
        normalized_query = search_query.lower().strip()
        if normalized_query:
            # Check if analytics entry exists
            analytics_stmt = select(SearchAnalytics).where(
                and_(
                    SearchAnalytics.search_term == normalized_query,
                    SearchAnalytics.search_type == search_type,
                )
            )
            result = await self.db.execute(analytics_stmt)
            analytics = result.scalar_one_or_none()

            if analytics:
                # Update existing analytics
                analytics.total_searches += 1
                analytics.total_results += results_count
                if results_count == 0:
                    analytics.zero_result_searches += 1
                analytics.avg_results_per_search = (
                    analytics.total_results / analytics.total_searches
                )
                analytics.last_searched_at = datetime.utcnow()
            else:
                # Create new analytics entry
                analytics = SearchAnalytics(
                    search_term=normalized_query,
                    search_type=search_type,
                    total_searches=1,
                    total_results=results_count,
                    zero_result_searches=1 if results_count == 0 else 0,
                    avg_results_per_search=float(results_count),
                )
                self.db.add(analytics)

        await self.db.commit()

    async def save_search(
        self,
        user_id: uuid.UUID,
        name: str,
        search_query: str,
        filters: SearchFilters,
        notify_matches: bool = False,
        notification_frequency: str = "daily",
    ) -> SavedSearch:
        """Save a search query for future use"""
        saved_search = SavedSearch(
            user_id=user_id,
            name=name,
            query=search_query,
            filters=json.dumps(filters.to_dict()),
            search_type="jd",  # This should be parameterized
        )
        self.db.add(saved_search)
        await self.db.commit()
        await self.db.refresh(saved_search)
        return saved_search

    async def get_saved_searches(
        self, user_id: uuid.UUID, notify_only: bool = False
    ) -> List[SavedSearch]:
        """Get user's saved searches"""
        query = select(SavedSearch).where(SavedSearch.user_id == user_id)

        if notify_only:
            query = query.where(SavedSearch.notify_matches.is_(True))

        query = query.order_by(desc(SavedSearch.created_at))

        result = await self.db.execute(query)
        return result.scalars().all()

    async def delete_saved_search(
        self, user_id: uuid.UUID, saved_search_id: uuid.UUID
    ) -> bool:
        """Delete a saved search"""
        stmt = select(SavedSearch).where(
            and_(
                SavedSearch.id == saved_search_id,
                SavedSearch.user_id == user_id,
            )
        )
        result = await self.db.execute(stmt)
        saved_search = result.scalar_one_or_none()

        if saved_search:
            await self.db.delete(saved_search)
            await self.db.commit()
            return True
        return False

    async def get_search_suggestions(
        self, user_id: uuid.UUID, partial_query: str, limit: int = 10
    ) -> Dict[str, List[str]]:
        """Get search suggestions based on user's history and available data"""
        search_pattern = f"%{partial_query.lower()}%"

        # Get company suggestions from JDs
        company_query = (
            select(JD.company)
            .where(JD.user_id == user_id)
            .where(JD.company.ilike(search_pattern))
            .distinct()
            .limit(limit)
        )
        company_result = await self.db.execute(company_query)
        companies = [row[0] for row in company_result.fetchall() if row[0]]

        # Get position suggestions from JDs
        position_query = (
            select(JD.position)
            .where(JD.user_id == user_id)
            .where(JD.position.ilike(search_pattern))
            .distinct()
            .limit(limit)
        )
        position_result = await self.db.execute(position_query)
        positions = [row[0] for row in position_result.fetchall() if row[0]]

        # Get skill suggestions from search history
        history_query = (
            select(SearchHistory.search_query)
            .where(SearchHistory.user_id == user_id)
            .where(SearchHistory.search_query.ilike(search_pattern))
            .distinct()
            .order_by(desc(SearchHistory.created_at))
            .limit(limit)
        )
        history_result = await self.db.execute(history_query)
        recent_searches = [row[0] for row in history_result.fetchall() if row[0]]

        return {
            "companies": companies,
            "positions": positions,
            "recent_searches": recent_searches,
        }

    async def get_popular_searches(
        self, search_type: str, limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Get popular search terms across all users"""
        query = (
            select(SearchAnalytics)
            .where(SearchAnalytics.search_type == search_type)
            .order_by(desc(SearchAnalytics.total_searches))
            .limit(limit)
        )

        result = await self.db.execute(query)
        analytics = result.scalars().all()

        return [
            {
                "search_term": a.search_term,
                "total_searches": a.total_searches,
                "avg_results": a.avg_results_per_search,
                "zero_result_rate": (
                    a.zero_result_searches / a.total_searches
                    if a.total_searches > 0
                    else 0
                ),
            }
            for a in analytics
        ]

    async def track_search_click(
        self,
        user_id: uuid.UUID,
        search_history_id: uuid.UUID,
        result_id: uuid.UUID,
        result_type: str,
    ):
        """Track when a user clicks on a search result"""
        stmt = select(SearchHistory).where(SearchHistory.id == search_history_id)
        result = await self.db.execute(stmt)
        history_entry = result.scalar_one_or_none()

        if history_entry:
            history_entry.clicked_result_id = result_id
            history_entry.clicked_result_type = result_type
            await self.db.commit()


# Helper function for ts_rank (needs to be imported from sqlalchemy)
def ts_rank(vector, query):
    """Generate PostgreSQL ts_rank function call"""
    return func.ts_rank(vector, query)
