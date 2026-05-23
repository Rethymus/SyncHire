import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.resume import Resume
from app.models.jd import JD
from app.services.ai_service import AIService
from pydantic import BaseModel, Field

router = APIRouter(prefix="/search", tags=["search"])


class SearchResult(BaseModel):
    id: uuid.UUID
    title: str
    content: str
    similarity: float = Field(..., ge=0, le=1)
    type: str  # "resume" or "jd"


class SearchResponse(BaseModel):
    results: List[SearchResult]
    total: int
    query: str


@router.get("/resumes", response_model=SearchResponse)
async def search_resumes(
    q: str = Query(..., min_length=2, description="Search query"),
    limit: int = Query(10, ge=1, le=50, description="Number of results"),
    threshold: float = Query(0.7, ge=0, le=1, description="Minimum similarity threshold"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Semantic search for resumes using vector similarity.
    Searches resumes owned by the current user.
    """
    # Generate embedding for search query
    query_embedding = await AIService.generate_embedding(q)

    # Convert embedding to PostgreSQL vector format
    embedding_str = f"[{','.join(map(str, query_embedding))}]"

    # Use PGVector cosine similarity search
    # Note: 1 - cosine_distance is used to get similarity
    query_stmt = (
        select(
            Resume.id,
            Resume.title,
            Resume.content,
            (1 - func.cosine_distance(Resume.embedding, text(embedding_str))).label(
                "similarity"
            ),
        )
        .where(Resume.user_id == current_user.id)
        .where(
            (1 - func.cosine_distance(Resume.embedding, text(embedding_str)))
            >= threshold
        )
        .order_by(
            (1 - func.cosine_distance(Resume.embedding, text(embedding_str))).desc()
        )
        .limit(limit)
    )

    result = await db.execute(query_stmt)
    rows = result.all()

    results = [
        SearchResult(
            id=row.id,
            title=row.title,
            content=row.content[:500] + "..." if len(row.content) > 500 else row.content,
            similarity=float(row.similarity),
            type="resume",
        )
        for row in rows
    ]

    return SearchResponse(results=results, total=len(results), query=q)


@router.get("/jds", response_model=SearchResponse)
async def search_jds(
    q: str = Query(..., min_length=2, description="Search query"),
    limit: int = Query(10, ge=1, le=50, description="Number of results"),
    threshold: float = Query(0.7, ge=0, le=1, description="Minimum similarity threshold"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Semantic search for job descriptions using vector similarity.
    Searches JDs owned by the current user.
    """
    # Generate embedding for search query
    query_embedding = await AIService.generate_embedding(q)

    # Convert embedding to PostgreSQL vector format
    embedding_str = f"[{','.join(map(str, query_embedding))}]"

    # Use PGVector cosine similarity search
    query_stmt = (
        select(
            JD.id,
            JD.title,
            JD.content,
            (1 - func.cosine_distance(JD.embedding, text(embedding_str))).label(
                "similarity"
            ),
        )
        .where(JD.user_id == current_user.id)
        .where(
            (1 - func.cosine_distance(JD.embedding, text(embedding_str))) >= threshold
        )
        .order_by((1 - func.cosine_distance(JD.embedding, text(embedding_str))).desc())
        .limit(limit)
    )

    result = await db.execute(query_stmt)
    rows = result.all()

    results = [
        SearchResult(
            id=row.id,
            title=row.title,
            content=row.content[:500] + "..." if len(row.content) > 500 else row.content,
            similarity=float(row.similarity),
            type="jd",
        )
        for row in rows
    ]

    return SearchResponse(results=results, total=len(results), query=q)


@router.get("/match/{resume_id}/{jd_id}", response_model=dict)
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
        select(Resume).where(
            Resume.id == resume_id, Resume.user_id == current_user.id
        )
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
