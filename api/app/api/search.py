import uuid
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text, and_, or_
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.resume import Resume
from app.models.jd import JD
from app.models.application import Application
from app.services.ai_service import AIService
from app.middleware.rate_limit import rate_limit, RateLimitType
from pydantic import BaseModel, Field

router = APIRouter(prefix="/search", tags=["search"])


class SearchResult(BaseModel):
    id: uuid.UUID
    title: str
    content: str
    similarity: float = Field(..., ge=0, le=1)
    type: str  # "resume" or "jd"
    created_at: datetime
    highlighted_content: Optional[str] = None


class SearchResponse(BaseModel):
    results: List[SearchResult]
    total: int
    query: str
    page: int
    page_size: int


class ApplicationSearchResult(BaseModel):
    id: uuid.UUID
    company_name: str
    position: str
    status: str
    match_score: Optional[float]
    created_at: datetime
    updated_at: datetime
    resume_title: str
    jd_title: str


class ApplicationSearchResponse(BaseModel):
    results: List[ApplicationSearchResult]
    total: int
    page: int
    page_size: int
    filters_applied: dict


@router.get("/resumes", response_model=SearchResponse)
@rate_limit(RateLimitType.SEARCH)
async def search_resumes(
    q: str = Query(..., min_length=1, description="Search query"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=50, description="Results per page"),
    threshold: float = Query(
        0.3, ge=0, le=1, description="Minimum similarity threshold"
    ),
    sort_by: str = Query("similarity", description="Sort by: similarity, date, title"),
    sort_order: str = Query("desc", description="Sort order: asc, desc"),
    date_from: Optional[datetime] = Query(None, description="Filter by date from"),
    date_to: Optional[datetime] = Query(None, description="Filter by date to"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Advanced semantic search for resumes using vector similarity.
    Supports full-text search, filtering, sorting, and pagination.
    """
    # Build base query with filters
    conditions = [Resume.user_id == current_user.id]

    if date_from:
        conditions.append(Resume.created_at >= date_from)
    if date_to:
        conditions.append(Resume.updated_at <= date_to)

    # Try semantic search first
    try:
        # Generate embedding for search query
        query_embedding = await AIService.generate_embedding(q)
        embedding_str = f"[{','.join(map(str, query_embedding))}]"

        # Calculate similarity
        similarity_expr = (
            1 - func.cosine_distance(Resume.embedding, text(embedding_str))
        ).label("similarity")

        # Build query with semantic search
        query_stmt = (
            select(
                Resume.id,
                Resume.title,
                Resume.content,
                Resume.created_at,
                similarity_expr,
            )
            .where(and_(*conditions))
            .where(similarity_expr >= threshold)
        )

        # Apply sorting
        if sort_by == "similarity":
            order_by_expr = (
                similarity_expr.desc()
                if sort_order == "desc"
                else similarity_expr.asc()
            )
        elif sort_by == "date":
            order_by_expr = (
                Resume.created_at.desc()
                if sort_order == "desc"
                else Resume.created_at.asc()
            )
        elif sort_by == "title":
            order_by_expr = (
                Resume.title.desc() if sort_order == "desc" else Resume.title.asc()
            )
        else:
            order_by_expr = similarity_expr.desc()

        query_stmt = query_stmt.order_by(order_by_expr)

        # Get total count
        count_stmt = select(func.count()).select_from(query_stmt.subquery())
        total_result = await db.execute(count_stmt)
        total = total_result.scalar() or 0

        # Apply pagination
        offset = (page - 1) * page_size
        query_stmt = query_stmt.limit(page_size).offset(offset)

        result = await db.execute(query_stmt)
        rows = result.all()

        # Highlight matching terms in content
        results = []
        for row in rows:
            content_preview = (
                row.content[:500] + "..." if len(row.content) > 500 else row.content
            )
            highlighted = highlight_search_terms(content_preview, q)

            results.append(
                SearchResult(
                    id=row.id,
                    title=row.title,
                    content=content_preview,
                    similarity=float(row.similarity),
                    type="resume",
                    created_at=row.created_at,
                    highlighted_content=highlighted,
                )
            )

        return SearchResponse(
            results=results,
            total=total,
            query=q,
            page=page,
            page_size=page_size,
        )

    except Exception:
        # Fallback to full-text search if semantic search fails
        query_stmt = select(
            Resume.id,
            Resume.title,
            Resume.content,
            Resume.created_at,
            func.cast(1.0, type(float)).label("similarity"),
        ).where(
            and_(
                *conditions,
                or_(
                    Resume.title.ilike(f"%{q}%"),
                    Resume.content.ilike(f"%{q}%"),
                ),
            )
        )

        # Apply sorting
        if sort_by == "date":
            order_by_expr = (
                Resume.created_at.desc()
                if sort_order == "desc"
                else Resume.created_at.asc()
            )
        elif sort_by == "title":
            order_by_expr = (
                Resume.title.desc() if sort_order == "desc" else Resume.title.asc()
            )
        else:
            order_by_expr = Resume.created_at.desc()

        query_stmt = query_stmt.order_by(order_by_expr)

        # Get total count
        count_stmt = select(func.count()).select_from(query_stmt.subquery())
        total_result = await db.execute(count_stmt)
        total = total_result.scalar() or 0

        # Apply pagination
        offset = (page - 1) * page_size
        query_stmt = query_stmt.limit(page_size).offset(offset)

        result = await db.execute(query_stmt)
        rows = result.all()

        results = []
        for row in rows:
            content_preview = (
                row.content[:500] + "..." if len(row.content) > 500 else row.content
            )
            highlighted = highlight_search_terms(content_preview, q)

            results.append(
                SearchResult(
                    id=row.id,
                    title=row.title,
                    content=content_preview,
                    similarity=0.5,  # Default similarity for full-text search
                    type="resume",
                    created_at=row.created_at,
                    highlighted_content=highlighted,
                )
            )

        return SearchResponse(
            results=results,
            total=total,
            query=q,
            page=page,
            page_size=page_size,
        )


@router.get("/jds", response_model=SearchResponse)
@rate_limit(RateLimitType.SEARCH)
async def search_jds(
    q: str = Query(..., min_length=1, description="Search query"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=50, description="Results per page"),
    threshold: float = Query(
        0.3, ge=0, le=1, description="Minimum similarity threshold"
    ),
    sort_by: str = Query("similarity", description="Sort by: similarity, date, title"),
    sort_order: str = Query("desc", description="Sort order: asc, desc"),
    date_from: Optional[datetime] = Query(None, description="Filter by date from"),
    date_to: Optional[datetime] = Query(None, description="Filter by date to"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Advanced semantic search for job descriptions using vector similarity.
    Supports full-text search, filtering, sorting, and pagination.
    """
    # Build base query with filters
    conditions = [JD.user_id == current_user.id]

    if date_from:
        conditions.append(JD.created_at >= date_from)
    if date_to:
        conditions.append(JD.updated_at <= date_to)

    # Try semantic search first
    try:
        # Generate embedding for search query
        query_embedding = await AIService.generate_embedding(q)
        embedding_str = f"[{','.join(map(str, query_embedding))}]"

        # Calculate similarity
        similarity_expr = (
            1 - func.cosine_distance(JD.embedding, text(embedding_str))
        ).label("similarity")

        # Build query with semantic search
        query_stmt = (
            select(
                JD.id,
                JD.title,
                JD.content,
                JD.created_at,
                similarity_expr,
            )
            .where(and_(*conditions))
            .where(similarity_expr >= threshold)
        )

        # Apply sorting
        if sort_by == "similarity":
            order_by_expr = (
                similarity_expr.desc()
                if sort_order == "desc"
                else similarity_expr.asc()
            )
        elif sort_by == "date":
            order_by_expr = (
                JD.created_at.desc() if sort_order == "desc" else JD.created_at.asc()
            )
        elif sort_by == "title":
            order_by_expr = JD.title.desc() if sort_order == "desc" else JD.title.asc()
        else:
            order_by_expr = similarity_expr.desc()

        query_stmt = query_stmt.order_by(order_by_expr)

        # Get total count
        count_stmt = select(func.count()).select_from(query_stmt.subquery())
        total_result = await db.execute(count_stmt)
        total = total_result.scalar() or 0

        # Apply pagination
        offset = (page - 1) * page_size
        query_stmt = query_stmt.limit(page_size).offset(offset)

        result = await db.execute(query_stmt)
        rows = result.all()

        # Highlight matching terms in content
        results = []
        for row in rows:
            content_preview = (
                row.content[:500] + "..." if len(row.content) > 500 else row.content
            )
            highlighted = highlight_search_terms(content_preview, q)

            results.append(
                SearchResult(
                    id=row.id,
                    title=row.title,
                    content=content_preview,
                    similarity=float(row.similarity),
                    type="jd",
                    created_at=row.created_at,
                    highlighted_content=highlighted,
                )
            )

        return SearchResponse(
            results=results,
            total=total,
            query=q,
            page=page,
            page_size=page_size,
        )

    except Exception:
        # Fallback to full-text search if semantic search fails
        query_stmt = select(
            JD.id,
            JD.title,
            JD.content,
            JD.created_at,
            func.cast(1.0, type(float)).label("similarity"),
        ).where(
            and_(
                *conditions,
                or_(
                    JD.title.ilike(f"%{q}%"),
                    JD.content.ilike(f"%{q}%"),
                ),
            )
        )

        # Apply sorting
        if sort_by == "date":
            order_by_expr = (
                JD.created_at.desc() if sort_order == "desc" else JD.created_at.asc()
            )
        elif sort_by == "title":
            order_by_expr = JD.title.desc() if sort_order == "desc" else JD.title.asc()
        else:
            order_by_expr = JD.created_at.desc()

        query_stmt = query_stmt.order_by(order_by_expr)

        # Get total count
        count_stmt = select(func.count()).select_from(query_stmt.subquery())
        total_result = await db.execute(count_stmt)
        total = total_result.scalar() or 0

        # Apply pagination
        offset = (page - 1) * page_size
        query_stmt = query_stmt.limit(page_size).offset(offset)

        result = await db.execute(query_stmt)
        rows = result.all()

        results = []
        for row in rows:
            content_preview = (
                row.content[:500] + "..." if len(row.content) > 500 else row.content
            )
            highlighted = highlight_search_terms(content_preview, q)

            results.append(
                SearchResult(
                    id=row.id,
                    title=row.title,
                    content=content_preview,
                    similarity=0.5,  # Default similarity for full-text search
                    type="jd",
                    created_at=row.created_at,
                    highlighted_content=highlighted,
                )
            )

        return SearchResponse(
            results=results,
            total=total,
            query=q,
            page=page,
            page_size=page_size,
        )


@router.get("/applications", response_model=ApplicationSearchResponse)
@rate_limit(RateLimitType.SEARCH)
async def search_applications(
    q: Optional[str] = Query(None, description="Search query for company or position"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=50, description="Results per page"),
    status: Optional[str] = Query(None, description="Filter by status"),
    sort_by: str = Query(
        "updated_at",
        description="Sort by: created_at, updated_at, match_score, company",
    ),
    sort_order: str = Query("desc", description="Sort order: asc, desc"),
    date_from: Optional[datetime] = Query(None, description="Filter by date from"),
    date_to: Optional[datetime] = Query(None, description="Filter by date to"),
    min_match_score: Optional[float] = Query(
        None, ge=0, le=100, description="Minimum match score"
    ),
    max_match_score: Optional[float] = Query(
        None, ge=0, le=100, description="Maximum match score"
    ),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Advanced search for applications with filtering and sorting.
    Supports searching by company name, position, and filtering by various criteria.
    """
    # Build base query with joins
    query_stmt = (
        select(
            Application.id,
            Application.status,
            Application.match_score,
            Application.created_at,
            Application.updated_at,
            Resume.title.label("resume_title"),
            JD.title.label("jd_title"),
            JD.company_name,
            JD.position,
        )
        .join(Resume, Application.resume_id == Resume.id)
        .join(JD, Application.jd_id == JD.id)
        .where(Application.user_id == current_user.id)
    )

    # Build conditions list
    conditions = []

    # Search query filter
    if q:
        search_pattern = f"%{q}%"
        conditions.append(
            or_(
                JD.company_name.ilike(search_pattern),
                JD.position.ilike(search_pattern),
                Resume.title.ilike(search_pattern),
            )
        )

    # Status filter
    if status:
        conditions.append(Application.status == status)

    # Date filters
    if date_from:
        conditions.append(Application.created_at >= date_from)
    if date_to:
        conditions.append(Application.updated_at <= date_to)

    # Match score filters
    if min_match_score is not None:
        conditions.append(Application.match_score >= min_match_score)
    if max_match_score is not None:
        conditions.append(Application.match_score <= max_match_score)

    # Apply all conditions
    if conditions:
        query_stmt = query_stmt.where(and_(*conditions))

        # Get total count before pagination
        count_stmt = select(func.count()).select_from(query_stmt.subquery())
    total_result = await db.execute(count_stmt)
    total = total_result.scalar() or 0

    # Apply sorting
    if sort_by == "created_at":
        order_by_expr = (
            Application.created_at.desc()
            if sort_order == "desc"
            else Application.created_at.asc()
        )
    elif sort_by == "updated_at":
        order_by_expr = (
            Application.updated_at.desc()
            if sort_order == "desc"
            else Application.updated_at.asc()
        )
    elif sort_by == "match_score":
        # Handle NULL values in match_score
        if sort_order == "desc":
            order_by_expr = Application.match_score.desc().nulls_last()
        else:
            order_by_expr = Application.match_score.asc().nulls_last()
    elif sort_by == "company":
        order_by_expr = (
            JD.company_name.desc() if sort_order == "desc" else JD.company_name.asc()
        )
    else:
        order_by_expr = Application.updated_at.desc()

    query_stmt = query_stmt.order_by(order_by_expr)

    # Apply pagination
    offset = (page - 1) * page_size
    query_stmt = query_stmt.limit(page_size).offset(offset)

    result = await db.execute(query_stmt)
    rows = result.all()

    results = [
        ApplicationSearchResult(
            id=row.id,
            company_name=row.company_name,
            position=row.position,
            status=row.status,
            match_score=row.match_score,
            created_at=row.created_at,
            updated_at=row.updated_at,
            resume_title=row.resume_title,
            jd_title=row.jd_title,
        )
        for row in rows
    ]

    return ApplicationSearchResponse(
        results=results,
        total=total,
        page=page,
        page_size=page_size,
        filters_applied={
            "query": q,
            "status": status,
            "date_from": date_from.isoformat() if date_from else None,
            "date_to": date_to.isoformat() if date_to else None,
            "min_match_score": min_match_score,
            "max_match_score": max_match_score,
            "sort_by": sort_by,
            "sort_order": sort_order,
        },
    )


@router.get("/match/{resume_id}/{jd_id}", response_model=dict)
@rate_limit(RateLimitType.SEARCH)
async def get_match_score(
    resume_id: uuid.UUID,
    jd_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Calculate semantic similarity score between a specific resume and JD.
    """
    # Get resume
    resume_result = await db.execute(
        select(Resume).where(Resume.id == resume_id, Resume.user_id == current_user.id)
    )
    resume = resume_result.scalar_one_or_none()

    # Get JD
    jd_result = await db.execute(
        select(JD).where(JD.id == jd_id, JD.user_id == current_user.id)
    )
    jd = jd_result.scalar_one_or_none()

    if not resume or not jd:
        return {"error": "Resume or JD not found"}

    if not resume.embedding or not jd.embedding:
        return {"error": "Resume or JD has no embedding"}

    # Calculate cosine similarity
    embedding_str = f"[{','.join(map(str, jd.embedding))}]"
    similarity_result = await db.execute(
        select(
            (1 - func.cosine_distance(resume.embedding, text(embedding_str))).label(
                "similarity"
            )
        )
    )
    similarity = similarity_result.scalar()

    return {
        "resume_id": str(resume_id),
        "jd_id": str(jd_id),
        "similarity_score": float(similarity),
        "match_percentage": round(float(similarity) * 100, 2),
    }


def highlight_search_terms(text: str, query: str) -> str:
    """
    Highlight search terms in text using markdown bold syntax.
    """
    if not query or not text:
        return text

    # Split query into terms
    terms = query.lower().split()

    # Highlight each term
    highlighted = text
    for term in terms:
        if len(term) < 2:  # Skip very short terms
            continue

        # Find and highlight matches (case-insensitive)
        import re

        pattern = re.compile(f"({re.escape(term)})", re.IGNORECASE)
        highlighted = pattern.sub(r"**\1**", highlighted)

    return highlighted


@router.get("/suggestions")
@rate_limit(RateLimitType.SEARCH)
async def get_search_suggestions(
    q: str = Query(..., min_length=2, description="Partial search query"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get search suggestions based on user's resumes and JDs.
    Returns company names, positions, and skills that match the partial query.
    """
    search_pattern = f"%{q}%"

    # Get matching company names from JDs
    company_query = (
        select(JD.company_name)
        .where(JD.user_id == current_user.id)
        .where(JD.company_name.ilike(search_pattern))
        .distinct()
        .limit(5)
    )
    company_result = await db.execute(company_query)
    companies = [row[0] for row in company_result.fetchall() if row[0]]

    # Get matching positions from JDs
    position_query = (
        select(JD.position)
        .where(JD.user_id == current_user.id)
        .where(JD.position.ilike(search_pattern))
        .distinct()
        .limit(5)
    )
    position_result = await db.execute(position_query)
    positions = [row[0] for row in position_result.fetchall() if row[0]]

    # Get matching resume titles
    resume_query = (
        select(Resume.title)
        .where(Resume.user_id == current_user.id)
        .where(Resume.title.ilike(search_pattern))
        .distinct()
        .limit(5)
    )
    resume_result = await db.execute(resume_query)
    resume_titles = [row[0] for row in resume_result.fetchall() if row[0]]

    return {
        "companies": companies,
        "positions": positions,
        "resume_titles": resume_titles,
        "query": q,
    }
