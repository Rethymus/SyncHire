# Application Status Tracking - Usage Guide

## Quick Start

### For Users

#### 1. View Your Applications
Navigate to the applications page to see all your job applications with their current status.

#### 2. Update Application Status
1. Find the application you want to update
2. Click the status dropdown button
3. Select the new status from the list:
   - **待处理** (pending) - Initial state
   - **已优化** (optimized) - After AI optimization
   - **已申请** (applied) - After submitting to employer
   - **面试中** (interview) - When in interview process
   - **已录用** (offer) - When received job offer
   - **已拒绝** (rejected) - If rejected

#### 3. Add Notes (Optional)
- Before confirming the status change, add notes in the text area
- Example: "Applied through company website", "Phone screen scheduled", etc.

#### 4. View Status History
- Click the "历史" (History) button on any application card
- See complete timeline of all status changes with dates and notes

## API Usage

### Update Application Status
```typescript
import { applicationAPI } from '@/lib/api-client';

// Update status with notes
const response = await applicationAPI.updateStatus(
  applicationId,
  'interview',
  'Technical interview scheduled for next Tuesday'
);

if (response.error) {
  console.error('Failed to update status:', response.error);
} else {
  console.log('Status updated successfully');
}
```

### Get Status History
```typescript
import { applicationAPI } from '@/lib/api-client';

const response = await applicationAPI.getStatusHistory(applicationId);

if (response.data) {
  response.data.forEach(entry => {
    console.log(`${entry.old_status} → ${entry.new_status}: ${entry.notes}`);
  });
}
```

### React Component Usage
```tsx
import { ApplicationStatusManager } from '@/components/application-status-manager';

function MyComponent() {
  const handleStatusUpdate = (newStatus: string) => {
    console.log('Status changed to:', newStatus);
  };

  return (
    <ApplicationStatusManager
      applicationId="app-123"
      currentStatus="applied"
      onStatusUpdate={handleStatusUpdate}
    />
  );
}
```

## Backend API Endpoints

### PATCH /applications/{id}/status
Update application status with automatic history tracking.

**Request Body:**
```json
{
  "status": "interview",
  "notes": "Phone screen completed, invited to onsite"
}
```

**Response:**
```json
{
  "id": "uuid",
  "status": "interview",
  "notes": "Phone screen completed, invited to onsite",
  "status_history": [
    {
      "id": "history-uuid",
      "old_status": "applied",
      "new_status": "interview",
      "notes": "Phone screen completed, invited to onsite",
      "changed_at": "2026-05-24T15:30:00Z"
    }
  ],
  "updated_at": "2026-05-24T15:30:00Z"
}
```

### GET /applications/{id}/history
Get complete status change history for an application.

**Response:**
```json
[
  {
    "id": "history-uuid-1",
    "old_status": "applied",
    "new_status": "interview",
    "notes": "Phone screen completed",
    "changed_at": "2026-05-24T15:30:00Z"
  },
  {
    "id": "history-uuid-2",
    "old_status": "interview",
    "new_status": "offer",
    "notes": "Received offer letter",
    "changed_at": "2026-05-28T10:15:00Z"
  }
]
```

## Notification System

### Basic Usage
```typescript
import { useNotifications } from '@/lib/status-notifications';

function MyComponent() {
  const { notifications, addNotification, removeNotification } = useNotifications();

  return (
    <div>
      <h3>Notifications ({notifications.length})</h3>
      {notifications.map(notification => (
        <div key={notification.id}>
          {notification.message}
          <button onClick={() => removeNotification(notification.id)}>
            Dismiss
          </button>
        </div>
      ))}
    </div>
  );
}
```

### Custom Notifications
```typescript
import { notificationStore, generateStatusNotification } from '@/lib/status-notifications';

// Generate notification for status change
const notification = generateStatusNotification(
  'app-123',
  'applied',
  'interview',
  'Tech Company Inc.'
);

// Add to store
notificationStore.add(notification);
```

## Status Workflow Best Practices

### Recommended Status Progression
1. Create application → **pending**
2. Optimize resume → **optimized**
3. Submit to employer → **applied**
4. Get interview invitation → **interview**
5. Receive offer → **offer**
6. Get rejected → **rejected** (can happen at any stage)

### Tips for Using Notes
- **Applied**: Mention how you applied (website, referral, etc.)
- **Interview**: Note interview type (phone, video, onsite) and date
- **Offer**: Include offer details (salary, start date, etc.)
- **Rejected**: Brief reason if known (for future reference)

### Managing Multiple Applications
- Keep notes detailed to remember application details
- Update status promptly to track progress accurately
- Use history to review what worked and what didn't
- Identify patterns in successful applications

## Troubleshooting

### Common Issues

#### Status Update Fails
- **Problem**: Cannot update application status
- **Solution**: Ensure you're logged in and the application belongs to you
- **Check**: Browser console for error messages

#### History Not Showing
- **Problem**: Status history is empty
- **Solution**: This is normal for new applications. History appears after first status change.

#### Notifications Not Appearing
- **Problem**: Don't see status change notifications
- **Solution**: Make sure `<StatusNotifications />` component is rendered in your app

#### Invalid Status Error
- **Problem**: API returns "Invalid status" error
- **Solution**: Use only valid status values: pending, optimized, applied, interview, offer, rejected

## Technical Support

For issues or questions:
1. Check browser console for errors
2. Review network requests in DevTools
3. Check backend logs for API errors
4. Verify database migration was run successfully

## Future Features

Coming soon:
- Email notifications for status changes
- Calendar integration for interviews
- Analytics dashboard for application success rates
- Bulk status updates for multiple applications
- Custom status workflows per company
