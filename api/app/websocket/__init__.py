"""
WebSocket Manager for Real-time Features

Manages WebSocket connections for real-time notifications, updates, and live features.
"""

from .manager import manager, ConnectionManager
from .types import WebSocketMessage, ConnectionInfo

__all__ = ["manager", "ConnectionManager", "WebSocketMessage", "ConnectionInfo"]
