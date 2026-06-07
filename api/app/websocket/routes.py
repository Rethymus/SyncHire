"""
WebSocket Routes

WebSocket endpoint handlers for real-time features.
"""

import json
import uuid
from typing import Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from fastapi.security import HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession
import jwt
from jwt import PyJWTError

from app.core.config import get_settings
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.core.logger import logger, LogCategory
from app.websocket.manager import manager
from app.websocket.types import WebSocketMessage, MessageType

settings = get_settings()
security = HTTPBearer()

router = APIRouter()


async def get_user_from_token(token: str, db: AsyncSession) -> Optional[User]:
    """
    Validate JWT token and return user.

    Args:
        token: JWT token from WebSocket query parameter
        db: Database session

    Returns:
        User object if valid, None otherwise
    """
    try:
        # Decode token
        payload = jwt.decode(
            token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM]
        )
        user_id = payload.get("sub")

        if not user_id:
            return None

        # Get user from database
        from sqlalchemy import select

        result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
        user = result.scalar_one_or_none()

        return user

    except (PyJWTError, ValueError):
        return None


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(..., description="JWT authentication token"),
    db: AsyncSession = Depends(get_db),
):
    """
    Main WebSocket endpoint for real-time features.

    Query Parameters:
        token: JWT authentication token (required)

    Message Types:
        - Client sends: {"type": "heartbeat", "data": {...}}
        - Server sends: Various message types for notifications, updates, etc.

    Features:
        - Real-time notifications
        - Application status updates
        - Job alerts
        - Interview reminders
        - Activity feed
        - Search suggestions
        - Live analytics

    Authentication:
        Requires valid JWT token via query parameter.

    Example:
        const ws = new WebSocket('ws://localhost:8000/api/ws?token=YOUR_JWT_TOKEN');
        ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            console.log('Received:', message);
        };
    """
    # Authenticate user
    user = await get_user_from_token(token, db)

    if not user:
        await websocket.close(code=1008, reason="Invalid authentication token")
        return

    # Get client info
    client_host = websocket.client.host if websocket.client else None
    user_agent = websocket.headers.get("user-agent")

    try:
        # Accept connection
        connection_id = await manager.connect(
            websocket=websocket,
            user_id=str(user.id),
            user_agent=user_agent,
            ip_address=client_host,
        )

        # Subscribe to default channels
        await manager.subscribe(str(user.id), "notifications")
        await manager.subscribe(str(user.id), "updates")
        await manager.subscribe(str(user.id), f"user:{user.id}")

        logger.info(
            LogCategory.WEBSOCKET,
            f"WebSocket connection established for user {user.id}: {connection_id}",
        )

        # Message loop
        while True:
            try:
                # Receive message from client
                data = await websocket.receive()

                if "text" in data:
                    # Handle text messages
                    message_data = json.loads(data["text"])
                    message_type = message_data.get("type")
                    message_data_payload = message_data.get("data", {})

                    # Handle heartbeat
                    if message_type == MessageType.HEARTBEAT:
                        await manager.update_heartbeat(connection_id)

                    # Handle subscriptions
                    elif message_type == "subscribe":
                        subscription = message_data_payload.get("subscription")
                        if subscription:
                            await manager.subscribe(str(user.id), subscription)

                    # Handle unsubscriptions
                    elif message_type == "unsubscribe":
                        subscription = message_data_payload.get("subscription")
                        if subscription:
                            await manager.unsubscribe(str(user.id), subscription)

                    # Handle custom messages
                    elif message_type == "ping":
                        await websocket.send_text(
                            json.dumps(
                                {
                                    "type": "pong",
                                    "data": {
                                        "timestamp": message_data_payload.get(
                                            "timestamp"
                                        )
                                    },
                                }
                            )
                        )

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

                elif "bytes" in data:
                    # Handle binary messages (if needed)
                    pass

            except WebSocketDisconnect:
                logger.info(
                    LogCategory.WEBSOCKET,
                    f"WebSocket disconnected normally for user {user.id}",
                )
                break

            except json.JSONDecodeError:
                # Invalid JSON
                error_msg = WebSocketMessage(
                    type=MessageType.ERROR,
                    data={
                        "code": "INVALID_JSON",
                        "message": "Invalid JSON format",
                    },
                )
                await websocket.send_text(error_msg.model_dump_json())

            except Exception as e:
                logger.error(
                    LogCategory.WEBSOCKET,
                    f"Error handling WebSocket message: {e}",
                )
                error_msg = WebSocketMessage(
                    type=MessageType.ERROR,
                    data={
                        "code": "INTERNAL_ERROR",
                        "message": "An internal error occurred",
                    },
                )
                await websocket.send_text(error_msg.model_dump_json())

    except Exception as e:
        logger.error(
            LogCategory.WEBSOCKET,
            f"WebSocket error for user {user.id}: {e}",
        )

    finally:
        # Cleanup connection
        await manager.disconnect(str(user.id), connection_id)


@router.get("/ws/status")
async def websocket_status(current_user: User = Depends(get_current_user)):
    """
    Get WebSocket connection status for current user.

    Returns:
        - is_online: Whether user has active WebSocket connections
        - connection_count: Number of active connections
        - connection_info: Details about each connection
    """
    is_online = await manager.is_user_online(str(current_user.id))
    connection_info = await manager.get_user_connections(str(current_user.id))

    return {
        "user_id": str(current_user.id),
        "is_online": is_online,
        "connection_count": len(connection_info),
        "connections": [
            {
                "connection_id": conn.connection_id,
                "connected_at": conn.connected_at,
                "last_heartbeat": conn.last_heartbeat,
                "subscriptions": conn.subscriptions,
            }
            for conn in connection_info
        ],
    }


@router.get("/ws/stats")
async def websocket_stats(current_user: User = Depends(get_current_user)):
    """
    Get WebSocket statistics (admin endpoint).

    Returns:
        - total_connections: Total number of active connections
        - online_users: Number of unique online users
        - online_user_list: List of online user IDs (admin only)
    """
    # Check if user is admin
    is_admin = current_user.is_admin if hasattr(current_user, "is_admin") else False

    stats = {
        "total_connections": await manager.get_connection_count(),
        "online_users": len(await manager.get_online_users()),
    }

    if is_admin:
        stats["online_user_list"] = list(await manager.get_online_users())

    return stats
