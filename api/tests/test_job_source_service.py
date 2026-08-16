"""
Job Source Service Tests

Covers ATS URL detection, payload parsing per adapter, HTML stripping,
and the deduplicating sync pipeline (in-memory SQLite).
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch
import uuid

import pytest
import pytest_asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database_lite import Base
from app.models.jd_lite import JobDescription
from app.models.job_source import JobSource
from app.services import job_source_service as svc


# ---------------------------------------------------------------------------
# URL detection
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "url,expected_ats,expected_org",
    [
        ("https://job-boards.greenhouse.io/stripe", "greenhouse", "stripe"),
        ("https://boards.greenhouse.io/vercel?for=vercel", "greenhouse", "vercel"),
        (
            "https://boards.greenhouse.io/embed/job_board?for=anthropic",
            "greenhouse",
            "anthropic",
        ),
        ("https://jobs.lever.co/plaid", "lever", "plaid"),
        ("https://jobs.eu.lever.co/some-team", "lever", "some-team"),
        ("https://jobs.ashbyhq.com/Ashby", "ashby", "Ashby"),
        (
            "https://careers.smartrecruiters.com/Visa",
            "smartrecruiters",
            "Visa",
        ),
        ("https://jobs.smartrecruiters.com/AcmeCo", "smartrecruiters", "AcmeCo"),
        # Bare host without scheme still detected
        ("job-boards.greenhouse.io/stripe", "greenhouse", "stripe"),
    ],
)
def test_detect_ats_from_url(url, expected_ats, expected_org):
    result = svc.detect_ats_from_url(url)
    assert result is not None, f"should detect {url}"
    assert result["ats_type"] == expected_ats
    assert result["org_key"] == expected_org
    assert result["suggested_name"]


@pytest.mark.parametrize(
    "url",
    [
        "https://example.com/careers",
        "https://www.linkedin.com/jobs",
        "https://app.mokahr.com/su/ozxnwp",  # not yet supported in P1
        "",
    ],
)
def test_detect_ats_from_url_unsupported(url):
    assert svc.detect_ats_from_url(url) is None


# ---------------------------------------------------------------------------
# HTML stripping / normalization helpers
# ---------------------------------------------------------------------------


def test_strip_html_removes_tags_and_scripts():
    html = "<h1>Engineer</h1><p>Build <b>things</b>.</p><script>alert(1)</script><style>a{}</style>"
    text = svc.strip_html(html)
    assert "Engineer" in text
    assert "Build things." in text
    assert "alert" not in text


def test_strip_html_empty():
    assert svc.strip_html("") == ""


@pytest.mark.parametrize(
    "raw,expected",
    [
        ("FullTime", "full-time"),
        ("Intern", "internship"),
        ("contract", "contract"),
        (None, None),
        ("Whatever", "whatever"),
    ],
)
def test_normalize_employment_type(raw, expected):
    assert svc.normalize_employment_type(raw) == expected


def test_parse_datetime_epoch_milliseconds():
    result = svc._parse_datetime(1717200000000)
    assert isinstance(result, datetime)
    assert result.tzinfo is not None


def test_parse_datetime_iso_string():
    result = svc._parse_datetime("2026-08-15T10:00:00Z")
    assert result is not None and result.year == 2026


# ---------------------------------------------------------------------------
# Adapter payload parsing (mocked HTTP)
# ---------------------------------------------------------------------------


def _client_mock() -> MagicMock:
    client = MagicMock()
    client.get = AsyncMock()
    return client


@pytest.mark.asyncio
async def test_fetch_greenhouse_parses_jobs():
    client = _client_mock()
    client.get.return_value = _json_response(
        {
            "jobs": [
                {
                    "id": 123,
                    "title": "Software Engineer",
                    "absolute_url": "https://stripe.com/jobs/123",
                    "location": {"name": "SF, NYC, SEA, CHI"},
                    "content": "<p>Build payments.</p>",
                    "updated_at": "2026-08-01T00:00:00Z",
                }
            ]
        }
    )
    jobs = await svc.fetch_greenhouse(client, "stripe")
    assert len(jobs) == 1
    job = jobs[0]
    assert job.external_id == "123"
    assert job.title == "Software Engineer"
    assert "Build payments." in job.description_text
    assert job.remote == "onsite"
    client.get.assert_awaited_once()
    assert "content=true" in client.get.await_args.args[0]


@pytest.mark.asyncio
async def test_fetch_lever_parses_jobs_and_remote():
    client = _client_mock()
    client.get.return_value = _json_response(
        [
            {
                "id": "abc-1",
                "text": "Platform Engineer",
                "hostedUrl": "https://jobs.lever.co/x/abc-1",
                "applyUrl": "https://jobs.lever.co/x/abc-1/apply",
                "categories": {
                    "location": "Remote - US",
                    "team": "Infrastructure",
                    "commitment": "Full-time",
                },
                "descriptionPlain": "Own the platform.",
                "createdAt": 1717200000000,
            }
        ]
    )
    jobs = await svc.fetch_lever(client, "leverdemo")
    assert len(jobs) == 1
    job = jobs[0]
    assert job.external_id == "abc-1"
    assert job.remote == "remote"
    assert job.employment_type == "full-time"
    assert job.apply_url.endswith("/apply")


@pytest.mark.asyncio
async def test_fetch_ashby_skips_unlisted_and_maps_workplace():
    client = _client_mock()
    client.get.return_value = _json_response(
        {
            "jobs": [
                {
                    "id": "j-1",
                    "title": "EM - EU",
                    "jobUrl": "https://jobs.ashbyhq.com/Ashby/j-1",
                    "applyUrl": "https://jobs.ashbyhq.com/Ashby/j-1/application",
                    "location": "Remote - European Union",
                    "workplaceType": "Remote",
                    "employmentType": "FullTime",
                    "descriptionHtml": "<p>Lead a team.</p>",
                    "publishedAt": "2026-07-01T00:00:00Z",
                    "isListed": True,
                },
                {"id": "j-2", "title": "Hidden", "isListed": False},
            ]
        }
    )
    jobs = await svc.fetch_ashby(client, "Ashby")
    assert len(jobs) == 1
    assert jobs[0].remote == "remote"
    assert jobs[0].employment_type == "full-time"


@pytest.mark.asyncio
async def test_fetch_smartrecruiters_paginates_and_enriches():
    client = _client_mock()

    list_page_1 = {
        "totalFound": 2,
        "content": [
            {
                "id": "111",
                "name": "Sr. Manager",
                "releasedDate": "2026-08-01T00:00:00.000Z",
                "location": {"city": "Warsaw", "country": "Poland", "remote": True},
                "typeOfEmployment": {"label": "Permanent"},
            },
            {"id": "222", "name": "Analyst"},
        ],
    }

    async def get_side_effect(url, headers=None):
        if "postings/111" in url:
            return _json_response(
                {"jobAd": {"sections": {"jobDescription": {"text": "<p>Lead it.</p>"}}}}
            )
        if "postings/222" in url:
            return _json_response({"jobAd": {}})
        if "offset=0" in url or ("offset" not in url and "postings?" in url):
            return _json_response(list_page_1)
        return _json_response({"totalFound": 2, "content": []})

    client.get = AsyncMock(side_effect=get_side_effect)
    jobs = await svc.fetch_smartrecruiters(client, "Visa")
    assert len(jobs) == 2
    assert jobs[0].remote == "remote"
    assert "Lead it." in jobs[0].description_text
    # jobs without a detail payload keep empty descriptions; the
    # non-empty fallback is applied at ingest, covered by the sync tests
    assert jobs[1].title == "Analyst"


def _json_response(payload):
    response = MagicMock()
    response.raise_for_status = MagicMock()
    response.json = MagicMock(return_value=payload)
    return response


# ---------------------------------------------------------------------------
# Sync pipeline with in-memory SQLite (dedup + upsert)
# ---------------------------------------------------------------------------


@pytest_asyncio.fixture
async def db_session():
    # Import the full lite model set (mirrors database_lite.init_db) so
    # string relationships and FKs resolve when mappers first configure.
    from app.models import (  # noqa: F401
        ai_provider_settings_lite,
        application_lite,
        application_material_lite,
        candidate_profile_item_lite,
        candidate_profile_lite,
        candidate_role_card_lite,
        extensions,
        jd_lite,
        job_source,
        local_profile,
        resume_export_lite,
        resume_lite,
        resume_variant_lite,
    )

    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with maker() as session:
        yield session
    await engine.dispose()


def _make_source():
    return JobSource(
        id=uuid.uuid4(),
        name="Stripe",
        ats_type="greenhouse",
        org_key="stripe",
    )


@pytest.mark.asyncio
async def test_sync_job_source_ingests_and_dedups(db_session):
    source = _make_source()
    payload = {
        "jobs": [
            {
                "id": 1,
                "title": "Engineer I",
                "absolute_url": "https://x/1",
                "location": {"name": "Seattle"},
                "content": "<p>First run.</p>",
            }
        ]
    }
    with patch.object(
        svc.httpx, "AsyncClient", return_value=_mock_async_context(payload)
    ):
        result1 = await svc.sync_job_source(db_session, source)
    assert result1.status == "ok"
    assert result1.new_count == 1
    assert result1.total_count == 1

    # Second sync with an updated title: no duplicate row, title refreshed
    payload["jobs"][0]["title"] = "Engineer I (Updated)"
    with patch.object(
        svc.httpx, "AsyncClient", return_value=_mock_async_context(payload)
    ):
        result2 = await svc.sync_job_source(db_session, source)
    assert result2.new_count == 0
    assert result2.updated_count == 1

    rows = (
        await db_session.execute(
            select(JobDescription).where(JobDescription.source == source.source_key)
        )
    ).scalars().all()
    assert len(rows) == 1
    assert rows[0].title == "Engineer I (Updated)"
    assert rows[0].platform == "greenhouse"
    assert rows[0].external_id == "1"

    source_row = (
        await db_session.execute(select(JobSource))
    ).scalar_one()
    assert source_row.last_sync_status == "ok"
    assert source_row.last_synced_at is not None


@pytest.mark.asyncio
async def test_sync_job_source_handles_fetch_error(db_session):
    source = _make_source()

    class Boom(Exception):
        pass

    failing = _mock_async_context(None, error=Boom("network down"))
    with patch.object(svc.httpx, "AsyncClient", return_value=failing):
        result = await svc.sync_job_source(db_session, source)
    assert result.status == "error"
    assert "network down" in result.message
    source_row = (await db_session.execute(select(JobSource))).scalar_one()
    assert source_row.last_sync_status == "error"


@pytest.mark.asyncio
async def test_sync_job_source_requires_description_fallback(db_session):
    source = _make_source()
    # Posting without any description content
    payload = {
        "jobs": [
            {
                "id": 9,
                "title": "Mystery Role",
                "absolute_url": "https://x/9",
                "location": {"name": "Tokyo"},
            }
        ]
    }
    with patch.object(
        svc.httpx, "AsyncClient", return_value=_mock_async_context(payload)
    ):
        result = await svc.sync_job_source(db_session, source)
    assert result.new_count == 1
    row = (
        await db_session.execute(
            select(JobDescription).where(JobDescription.external_id == "9")
        )
    ).scalar_one()
    assert row.description.strip()  # non-empty fallback


def _mock_async_context(payload, error=None):
    import contextlib

    client = MagicMock()
    if error is not None:
        client.get = AsyncMock(side_effect=error)
    else:
        client.get = AsyncMock(return_value=_json_response(payload))

    @contextlib.asynccontextmanager
    async def _factory(*args, **kwargs):
        yield client

    return _factory()


# ---------------------------------------------------------------------------
# P2: local match scoring
# ---------------------------------------------------------------------------


from app.models.resume_lite import Resume
from app.services import job_match_service as match_svc

RESUME_TEXT = """
Senior Backend Engineer. Skills: Python, FastAPI, PostgreSQL, Docker,
Kubernetes, AWS, Redis, pytest. Built data pipelines with Spark.
5 years of experience with React frontend and TypeScript.
"""

JD_STRONG = """
Backend Engineer - Platform
We need someone with Python, FastAPI, PostgreSQL, Docker and AWS
experience. Kubernetes and Redis knowledge required. pytest for testing.
"""

JD_WEAK = """
Design Researcher - Brand Studio
Lead user research studies, interviews, and design workshops.
Background in industrial design, typography, and illustration required.
"""


def test_local_match_score_ranks_relevant_jd_higher():
    strong = match_svc.local_match_score(RESUME_TEXT, JD_STRONG)
    weak = match_svc.local_match_score(RESUME_TEXT, JD_WEAK)
    assert strong.score > weak.score
    assert strong.score >= 60
    assert "python" in " ".join(strong.matched_terms).lower()
    assert 0 <= weak.score <= 100


def test_local_match_score_empty_inputs():
    result = match_svc.local_match_score("", JD_STRONG)
    assert result.score == 50.0
    result = match_svc.local_match_score(RESUME_TEXT, "")
    assert result.score == 50.0


def test_local_match_score_lists_missing_high_value_terms():
    result = match_svc.local_match_score(RESUME_TEXT, JD_WEAK)
    assert isinstance(result.missing_terms, list)


@pytest.mark.asyncio
async def test_score_unscored_jobs_uses_latest_resume(db_session):
    from datetime import datetime, timedelta, timezone

    now = datetime.now(timezone.utc)
    resume_old = Resume(
        id=uuid.uuid4(),
        title="Old resume",
        content="Java Spring developer",
        updated_at=now - timedelta(days=1),
    )
    resume_new = Resume(
        id=uuid.uuid4(), title="New resume", content=RESUME_TEXT, updated_at=now
    )
    db_session.add(resume_old)
    db_session.add(resume_new)
    await db_session.commit()

    source = _make_source()
    payload = {
        "jobs": [
            {
                "id": 1,
                "title": "Backend Engineer",
                "absolute_url": "https://x/1",
                "location": {"name": "Seattle"},
                "content": JD_STRONG,
            }
        ]
    }
    with patch.object(
        svc.httpx, "AsyncClient", return_value=_mock_async_context(payload)
    ):
        # Sync scores automatically via the auto-score hook
        await svc.sync_job_source(db_session, source)

    row = (
        await db_session.execute(
            select(JobDescription).where(JobDescription.external_id == "1")
        )
    ).scalar_one()
    assert row.match_score is not None
    assert row.match_score >= 60  # scored against the Python resume
    import json as _json

    detail = _json.loads(row.match_detail)
    assert detail["resume_id"] == str(resume_new.id)
    assert "python" in " ".join(detail["matched"]).lower()


@pytest.mark.asyncio
async def test_score_unscored_jobs_without_resume_is_noop(db_session):
    scored, title = await match_svc.score_unscored_jobs(db_session, limit=10)
    assert scored == 0
    assert title is None


# ---------------------------------------------------------------------------
# Job browser application logging + LLM scoring (endpoint-level)
# ---------------------------------------------------------------------------

from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from app.core.database_lite import get_db
from app.api.job_sources_lite import router as job_sources_router


@pytest_asyncio.fixture
async def client_factory(db_session):
    """FastAPI app wired to the in-memory session for endpoint tests."""

    async def _override():
        yield db_session

    app = FastAPI()
    app.include_router(job_sources_router, prefix="/api")
    app.dependency_overrides[get_db] = _override
    transport = ASGITransport(app=app)
    AsyncClientLocal = AsyncClient(transport=transport, base_url="http://test")
    return AsyncClientLocal


@pytest.mark.asyncio
async def test_log_application_links_existing_feed_jd(db_session, client_factory):
    resume = Resume(
        id=uuid.uuid4(),
        title="My Resume",
        content="python backend engineer",
        updated_at=datetime.now(timezone.utc),
    )
    db_session.add(resume)
    jd = JobDescription(
        id=uuid.uuid4(),
        company="Stripe",
        title="Engineer",
        description="python job",
        url="https://stripe.com/jobs/123",
        platform="greenhouse",
        source="greenhouse:stripe",
        external_id="123",
    )
    db_session.add(jd)
    await db_session.commit()

    async with client_factory as client:
        response = await client.post(
            "/api/job-sources/log-application",
            json={"url": "https://stripe.com/jobs/123", "title": "Engineer"},
        )

    assert response.status_code == 201
    data = response.json()
    assert data["jd_created"] is False
    assert data["jd_id"] == str(jd.id)
    assert data["status"] == "submitted"

    from app.models.application_lite import Application, ApplicationStatus

    application = (
        await db_session.execute(select(Application))
    ).scalar_one()
    assert application.status == ApplicationStatus.SUBMITTED
    assert application.platform == "job-browser"
    assert application.source_url == "https://stripe.com/jobs/123"


@pytest.mark.asyncio
async def test_log_application_creates_stub_jd(db_session, client_factory):
    resume = Resume(
        id=uuid.uuid4(),
        title="My Resume",
        content="engineer",
        updated_at=datetime.now(timezone.utc),
    )
    db_session.add(resume)
    await db_session.commit()

    async with client_factory as client:
        response = await client.post(
            "/api/job-sources/log-application",
            json={
                "url": "https://careers.example.com/apply/xyz",
                "title": "Some Role at Example",
            },
        )

    assert response.status_code == 201
    assert response.json()["jd_created"] is True


@pytest.mark.asyncio
async def test_log_application_requires_resume(db_session, client_factory):
    async with client_factory as client:
        response = await client.post(
            "/api/job-sources/log-application",
            json={"url": "https://careers.example.com/apply/xyz"},
        )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_llm_score_requires_ai_provider(db_session, client_factory):
    resume = Resume(
        id=uuid.uuid4(),
        title="R",
        content="engineer",
        updated_at=datetime.now(timezone.utc),
    )
    jd = JobDescription(
        id=uuid.uuid4(),
        company="C",
        title="T",
        description="job",
        platform="manual",
    )
    db_session.add(resume)
    db_session.add(jd)
    await db_session.commit()

    from app.services import ai_service_lite

    async with client_factory as client:
        with patch.object(
            ai_service_lite.ai_service, "openai_client", None
        ):
            response = await client.post(f"/api/job-sources/{jd.id}/score-llm")

    assert response.status_code == 422
    assert "AI provider" in response.json()["detail"]


@pytest.mark.asyncio
async def test_job_source_bulk_import_dedupes_and_defaults_disabled(
    db_session, client_factory,
):
    payload = {"ats_type": "greenhouse", "org_keys": ["stripe", "figma", "stripe"]}
    async with client_factory as client:
        first = await client.post("/api/job-sources/import", json=payload)
        assert first.status_code == 200
        assert first.json() == {"created": 2, "skipped": 1}

        second = await client.post("/api/job-sources/import", json=payload)
        assert second.json() == {"created": 0, "skipped": 3}

        bad = await client.post(
            "/api/job-sources/import",
            json={"ats_type": "moka", "org_keys": ["x"]},
        )
        assert bad.status_code == 422

    from app.models.job_source import JobSource as JobSourceModel

    rows = (await db_session.execute(select(JobSourceModel))).scalars().all()
    assert len(rows) == 2
    assert all(r.enabled is False for r in rows)  # imported disabled by default


# ---------------------------------------------------------------------------
# Campus repo markdown parsing (radar import source)
# ---------------------------------------------------------------------------

from app.services.hiring_signal_service import parse_campus_markdown


def test_parse_campus_markdown_extracts_companies_and_signals():
    markdown = """
| 公司     | 招聘状态&&投递链接 | 更新日期   | 地点 | 备注 |
| -------- | ------------------ | ---------- | ---- | ---- |
| 百度     | [校招提前批](https://talent.baidu.com/jobs/list) | 2026/7/20 | 全国 | 2027届校招提前批已开启 |
| 阿里巴巴 | [校招正式批](https://talent.alibaba.com/campus/position-list) | 2026/7/1 | 全国 | 2027届校招正式批预计7月开启 |
| 某创业公司 | [推文](https://mp.weixin.qq.com/s/abc) | 2026/7/2 | 上海 | 2027届秋招启动 |
"""
    rows = list(parse_campus_markdown(markdown))

    assert len(rows) == 3

    baidu = rows[0]
    assert baidu[0] == "百度"
    assert baidu[1] == "https://talent.baidu.com/jobs/list"  # official career URL
    assert baidu[3] == "2027届提前批"  # signal batch extracted
    assert baidu[5] is not None and baidu[5].year == 2026 and baidu[5].month == 7

    # 预计开启 -> company imported, no signal pinned
    alibaba = rows[1]
    assert alibaba[0] == "阿里巴巴"
    assert alibaba[3] is None

    # mp.weixin link is not a career URL, but the signal still applies
    startup = rows[2]
    assert startup[1] is None
    assert startup[3] == "2027届秋招"
