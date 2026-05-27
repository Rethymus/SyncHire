# WebSocket Implementation Guide

## Overview

SyncHire now includes a comprehensive WebSocket implementation for real-time updates and live collaboration features. This enables instant notifications, application status updates, interview scheduling, and analytics updates without requiring page refreshes.

## Architecture

### Backend Components

1. **WebSocket Server** (`/api/app/websocket/server.py`)
   - JWT-based authentication
   - Room/channel management
   - Connection lifecycle handling
   - Event emission system for integration

2. **Connection Manager** (`/api/app/websocket/manager.py`)
   - Connection pooling and management
   - Message broadcasting and routing
   - Heartbeat monitoring
   - Automatic cleanup of stale connections
   - Message queuing for offline users

3. **WebSocket Routes** (`/api/app/websocket/routes.py`)
   - Main WebSocket endpoint: `/api/ws`
   - Status endpoints for connection monitoring
   - Authentication middleware

### Frontend Components

1. **WebSocket Client** (`/frontend/src/lib/websocket.ts`)
   - Connection management
   - Auto-reconnect logic
   - Message handling and routing
   - Heartbeat monitoring

2. **Enhanced Client** (`/frontend/src/lib/websocket-client.ts`)
   - React Query integration
   - Automatic cache invalidation
   - Optimistic updates
   - React hooks for easy integration

3. **UI Components** (`/frontend/src/components/websocket-status.tsx`)
   - Connection status indicator
   - Real-time notification bell
   - Reconnect controls

## Message Types

### Connection Management
- `CONNECT` - Connection established
- `DISCONNECT` - Connection closed
- `HEARTBEAT` - Connection health check
- `ERROR` - Error messages

### Notifications
- `NOTIFICATION_NEW` - New notification created
- `NOTIFICATION_READ` - Notification marked as read
- `NOTIFICATION_DELETED` - Notification deleted

### Application Updates
- `APPLICATION_STATUS` - Application status changed
- `APPLICATION_NEW` - New application created
- `APPLICATION_UPDATED` - Application details updated

### Job Alerts
- `JOB_ALERT` - New job matching criteria
- `JOB_MATCH_UPDATE` - Job match score updated

### Interview Updates
- `INTERVIEW_SCHEDULED` - New interview scheduled
- `INTERVIEW_REMINDER` - Interview reminder
- `INTERVIEW_CANCELLED` - Interview cancelled

### System Messages
- `SYSTEM_MESSAGE` - System announcements
- `SYSTEM_UPDATE` - System updates
- `ANALYTICS_UPDATE` - Analytics data updated

## Usage Examples

### Backend Integration

#### Broadcasting Application Status Updates

```python
from app.websocket.manager import manager
from app.websocket.types import WebSocketMessage, MessageType

async def notify_application_status_update(application_id: str, user_id: str):
    message = WebSocketMessage(
        type=MessageType.APPLICATION_STATUS,
        data={
            "application_id": str(application_id),
            "company": "Tech Corp",
            "position": "Senior Developer",
            "status": "interview",
            "status_text": "Interview scheduled",
            "updated_at": datetime.utcnow().isoformat(),
        }
    )

    await manager.send_personal_message(user_id, message)
```

#### Broadcasting to Multiple Users

```python
# Send to specific users
user_ids = ["user1", "user2", "user3"]
await manager.send_to_users(user_ids, message)

# Broadcast to all users (except sender)
await manager.broadcast(message, exclude_user="sender_id")

# Broadcast to subscribers
await manager.broadcast_to_subscription("notifications", message)
```

### Frontend Integration

#### Basic WebSocket Connection

```typescript
import { useWebSocketClient } from '@/lib/websocket-client';
import { useAuthStore } from '@/lib/store';

function MyComponent() {
  const { token } = useAuthStore();

  useWebSocketClient({
    token: token || '',
  });

  return <div>Real-time updates enabled</div>;
}
```

#### Real-time Application Updates

```typescript
import { useRealtimeApplications } from '@/hooks/use-realtime-applications';

function ApplicationList() {
  const { wsClient } = useRealtimeApplications({
    onApplicationStatusChange: (data) => {
      console.log('Application status changed:', data);
    },
    onInterviewScheduled: (data) => {
      console.log('Interview scheduled:', data);
    },
  });

  // Your component logic
}
```

#### Real-time Analytics

```typescript
import { useRealtimeAnalytics } from '@/hooks/use-realtime-applications';

function AnalyticsDashboard() {
  const { wsClient } = useRealtimeAnalytics();

  // Analytics will auto-update via React Query
}
```

#### Real-time Notifications

```typescript
import { useRealtimeNotifications } from '@/hooks/use-realtime-applications';

function NotificationCenter() {
  const { wsClient } = useRealtimeNotifications();

  // Notifications will auto-update and show browser notifications
}
```

#### Connection Status Display

```typescript
import { WebSocketStatus, NotificationBell } from '@/components/websocket-status';

function Header() {
  return (
    <header>
      <WebSocketStatus />
      <NotificationBell />
    </header>
  );
}
```

## Configuration

### Backend Configuration

Add to `.env`:

```bash
# WebSocket Configuration
WS_HEARTBEAT_INTERVAL=30
WS_MAX_CONNECTIONS=1000
WS_MESSAGE_QUEUE_SIZE=50
WS_RECONNECT_INTERVAL=3000
WS_MAX_RECONNECT_ATTEMPTS=10
```

### Frontend Configuration

Add to `.env.local`:

```bash
# WebSocket URL
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

## Authentication

WebSocket connections require a valid JWT token passed as a query parameter:

```typescript
const ws = new WebSocket('ws://localhost:8000/api/ws?token=YOUR_JWT_TOKEN');
```

The token is validated on connection, and the user's identity is established before any messages are exchanged.

## Room/Channel Management

### Backend

```python
# Add connection to room
await ws_server.add_to_room(connection_id, "application:123")

# Broadcast to room
await ws_server.broadcast_to_room("application:123", message)

# Remove from room
await ws_server.remove_from_room(connection_id, "application:123")
```

### Frontend

```typescript
// Subscribe to channel
wsClient.subscribe('application:123');

// Unsubscribe from channel
wsClient.unsubscribe('application:123');
```

## Error Handling

### Connection Errors

```typescript
wsClient.onConnectionChange((state) => {
  if (state === 'error' || state === 'failed') {
    // Handle connection error
    console.error('WebSocket connection failed');
  }
});
```

### Message Errors

```typescript
wsClient.on(MessageType.ERROR, (message) => {
  console.error('WebSocket error:', message.data);
});
```

## Performance Considerations

1. **Connection Pooling**: The backend efficiently manages connections with automatic cleanup
2. **Message Queuing**: Messages for offline users are queued in Redis for later delivery
3. **Heartbeat Monitoring**: Stale connections are automatically removed after 5 minutes
4. **React Query Integration**: Automatic cache invalidation prevents unnecessary API calls
5. **Browser Notifications**: Native browser notifications for important updates

## Security Features

1. **JWT Authentication**: All connections require valid authentication
2. **Subscription Validation**: Only allowed subscriptions are accepted
3. **Rate Limiting**: WebSocket connections are subject to rate limiting
4. **Input Sanitization**: All messages are validated and sanitized
5. **CSRF Protection**: WebSocket connections inherit CSRF protection from the main app

## Testing

Run WebSocket tests:

```bash
# Frontend tests
npm test -- websocket-client.test.ts

# Backend tests (to be implemented)
pytest api/tests/test_websocket.py
```

## Troubleshooting

### Connection Issues

1. **Check Token**: Ensure JWT token is valid and not expired
2. **CORS Configuration**: Verify WebSocket URL is in CORS allowed origins
3. **Firewall**: Check if WebSocket port is accessible
4. **Browser Support**: Ensure browser supports WebSocket (all modern browsers do)

### Performance Issues

1. **Connection Count**: Monitor active connections via `/api/ws/stats`
2. **Message Queue**: Check Redis message queue size
3. **Database Load**: WebSocket updates can trigger database queries

### Debug Mode

Enable detailed logging:

```python
# Backend
import logging
logging.getLogger('app.websocket').setLevel(logging.DEBUG)
```

```typescript
// Frontend
localStorage.setItem('debug', 'true');
```

## Future Enhancements

1. **Presence System**: Show which users are online
2. **Typing Indicators**: Real-time collaboration features
3. **File Progress Updates**: Real-time upload/download progress
4. **Collaborative Editing**: Multiple users editing simultaneously
5. **Video/Audio Integration**: WebRTC for video interviews

## API Reference

### WebSocket Endpoints

- `ws://localhost:8000/api/ws?token=JWT_TOKEN` - Main WebSocket connection
- `GET /api/ws/status` - Get connection status for current user
- `GET /api/ws/stats` - Get WebSocket statistics (admin)

### Message Format

```typescript
interface WebSocketMessage {
  type: MessageType;
  data: Record<string, any>;
  timestamp: string;
  id: string;
}
```

## Support

For issues or questions about WebSocket functionality, please refer to:
- Main documentation: `/docs/`
- API documentation: `/api/docs` (Swagger UI)
- GitHub issues: https://github.com/Rethymus/synchire/issues