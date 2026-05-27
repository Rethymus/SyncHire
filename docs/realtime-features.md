# Real-time Features Implementation Guide

## Overview

SyncHire's real-time features provide instant updates and notifications to users through WebSocket connections. This system enables live notifications, application status updates, job alerts, interview reminders, and more.

## Architecture

### Backend Components

- **WebSocket Connection Manager** (`app/websocket/manager.py`)
  - Manages WebSocket connections lifecycle
  - Handles connection health monitoring
  - Implements message broadcasting and routing
  - Provides automatic reconnection support

- **WebSocket Routes** (`app/websocket/routes.py`)
  - WebSocket endpoint handlers
  - Authentication via JWT tokens
  - Message type routing
  - Connection status endpoints

- **WebSocket Notification Service** (`app/services/websocket_notification_service.py`)
  - High-level API for sending notifications
  - Specialized methods for different notification types
  - Integration with existing notification system

### Frontend Components

- **WebSocket Client** (`frontend/src/lib/websocket.ts`)
  - WebSocket connection management
  - Automatic reconnection logic
  - Message routing and handling
  - Connection state management

- **React Hooks** (`frontend/src/hooks/use-websocket.ts`)
  - `useWebSocket` - Main WebSocket hook
  - `useRealtimeNotifications` - Real-time notifications
  - `useApplicationUpdates` - Application status updates
  - `useJobAlerts` - Job alert notifications
  - `useInterviewReminders` - Interview reminders
  - `useActivityFeed` - Activity feed updates

- **Components** (`frontend/src/components/realtime/`)
  - `WebSocketProvider` - Context provider for WebSocket
  - `NotificationToast` - Toast notifications
  - `ConnectionStatusIndicator` - Connection status display
  - `ActivityFeed` - Live activity feed

## Message Types

### Connection Management
- `CONNECT` - Connection established
- `DISCONNECT` - Connection closed
- `HEARTBEAT` - Connection health check
- `ERROR` - Error notification

### Notifications
- `NOTIFICATION_NEW` - New notification
- `NOTIFICATION_READ` - Notification marked as read
- `NOTIFICATION_DELETED` - Notification deleted

### Application Updates
- `APPLICATION_STATUS` - Application status change
- `APPLICATION_NEW` - New application created
- `APPLICATION_UPDATED` - Application updated

### Job Alerts
- `JOB_ALERT` - New job match alert
- `JOB_MATCH_UPDATE` - Job match score update

### Interview Updates
- `INTERVIEW_SCHEDULED` - New interview scheduled
- `INTERVIEW_REMINDER` - Interview reminder
- `INTERVIEW_CANCELLED` - Interview cancelled

### System Notifications
- `SYSTEM_MESSAGE` - System-wide message
- `SYSTEM_UPDATE` - System update notification

### Activity Feed
- `ACTIVITY_NEW` - New activity
- `ACTIVITY_UPDATE` - Activity update

### Search
- `SEARCH_SUGGESTION` - Real-time search suggestions
- `SEARCH_RESULT` - Search results

### Analytics
- `ANALYTICS_UPDATE` - Analytics data update
- `PROFILE_VIEW` - Profile view notification

## Backend Usage

### Sending Notifications

```python
from app.services.websocket_notification_service import websocket_notification_service

# Send simple notification
await websocket_notification_service.send_notification(
    user_id=str(user.id),
    notification_type="application_status",
    title="Application Updated",
    message="Your application status has changed to 'Under Review'",
    action_url="/applications/123"
)

# Send application status update
await websocket_notification_service.send_application_status_update(
    user_id=str(user.id),
    application_id="123",
    company="Tech Corp",
    position="Software Engineer",
    status="under_review",
    status_text="Under Review"
)

# Send job alert
await websocket_notification_service.send_job_alert(
    user_id=str(user.id),
    job_id="456",
    company="Startup Inc",
    position="Senior Developer",
    location="Remote",
    match_score=95,
    posted_date="2026-05-26",
    urgency="high"
)

# Send interview reminder
await websocket_notification_service.send_interview_reminder(
    user_id=str(user.id),
    interview_id="789",
    application_id="123",
    company="Tech Corp",
    position="Software Engineer",
    interview_date="2026-05-30",
    interview_time="10:00 AM",
    interview_type="video"
)

# Send to multiple users
await websocket_notification_service.send_to_users(
    user_ids=["user1", "user2", "user3"],
    notification_type="system_update",
    title="System Maintenance",
    message="The system will be under maintenance tonight from 10 PM to 12 AM"
)

# Broadcast to all users
await websocket_notification_service.broadcast_system_message(
    message="New features have been deployed!",
    title="Feature Update"
)
```

### Checking Connection Status

```python
from app.websocket import manager

# Check if user is online
is_online = await manager.is_user_online(str(user.id))

# Get connection count
connection_count = await manager.get_connection_count()

# Get online users
online_users = await manager.get_online_users()

# Get user connection info
connections = await manager.get_user_connections(str(user.id))
```

### Managing Subscriptions

```python
from app.websocket import manager

# Subscribe user to channel
await manager.subscribe(str(user.id), "notifications")

# Unsubscribe from channel
await manager.unsubscribe(str(user.id), "notifications")

# Broadcast to subscribers
await manager.broadcast_to_subscription(
    "notifications",
    WebSocketMessage(type=MessageType.SYSTEM_MESSAGE, data={...})
)
```

## Frontend Usage

### Basic WebSocket Connection

```typescript
import { useWebSocket } from '@/hooks/use-websocket';

function MyComponent() {
  const token = useAuthStore(state => state.token);

  const {
    isConnected,
    connectionId,
    sendMessage,
    subscribe,
    unsubscribe,
  } = useWebSocket(token, {
    enabled: !!token,
    onConnect: () => console.log('Connected'),
    onDisconnect: () => console.log('Disconnected'),
  });

  return (
    <div>
      <p>Connection Status: {isConnected ? 'Connected' : 'Disconnected'}</p>
    </div>
  );
}
```

### Real-time Notifications

```typescript
import { useRealtimeNotifications } from '@/hooks/use-websocket';

function NotificationPanel() {
  const token = useAuthStore(state => state.token);
  const { notifications, unreadCount, markAsRead } = useRealtimeNotifications(token);

  return (
    <div>
      <h3>Notifications ({unreadCount})</h3>
      {notifications.map(notification => (
        <div key={notification.notification_id}>
          <h4>{notification.title}</h4>
          <p>{notification.message}</p>
          <button onClick={() => markAsRead(notification.notification_id)}>
            Mark as Read
          </button>
        </div>
      ))}
    </div>
  );
}
```

### Application Updates

```typescript
import { useApplicationUpdates } from '@/hooks/use-websocket';

function ApplicationStatus() {
  const token = useAuthStore(state => state.token);
  const { updates } = useApplicationUpdates(token);

  return (
    <div>
      <h3>Recent Updates</h3>
      {updates.map(update => (
        <div key={update.application_id}>
          <p>{update.company} - {update.position}</p>
          <p>Status: {update.status_text}</p>
        </div>
      ))}
    </div>
  );
}
```

### Job Alerts

```typescript
import { useJobAlerts } from '@/hooks/use-websocket';

function JobAlertsPanel() {
  const token = useAuthStore(state => state.token);
  const { alerts } = useJobAlerts(token);

  return (
    <div>
      <h3>New Job Matches</h3>
      {alerts.map(alert => (
        <div key={alert.job_id}>
          <h4>{alert.position} at {alert.company}</h4>
          <p>Location: {alert.location}</p>
          <p>Match Score: {alert.match_score}%</p>
        </div>
      ))}
    </div>
  );
}
```

### Interview Reminders

```typescript
import { useInterviewReminders } from '@/hooks/use-websocket';

function InterviewReminders() {
  const token = useAuthStore(state => state.token);
  const { reminders } = useInterviewReminders(token);

  return (
    <div>
      <h3>Upcoming Interviews</h3>
      {reminders.map(reminder => (
        <div key={reminder.interview_id}>
          <h4>{reminder.company} - {reminder.position}</h4>
          <p>{reminder.interview_date} at {reminder.interview_time}</p>
          <p>Type: {reminder.interview_type}</p>
        </div>
      ))}
    </div>
  );
}
```

### Activity Feed

```typescript
import { useActivityFeed } from '@/hooks/use-websocket';

function ActivityFeed() {
  const token = useAuthStore(state => state.token);
  const { activities } = useActivityFeed(token);

  return (
    <div>
      <h3>Recent Activity</h3>
      {activities.map(activity => (
        <div key={activity.activity_id}>
          <p>{activity.description}</p>
          <small>{new Date(activity.created_at).toLocaleString()}</small>
        </div>
      ))}
    </div>
  );
}
```

### WebSocket Provider Setup

```typescript
// app/layout.tsx
import { WebSocketProvider } from '@/components/realtime/WebSocketProvider';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <WebSocketProvider>
          {children}
        </WebSocketProvider>
      </body>
    </html>
  );
}
```

### Custom Message Handling

```typescript
import { useWebSocket } from '@/hooks/use-websocket';
import { MessageType } from '@/lib/websocket-types';

function CustomComponent() {
  const token = useAuthStore(state => state.token);
  const { on } = useWebSocket(token);

  useEffect(() => {
    const unsubscribe = on(MessageType.CUSTOM_MESSAGE, (message) => {
      console.log('Received custom message:', message.data);
      // Handle custom message
    });

    return unsubscribe;
  }, [on]);

  return <div>Custom Message Handler</div>;
}
```

## Environment Configuration

### Backend (.env)

```env
# WebSocket Configuration
WS_HEARTBEAT_INTERVAL=30
WS_MESSAGE_QUEUE_SIZE=50
WS_RECONNECT_TIMEOUT=300
WS_CONNECTION_TIMEOUT=600
```

### Frontend (.env.local)

```env
# WebSocket URL
NEXT_PUBLIC_WS_URL=ws://localhost:8000
# For production:
# NEXT_PUBLIC_WS_URL=wss://api.synchire.com
```

## Browser Notifications

The real-time system supports browser notifications. To enable:

1. Request permission on first user interaction
2. Handle notification clicks
3. Show notifications for important events

```typescript
// Request notification permission
useEffect(() => {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}, []);

// Notifications are automatically shown for:
// - New notifications
// - Job alerts
// - Interview reminders
```

## Performance Considerations

### Connection Management
- Automatic reconnection with exponential backoff
- Connection health monitoring via heartbeat
- Maximum 10 reconnection attempts
- 30-second heartbeat interval

### Message Queuing
- Messages queued for offline users
- Maximum 50 messages per user
- 7-day message retention in Redis
- Automatic delivery on reconnection

### Scalability
- Redis-backed message queuing
- Horizontal scaling support
- Connection pooling
- Efficient message broadcasting

## Security

### Authentication
- JWT token required for WebSocket connection
- Token validation on connection
- Automatic disconnection on token expiry

### Authorization
- User-specific message routing
- Channel-based subscriptions
- Admin-only endpoints

### Message Validation
- Input validation on all messages
- Type checking for message data
- Sanitization of user-generated content

## Monitoring

### Connection Metrics
- Total active connections
- Online user count
- Connection duration
- Message delivery rate

### Logging
- All WebSocket events logged
- Error tracking and alerting
- Performance monitoring

## Testing

### Backend Tests

```python
# tests/test_websocket.py
import pytest
from app.websocket import manager

@pytest.mark.asyncio
async def test_websocket_connection():
    # Test connection establishment
    pass

@pytest.mark.asyncio
async def test_message_delivery():
    # Test message sending
    pass

@pytest.mark.asyncio
async def test_broadcast():
    # Test broadcasting
    pass
```

### Frontend Tests

```typescript
// tests/websocket.test.ts
import { renderHook } from '@testing-library/react';
import { useWebSocket } from '@/hooks/use-websocket';

test('WebSocket connection management', () => {
  const { result } = renderHook(() => useWebSocket('fake-token'));
  // Test connection logic
});
```

## Troubleshooting

### Connection Issues
- Check JWT token validity
- Verify WebSocket URL configuration
- Check network connectivity
- Review server logs

### Message Delivery
- Verify user is online
- Check message queue
- Review subscription status
- Check message format

### Performance Issues
- Monitor connection count
- Check message queue size
- Review broadcast frequency
- Optimize message size

## Future Enhancements

- [ ] Message persistence and history
- [ ] Typing indicators for chat
- [ ] File transfer support
- [ ] Video/audio streaming
- [ ] End-to-end encryption
- [ ] Advanced filtering and search
- [ ] Analytics dashboard
- [ ] A/B testing for notifications

## Related Documentation

- [API Documentation](./api.md)
- [Frontend Architecture](./frontend.md)
- [Notification System](./notifications.md)
- [Security Guidelines](./security.md)
