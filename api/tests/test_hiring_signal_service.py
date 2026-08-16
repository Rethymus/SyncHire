"""
Hiring Signal Service Tests

Covers batch-label extraction, company alias matching (bilingual),
multi-company detection, and the signal-driven directory ordering.
"""

import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import pytest_asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database_lite import Base
from app.models.company_directory import CompanyDirectoryEntry
from app.services import hiring_signal_service as signal_svc


@pytest_asyncio.fixture
async def db_session():
    from app.models import (  # noqa: F401
        ai_provider_settings_lite,
        application_lite,
        application_material_lite,
        candidate_profile_item_lite,
        candidate_profile_lite,
        candidate_role_card_lite,
        company_directory,
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


def _entry(name, aliases=None, url="https://example.com"):
    import json

    return CompanyDirectoryEntry(
        id=uuid.uuid4(),
        name=name,
        aliases=json.dumps(aliases or [name]),
        career_url=url,
    )


# ---------------------------------------------------------------------------
# Batch extraction
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "title,expected",
    [
        ("腾讯2027届秋招正式启动", "2027届秋招"),
        ("2027届秋招来了！腾讯全球校园招聘", "2027届秋招"),
        ("华为秋季校园招聘开启", "秋招"),
        ("阿里春招网申通道开放", "春招"),
        ("字节跳动提前批启动", "提前批"),
        ("美团暑期实习生招募", "暑期实习"),
        ("百度实习生招聘公告", "实习"),
        ("网易社会招聘岗位发布", "社招"),
        ("小米校园招聘进行中", "校招"),
        ("普通公司新闻稿，无招聘信息", None),
        ("", None),
    ],
)
def test_extract_batch(title, expected):
    assert signal_svc.extract_batch(title) == expected


def test_extract_batch_prefers_year_over_generic():
    # Both 秋招-with-year and plain 校园招聘 match; year form wins
    assert signal_svc.extract_batch("2026届秋季校园招聘正式启动") == "2026届秋招"


# ---------------------------------------------------------------------------
# Company matching / signal detection
# ---------------------------------------------------------------------------


def test_match_companies_by_alias():
    entries = [
        _entry("腾讯", ["Tencent", "腾讯"]),
        _entry("哔哩哔哩", ["B站", "bilibili"]),
        _entry("美团", ["美团"]),
    ]
    matched = signal_svc.match_companies("B站2027届秋招正式启动", entries)
    assert [e.name for e in matched] == ["哔哩哔哩"]


def test_match_companies_case_insensitive_latin():
    entries = [_entry("字节跳动", ["ByteDance"])]
    matched = signal_svc.match_companies("bytedance 秋招启动", entries)
    assert len(matched) == 1


def test_detect_signals_requires_batch_keyword():
    entries = [_entry("腾讯")]
    # Company present but no recruiting keyword -> no signal
    assert signal_svc.detect_signals("腾讯发布季度财报", entries) == []


def test_detect_signals_multiple_companies():
    entries = [_entry("腾讯"), _entry("阿里", ["阿里"])]
    signals = signal_svc.detect_signals("腾讯阿里联合2027届秋招启动", entries)
    assert {s.company_name for s in signals} == {"腾讯", "阿里"}
    assert all(s.batch == "2027届秋招" for s in signals)


@pytest.mark.asyncio
async def test_apply_signal_pins_and_orders_directory(db_session):
    now = datetime.now(timezone.utc)
    tencent = _entry("腾讯", url="https://join.qq.com")
    meituan = _entry("美团", url="https://zhaopin.meituan.com")
    meituan.signal_batch = "春招"
    meituan.signal_detected_at = now - timedelta(days=3)
    db_session.add_all([tencent, meituan])
    await db_session.commit()

    signals = await signal_svc.apply_signal(
        db_session, "腾讯2027届秋招正式启动", url="https://mp.weixin.qq.com/s/abc"
    )
    assert len(signals) == 1
    assert signals[0].batch == "2027届秋招"

    rows = (
        (
            await db_session.execute(
                select(CompanyDirectoryEntry).order_by(
                    CompanyDirectoryEntry.signal_detected_at.desc().nullslast()
                )
            )
        )
        .scalars()
        .all()
    )
    # Freshest signal first, unsignaled companies last
    assert [r.name for r in rows] == ["腾讯", "美团"]
    assert rows[0].signal_url == "https://mp.weixin.qq.com/s/abc"


@pytest.mark.asyncio
async def test_apply_signal_no_match_is_noop(db_session):
    db_session.add(_entry("腾讯"))
    await db_session.commit()
    signals = await signal_svc.apply_signal(db_session, "某新能源公司秋招启动")
    assert signals == []
    entry = (await db_session.execute(select(CompanyDirectoryEntry))).scalar_one()
    assert entry.signal_batch is None


@pytest.mark.asyncio
async def test_fetch_article_title_extracts_og_title():
    html = '<html><meta property="og:title" content="同学们好，Apple 校园秋招来了。" /></html>'
    client = MagicMock()
    response = MagicMock()
    response.status_code = 200
    response.raise_for_status = MagicMock()
    response.text = html
    client.get = AsyncMock(return_value=response)

    import contextlib

    @contextlib.asynccontextmanager
    async def _factory(*args, **kwargs):
        yield client

    with patch.object(signal_svc.httpx, "AsyncClient", return_value=_factory()):
        title = await signal_svc.fetch_article_title("https://mp.weixin.qq.com/s/x")
    assert title == "同学们好，Apple 校园秋招来了。"


@pytest.mark.asyncio
async def test_seed_companies_idempotent(db_session):
    created1 = await signal_svc.seed_companies(db_session)
    created2 = await signal_svc.seed_companies(db_session)
    assert created1 > 0
    assert created2 == 0
    total = len(
        (await db_session.execute(select(CompanyDirectoryEntry))).scalars().all()
    )
    assert total == len(signal_svc.SEED_COMPANIES)
    # Industry tags are seeded for signal grouping/display
    industries = {
        e.industry
        for e in (await db_session.execute(select(CompanyDirectoryEntry)))
        .scalars()
        .all()
    }
    assert "互联网" in industries
    assert "银行" in industries


@pytest.mark.asyncio
async def test_import_companies_bulk_dedupes(db_session):
    from fastapi import FastAPI
    from httpx import ASGITransport, AsyncClient

    from app.core.database_lite import get_db
    from app.api.companies_lite import router as companies_router

    async def _override():
        yield db_session

    app = FastAPI()
    app.include_router(companies_router, prefix="/api")
    app.dependency_overrides[get_db] = _override

    payload = {
        "companies": [
            {
                "name": "测试公司甲",
                "career_url": "https://a.example.com",
                "industry": "测试",
            },
            {"name": "测试公司乙"},
        ]
    }
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        first = await client.post("/api/companies/import", json=payload)
        assert first.status_code == 200
        assert first.json() == {"created": 2, "skipped": 0}

        # Re-import: same names skipped, new one created
        payload["companies"].append({"name": "测试公司丙"})
        second = await client.post("/api/companies/import", json=payload)
        assert second.json() == {"created": 1, "skipped": 2}

    total = len(
        (await db_session.execute(select(CompanyDirectoryEntry))).scalars().all()
    )
    assert total == 3
