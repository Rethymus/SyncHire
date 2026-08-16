"""
Job Match Service - deterministic resume-to-JD scoring for the job feed.

Scores ingested ATS jobs against the user's most recently updated
resume using a local lexical-overlap scorer (no AI calls, no cost), so
every synced job can be ranked automatically. LLM-based scoring stays
available through ai_service_lite for on-demand refinement.
"""

import re
from dataclasses import dataclass, field
from typing import List, Optional, Tuple

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config_lite import get_lite_settings
from app.core.logger import LogCategory, logger
from app.models.jd_lite import JobDescription
from app.models.resume_lite import Resume

settings = get_lite_settings()

_STOP_WORDS = {
    "and",
    "or",
    "the",
    "a",
    "an",
    "to",
    "for",
    "of",
    "in",
    "with",
    "using",
    "we",
    "are",
    "is",
    "this",
    "that",
    "you",
    "your",
    "our",
    "will",
    "be",
    "as",
    "at",
    "on",
    "by",
    "it",
    "or",
    "if",
    "from",
    "about",
    "who",
    "what",
    "how",
    "their",
    "they",
    "has",
    "have",
    "not",
    "can",
    "us",
    "etc",
    "e",
    "g",
    "job",
    "work",
    "team",
    "role",
    "years",
    "year",
    "experience",
    "strong",
    "plus",
    "preferred",
    "required",
    "requirements",
    "responsibilities",
    "qualifications",
    "candidate",
    "candidates",
    "company",
    "ability",
    "including",
    "related",
    "field",
    "new",
    "well",
    "across",
    "within",
    "other",
}

# Weighted signal terms: matches here count more than generic overlap
_HIGH_VALUE_TERMS = {
    "python",
    "typescript",
    "javascript",
    "java",
    "golang",
    "rust",
    "react",
    "next.js",
    "vue",
    "angular",
    "svelte",
    "node",
    "node.js",
    "fastapi",
    "django",
    "flask",
    "spring",
    "sqlalchemy",
    "postgresql",
    "mysql",
    "sqlite",
    "redis",
    "mongodb",
    "docker",
    "kubernetes",
    "k8s",
    "aws",
    "gcp",
    "azure",
    "terraform",
    "linux",
    "git",
    "ci",
    "cd",
    "rest",
    "graphql",
    "grpc",
    "machine",
    "learning",
    "deep",
    "pytorch",
    "tensorflow",
    "llm",
    "nlp",
    "ai",
    "data",
    "analytics",
    "etl",
    "spark",
    "testing",
    "pytest",
    "jest",
    "vitest",
    "playwright",
    "security",
    "product",
    "design",
    "mobile",
    "android",
    "ios",
    "backend",
    "frontend",
    "full",
    "stack",
    "devops",
    "sre",
}

_WORD_RE = re.compile(r"[a-zA-Z][a-zA-Z0-9.+#/-]*")


@dataclass
class MatchResult:
    score: float  # 0-100
    matched_terms: List[str] = field(default_factory=list)
    missing_terms: List[str] = field(default_factory=list)


def _tokenize(text: str) -> set:
    words = set()
    for token in _WORD_RE.findall((text or "").lower()):
        token = token.strip("./-")
        if len(token) < 2 or token in _STOP_WORDS:
            continue
        words.add(token)
    return words


def local_match_score(resume_text: str, jd_text: str) -> MatchResult:
    """Deterministic lexical match score with term-level detail.

    Signals: high-value skill overlap (weighted 4x), general lexical
    overlap, and JD title terms appearing in the resume. ASCII-only
    tokenization; the ingested ATS boards post in English.
    """
    resume_words = _tokenize(resume_text)
    jd_words = _tokenize(jd_text)
    if not resume_words or not jd_words:
        return MatchResult(score=50.0)

    overlap = resume_words & jd_words
    high_overlap = overlap & _HIGH_VALUE_TERMS
    jd_high = jd_words & _HIGH_VALUE_TERMS

    # 60 points: high-value skill coverage (JD's important terms found in resume)
    high_coverage = len(high_overlap) / max(1, len(jd_high)) if jd_high else 0.5
    high_points = min(60.0, high_coverage * 60.0)
    # 30 points: general lexical coverage, capped early (long JDs dilute)
    lexical_coverage = min(1.0, len(overlap) / 40.0)
    lexical_points = lexical_coverage * 30.0
    # 10 points: resume breadth relative to JD vocabulary
    breadth = min(1.0, len(resume_words) / max(1, len(jd_words)))
    breadth_points = breadth * 10.0

    score = round(min(100.0, high_points + lexical_points + breadth_points), 1)
    return MatchResult(
        score=score,
        matched_terms=sorted(high_overlap or overlap)[:20],
        missing_terms=sorted(jd_high - resume_words)[:10],
    )


async def get_scoring_resume(db: AsyncSession) -> Optional[Resume]:
    """The resume used for feed scoring: most recently updated."""
    result = await db.execute(
        select(Resume).order_by(Resume.updated_at.desc()).limit(1)
    )
    return result.scalar_one_or_none()


async def score_unscored_jobs(
    db: AsyncSession, limit: int = 100
) -> Tuple[int, Optional[str]]:
    """Score feed jobs lacking a match score against the scoring resume.

    Returns (scored_count, resume_title). Zero scored when no resume
    exists (the feed stays unscored until one is uploaded).
    """
    resume = await get_scoring_resume(db)
    if resume is None:
        return 0, None

    rows = await db.execute(
        select(JobDescription)
        .where(JobDescription.source.is_not(None), JobDescription.match_score.is_(None))
        .order_by(JobDescription.created_at.desc())
        .limit(max(1, limit))
    )
    jobs = rows.scalars().all()
    for job in jobs:
        result = local_match_score(resume.content, job.raw_text or job.description)
        job.match_score = result.score
        job.match_detail = _dump_detail(resume.id, result)

    if jobs:
        await db.commit()
        logger.info(
            LogCategory.DATA,
            f"Scored {len(jobs)} feed jobs against resume '{resume.title}'",
        )
    return len(jobs), resume.title


async def rescore_all_jobs(db: AsyncSession, limit: int = 500) -> int:
    """Recompute scores for every feed job (e.g. after resume update)."""
    resume = await get_scoring_resume(db)
    if resume is None:
        return 0
    rows = await db.execute(
        select(JobDescription)
        .where(JobDescription.source.is_not(None))
        .order_by(JobDescription.created_at.desc())
        .limit(max(1, limit))
    )
    jobs = rows.scalars().all()
    for job in jobs:
        result = local_match_score(resume.content, job.raw_text or job.description)
        job.match_score = result.score
        job.match_detail = _dump_detail(resume.id, result)
    if jobs:
        await db.commit()
    return len(jobs)


def _dump_detail(resume_id, result: MatchResult) -> str:
    import json

    return json.dumps(
        {
            "resume_id": str(resume_id),
            "matched": result.matched_terms,
            "missing": result.missing_terms,
            "method": "local-lexical-v1",
        },
        ensure_ascii=False,
    )
