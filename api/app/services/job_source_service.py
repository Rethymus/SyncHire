"""
Job Source Service - ATS Job Board Aggregation

Fetches official job postings from public ATS (Applicant Tracking
System) APIs so job data comes from the source (company recruiting
pages) instead of second-hand aggregators. Each adapter targets a
public, no-auth endpoint published by the ATS vendor:

- Greenhouse      boards-api.greenhouse.io/v1/boards/{org}/jobs
- Lever           api.lever.co/v0/postings/{org}
- Ashby           api.ashbyhq.com/posting-api/job-board/{org}
- SmartRecruiters api.smartrecruiters.com/v1/companies/{org}/postings

All endpoints were verified live (2026-08). Postings are normalized
and upserted into job_descriptions keyed by (source, external_id).
"""

import asyncio
import re
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from html.parser import HTMLParser
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config_lite import get_lite_settings
from app.core.logger import LogCategory, logger
from app.models.jd_lite import JobDescription
from app.models.job_source import JobSource
from app.api.local_first_helpers import dump_json

settings = get_lite_settings()

ATS_GREENHOUSE = "greenhouse"
ATS_LEVER = "lever"
ATS_ASHBY = "ashby"
ATS_SMARTRECRUITERS = "smartrecruiters"

SUPPORTED_ATS_TYPES = (
    ATS_GREENHOUSE,
    ATS_LEVER,
    ATS_ASHBY,
    ATS_SMARTRECRUITERS,
)

_HEADERS = {
    "User-Agent": "SyncHire-Lite/1.0 (personal job search tool; +localhost)",
    "Accept": "application/json",
}

_EMPLOYMENT_TYPE_MAP = {
    "fulltime": "full-time",
    "full-time": "full-time",
    "parttime": "part-time",
    "part-time": "part-time",
    "intern": "internship",
    "internship": "internship",
    "contract": "contract",
    "temporary": "temporary",
    "casual": "casual",
}

# (regex on netloc+path, ats_type); first match wins. The embed pattern
# must precede the generic boards pattern, which would otherwise capture
# the literal "embed" path segment as the org key.
_URL_PATTERNS = [
    (
        re.compile(r"greenhouse\.io/embed/job_board\?.*for=([A-Za-z0-9_-]+)"),
        ATS_GREENHOUSE,
    ),
    (
        re.compile(r"(?:job-boards|boards)\.greenhouse\.io/([A-Za-z0-9_-]+)"),
        ATS_GREENHOUSE,
    ),
    (re.compile(r"jobs\.(?:eu\.)?lever\.co/([A-Za-z0-9_-]+)"), ATS_LEVER),
    (re.compile(r"jobs\.ashbyhq\.com/([A-Za-z0-9_-]+)"), ATS_ASHBY),
    (
        re.compile(r"(?:careers|jobs)\.smartrecruiters\.com/([A-Za-z0-9_-]+)"),
        ATS_SMARTRECRUITERS,
    ),
]


class _TextExtractor(HTMLParser):
    """Minimal stdlib HTML-to-text converter (no bs4 in Lite deps)."""

    _SKIP = {"script", "style", "noscript"}

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self._chunks: List[str] = []
        self._skip_depth = 0

    def handle_starttag(self, tag: str, attrs) -> None:
        if tag in self._SKIP:
            self._skip_depth += 1
        if tag in {"p", "div", "li", "br", "tr", "h1", "h2", "h3", "h4"}:
            self._chunks.append("\n")

    def handle_endtag(self, tag: str) -> None:
        if tag in self._SKIP and self._skip_depth > 0:
            self._skip_depth -= 1

    def handle_data(self, data: str) -> None:
        if not self._skip_depth:
            self._chunks.append(data)

    def get_text(self) -> str:
        return re.sub(r"\n{3,}", "\n\n", "".join(self._chunks)).strip()


def strip_html(html: str) -> str:
    """Convert an HTML fragment to readable plain text."""
    extractor = _TextExtractor()
    try:
        extractor.feed(html or "")
    except Exception:
        return re.sub(r"<[^>]+>", " ", html or "").strip()
    return extractor.get_text()


def normalize_employment_type(raw: Optional[str]) -> Optional[str]:
    if not raw:
        return None
    return _EMPLOYMENT_TYPE_MAP.get(raw.strip().lower(), raw.strip().lower())


def detect_ats_from_url(url: str) -> Optional[Dict[str, str]]:
    """Identify the ATS behind a recruiting page URL.

    Returns {"ats_type", "org_key", "suggested_name", "portal_url"} or
    None when the URL does not match a known ATS pattern.
    """
    if not url or not urlparse(url).netloc:
        url = f"https://{url}"
    target = url.split("?", 1)[0]
    for pattern, ats_type in _URL_PATTERNS:
        # Re-run against the full URL so embed-style query tokens match
        for candidate in (target, url):
            match = pattern.search(candidate)
            if match:
                org_key = match.group(1)
                return {
                    "ats_type": ats_type,
                    "org_key": org_key,
                    "suggested_name": org_key[:1].upper() + org_key[1:],
                    "portal_url": f"https://{candidate.split('://', 1)[-1].split('/', 1)[0]}/{org_key}",
                }
    return None


def _parse_datetime(value: Any) -> Optional[datetime]:
    """Best-effort datetime parsing for the formats ATS APIs emit."""
    if not value:
        return None
    if isinstance(value, (int, float)):
        # Lever emits epoch milliseconds
        try:
            return datetime.fromtimestamp(value / 1000, tz=timezone.utc)
        except (OverflowError, OSError, ValueError):
            return None
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
    return None


@dataclass
class NormalizedJob:
    """ATS-posting normalized to SyncHire's job description shape."""

    external_id: str
    title: str
    url: Optional[str] = None
    apply_url: Optional[str] = None
    location: Optional[str] = None
    description_html: Optional[str] = None
    description_text: Optional[str] = None
    employment_type: Optional[str] = None
    remote: str = "onsite"  # remote | hybrid | onsite
    departments: List[str] = field(default_factory=list)
    posted_at: Optional[datetime] = None


@dataclass
class SyncResult:
    new_count: int = 0
    updated_count: int = 0
    total_count: int = 0
    status: str = "ok"  # ok | empty | error
    message: Optional[str] = None


def _infer_remote(location: Optional[str]) -> str:
    if not location:
        return "onsite"
    lowered = location.lower()
    if "hybrid" in lowered:
        return "hybrid"
    if "remote" in lowered or "远程" in lowered:
        return "remote"
    return "onsite"


async def _fetch_json(client: httpx.AsyncClient, url: str) -> Any:
    response = await client.get(url, headers=_HEADERS)
    response.raise_for_status()
    return response.json()


async def fetch_greenhouse(
    client: httpx.AsyncClient, org_key: str
) -> List[NormalizedJob]:
    """Fetch jobs from Greenhouse's public board API."""
    data = await _fetch_json(
        client,
        f"https://boards-api.greenhouse.io/v1/boards/{org_key}/jobs?content=true",
    )
    jobs: List[NormalizedJob] = []
    for item in data.get("jobs", []):
        location = (item.get("location") or {}).get("name")
        html = item.get("content")
        jobs.append(
            NormalizedJob(
                external_id=str(item["id"]),
                title=item.get("title") or "Untitled",
                url=item.get("absolute_url"),
                location=location,
                description_html=html,
                description_text=strip_html(html) if html else None,
                employment_type=None,
                remote=_infer_remote(location),
                departments=[
                    d.get("name")
                    for d in item.get("departments") or []
                    if d.get("name")
                ],
                posted_at=_parse_datetime(item.get("updated_at")),
            )
        )
    return jobs


async def fetch_lever(client: httpx.AsyncClient, org_key: str) -> List[NormalizedJob]:
    """Fetch jobs from Lever's public postings API."""
    data = await _fetch_json(
        client, f"https://api.lever.co/v0/postings/{org_key}?mode=json"
    )
    jobs: List[NormalizedJob] = []
    for item in data:
        categories = item.get("categories") or {}
        location = categories.get("location")
        text_parts = [
            part
            for part in (item.get("descriptionPlain"), item.get("additionalPlain"))
            if part
        ]
        departments = [
            d for d in (categories.get("team"), categories.get("department")) if d
        ]
        jobs.append(
            NormalizedJob(
                external_id=str(item["id"]),
                title=item.get("text") or "Untitled",
                url=item.get("hostedUrl"),
                apply_url=item.get("applyUrl"),
                location=location,
                description_text="\n\n".join(text_parts) or None,
                employment_type=normalize_employment_type(categories.get("commitment")),
                remote=_infer_remote(location),
                departments=departments,
                posted_at=_parse_datetime(item.get("createdAt")),
            )
        )
    return jobs


async def fetch_ashby(client: httpx.AsyncClient, org_key: str) -> List[NormalizedJob]:
    """Fetch jobs from Ashby's public job board API."""
    data = await _fetch_json(
        client, f"https://api.ashbyhq.com/posting-api/job-board/{org_key}"
    )
    workplace_map = {"Remote": "remote", "Hybrid": "hybrid", "OnSite": "onsite"}
    jobs: List[NormalizedJob] = []
    for item in data.get("jobs", []):
        if item.get("isListed") is False:
            continue
        html = item.get("descriptionHtml")
        jobs.append(
            NormalizedJob(
                external_id=str(item.get("id") or item.get("jobUrl") or item["title"]),
                title=item.get("title") or "Untitled",
                url=item.get("jobUrl"),
                apply_url=item.get("applyUrl"),
                location=item.get("location"),
                description_html=html,
                description_text=item.get("descriptionPlain")
                or (strip_html(html) if html else None),
                employment_type=normalize_employment_type(item.get("employmentType")),
                remote=workplace_map.get(
                    item.get("workplaceType"), _infer_remote(item.get("location"))
                ),
                departments=[
                    d for d in (item.get("department"), item.get("team")) if d
                ],
                posted_at=_parse_datetime(item.get("publishedAt")),
            )
        )
    return jobs


async def _fetch_smartrecruiters_detail(
    client: httpx.AsyncClient, org_key: str, posting_id: str
) -> Optional[str]:
    """Fetch a single posting's description (bounded, best-effort)."""
    try:
        data = await _fetch_json(
            client,
            f"https://api.smartrecruiters.com/v1/companies/{org_key}/postings/{posting_id}",
        )
        job_ad = data.get("jobAd") or {}
        sections = job_ad.get("sections") or {}
        html = sections.get("jobDescription", {}).get("text") or job_ad.get(
            "description"
        )
        return html
    except Exception:
        return None


async def fetch_smartrecruiters(
    client: httpx.AsyncClient, org_key: str
) -> List[NormalizedJob]:
    """Fetch jobs from SmartRecruiters' public postings API.

    The list endpoint lacks descriptions, so details are fetched with
    bounded concurrency and capped per sync.
    """
    jobs: List[NormalizedJob] = []
    limit = 100
    offset = 0
    max_jobs = settings.JOB_SOURCE_MAX_JOBS_PER_SYNC
    while len(jobs) < max_jobs:
        data = await _fetch_json(
            client,
            f"https://api.smartrecruiters.com/v1/companies/{org_key}/postings"
            f"?limit={limit}&offset={offset}",
        )
        content = data.get("content") or []
        if not content:
            break
        for item in content:
            location_parts = [
                p
                for p in (
                    (item.get("location") or {}).get("city"),
                    (item.get("location") or {}).get("country"),
                )
                if p
            ]
            remote = (
                "remote" if (item.get("location") or {}).get("remote") else "onsite"
            )
            jobs.append(
                NormalizedJob(
                    external_id=str(item["id"]),
                    title=item.get("name") or "Untitled",
                    url=f"https://jobs.smartrecruiters.com/{org_key}/{item['id']}",
                    location=", ".join(location_parts) or None,
                    employment_type=normalize_employment_type(
                        (item.get("typeOfEmployment") or {}).get("label")
                    ),
                    remote=remote,
                    posted_at=_parse_datetime(item.get("releasedDate")),
                )
            )
        total = data.get("totalFound") or 0
        offset += limit
        if offset >= total:
            break

    jobs = jobs[:max_jobs]

    # Enrich the newest postings with full descriptions
    detail_targets = jobs[: settings.JOB_SOURCE_DETAIL_FETCH_LIMIT]

    async def _enrich(job: NormalizedJob) -> None:
        html = await _fetch_smartrecruiters_detail(client, org_key, job.external_id)
        if html:
            job.description_html = html
            job.description_text = strip_html(html)

    await asyncio.gather(*(_enrich(job) for job in detail_targets))
    return jobs


_ADAPTERS = {
    ATS_GREENHOUSE: fetch_greenhouse,
    ATS_LEVER: fetch_lever,
    ATS_ASHBY: fetch_ashby,
    ATS_SMARTRECRUITERS: fetch_smartrecruiters,
}


def get_adapter(ats_type: str):
    return _ADAPTERS.get(ats_type)


def _job_description_from_normalized(
    source: JobSource, job: NormalizedJob, existing: Optional[JobDescription]
) -> JobDescription:
    """Build or update a JobDescription row from a normalized posting."""
    description_text = job.description_text or job.description_html or ""
    if not description_text.strip():
        description_text = (
            f"{job.title} at {source.name}"
            + (f" — {job.location}" if job.location else "")
            + ". Full description available at the job page."
        )
    parsed_json = {
        "departments": job.departments,
        "posted_at": job.posted_at.isoformat() if job.posted_at else None,
        "ats_type": source.ats_type,
    }
    row = existing or JobDescription(
        id=None,  # type: ignore[arg-type] # caller assigns uuid below
        company=source.name,
        title=job.title[:255],
    )
    row.company = source.name
    row.title = job.title[:255]
    row.description = job.description_html or description_text
    row.raw_text = description_text
    row.url = job.url
    row.platform = source.ats_type
    row.source_url = job.apply_url or job.url
    row.source = source.source_key
    row.external_id = job.external_id[:255]
    row.location = job.location[:255] if job.location else None
    row.employment_type = job.employment_type
    row.remote = job.remote
    row.parsed_json = dump_json(parsed_json)
    return row


async def sync_job_source(db: AsyncSession, source: JobSource) -> SyncResult:
    """Fetch a job source's postings and upsert them as JDs."""
    adapter = get_adapter(source.ats_type)
    if adapter is None:
        result = SyncResult(
            status="error", message=f"Unsupported ATS type: {source.ats_type}"
        )
        _record_sync(db, source, result)
        await db.commit()
        return result

    try:
        async with httpx.AsyncClient(
            timeout=settings.JOB_SOURCE_FETCH_TIMEOUT, follow_redirects=True
        ) as client:
            jobs = await adapter(client, source.org_key)
    except Exception as exc:
        logger.warning(
            LogCategory.API,
            f"Job source sync failed ({source.name}): {exc}",
        )
        result = SyncResult(status="error", message=str(exc)[:500])
        _record_sync(db, source, result)
        await db.commit()
        return result

    jobs = jobs[: settings.JOB_SOURCE_MAX_JOBS_PER_SYNC]

    existing_rows = await db.execute(
        select(JobDescription).where(JobDescription.source == source.source_key)
    )
    existing_by_ext = {row.external_id: row for row in existing_rows.scalars().all()}

    result = SyncResult(total_count=len(jobs))
    for job in jobs:
        existing = existing_by_ext.get(job.external_id)
        row = _job_description_from_normalized(source, job, existing)
        if existing is None:
            row.id = uuid.uuid4()
            db.add(row)
            result.new_count += 1
        else:
            result.updated_count += 1

    if not jobs:
        result.status = "empty"
        result.message = "No postings returned by the ATS API"

    _record_sync(db, source, result)
    await db.commit()

    # Rank the new arrivals against the local resume (free, deterministic)
    if result.new_count:
        try:
            from app.services.job_match_service import score_unscored_jobs

            await score_unscored_jobs(db, limit=settings.JOB_SOURCE_AUTOSCORE_LIMIT)
        except Exception as exc:
            logger.warning(LogCategory.DATA, f"Auto-scoring after sync failed: {exc}")

    logger.info(
        LogCategory.DATA,
        f"Synced job source {source.name}: {result.new_count} new, "
        f"{result.updated_count} updated, {result.total_count} total",
    )
    return result


def _record_sync(db: AsyncSession, source: JobSource, result: SyncResult) -> None:
    """Stage sync outcome on the source row; caller commits."""
    source.last_synced_at = datetime.now(timezone.utc)
    source.last_sync_status = result.status
    source.last_sync_message = result.message
    source.last_new_count = result.new_count
    source.last_total_count = result.total_count
    db.add(source)


async def sync_all_enabled(db: AsyncSession) -> List[tuple]:
    """Sync every enabled job source sequentially (polite to ATS APIs).

    Returns (JobSource, SyncResult) pairs in created_at order.
    """
    rows = await db.execute(
        select(JobSource)
        .where(JobSource.enabled.is_(True))
        .order_by(JobSource.created_at)
    )
    pairs = []
    for source in rows.scalars().all():
        result = await sync_job_source(db, source)
        pairs.append((source, result))
    return pairs


# Verified-live sample sources offered through the seed endpoint
DEFAULT_SEED_SOURCES = [
    {"name": "Stripe", "ats_type": ATS_GREENHOUSE, "org_key": "stripe"},
    {"name": "Lever (demo board)", "ats_type": ATS_LEVER, "org_key": "leverdemo"},
    {"name": "Visa", "ats_type": ATS_SMARTRECRUITERS, "org_key": "Visa"},
    {"name": "Ashby", "ats_type": ATS_ASHBY, "org_key": "Ashby"},
]


async def seed_default_sources(db: AsyncSession) -> List[JobSource]:
    """Add the verified sample sources that are not present yet."""
    existing = await db.execute(select(JobSource))
    known = {(s.ats_type, s.org_key.lower()) for s in existing.scalars().all()}
    created: List[JobSource] = []
    for seed in DEFAULT_SEED_SOURCES:
        if (seed["ats_type"], seed["org_key"].lower()) in known:
            continue
        source = JobSource(
            id=uuid.uuid4(),
            name=seed["name"],
            ats_type=seed["ats_type"],
            org_key=seed["org_key"],
            portal_url=None,
        )
        db.add(source)
        created.append(source)
    if created:
        await db.commit()
    return created
