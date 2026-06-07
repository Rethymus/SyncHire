"""
Search API - Lightweight Version

Local-first search functionality without authentication.
Uses SQLite FTS5 for full-text search.
"""

from fastapi import APIRouter, Body, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import and_, select, or_, func

from app.api.utils_lite import parse_uuid
from app.core.database_lite import get_db
from app.models.resume_lite import Resume
from app.models.jd_lite import JobDescription
from app.models.application_lite import Application
from app.schemas.schemas_lite import (
    SearchRequest,
    SearchResponse,
    MatchRequest,
    MatchResponse,
)
from app.services.ai_service_lite import ai_service
from app.core.logger import logger, LogCategory

router = APIRouter(prefix="/search", tags=["search"])


@router.post("", response_model=SearchResponse)
async def search_all(
    request: SearchRequest | None = Body(None),
    query: str | None = None,
    type: str = "all",
    limit: int = 20,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    """
    Full-text search across resumes and job descriptions.

    Args:
        query: Search query
        type: Search type (all, resumes, jds, applications)
        limit: Maximum results
        offset: Results offset
        db: Database session

    Returns:
        Search results
    """
    try:
        if request is not None:
            query = request.query
            type = request.type
            limit = request.limit
            offset = request.offset

        if not query or len(query.strip()) < 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Query must be at least 2 characters",
            )

        terms = [term for term in query.strip().split() if term]
        results = []
        total = 0

        # Search resumes
        if type in ["all", "resumes"]:
            resume_filters = [
                or_(
                    Resume.title.ilike(f"%{term}%"),
                    Resume.content.ilike(f"%{term}%"),
                )
                for term in terms
            ]
            resume_result = await db.execute(
                select(Resume).where(and_(*resume_filters)).offset(offset).limit(limit)
            )
            resumes = resume_result.scalars().all()

            for resume in resumes:
                results.append(
                    {
                        "type": "resume",
                        "id": str(resume.id),
                        "title": resume.title,
                        "content": (
                            resume.content[:200] + "..."
                            if len(resume.content) > 200
                            else resume.content
                        ),
                        "created_at": resume.created_at.isoformat(),
                    }
                )

            total += len(resumes)

        # Search job descriptions
        if type in ["all", "jds"]:
            jd_filters = [
                or_(
                    JobDescription.company.ilike(f"%{term}%"),
                    JobDescription.title.ilike(f"%{term}%"),
                    JobDescription.description.ilike(f"%{term}%"),
                )
                for term in terms
            ]
            jd_result = await db.execute(
                select(JobDescription)
                .where(and_(*jd_filters))
                .offset(offset)
                .limit(limit)
            )
            jds = jd_result.scalars().all()

            for jd in jds:
                results.append(
                    {
                        "type": "jd",
                        "id": str(jd.id),
                        "title": f"{jd.company} - {jd.title}",
                        "content": (
                            jd.description[:200] + "..."
                            if len(jd.description) > 200
                            else jd.description
                        ),
                        "created_at": jd.created_at.isoformat(),
                    }
                )

            total += len(jds)

        logger.info(LogCategory.DATA, f"Search completed: {query} ({total} results)")

        return SearchResponse(total=total, results=results, query=query, type=type)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(LogCategory.DATA, f"Search failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Search failed"
        )


@router.post("/semantic", response_model=SearchResponse)
async def semantic_search(
    request: SearchRequest | None = Body(None),
    query: str | None = None,
    type: str = "all",
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
):
    """
    Semantic search using vector embeddings (stored as JSON).

    Args:
        query: Search query
        type: Search type
        limit: Maximum results
        db: Database session

    Returns:
        Semantic search results
    """
    try:
        if request is not None:
            query = request.query
            type = request.type
            limit = request.limit

        # For now, fallback to keyword search
        # TODO: Implement proper vector similarity search
        return await search_all(None, query, type, limit, 0, db)

    except Exception as e:
        logger.error(
            LogCategory.DATA, f"Semantic search failed: {str(e)}", exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Semantic search failed",
        )


@router.post("/match", response_model=MatchResponse)
async def match_resume_jd(request: MatchRequest, db: AsyncSession = Depends(get_db)):
    """
    Calculate match score between resume and job description.

    Args:
        request: Match request with resume_id and jd_id
        db: Database session

    Returns:
        Match score and insights
    """
    try:
        resume_id = parse_uuid(request.resume_id, "resume_id")
        jd_id = parse_uuid(request.jd_id, "jd_id")

        # Get resume
        resume_result = await db.execute(select(Resume).where(Resume.id == resume_id))
        resume = resume_result.scalar_one_or_none()

        if not resume:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found"
            )

        # Get JD
        jd_result = await db.execute(
            select(JobDescription).where(JobDescription.id == jd_id)
        )
        jd = jd_result.scalar_one_or_none()

        if not jd:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Job description not found",
            )

        # Calculate match score
        match_score = await ai_service.calculate_match_score(
            resume.content, jd.description
        )

        # Generate insights
        insights = []
        if match_score >= 80:
            insights.append(
                "Strong match - Your profile aligns well with this position"
            )
        elif match_score >= 60:
            insights.append("Good match - Consider highlighting relevant experience")
        else:
            insights.append("Weak match - You may need additional qualifications")

        if match_score < 100:
            insights.append("Optimize your resume to increase match score")

        logger.info(
            LogCategory.AI,
            f"Match calculated: {request.resume_id} + {request.jd_id} = {match_score}",
        )

        return MatchResponse(
            resume_id=request.resume_id,
            jd_id=request.jd_id,
            match_score=match_score,
            insights=insights,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            LogCategory.AI, f"Match calculation failed: {str(e)}", exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Match calculation failed",
        )


@router.get("/suggestions")
async def get_search_suggestions(
    query: str, limit: int = 5, db: AsyncSession = Depends(get_db)
):
    """
    Get search suggestions based on existing data.

    Args:
        query: Partial search query
        limit: Maximum suggestions
        db: Database session

    Returns:
        Search suggestions
    """
    try:
        if not query or len(query.strip()) < 2:
            return {"suggestions": []}

        search_term = f"%{query.strip()}%"
        suggestions = []

        # Get resume title suggestions
        resume_result = await db.execute(
            select(Resume.title)
            .where(Resume.title.ilike(search_term))
            .distinct()
            .limit(limit)
        )
        resume_titles = resume_result.scalars().all()

        for title in resume_titles:
            suggestions.append({"type": "resume", "text": title})

        # Get JD title suggestions
        jd_result = await db.execute(
            select(JobDescription.title)
            .where(JobDescription.title.ilike(search_term))
            .distinct()
            .limit(limit)
        )
        jd_titles = jd_result.scalars().all()

        for title in jd_titles:
            suggestions.append({"type": "jd", "text": title})

        # Get company suggestions
        company_result = await db.execute(
            select(JobDescription.company)
            .where(JobDescription.company.ilike(search_term))
            .distinct()
            .limit(limit)
        )
        companies = company_result.scalars().all()

        for company in companies:
            suggestions.append({"type": "company", "text": company})

        return {"suggestions": suggestions[:limit]}

    except Exception as e:
        logger.error(
            LogCategory.DATA, f"Failed to get suggestions: {str(e)}", exc_info=True
        )
        return {"suggestions": []}


@router.get("/statistics")
async def get_search_statistics(db: AsyncSession = Depends(get_db)):
    """
    Get search statistics and data counts.

    Args:
        db: Database session

    Returns:
        Search statistics
    """
    try:
        # Count records
        resume_count = await db.execute(select(func.count()).select_from(Resume))
        resume_total = resume_count.scalar()

        jd_count = await db.execute(select(func.count()).select_from(JobDescription))
        jd_total = jd_count.scalar()

        application_count = await db.execute(
            select(func.count()).select_from(Application)
        )
        application_total = application_count.scalar()

        return {
            "resumes": resume_total or 0,
            "job_descriptions": jd_total or 0,
            "applications": application_total or 0,
            "total": (resume_total or 0) + (jd_total or 0) + (application_total or 0),
        }

    except Exception as e:
        logger.error(
            LogCategory.DATA, f"Failed to get statistics: {str(e)}", exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get statistics",
        )
