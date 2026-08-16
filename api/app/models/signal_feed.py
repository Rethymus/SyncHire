"""
Signal Feed Model - RSS-backed automatic hiring signals

An RSS feed (typically a WeChat official-account feed bridged via
WeWe RSS / wechat2rss) whose item titles are scanned by the hiring
signal engine. New "XX 2027届秋招启动" posts pin the company in the
radar automatically — no article content is stored beyond titles.
"""

from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text, UUID
from sqlalchemy.sql import func

from app.core.database_lite import Base


class SignalFeed(Base):
    """RSS source feeding the company radar's signal engine."""

    __tablename__ = "signal_feeds"

    id = Column(UUID, primary_key=True)
    name = Column(String(255), nullable=False)
    rss_url = Column(Text, nullable=False)
    enabled = Column(Boolean, default=True, nullable=False)
    last_fetched_at = Column(DateTime(timezone=True))
    last_status = Column(String(20))  # ok | empty | error
    last_new_signals = Column(Integer, default=0, nullable=False)
    last_message = Column(Text)
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    def __repr__(self):
        return f"<SignalFeed(name={self.name}, status={self.last_status})>"
