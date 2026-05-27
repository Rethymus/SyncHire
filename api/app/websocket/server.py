"""
WebSocket Server Configuration and Setup

Configures WebSocket server with authentication, room management,
and connection lifecycle handling.
"""

import asyncio
import uuid
from typing import Optional, Dict, Any, Set, List
from datetime import datetime, timedelta
from fastapi import WebSocket, WebSocketDisconnect, status
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import get_settings
from app.core.logger import logger, LogCategory
from app.models.user import User
from app.websocket.manager import manager
from app.websocket.types import (
    WebSocketMessage,
    MessageType,
    ErrorMessage,
    ConnectionInfo,
)

settings = get_settings()


class WebSocketServer:
    """
    WebSocket server with enhanced connection management.

    Features:
    - JWT authentication
    - Room/channel management
    - Connection heartbeat and cleanup
    - Message broadcasting and routing
    - Event emission for integration
    """

    def __init__(self):
        self._active_connections: Dict[str, Set[str]] = (
            {}
        )  # {room_id: set(connection_ids)}
        self._connection_rooms: Dict[str, Set[str]] = (
            {}
        )  # {connection_id: set(room_ids)}
        self._event_handlers: Dict[str, Set[callable]] = (
            {}
        )  # {event_type: set(handlers)}

    async def authenticate_connection(
        self, websocket: WebSocket, token: str, db: AsyncSession
    ) -> Optional[User]:
        """
        Authenticate WebSocket connection using JWT token.

        Args:
            websocket: The WebSocket connection
            token: JWT authentication token
            db: Database session

        Returns:
            User object if authenticated, None otherwise
        """
        try:
            # Decode JWT token
            payload = jwt.decode(
                token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM]
            )
            user_id = payload.get("sub")

            if not user_id:
                await websocket.close(code=1008, reason="Invalid token: no user_id")
                return None

            # Verify user exists in database
            result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
            user = result.scalar_one_or_none()

            if not user:
                await websocket.close(code=1008, reason="User not found")
                return None

            logger.info(
                LogCategory.WEBSOCKET,
                f"WebSocket authentication successful for user {user_id}",
            )

            return user

        except JWTError as e:
            logger.warning(
                LogCategory.WEBSOCKET, f"WebSocket authentication failed: {str(e)}"
            )
            await websocket.close(code=1008, reason=f"Invalid token: {str(e)}")
            return None

        except Exception as e:
            logger.error(
                LogCategory.WEBSOCKET,
                f"Unexpected error during authentication: {str(e)}",
            )
            await websocket.close(code=1011, reason="Internal server error")
            return None

    async def handle_connection(
        self, websocket: WebSocket, user: User, db: AsyncSession
    ) -> str:
        """
        Handle new WebSocket connection after authentication.

        Args:
            websocket: The WebSocket connection
            user: Authenticated user
            db: Database session

        Returns:
            Connection ID
        """
        # Get client information
        client_host = websocket.client.host if websocket.client else None
        user_agent = websocket.headers.get("user-agent")

        # Accept and register connection
        connection_id = await manager.connect(
            websocket=websocket,
            user_id=str(user.id),
            user_agent=user_agent,
            ip_address=client_host,
        )

        # Subscribe to user-specific channels
        await manager.subscribe(str(user.id), f"user:{user.id}")
        await manager.subscribe(str(user.id), "notifications")
        await manager.subscribe(str(user.id), "updates")

        # Add to user room
        await self.add_to_room(str(user.id), f"user:{user.id}")

        logger.info(
            LogCategory.WEBSOCKET,
            f"WebSocket connection established: {connection_id} for user {user.id}",
        )

        # Emit connection event
        await self._emit_event(
            "connection_established",
            {
                "connection_id": connection_id,
                "user_id": str(user.id),
                "timestamp": datetime.utcnow().isoformat(),
            },
        )

        return connection_id

    async def handle_message(
        self,
        websocket: WebSocket,
        user: User,
        connection_id: str,
        message_data: Dict[str, Any],
    ):
        """
        Handle incoming WebSocket message.

        Args:
            websocket: The WebSocket connection
            user: Authenticated user
            connection_id: Connection ID
            message_data: Parsed message data
        """
        message_type = message_data.get("type")
        message_payload = message_data.get("data", {})

        try:
            # Handle heartbeat
            if message_type == MessageType.HEARTBEAT:
                await manager.update_heartbeat(connection_id)

            # Handle subscription requests
            elif message_type == "subscribe":
                subscription = message_payload.get("subscription")
                if subscription:
                    await self._handle_subscription(
                        user, connection_id, subscription, True
                    )

            # Handle unsubscription requests
            elif message_type == "unsubscribe":
                subscription = message_payload.get("subscription")
                if subscription:
                    await self._handle_subscription(
                        user, connection_id, subscription, False
                    )

            # Handle ping/pong
            elif message_type == "ping":
                await websocket.send_text(
                    '{"type": "pong", "data": {"timestamp": "'
                    + datetime.utcnow().isoformat()
                    + '"}}'
                )

            # Handle room join requests
            elif message_type == "join_room":
                room_id = message_payload.get("room_id")
                if room_id:
                    await self.add_to_room(connection_id, room_id)

            # Handle room leave requests
            elif message_type == "leave_room":
                room_id = message_payload.get("room_id")
                if room_id:
                    await self.remove_from_room(connection_id, room_id)

            else:
                # Unknown message type
                error_msg = WebSocketMessage(
                    type=MessageType.ERROR,
                    data={
                        "code": "UNKNOWN_MESSAGE_TYPE",
                        "message": f"Unknown message type: {message_type}",
                    },
                )
                await websocket.send_text(error_msg.model_dump_json())

        except Exception as e:
            logger.error(LogCategory.WEBSOCKET, f"Error handling message: {str(e)}")
            error_msg = WebSocketMessage(
                type=MessageType.ERROR,
                data={
                    "code": "MESSAGE_HANDLING_ERROR",
                    "message": "Error processing message",
                },
            )
            await websocket.send_text(error_msg.model_dump_json())

    async def handle_disconnection(
        self,
        user: User,
        connection_id: str,
        close_code: Optional[int] = None,
        close_reason: Optional[str] = None,
    ):
        """
        Handle WebSocket disconnection.

        Args:
            user: Authenticated user
            connection_id: Connection ID
            close_code: WebSocket close code
            close_reason: WebSocket close reason
        """
        try:
            # Remove from all rooms
            if connection_id in self._connection_rooms:
                for room_id in list(self._connection_rooms[connection_id]):
                    await self.remove_from_room(connection_id, room_id)

            # Disconnect from manager
            await manager.disconnect(str(user.id), connection_id)

            logger.info(
                LogCategory.WEBSOCKET,
                f"WebSocket disconnected: {connection_id} for user {user.id} - code: {close_code}, reason: {close_reason}",
            )

            # Emit disconnection event
            await self._emit_event(
                "connection_closed",
                {
                    "connection_id": connection_id,
                    "user_id": str(user.id),
                    "close_code": close_code,
                    "close_reason": close_reason,
                    "timestamp": datetime.utcnow().isoformat(),
                },
            )

        except Exception as e:
            logger.error(
                LogCategory.WEBSOCKET, f"Error handling disconnection: {str(e)}"
            )

    async def add_to_room(self, connection_id: str, room_id: str):
        """
        Add a connection to a room.

        Args:
            connection_id: Connection ID
            room_id: Room identifier
        """
        # Initialize sets if needed
        if room_id not in self._active_connections:
            self._active_connections[room_id] = set()
        if connection_id not in self._connection_rooms:
            self._connection_rooms[connection_id] = set()

        # Add connection to room
        self._active_connections[room_id].add(connection_id)
        self._connection_rooms[connection_id].add(room_id)

        logger.debug(
            LogCategory.WEBSOCKET, f"Connection {connection_id} joined room {room_id}"
        )

    async def remove_from_room(self, connection_id: str, room_id: str):
        """
        Remove a connection from a room.

        Args:
            connection_id: Connection ID
            room_id: Room identifier
        """
        # Remove from room
        if room_id in self._active_connections:
            self._active_connections[room_id].discard(connection_id)
            if not self._active_connections[room_id]:
                del self._active_connections[room_id]

        # Remove room from connection
        if connection_id in self._connection_rooms:
            self._connection_rooms[connection_id].discard(room_id)
            if not self._connection_rooms[connection_id]:
                del self._connection_rooms[connection_id]

        logger.debug(
            LogCategory.WEBSOCKET, f"Connection {connection_id} left room {room_id}"
        )

    async def broadcast_to_room(
        self,
        room_id: str,
        message: WebSocketMessage,
        exclude_connection: Optional[str] = None,
    ):
        """
        Broadcast a message to all connections in a room.

        Args:
            room_id: Room identifier
            message: Message to broadcast
            exclude_connection: Optional connection ID to exclude
        """
        if room_id not in self._active_connections:
            return

        for connection_id in self._active_connections[room_id]:
            if exclude_connection and connection_id == exclude_connection:
                continue

            # Get connection info to find user_id
            conn_info = await manager.get_connection_info(connection_id)
            if conn_info:
                await manager.send_personal_message(conn_info.user_id, message)

    async def get_room_connections(self, room_id: str) -> List[str]:
        """
        Get all connection IDs in a room.

        Args:
            room_id: Room identifier

        Returns:
            List of connection IDs
        """
        return list(self._active_connections.get(room_id, set()))

    async def get_room_size(self, room_id: str) -> int:
        """
        Get the number of connections in a room.

        Args:
            room_id: Room identifier

        Returns:
            Number of connections
        """
        return len(self._active_connections.get(room_id, set()))

    async def _handle_subscription(
        self, user: User, connection_id: str, subscription: str, subscribe: bool
    ):
        """
        Handle subscription/unsubscription requests.

        Args:
            user: Authenticated user
            connection_id: Connection ID
            subscription: Subscription name
            subscribe: True to subscribe, False to unsubscribe
        """
        # Validate subscription
        allowed_subscriptions = [
            f"user:{user.id}",
            "notifications",
            "updates",
            "analytics",
            "activity",
        ]

        # Allow dynamic subscriptions like "application:{application_id}"
        if subscription.startswith("application:") or subscription.startswith("jd:"):
            allowed_subscriptions.append(subscription)

        if subscription not in allowed_subscriptions:
            error_msg = WebSocketMessage(
                type=MessageType.ERROR,
                data={
                    "code": "INVALID_SUBSCRIPTION",
                    "message": f"Subscription not allowed: {subscription}",
                },
            )
            # Get connection to send error
            conn_info = await manager.get_connection_info(connection_id)
            if conn_info:
                await manager.send_personal_message(conn_info.user_id, error_msg)
            return

        # Subscribe or unsubscribe
        if subscribe:
            await manager.subscribe(str(user.id), subscription)
            await self.add_to_room(connection_id, subscription)
        else:
            await manager.unsubscribe(str(user.id), subscription)
            await self.remove_from_room(connection_id, subscription)

    async def _emit_event(self, event_type: str, data: Dict[str, Any]):
        """
        Emit an event to registered handlers.

        Args:
            event_type: Type of event
            data: Event data
        """
        if event_type in self._event_handlers:
            for handler in self._event_handlers[event_type]:
                try:
                    if asyncio.iscoroutinefunction(handler):
                        await handler(data)
                    else:
                        handler(data)
                except Exception as e:
                    logger.error(
                        LogCategory.WEBSOCKET,
                        f"Error in event handler for {event_type}: {str(e)}",
                    )

    def on_event(self, event_type: str, handler: callable):
        """
        Register an event handler.

        Args:
            event_type: Type of event to handle
            handler: Handler function
        """
        if event_type not in self._event_handlers:
            self._event_handlers[event_type] = set()
        self._event_handlers[event_type].add(handler)

    def remove_event_handler(self, event_type: str, handler: callable):
        """
        Remove an event handler.

        Args:
            event_type: Type of event
            handler: Handler function to remove
        """
        if event_type in self._event_handlers:
            self._event_handlers[event_type].discard(handler)


# Global WebSocket server instance
ws_server = WebSocketServer()
