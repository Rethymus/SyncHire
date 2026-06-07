"""
Notification Management API Endpoints

Provides endpoints for managing user notification preferences and email subscriptions.
"""

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func
from typing import Dict, Any, Optional, List
import uuid

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User, NotificationFrequency
from app.models.notification import Notification, NotificationType
from app.services.email_service import email_service
from app.core.logger import logger, LogCategory
from pydantic import BaseModel, ConfigDict

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


# Pydantic models for request/response
class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    type: str
    title: str
    message: str
    read: bool
    created_at: str
    action_url: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class NotificationsListResponse(BaseModel):
    notifications: List[NotificationResponse]
    total: int
    unread_count: int


@router.get("/preferences")
async def get_notification_preferences(
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """Get current user's notification preferences."""
    try:
        preferences = current_user.notification_preferences or {
            "email_enabled": True,
            "application_status_updates": True,
            "interview_reminders": True,
            "weekly_digest": False,
            "job_recommendations": True,
            "profile_views": True,
            "notification_frequency": NotificationFrequency.IMMEDIATE.value,
        }

        return {
            "preferences": preferences,
            "email_unsubscribed": current_user.email_unsubscribed,
            "email_bounced": current_user.email_bounced,
        }
    except Exception as e:
        logger.error(LogCategory.API, f"Error getting notification preferences: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve notification preferences",
        )


@router.put("/preferences")
async def update_notification_preferences(
    preferences: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Update user's notification preferences."""
    try:
        # Validate notification frequency
        if "notification_frequency" in preferences:
            valid_frequencies = [freq.value for freq in NotificationFrequency]
            if preferences["notification_frequency"] not in valid_frequencies:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid notification frequency. Must be one of: {valid_frequencies}",
                )

        # Merge with existing preferences
        current_prefs = current_user.notification_preferences or {}
        updated_preferences = {**current_prefs, **preferences}

        # Update user
        current_user.notification_preferences = updated_preferences
        await db.commit()
        await db.refresh(current_user)

        logger.info(
            LogCategory.API,
            f"Updated notification preferences for user {current_user.id}",
            {"preferences": updated_preferences},
        )

        return {
            "message": "Notification preferences updated successfully",
            "preferences": updated_preferences,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(LogCategory.API, f"Error updating notification preferences: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update notification preferences",
        )


@router.post("/unsubscribe")
async def unsubscribe_from_emails(
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Unsubscribe current user from all email notifications."""
    try:
        current_user.email_unsubscribed = True
        current_user.email_unsubscribed_at = datetime.utcnow()

        # Also disable email in preferences
        if current_user.notification_preferences is None:
            current_user.notification_preferences = {}
        current_user.notification_preferences["email_enabled"] = False

        await db.commit()
        await db.refresh(current_user)

        logger.info(LogCategory.API, f"User {current_user.id} unsubscribed from emails")

        return {
            "message": "You have been successfully unsubscribed from all email notifications",
            "unsubscribed_at": current_user.email_unsubscribed_at.isoformat(),
        }

    except Exception as e:
        logger.error(LogCategory.API, f"Error unsubscribing user: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to unsubscribe from emails",
        )


@router.post("/resubscribe")
async def resubscribe_to_emails(
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Resubscribe current user to email notifications."""
    try:
        current_user.email_unsubscribed = False
        current_user.email_unsubscribed_at = None

        # Enable email in preferences
        if current_user.notification_preferences is None:
            current_user.notification_preferences = {}
        current_user.notification_preferences["email_enabled"] = True

        await db.commit()
        await db.refresh(current_user)

        logger.info(LogCategory.API, f"User {current_user.id} resubscribed to emails")

        return {
            "message": "You have been successfully resubscribed to email notifications"
        }

    except Exception as e:
        logger.error(LogCategory.API, f"Error resubscribing user: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to resubscribe to emails",
        )


@router.get("/unsubscribe/token/{token}")
async def unsubscribe_by_token(
    token: str, db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Unsubscribe using email token (for email links)."""
    try:
        # In production, you would validate a cryptographic token
        # For now, we'll use a simple UUID check
        # This should be improved with proper JWT tokens

        result = await db.execute(select(User).where(User.id == uuid.UUID(token)))
        user = result.scalar_one_or_none()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Invalid unsubscribe link"
            )

        user.email_unsubscribed = True
        user.email_unsubscribed_at = datetime.utcnow()

        if user.notification_preferences is None:
            user.notification_preferences = {}
        user.notification_preferences["email_enabled"] = False

        await db.commit()

        logger.info(LogCategory.API, f"User {user.id} unsubscribed via email link")

        return {
            "message": "You have been successfully unsubscribed from all email notifications"
        }

    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid unsubscribe link"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(LogCategory.API, f"Error processing unsubscribe request: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process unsubscribe request",
        )


@router.post("/test")
async def test_notification(
    notification_type: str, current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """Send a test notification to verify email settings."""
    try:
        # Check if user is unsubscribed
        if current_user.email_unsubscribed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You are unsubscribed from email notifications",
            )

        # Check if emails are enabled
        preferences = current_user.notification_preferences or {}
        if not preferences.get("email_enabled", True):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email notifications are disabled in your preferences",
            )

        # Send test notification based on type
        if notification_type == "application_status":
            success = await email_service.send_application_status_update(
                to_email=current_user.email,
                user_name=current_user.full_name or "there",
                company_name="Test Company",
                status="applied",
                status_text="Application Submitted",
                message="This is a test notification to verify your email settings are working correctly.",
                application_id=str(uuid.uuid4()),
            )
        elif notification_type == "interview_reminder":
            success = await email_service.send_interview_reminder(
                to_email=current_user.email,
                user_name=current_user.full_name or "there",
                company_name="Test Company",
                position="Software Engineer",
                interview_date="2026-05-25",
                interview_time="10:00 AM",
                interview_type="Video Call",
                application_id=str(uuid.uuid4()),
            )
        elif notification_type == "weekly_digest":
            from datetime import timedelta

            week_end = datetime.utcnow()
            week_start = week_end - timedelta(days=7)

            success = await email_service.send_weekly_digest(
                to_email=current_user.email,
                user_name=current_user.full_name or "there",
                week_start=week_start.strftime("%B %d"),
                week_end=week_end.strftime("%B %d, %Y"),
                applications_submitted=5,
                interviews_scheduled=2,
                profile_views=15,
                new_matches=[
                    {
                        "company": "Tech Corp",
                        "position": "Senior Developer",
                        "match_score": 95,
                    }
                ],
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid notification type: {notification_type}",
            )

        if success:
            return {
                "message": f"Test {notification_type} notification sent successfully",
                "sent_to": current_user.email,
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to send test notification",
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(LogCategory.API, f"Error sending test notification: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send test notification",
        )


@router.get("/status")
async def get_notification_status(
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """Get current notification system status."""
    try:
        preferences = current_user.notification_preferences or {}

        return {
            "email_enabled": preferences.get("email_enabled", True),
            "email_unsubscribed": current_user.email_unsubscribed,
            "email_bounced": current_user.email_bounced,
            "notification_frequency": preferences.get(
                "notification_frequency", "immediate"
            ),
            "application_status_updates": preferences.get(
                "application_status_updates", True
            ),
            "interview_reminders": preferences.get("interview_reminders", True),
            "weekly_digest": preferences.get("weekly_digest", False),
            "job_recommendations": preferences.get("job_recommendations", True),
            "profile_views": preferences.get("profile_views", True),
            "email_address": current_user.email,
        }

    except Exception as e:
        logger.error(LogCategory.API, f"Error getting notification status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve notification status",
        )


# ============================================================================
# In-App Notification Endpoints
# ============================================================================


@router.get("", response_model=NotificationsListResponse)
async def get_notifications(
    unread_only: bool = Query(
        False, description="Filter to only show unread notifications"
    ),
    limit: int = Query(
        50, ge=1, le=100, description="Maximum number of notifications to return"
    ),
    offset: int = Query(0, ge=0, description="Number of notifications to skip"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> NotificationsListResponse:
    """Get current user's notifications."""
    try:
        # Build query
        query = select(Notification).where(Notification.user_id == current_user.id)

        if unread_only:
            query = query.where(not Notification.read)

        # Get total count
        count_query = select(func.count(Notification.id)).where(
            Notification.user_id == current_user.id
        )
        if unread_only:
            count_query = count_query.where(not Notification.read)

        # Get unread count
        unread_query = select(func.count(Notification.id)).where(
            Notification.user_id == current_user.id, not Notification.read
        )

        # Order by created_at descending
        query = (
            query.order_by(Notification.created_at.desc()).limit(limit).offset(offset)
        )

        # Execute queries
        result = await db.execute(query)
        notifications = result.scalars().all()

        total_result = await db.execute(count_query)
        total = total_result.scalar() or 0

        unread_result = await db.execute(unread_query)
        unread_count = unread_result.scalar() or 0

        return NotificationsListResponse(
            notifications=[
                NotificationResponse(
                    id=str(n.id),
                    type=n.type.value,
                    title=n.title,
                    message=n.message,
                    read=n.read,
                    created_at=n.created_at.isoformat(),
                    action_url=n.action_url,
                    metadata=n.meta,
                )
                for n in notifications
            ],
            total=total,
            unread_count=unread_count,
        )

    except Exception as e:
        logger.error(LogCategory.API, f"Error getting notifications: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve notifications",
        )


@router.put("/{notification_id}/read")
async def mark_notification_as_read(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Mark a specific notification as read."""
    try:
        # Parse notification ID
        try:
            nid = uuid.UUID(notification_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid notification ID",
            )

        # Get notification
        result = await db.execute(
            select(Notification).where(
                Notification.id == nid, Notification.user_id == current_user.id
            )
        )
        notification = result.scalar_one_or_none()

        if not notification:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found"
            )

        # Mark as read if not already read
        if not notification.read:
            notification.read = True
            notification.read_at = datetime.utcnow()
            await db.commit()

        return {"message": "Notification marked as read"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(LogCategory.API, f"Error marking notification as read: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to mark notification as read",
        )


@router.put("/read-all")
async def mark_all_notifications_as_read(
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Mark all notifications for the current user as read."""
    try:
        # Get all unread notifications
        result = await db.execute(
            select(Notification).where(
                Notification.user_id == current_user.id, not Notification.read
            )
        )
        notifications = result.scalars().all()

        # Mark all as read
        for notification in notifications:
            notification.read = True
            notification.read_at = datetime.utcnow()

        await db.commit()

        logger.info(
            LogCategory.API,
            f"Marked {len(notifications)} notifications as read for user {current_user.id}",
        )

        return {"message": f"Marked {len(notifications)} notifications as read"}

    except Exception as e:
        logger.error(LogCategory.API, f"Error marking all as read: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to mark all notifications as read",
        )


@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Delete a specific notification."""
    try:
        # Parse notification ID
        try:
            nid = uuid.UUID(notification_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid notification ID",
            )

        # Delete notification
        result = await db.execute(
            delete(Notification).where(
                Notification.id == nid, Notification.user_id == current_user.id
            )
        )

        if result.rowcount == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found"
            )

        await db.commit()

        return {"message": "Notification deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(LogCategory.API, f"Error deleting notification: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete notification",
        )


@router.delete("/clear-all")
async def clear_all_notifications(
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Delete all notifications for the current user."""
    try:
        # Delete all notifications
        result = await db.execute(
            delete(Notification).where(Notification.user_id == current_user.id)
        )

        await db.commit()

        count = result.rowcount
        logger.info(
            LogCategory.API, f"Cleared {count} notifications for user {current_user.id}"
        )

        return {"message": f"Cleared {count} notifications"}

    except Exception as e:
        logger.error(LogCategory.API, f"Error clearing notifications: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to clear notifications",
        )


@router.post("/create")
async def create_notification(
    user_id: str,
    notification_type: NotificationType,
    title: str,
    message: str,
    action_url: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Create a new notification (internal endpoint)."""
    try:
        # Parse user ID
        try:
            uid = uuid.UUID(user_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user ID"
            )

        # Create notification
        notification = Notification(
            user_id=uid,
            type=notification_type,
            title=title,
            message=message,
            action_url=action_url,
            meta=metadata,
        )

        db.add(notification)
        await db.commit()
        await db.refresh(notification)

        logger.info(
            LogCategory.API, f"Created notification for user {user_id}: {title}"
        )

        return {
            "message": "Notification created successfully",
            "notification_id": str(notification.id),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(LogCategory.API, f"Error creating notification: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create notification",
        )
