"""
Signal Feeds API - Lightweight Version

Manage RSS feeds (e.g. WeChat official-account bridges via WeWe RSS /
wechat2rss) whose item titles automatically pin hiring signals on the
company radar.
"""

import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database_lite import get_db
from app.core.logger import LogCategory, logger
from app.models.signal_feed import SignalFeed
from app.schemas.schemas_lite import (
    SignalFeedCreate,
    SignalFeedResponse,
    SignalFeedSyncResponse,
    SignalFeedUpdate,
)
from app.services import signal_feed_service

router = APIRouter(prefix="/signal-feeds", tags=["signal-feeds"])


def _feed_response(feed: SignalFeed) -> SignalFeedResponse:
    return SignalFeedResponse(
        id=str(feed.id),
        name=feed.name,
        rss_url=feed.rss_url,
        enabled=feed.enabled,
        last_fetched_at=feed.last_fetched_at,
        last_status=feed.last_status,
        last_new_signals=feed.last_new_signals or 0,
        last_message=feed.last_message,
        created_at=feed.created_at,
        updated_at=feed.updated_at,
    )


async def _get_feed_or_404(feed_id: str, db: AsyncSession) -> SignalFeed:
    try:
        feed_uuid = uuid.UUID(feed_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid feed id"
        )
    feed = (
        await db.execute(select(SignalFeed).where(SignalFeed.id == feed_uuid))
    ).scalar_one_or_none()
    if feed is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Signal feed not found"
        )
    return feed


@router.get("", response_model=List[SignalFeedResponse])
async def list_signal_feeds(db: AsyncSession = Depends(get_db)):
    feeds = (
        (await db.execute(select(SignalFeed).order_by(SignalFeed.created_at)))
        .scalars()
        .all()
    )
    return [_feed_response(f) for f in feeds]


@router.post("", response_model=SignalFeedResponse, status_code=status.HTTP_201_CREATED)
async def create_signal_feed(
    payload: SignalFeedCreate, db: AsyncSession = Depends(get_db)
):
    """Subscribe an RSS feed as an automatic signal source."""
    if not payload.rss_url.startswith(("http://", "https://")):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="rss_url must be an http(s) URL",
        )
    duplicate = await db.execute(
        select(SignalFeed).where(SignalFeed.rss_url == payload.rss_url)
    )
    if duplicate.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Feed already subscribed"
        )
    feed = SignalFeed(
        id=uuid.uuid4(),
        name=payload.name or payload.rss_url.split("//", 1)[-1][:255],
        rss_url=payload.rss_url,
    )
    db.add(feed)
    await db.commit()
    await db.refresh(feed)
    logger.info(LogCategory.DATA, f"Subscribed signal feed: {feed.name}")
    return _feed_response(feed)


@router.patch("/{feed_id}", response_model=SignalFeedResponse)
async def update_signal_feed(
    feed_id: str,
    payload: SignalFeedUpdate,
    db: AsyncSession = Depends(get_db),
):
    feed = await _get_feed_or_404(feed_id, db)
    if payload.name is not None:
        feed.name = payload.name
    if payload.enabled is not None:
        feed.enabled = payload.enabled
    await db.commit()
    await db.refresh(feed)
    return _feed_response(feed)


@router.delete("/{feed_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_signal_feed(feed_id: str, db: AsyncSession = Depends(get_db)):
    feed = await _get_feed_or_404(feed_id, db)
    await db.delete(feed)
    await db.commit()


@router.post("/{feed_id}/sync", response_model=SignalFeedSyncResponse)
async def sync_signal_feed(feed_id: str, db: AsyncSession = Depends(get_db)):
    """Fetch one feed now and apply its titles to the radar."""
    feed = await _get_feed_or_404(feed_id, db)
    result = await signal_feed_service.sync_signal_feed(db, feed)
    return SignalFeedSyncResponse(
        feed_id=str(feed.id),
        feed_name=feed.name,
        status=result.status,
        items_seen=result.items_seen,
        signals=result.signals_applied,
        message=result.message,
    )


@router.post("/sync-all", response_model=List[SignalFeedSyncResponse])
async def sync_all_signal_feeds(db: AsyncSession = Depends(get_db)):
    """Fetch every enabled signal feed now."""
    responses = []
    for feed, result in await signal_feed_service.sync_all_signal_feeds(db):
        responses.append(
            SignalFeedSyncResponse(
                feed_id=str(feed.id),
                feed_name=feed.name,
                status=result.status,
                items_seen=result.items_seen,
                signals=result.signals_applied,
                message=result.message,
            )
        )
    return responses
