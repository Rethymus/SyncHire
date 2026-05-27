"""
WebSocket Manager Tests

Tests for WebSocket connection management, message delivery, and subscriptions.
"""

import pytest
import asyncio
from unittest.mock import Mock, AsyncMock, patch, MagicMock
from datetime import datetime, timedelta

from app.websocket.manager import ConnectionManager
from app.websocket.types import (
    WebSocketMessage,
    MessageType,
    ConnectionInfo,
    NotificationData,
)


@pytest.fixture
def mock_redis():
    """Mock Redis client."""
    with patch('app.websocket.manager.redis_client') as mock:
        mock.client = AsyncMock()
        mock.client.lpush = AsyncMock()
        mock.client.ltrim = AsyncMock()
        mock.client.expire = AsyncMock()
        mock.client.lrange = AsyncMock(return_value=[])
        mock.client.delete = AsyncMock()
        yield mock


@pytest.fixture
def manager(mock_redis):
    """Create a fresh ConnectionManager for each test."""
    return ConnectionManager()


@pytest.fixture
def mock_websocket():
    """Create a mock WebSocket connection."""
    ws = AsyncMock()
    ws.accept = AsyncMock()
    ws.send_text = AsyncMock()
    ws.receive = AsyncMock()
    ws.close = AsyncMock()
    return ws


@pytest.mark.asyncio
async def test_connect_websocket(manager, mock_websocket):
    """Test WebSocket connection establishment."""
    user_id = "test-user-123"
    connection_id = await manager.connect(
        websocket=mock_websocket,
        user_id=user_id,
        user_agent="TestAgent/1.0",
        ip_address="127.0.0.1",
    )

    assert connection_id is not None
    assert user_id in manager._connections
    assert connection_id in manager._connections[user_id]
    assert connection_id in manager._connection_info
    assert connection_id in manager._last_heartbeat

    # Verify welcome message was sent
    mock_websocket.send_text.assert_called_once()

    # Cleanup
    await manager.disconnect(user_id, connection_id)


@pytest.mark.asyncio
async def test_disconnect_websocket(manager, mock_websocket):
    """Test WebSocket disconnection."""
    user_id = "test-user-123"
    connection_id = await manager.connect(
        websocket=mock_websocket, user_id=user_id
    )

    await manager.disconnect(user_id, connection_id)

    assert user_id not in manager._connections
    assert connection_id not in manager._connection_info
    assert connection_id not in manager._last_heartbeat


@pytest.mark.asyncio
async def test_send_personal_message(manager, mock_websocket):
    """Test sending message to specific user."""
    user_id = "test-user-123"
    await manager.connect(websocket=mock_websocket, user_id=user_id)

    message = WebSocketMessage(
        type=MessageType.NOTIFICATION_NEW,
        data=NotificationData(
            notification_id="notif-123",
            type="test",
            title="Test Notification",
            message="Test message",
        ).model_dump(),
    )

    delivered = await manager.send_personal_message(user_id, message)

    assert delivered is True
    mock_websocket.send_text.assert_called()

    # Cleanup
    await manager.disconnect(user_id, list(manager._connections[user_id].keys())[0])


@pytest.mark.asyncio
async def test_send_to_offline_user(manager):
    """Test message queuing for offline users."""
    user_id = "offline-user-123"
    message = WebSocketMessage(
        type=MessageType.NOTIFICATION_NEW,
        data={"test": "data"},
    )

    delivered = await manager.send_personal_message(user_id, message)

    assert delivered is False
    assert user_id in manager._message_queue
    assert len(manager._message_queue[user_id]) == 1


@pytest.mark.asyncio
async def test_broadcast_message(manager):
    """Test broadcasting message to all users."""
    # Create multiple users
    ws1 = AsyncMock()
    ws1.accept = AsyncMock()
    ws1.send_text = AsyncMock()
    ws2 = AsyncMock()
    ws2.accept = AsyncMock()
    ws2.send_text = AsyncMock()

    user1_id = "user-1"
    user2_id = "user-2"

    await manager.connect(websocket=ws1, user_id=user1_id)
    await manager.connect(websocket=ws2, user_id=user2_id)

    message = WebSocketMessage(
        type=MessageType.SYSTEM_MESSAGE,
        data={"message": "System update"},
    )

    await manager.broadcast(message)

    # Verify both users received the message
    assert ws1.send_text.called
    assert ws2.send_text.called

    # Cleanup
    await manager.disconnect(user1_id, list(manager._connections[user1_id].keys())[0])
    await manager.disconnect(user2_id, list(manager._connections[user2_id].keys())[0])


@pytest.mark.asyncio
async def test_send_to_multiple_users(manager):
    """Test sending message to multiple specific users."""
    ws1 = AsyncMock()
    ws1.accept = AsyncMock()
    ws1.send_text = AsyncMock()
    ws2 = AsyncMock()
    ws2.accept = AsyncMock()
    ws2.send_text = AsyncMock()
    ws3 = AsyncMock()
    ws3.accept = AsyncMock()
    ws3.send_text = AsyncMock()

    user1_id = "user-1"
    user2_id = "user-2"
    user3_id = "user-3"

    await manager.connect(websocket=ws1, user_id=user1_id)
    await manager.connect(websocket=ws2, user_id=user2_id)
    await manager.connect(websocket=ws3, user_id=user3_id)

    message = WebSocketMessage(
        type=MessageType.NOTIFICATION_NEW,
        data={"test": "data"},
    )

    results = await manager.send_to_users([user1_id, user2_id], message)

    assert results[user1_id] is True
    assert results[user2_id] is True
    assert user3_id not in results  # Not in recipient list

    # Cleanup
    await manager.disconnect(user1_id, list(manager._connections[user1_id].keys())[0])
    await manager.disconnect(user2_id, list(manager._connections[user2_id].keys())[0])
    await manager.disconnect(user3_id, list(manager._connections[user3_id].keys())[0])


@pytest.mark.asyncio
async def test_user_subscriptions(manager, mock_websocket):
    """Test user subscription management."""
    user_id = "test-user-123"
    connection_id = await manager.connect(
        websocket=mock_websocket, user_id=user_id
    )

    # Subscribe to channel
    await manager.subscribe(user_id, "notifications")

    assert "notifications" in manager._subscriptions[user_id]
    assert "notifications" in manager._connection_info[connection_id].subscriptions

    # Unsubscribe from channel
    await manager.unsubscribe(user_id, "notifications")

    assert "notifications" not in manager._subscriptions[user_id]
    assert "notifications" not in manager._connection_info[connection_id].subscriptions

    # Cleanup
    await manager.disconnect(user_id, connection_id)


@pytest.mark.asyncio
async def test_broadcast_to_subscription(manager):
    """Test broadcasting to subscribers only."""
    ws1 = AsyncMock()
    ws1.accept = AsyncMock()
    ws1.send_text = AsyncMock()
    ws2 = AsyncMock()
    ws2.accept = AsyncMock()
    ws2.send_text = AsyncMock()
    ws3 = AsyncMock()
    ws3.accept = AsyncMock()
    ws3.send_text = AsyncMock()

    user1_id = "user-1"
    user2_id = "user-2"
    user3_id = "user-3"

    await manager.connect(websocket=ws1, user_id=user1_id)
    await manager.connect(websocket=ws2, user_id=user2_id)
    await manager.connect(websocket=ws3, user_id=user3_id)

    # Subscribe users 1 and 2 to notifications
    await manager.subscribe(user1_id, "notifications")
    await manager.subscribe(user2_id, "notifications")

    message = WebSocketMessage(
        type=MessageType.NOTIFICATION_NEW,
        data={"test": "data"},
    )

    await manager.broadcast_to_subscription("notifications", message)

    # Verify only subscribers received the broadcast message
    # All connections get 1 welcome message, subscribers get 1 additional broadcast message
    assert ws1.send_text.call_count == 2, f"ws1 should have 2 messages (welcome + broadcast), got {ws1.send_text.call_count}"
    assert ws2.send_text.call_count == 2, f"ws2 should have 2 messages (welcome + broadcast), got {ws2.send_text.call_count}"
    assert ws3.send_text.call_count == 1, f"ws3 should have 1 message (welcome only), got {ws3.send_text.call_count}"  # Not subscribed

    # Cleanup
    await manager.disconnect(user1_id, list(manager._connections[user1_id].keys())[0])
    await manager.disconnect(user2_id, list(manager._connections[user2_id].keys())[0])
    await manager.disconnect(user3_id, list(manager._connections[user3_id].keys())[0])


@pytest.mark.asyncio
async def test_heartbeat_update(manager, mock_websocket):
    """Test heartbeat timestamp update."""
    user_id = "test-user-123"
    connection_id = await manager.connect(
        websocket=mock_websocket, user_id=user_id
    )

    initial_heartbeat = manager._last_heartbeat[connection_id]

    # Wait a bit
    await asyncio.sleep(0.1)

    await manager.update_heartbeat(connection_id)

    updated_heartbeat = manager._last_heartbeat[connection_id]

    assert updated_heartbeat > initial_heartbeat

    # Cleanup
    await manager.disconnect(user_id, connection_id)


@pytest.mark.asyncio
async def test_connection_info(manager, mock_websocket):
    """Test connection information retrieval."""
    user_id = "test-user-123"
    user_agent = "TestAgent/1.0"
    ip_address = "127.0.0.1"

    connection_id = await manager.connect(
        websocket=mock_websocket,
        user_id=user_id,
        user_agent=user_agent,
        ip_address=ip_address,
    )

    # Get connection info
    info = await manager.get_connection_info(connection_id)

    assert info is not None
    assert info.user_id == user_id
    assert info.connection_id == connection_id
    assert info.user_agent == user_agent
    assert info.ip_address == ip_address

    # Get user connections
    user_connections = await manager.get_user_connections(user_id)

    assert len(user_connections) == 1
    assert user_connections[0].connection_id == connection_id

    # Cleanup
    await manager.disconnect(user_id, connection_id)


@pytest.mark.asyncio
async def test_online_users(manager):
    """Test online user tracking."""
    ws1 = AsyncMock()
    ws1.accept = AsyncMock()
    ws1.send_text = AsyncMock()
    ws2 = AsyncMock()
    ws2.accept = AsyncMock()
    ws2.send_text = AsyncMock()

    user1_id = "user-1"
    user2_id = "user-2"

    await manager.connect(websocket=ws1, user_id=user1_id)
    await manager.connect(websocket=ws2, user_id=user2_id)

    # Check online users
    online_users = await manager.get_online_users()

    assert user1_id in online_users
    assert user2_id in online_users
    assert len(online_users) == 2

    # Check if specific user is online
    assert await manager.is_user_online(user1_id) is True
    assert await manager.is_user_online("offline-user") is False

    # Check connection count
    count = await manager.get_connection_count()
    assert count == 2

    # Cleanup
    await manager.disconnect(user1_id, list(manager._connections[user1_id].keys())[0])
    await manager.disconnect(user2_id, list(manager._connections[user2_id].keys())[0])


@pytest.mark.asyncio
async def test_message_queue_size_limit(manager):
    """Test message queue size limit."""
    user_id = "offline-user-123"

    # Add more messages than the limit (50)
    for i in range(100):
        message = WebSocketMessage(
            type=MessageType.NOTIFICATION_NEW,
            data={"test": f"message-{i}"},
        )
        await manager.send_personal_message(user_id, message)

    # Verify queue size is limited to 50
    assert len(manager._message_queue[user_id]) == 50


@pytest.mark.asyncio
async def test_failed_websocket_send(manager):
    """Test handling of failed WebSocket sends."""
    ws = AsyncMock()
    ws.accept = AsyncMock()
    ws.send_text = AsyncMock(side_effect=Exception("Connection lost"))

    user_id = "test-user-123"
    connection_id = await manager.connect(websocket=ws, user_id=user_id)

    message = WebSocketMessage(
        type=MessageType.NOTIFICATION_NEW,
        data={"test": "data"},
    )

    # Send should return False but not raise exception
    delivered = await manager.send_personal_message(user_id, message)

    assert delivered is False
    # Connection should be removed
    assert user_id not in manager._connections


@pytest.mark.asyncio
async def test_multiple_connections_same_user(manager):
    """Test multiple connections for the same user."""
    ws1 = AsyncMock()
    ws1.accept = AsyncMock()
    ws1.send_text = AsyncMock()
    ws2 = AsyncMock()
    ws2.accept = AsyncMock()
    ws2.send_text = AsyncMock()

    user_id = "test-user-123"

    # Create two connections for the same user
    conn1 = await manager.connect(websocket=ws1, user_id=user_id)
    conn2 = await manager.connect(websocket=ws2, user_id=user_id)

    # Both connections should exist
    assert len(manager._connections[user_id]) == 2

    # Send message should be delivered to both connections
    message = WebSocketMessage(
        type=MessageType.NOTIFICATION_NEW,
        data={"test": "data"},
    )

    delivered = await manager.send_personal_message(user_id, message)

    assert delivered is True
    assert ws1.send_text.called
    assert ws2.send_text.called

    # Cleanup
    await manager.disconnect(user_id, conn1)
    await manager.disconnect(user_id, conn2)


@pytest.mark.asyncio
async def test_shutdown(manager):
    """Test manager shutdown."""
    ws = AsyncMock()
    ws.accept = AsyncMock()
    ws.send_text = AsyncMock()
    ws.close = AsyncMock()

    user_id = "test-user-123"
    await manager.connect(websocket=ws, user_id=user_id)

    # Get the connection ID before shutdown
    connection_id = list(manager._connections[user_id].keys())[0]

    # Shutdown
    await manager.shutdown()

    # Verify connections are closed (shutdown calls close on all websockets)
    assert ws.close.call_count >= 1, f"WebSocket should be closed at least once, got {ws.close.call_count}"
    assert len(manager._connections) == 0, "All connections should be removed"
    assert connection_id not in manager._connection_info, "Connection info should be removed"
