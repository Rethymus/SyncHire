"""
Signal Feed Service - RSS titles into the hiring-signal radar

Fetches an RSS/Atom feed (e.g. a WeChat official-account bridge), parses
item titles/links, and runs each title through the existing hiring
signal engine so "XX 2027届秋招正式启动" posts pin companies in the
radar automatically. Only titles and links are processed — no article
bodies are fetched or stored.
"""

import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import List, Optional

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config_lite import get_lite_settings
from app.core.logger import LogCategory, logger
from app.models.signal_feed import SignalFeed
from app.services.hiring_signal_service import apply_signal

settings = get_lite_settings()

_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0.0.0",
    "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
}

_RSS_ITEM_RE = re.compile(r"<item[^>]*>(.*?)</item>", re.S)
_ATOM_ENTRY_RE = re.compile(r"<entry[^>]*>(.*?)</entry>", re.S)
_TAG_RE = {
    "title": re.compile(r"<title[^>]*>(.*?)</title>", re.S),
    "link": re.compile(r"<link[^>]*>(.*?)</link>", re.S),
    "link_self": re.compile(r'<link[^>]*href="([^"]+)"[^>]*/?>', re.S),
    "pub": re.compile(
        r"<(?:pubDate|published|updated)[^>]*>(.*?)</(?:pubDate|published|updated)>",
        re.S,
    ),
}
_CDATA_RE = re.compile(r"<!\[CDATA\[(.*?)\]\]>", re.S)


@dataclass
class FeedItem:
    title: str
    link: Optional[str] = None
    published: Optional[datetime] = None


@dataclass
class FeedSyncResult:
    status: str = "ok"  # ok | empty | error
    items_seen: int = 0
    signals_applied: List[str] = field(default_factory=list)
    message: Optional[str] = None


def _clean(text: Optional[str]) -> str:
    if not text:
        return ""
    cdata = _CDATA_RE.search(text)
    if cdata:
        text = cdata.group(1)
    text = re.sub(r"<[^>]+>", "", text)
    return (
        text.replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", '"')
        .replace("&#39;", "'")
        .strip()
    )


def _parse_date(raw: Optional[str]) -> Optional[datetime]:
    raw = _clean(raw)
    if not raw:
        return None
    try:  # ISO (Atom)
        return datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except ValueError:
        pass
    try:  # RFC 822 (RSS): Mon, 20 Jul 2026 17:00:00 GMT
        from email.utils import parsedate_to_datetime

        parsed = parsedate_to_datetime(raw)
        return parsed if isinstance(parsed, datetime) else None
    except (TypeError, ValueError):
        return None


def parse_feed(xml: str) -> List[FeedItem]:
    """Parse RSS 2.0 or Atom XML into items (title/link/published).

    Intentionally regex-based: RSS bridges emit simple, stable XML and
    this avoids a feedparser dependency in the Lite install.
    """
    items: List[FeedItem] = []
    blocks = _RSS_ITEM_RE.findall(xml) or _ATOM_ENTRY_RE.findall(xml)
    for block in blocks:
        title = (
            _clean(_TAG_RE["title"].search(block).group(1))
            if _TAG_RE["title"].search(block)
            else ""
        )
        if not title:
            continue
        link_match = _TAG_RE["link"].search(block)
        link = _clean(link_match.group(1)) if link_match else None
        if not link:  # Atom <link href="..."/>
            href = _TAG_RE["link_self"].search(block)
            link = href.group(1).strip() if href else None
        published = _parse_date(
            _TAG_RE["pub"].search(block).group(1)
            if _TAG_RE["pub"].search(block)
            else None
        )
        items.append(FeedItem(title=title, link=link or None, published=published))
    return items


async def fetch_feed_items(rss_url: str) -> List[FeedItem]:
    async with httpx.AsyncClient(
        timeout=settings.JOB_SOURCE_FETCH_TIMEOUT, follow_redirects=True
    ) as client:
        response = await client.get(rss_url, headers=_HEADERS)
        response.raise_for_status()
        return parse_feed(response.text)


async def sync_signal_feed(db: AsyncSession, feed: SignalFeed) -> FeedSyncResult:
    """Fetch one feed and run every fresh title through the radar."""
    try:
        items = await fetch_feed_items(feed.rss_url)
    except Exception as exc:
        logger.warning(
            LogCategory.API, f"Signal feed fetch failed ({feed.name}): {exc}"
        )
        result = FeedSyncResult(status="error", message=str(exc)[:500])
        _record(db, feed, result)
        await db.commit()
        return result

    items = items[:30]  # newest N items per pass
    result = FeedSyncResult(items_seen=len(items))
    if not items:
        result.status = "empty"
        result.message = "Feed returned no items"
        _record(db, feed, result)
        await db.commit()
        return result

    for item in items:
        signals = await apply_signal(db, item.title, url=item.link)
        result.signals_applied.extend(f"{s.company_name}·{s.batch}" for s in signals)

    _record(db, feed, result)
    await db.commit()
    logger.info(
        LogCategory.DATA,
        f"Signal feed {feed.name}: {len(items)} items, "
        f"{len(result.signals_applied)} signals",
    )
    return result


async def sync_all_signal_feeds(db: AsyncSession) -> List[tuple]:
    """Sync every enabled signal feed. Returns (feed, result) pairs."""
    rows = await db.execute(
        select(SignalFeed)
        .where(SignalFeed.enabled.is_(True))
        .order_by(SignalFeed.created_at)
    )
    pairs = []
    for feed in rows.scalars().all():
        pairs.append((feed, await sync_signal_feed(db, feed)))
    return pairs


def _record(db: AsyncSession, feed: SignalFeed, result: FeedSyncResult) -> None:
    feed.last_fetched_at = datetime.now(timezone.utc)
    feed.last_status = result.status
    feed.last_new_signals = len(result.signals_applied)
    feed.last_message = result.message
    db.add(feed)
