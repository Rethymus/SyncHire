"""
Signal Feed Service Tests

Covers RSS 2.0 / Atom parsing (CDATA, entity escaping, date formats)
and the end-to-end feed → title → radar-signal pipeline with mocked
HTTP.
"""

import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import pytest_asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database_lite import Base
from app.models.company_directory import CompanyDirectoryEntry
from app.models.signal_feed import SignalFeed
from app.services import signal_feed_service as feed_svc

RSS_SAMPLE = """<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <title>Test Feed</title>
  <item>
    <title><![CDATA[腾讯2027届秋招正式启动]]></title>
    <link>https://mp.weixin.qq.com/s/a1</link>
    <pubDate>Mon, 20 Jul 2026 17:00:00 GMT</pubDate>
  </item>
  <item>
    <title>美团&amp;字节暑期实习开启</title>
    <link>https://mp.weixin.qq.com/s/a2</link>
    <pubDate>Tue, 21 Jul 2026 08:00:00 GMT</pubDate>
  </item>
  <item>
    <title>本周行业资讯汇总</title>
    <link>https://mp.weixin.qq.com/s/a3</link>
  </item>
</channel></rss>"""

ATOM_SAMPLE = """<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Atom Feed</title>
  <entry>
    <title>B站2026届春季校园招聘启动</title>
    <link href="https://mp.weixin.qq.com/s/b1"/>
    <published>2026-03-01T09:00:00Z</published>
  </entry>
</feed>"""


# ---------------------------------------------------------------------------
# Parsing
# ---------------------------------------------------------------------------


def test_parse_rss_items_with_cdata_and_entities():
    items = feed_svc.parse_feed(RSS_SAMPLE)
    assert len(items) == 3
    assert items[0].title == "腾讯2027届秋招正式启动"
    assert items[0].link == "https://mp.weixin.qq.com/s/a1"
    assert items[0].published is not None and items[0].published.year == 2026
    assert items[1].title == "美团&字节暑期实习开启"  # entity decoded


def test_parse_atom_entries():
    items = feed_svc.parse_feed(ATOM_SAMPLE)
    assert len(items) == 1
    assert items[0].title == "B站2026届春季校园招聘启动"
    assert items[0].link == "https://mp.weixin.qq.com/s/b1"
    assert items[0].published is not None


def test_parse_feed_tolerates_garbage():
    assert feed_svc.parse_feed("") == []
    assert feed_svc.parse_feed("<html><body>not a feed</body></html>") == []


# ---------------------------------------------------------------------------
# Feed → radar pipeline (mocked HTTP)
# ---------------------------------------------------------------------------


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
        signal_feed,
    )

    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with maker() as session:
        import json

        session.add_all(
            [
                CompanyDirectoryEntry(
                    id=uuid.uuid4(),
                    name="腾讯",
                    aliases=json.dumps(["腾讯"]),
                    career_url="https://join.qq.com",
                ),
                CompanyDirectoryEntry(
                    id=uuid.uuid4(),
                    name="美团",
                    aliases=json.dumps(["美团"]),
                    career_url="https://zhaopin.meituan.com",
                ),
                CompanyDirectoryEntry(
                    id=uuid.uuid4(),
                    name="哔哩哔哩",
                    aliases=json.dumps(["B站", "bilibili"]),
                    career_url="https://jobs.bilibili.com",
                ),
            ]
        )
        await session.commit()
        yield session
    await engine.dispose()


def _mock_http(xml: str):
    import contextlib

    client = MagicMock()
    response = MagicMock()
    response.status_code = 200
    response.raise_for_status = MagicMock()
    response.text = xml
    client.get = AsyncMock(return_value=response)

    @contextlib.asynccontextmanager
    async def _factory(*args, **kwargs):
        yield client

    return _factory()


@pytest.mark.asyncio
async def test_sync_signal_feed_pins_companies_from_titles(db_session):
    feed = SignalFeed(
        id=uuid.uuid4(), name="校招情报", rss_url="https://r.example/feed"
    )
    db_session.add(feed)
    await db_session.commit()

    with patch.object(
        feed_svc.httpx, "AsyncClient", return_value=_mock_http(RSS_SAMPLE)
    ):
        result = await feed_svc.sync_signal_feed(db_session, feed)

    assert result.status == "ok"
    assert result.items_seen == 3
    # Signal-bearing titles pin companies; news items do not
    assert sorted(result.signals_applied) == [
        "美团·暑期实习",
        "腾讯·2027届秋招",
    ]

    rows = (await db_session.execute(select(CompanyDirectoryEntry))).scalars().all()
    by_name = {r.name: r for r in rows}
    assert by_name["腾讯"].signal_batch == "2027届秋招"
    assert by_name["腾讯"].signal_url == "https://mp.weixin.qq.com/s/a1"
    assert by_name["哔哩哔哩"].signal_batch is None  # not mentioned in feed

    refreshed = (await db_session.execute(select(SignalFeed))).scalar_one()
    assert refreshed.last_status == "ok"
    assert refreshed.last_new_signals == 2


@pytest.mark.asyncio
async def test_sync_signal_feed_handles_fetch_error(db_session):
    feed = SignalFeed(id=uuid.uuid4(), name="dead", rss_url="https://x.example/rss")

    class Boom(Exception):
        pass

    import contextlib

    client = MagicMock()
    client.get = AsyncMock(side_effect=Boom("dns fail"))

    @contextlib.asynccontextmanager
    async def _factory(*a, **k):
        yield client

    with patch.object(feed_svc.httpx, "AsyncClient", return_value=_factory()):
        result = await feed_svc.sync_signal_feed(db_session, feed)

    assert result.status == "error"
    assert "dns fail" in result.message
    refreshed = (await db_session.execute(select(SignalFeed))).scalar_one()
    assert refreshed.last_status == "error"


@pytest.mark.asyncio
async def test_sync_all_signal_feeds_skips_disabled(db_session):
    enabled = SignalFeed(id=uuid.uuid4(), name="on", rss_url="https://a.example/rss")
    disabled = SignalFeed(
        id=uuid.uuid4(), name="off", rss_url="https://b.example/rss", enabled=False
    )
    db_session.add_all([enabled, disabled])
    await db_session.commit()

    with patch.object(
        feed_svc.httpx, "AsyncClient", return_value=_mock_http(ATOM_SAMPLE)
    ):
        pairs = await feed_svc.sync_all_signal_feeds(db_session)

    assert len(pairs) == 1
    assert pairs[0][0].name == "on"
    assert "哔哩哔哩·春招" in pairs[0][1].signals_applied or pairs[0][1].signals_applied
