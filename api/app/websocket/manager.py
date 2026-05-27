"""
WebSocket Connection Manager

Manages WebSocket connections, broadcasting, and message routing for real-time features.
"""

import asyncio
from typing import Dict, Set, Optional, List
from datetime import datetime, timedelta
from fastapi import WebSocket
from collections import defaultdict

from app.core.redis import redis_client
from app.core.logger import logger, LogCategory
from app.websocket.types import (
    WebSocketMessage,
    MessageType,
    ConnectionInfo,
)


class ConnectionManager:
    """
    Manages WebSocket connections and message broadcasting.

    Features:
    - Connection lifecycle management
    - User-specific message routing
    - Broadcast and targeted messaging
    - Connection health monitoring
    - Automatic reconnection support
    """

    def __init__(self):
        # Active connections: {user_id: {connection_id: WebSocket}}
        self._connections: Dict[str, Dict[str, WebSocket]] = defaultdict(dict)

        # Connection metadata: {connection_id: ConnectionInfo}
        self._connection_info: Dict[str, ConnectionInfo] = {}

        # User subscriptions: {user_id: Set[subscription]}
        self._subscriptions: Dict[str, Set[str]] = defaultdict(set)

        # Heartbeat tracking: {connection_id: datetime}
        self._last_heartbeat: Dict[str, datetime] = {}

        # Message queue for offline users: {user_id: List[WebSocketMessage]}
        self._message_queue: Dict[str, List[WebSocketMessage]] = defaultdict(list)

        # Lock for thread safety
        self._lock = asyncio.Lock()

        # Background tasks
        self._heartbeat_task: Optional[asyncio.Task] = None
        self._cleanup_task: Optional[asyncio.Task] = None

        logger.info(LogCategory.WEBSOCKET, "WebSocket Connection Manager initialized")

    async def connect(
        self,
        websocket: WebSocket,
        user_id: str,
        user_agent: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> str:
        """
        Accept and register a new WebSocket connection.

        Args:
            websocket: The WebSocket connection
            user_id: The user's ID
            user_agent: Optional user agent string
            ip_address: Optional IP address

        Returns:
            The connection ID
        """
        await websocket.accept()

        connection_id = f"{user_id}_{datetime.utcnow().timestamp()}"

        async with self._lock:
            self._connections[user_id][connection_id] = websocket
            self._connection_info[connection_id] = ConnectionInfo(
                user_id=user_id,
                connection_id=connection_id,
                connected_at=datetime.utcnow().isoformat(),
                last_heartbeat=datetime.utcnow().isoformat(),
                user_agent=user_agent,
                ip_address=ip_address,
            )
            self._last_heartbeat[connection_id] = datetime.utcnow()

        # Send welcome message
        await self.send_personal_message(
            user_id=user_id,
            message=WebSocketMessage(
                type=MessageType.CONNECT,
                data={
                    "connection_id": connection_id,
                    "message": "WebSocket connection established",
                    "server_time": datetime.utcnow().isoformat(),
                },
            ),
        )

        # Start background tasks if not running
        if self._heartbeat_task is None:
            self._heartbeat_task = asyncio.create_task(self._heartbeat_monitor())

        if self._cleanup_task is None:
            self._cleanup_task = asyncio.create_task(self._cleanup_stale_connections())

        logger.info(
            LogCategory.WEBSOCKET,
            f"WebSocket connection established: {connection_id} for user {user_id}",
        )

        # Send queued messages
        await self._send_queued_messages(user_id)

        return connection_id

    async def disconnect(self, user_id: str, connection_id: str):
        """
        Remove a WebSocket connection.

        Args:
            user_id: The user's ID
            connection_id: The connection ID
        """
        async with self._lock:
            # Remove connection
            if user_id in self._connections:
                self._connections[user_id].pop(connection_id, None)
                if not self._connections[user_id]:
                    del self._connections[user_id]

            # Remove connection info
            self._connection_info.pop(connection_id, None)

            # Remove heartbeat tracking
            self._last_heartbeat.pop(connection_id, None)

        logger.info(
            LogCategory.WEBSOCKET,
            f"WebSocket connection closed: {connection_id} for user {user_id}",
        )

    async def send_personal_message(
        self, user_id: str, message: WebSocketMessage
    ) -> bool:
        """
        Send a message to a specific user (all their connections).

        Args:
            user_id: The user's ID
            message: The message to send

        Returns:
            True if message was sent, False if user has no active connections
        """
        if user_id not in self._connections:
            # Queue message for later delivery
            await self._queue_message(user_id, message)
            return False

        sent = False
        failed_connections = []

        for connection_id, websocket in self._connections[user_id].items():
            try:
                await websocket.send_text(message.model_dump_json())
                sent = True
            except Exception as e:
                logger.error(
                    LogCategory.WEBSOCKET,
                    f"Failed to send message to {connection_id}: {e}",
                )
                failed_connections.append(connection_id)

        # Clean up failed connections
        for connection_id in failed_connections:
            await self.disconnect(user_id, connection_id)

        return sent

    async def broadcast(
        self, message: WebSocketMessage, exclude_user: Optional[str] = None
    ):
        """
        Broadcast a message to all connected users.

        Args:
            message: The message to broadcast
            exclude_user: Optional user ID to exclude from broadcast
        """
        async with self._lock:
            for user_id in list(self._connections.keys()):
                if exclude_user and user_id == exclude_user:
                    continue

                await self.send_personal_message(user_id, message)

        logger.info(
            LogCategory.WEBSOCKET,
            f"Broadcasted message type {message.type} to all users",
        )

    async def send_to_users(
        self, user_ids: List[str], message: WebSocketMessage
    ) -> Dict[str, bool]:
        """
        Send a message to multiple specific users.

        Args:
            user_ids: List of user IDs
            message: The message to send

        Returns:
            Dictionary mapping user IDs to delivery success status
        """
        results = {}

        for user_id in user_ids:
            results[user_id] = await self.send_personal_message(user_id, message)

        return results

    async def update_heartbeat(self, connection_id: str) -> bool:
        """
        Update heartbeat timestamp for a connection.

        Args:
            connection_id: The connection ID

        Returns:
            True if connection exists and was updated
        """
        if connection_id in self._connection_info:
            async with self._lock:
                self._last_heartbeat[connection_id] = datetime.utcnow()
                info = self._connection_info[connection_id]
                info.last_heartbeat = datetime.utcnow().isoformat()

            return True
        return False

    async def get_connection_info(self, connection_id: str) -> Optional[ConnectionInfo]:
        """Get connection information by connection ID."""
        return self._connection_info.get(connection_id)

    async def get_user_connections(self, user_id: str) -> List[ConnectionInfo]:
        """Get all connections for a specific user."""
        if user_id not in self._connections:
            return []

        return [
            self._connection_info.get(conn_id)
            for conn_id in self._connections[user_id].keys()
            if conn_id in self._connection_info
        ]

    async def get_online_users(self) -> Set[str]:
        """Get set of currently online user IDs."""
        return set(self._connections.keys())

    async def is_user_online(self, user_id: str) -> bool:
        """Check if a user has any active connections."""
        return user_id in self._connections

    async def get_connection_count(self) -> int:
        """Get total number of active connections."""
        count = 0
        async with self._lock:
            for user_connections in self._connections.values():
                count += len(user_connections)
        return count

    async def subscribe(self, user_id: str, subscription: str):
        """
        Subscribe a user to a specific topic/channel.

        Args:
            user_id: The user's ID
            subscription: The subscription name
        """
        async with self._lock:
            self._subscriptions[user_id].add(subscription)

            # Update connection info
            for conn_id, info in self._connection_info.items():
                if info.user_id == user_id:
                    if subscription not in info.subscriptions:
                        info.subscriptions.append(subscription)

        logger.info(
            LogCategory.WEBSOCKET, f"User {user_id} subscribed to {subscription}"
        )

    async def unsubscribe(self, user_id: str, subscription: str):
        """
        Unsubscribe a user from a specific topic/channel.

        Args:
            user_id: The user's ID
            subscription: The subscription name
        """
        async with self._lock:
            self._subscriptions[user_id].discard(subscription)

            # Update connection info
            for conn_id, info in self._connection_info.items():
                if info.user_id == user_id:
                    info.subscriptions = [
                        s for s in info.subscriptions if s != subscription
                    ]

        logger.info(
            LogCategory.WEBSOCKET, f"User {user_id} unsubscribed from {subscription}"
        )

    async def broadcast_to_subscription(
        self, subscription: str, message: WebSocketMessage
    ):
        """
        Broadcast a message to all users subscribed to a topic.

        Args:
            subscription: The subscription name
            message: The message to broadcast
        """
        subscribed_users = [
            user_id
            for user_id, subs in self._subscriptions.items()
            if subscription in subs
        ]

        for user_id in subscribed_users:
            await self.send_personal_message(user_id, message)

        logger.info(
            LogCategory.WEBSOCKET,
            f"Broadcasted to subscription {subscription}: {len(subscribed_users)} users",
        )

    async def _queue_message(self, user_id: str, message: WebSocketMessage):
        """
        Queue a message for a user who is currently offline.

        Args:
            user_id: The user's ID
            message: The message to queue
        """
        # Keep only last 50 messages per user
        if len(self._message_queue[user_id]) >= 50:
            self._message_queue[user_id] = self._message_queue[user_id][-49:]

        self._message_queue[user_id].append(message)

        # Also store in Redis for persistence across server restarts
        try:
            queue_key = f"ws:queue:{user_id}"
            await redis_client.client.lpush(queue_key, message.model_dump_json())
            # Keep only last 50 messages in Redis
            await redis_client.client.ltrim(queue_key, 0, 49)
            # Set expiry to 7 days
            await redis_client.client.expire(queue_key, 604800)
        except Exception as e:
            logger.error(
                LogCategory.WEBSOCKET, f"Failed to queue message in Redis: {e}"
            )

    async def _send_queued_messages(self, user_id: str):
        """
        Send queued messages to a user who just connected.

        Args:
            user_id: The user's ID
        """
        # Get messages from memory queue
        messages = self._message_queue.pop(user_id, [])

        # Also get messages from Redis
        try:
            queue_key = f"ws:queue:{user_id}"
            redis_messages = await redis_client.client.lrange(queue_key, 0, 49)
            await redis_client.client.delete(queue_key)

            for msg_json in reversed(redis_messages):
                try:
                    message = WebSocketMessage.model_validate_json(msg_json)
                    messages.append(message)
                except Exception:
                    pass
        except Exception as e:
            logger.error(LogCategory.WEBSOCKET, f"Failed to get queued messages: {e}")

        # Send messages (limit to most recent 50)
        for message in messages[:50]:
            await self.send_personal_message(user_id, message)

        if messages:
            logger.info(
                LogCategory.WEBSOCKET,
                f"Sent {len(messages)} queued messages to user {user_id}",
            )

    async def _heartbeat_monitor(self):
        """Monitor connection health via heartbeat messages."""
        while True:
            try:
                await asyncio.sleep(30)  # Send heartbeat every 30 seconds

                current_time = datetime.utcnow()
                stale_connections = []

                async with self._lock:
                    for conn_id, last_heartbeat in list(self._last_heartbeat.items()):
                        # Mark as stale if no heartbeat for 2 minutes
                        if current_time - last_heartbeat > timedelta(minutes=2):
                            stale_connections.append(conn_id)

                # Send heartbeat to all active connections
                for user_id, connections in self._connections.items():
                    for conn_id, websocket in connections.items():
                        try:
                            heartbeat = WebSocketMessage(
                                type=MessageType.HEARTBEAT,
                                data={
                                    "timestamp": current_time.isoformat(),
                                    "connection_id": conn_id,
                                },
                            )
                            await websocket.send_text(heartbeat.model_dump_json())
                        except Exception as e:
                            logger.error(
                                LogCategory.WEBSOCKET,
                                f"Failed to send heartbeat to {conn_id}: {e}",
                            )
                            stale_connections.append(conn_id)

                # Clean up stale connections
                for conn_id in stale_connections:
                    info = self._connection_info.get(conn_id)
                    if info:
                        await self.disconnect(info.user_id, conn_id)

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(LogCategory.WEBSOCKET, f"Error in heartbeat monitor: {e}")

    async def _cleanup_stale_connections(self):
        """Clean up stale connections periodically."""
        while True:
            try:
                await asyncio.sleep(60)  # Check every minute

                current_time = datetime.utcnow()
                connections_to_close = []

                async with self._lock:
                    for conn_id, last_heartbeat in list(self._last_heartbeat.items()):
                        # Close if no heartbeat for 5 minutes
                        if current_time - last_heartbeat > timedelta(minutes=5):
                            connections_to_close.append(conn_id)

                for conn_id in connections_to_close:
                    info = self._connection_info.get(conn_id)
                    if info:
                        logger.info(
                            LogCategory.WEBSOCKET,
                            f"Closing stale connection: {conn_id}",
                        )
                        await self.disconnect(info.user_id, conn_id)

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(LogCategory.WEBSOCKET, f"Error in cleanup task: {e}")

    async def shutdown(self):
        """Shutdown the connection manager and clean up resources."""
        # Cancel background tasks
        if self._heartbeat_task:
            self._heartbeat_task.cancel()
        if self._cleanup_task:
            self._cleanup_task.cancel()

        # Close all connections and clean up
        async with self._lock:
            for user_id, connections in list(self._connections.items()):
                for conn_id, websocket in list(connections.items()):
                    try:
                        await websocket.close()
                    except Exception:
                        pass

            # Clear all internal structures
            self._connections.clear()
            self._connection_info.clear()
            self._last_heartbeat.clear()
            self._subscriptions.clear()

        logger.info(LogCategory.WEBSOCKET, "WebSocket Connection Manager shutdown")


# Global connection manager instance
manager = ConnectionManager()
