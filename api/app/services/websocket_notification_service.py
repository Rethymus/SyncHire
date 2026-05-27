"""
WebSocket Notification Service

Service for sending real-time notifications through WebSocket connections.
Integrates with existing notification system to provide instant delivery.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime
import uuid

from app.websocket.manager import manager
from app.websocket.types import (
    WebSocketMessage,
    MessageType,
    NotificationData,
    ApplicationStatusData,
    JobAlertData,
    InterviewData,
    ActivityData,
)
from app.core.logger import logger, LogCategory


class WebSocketNotificationService:
    """
    Service for sending real-time notifications via WebSocket.

    Features:
        - Instant notification delivery
        - Application status updates
        - Job alerts
        - Interview reminders
        - Activity feed updates
        - Targeted and broadcast messaging
    """

    def __init__(self):
        self.manager = manager

    async def send_notification(
        self,
        user_id: str,
        notification_type: str,
        title: str,
        message: str,
        action_url: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> bool:
        """
        Send a real-time notification to a user.

        Args:
            user_id: The user's ID
            notification_type: Type of notification
            title: Notification title
            message: Notification message
            action_url: Optional URL for action button
            metadata: Optional additional metadata

        Returns:
            True if notification was delivered, False if user is offline
        """
        notification_data = NotificationData(
            notification_id=str(uuid.uuid4()),
            type=notification_type,
            title=title,
            message=message,
            action_url=action_url,
            metadata=metadata,
        )

        ws_message = WebSocketMessage(
            type=MessageType.NOTIFICATION_NEW,
            data=notification_data.model_dump(),
        )

        delivered = await self.manager.send_personal_message(user_id, ws_message)

        if delivered:
            logger.info(
                LogCategory.WEBSOCKET,
                f"Real-time notification sent to user {user_id}: {title}",
            )
        else:
            logger.info(
                LogCategory.WEBSOCKET,
                f"User {user_id} offline, notification queued: {title}",
            )

        return delivered

    async def send_application_status_update(
        self,
        user_id: str,
        application_id: str,
        company: str,
        position: str,
        status: str,
        status_text: str,
    ) -> bool:
        """
        Send application status update notification.

        Args:
            user_id: The user's ID
            application_id: Application ID
            company: Company name
            position: Position title
            status: Application status
            status_text: Human-readable status text

        Returns:
            True if notification was delivered
        """
        status_data = ApplicationStatusData(
            application_id=application_id,
            company=company,
            position=position,
            status=status,
            status_text=status_text,
            updated_at=datetime.utcnow().isoformat(),
        )

        ws_message = WebSocketMessage(
            type=MessageType.APPLICATION_STATUS,
            data=status_data.model_dump(),
        )

        return await self.manager.send_personal_message(user_id, ws_message)

    async def send_job_alert(
        self,
        user_id: str,
        job_id: str,
        company: str,
        position: str,
        location: str,
        match_score: int,
        posted_date: str,
        urgency: str = "normal",
    ) -> bool:
        """
        Send job alert notification.

        Args:
            user_id: The user's ID
            job_id: Job ID
            company: Company name
            position: Position title
            location: Job location
            match_score: Match score (0-100)
            posted_date: Job posting date
            urgency: Urgency level (low, normal, high)

        Returns:
            True if notification was delivered
        """
        job_data = JobAlertData(
            job_id=job_id,
            company=company,
            position=position,
            location=location,
            match_score=match_score,
            posted_date=posted_date,
            urgency=urgency,
        )

        ws_message = WebSocketMessage(
            type=MessageType.JOB_ALERT,
            data=job_data.model_dump(),
        )

        return await self.manager.send_personal_message(user_id, ws_message)

    async def send_interview_reminder(
        self,
        user_id: str,
        interview_id: str,
        application_id: str,
        company: str,
        position: str,
        interview_date: str,
        interview_time: str,
        interview_type: str,
    ) -> bool:
        """
        Send interview reminder notification.

        Args:
            user_id: The user's ID
            interview_id: Interview ID
            application_id: Application ID
            company: Company name
            position: Position title
            interview_date: Interview date
            interview_time: Interview time
            interview_type: Interview type (video, phone, in-person)

        Returns:
            True if notification was delivered
        """
        interview_data = InterviewData(
            interview_id=interview_id,
            application_id=application_id,
            company=company,
            position=position,
            interview_date=interview_date,
            interview_time=interview_time,
            interview_type=interview_type,
        )

        ws_message = WebSocketMessage(
            type=MessageType.INTERVIEW_REMINDER,
            data=interview_data.model_dump(),
        )

        return await self.manager.send_personal_message(user_id, ws_message)

    async def send_interview_scheduled(
        self,
        user_id: str,
        interview_id: str,
        application_id: str,
        company: str,
        position: str,
        interview_date: str,
        interview_time: str,
        interview_type: str,
    ) -> bool:
        """
        Send interview scheduled notification.

        Args:
            user_id: The user's ID
            interview_id: Interview ID
            application_id: Application ID
            company: Company name
            position: Position title
            interview_date: Interview date
            interview_time: Interview time
            interview_type: Interview type

        Returns:
            True if notification was delivered
        """
        interview_data = InterviewData(
            interview_id=interview_id,
            application_id=application_id,
            company=company,
            position=position,
            interview_date=interview_date,
            interview_time=interview_time,
            interview_type=interview_type,
        )

        ws_message = WebSocketMessage(
            type=MessageType.INTERVIEW_SCHEDULED,
            data=interview_data.model_dump(),
        )

        return await self.manager.send_personal_message(user_id, ws_message)

    async def send_activity_update(
        self,
        user_id: str,
        activity_type: str,
        description: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> bool:
        """
        Send activity feed update.

        Args:
            user_id: The user's ID
            activity_type: Type of activity
            description: Activity description
            metadata: Optional additional metadata

        Returns:
            True if notification was delivered
        """
        activity_data = ActivityData(
            activity_id=str(uuid.uuid4()),
            type=activity_type,
            description=description,
            metadata=metadata,
            created_at=datetime.utcnow().isoformat(),
        )

        ws_message = WebSocketMessage(
            type=MessageType.ACTIVITY_NEW,
            data=activity_data.model_dump(),
        )

        return await self.manager.send_personal_message(user_id, ws_message)

    async def send_profile_view(
        self, user_id: str, viewer_company: str, viewer_position: str
    ) -> bool:
        """
        Send profile view notification.

        Args:
            user_id: The user's ID
            viewer_company: Company that viewed the profile
            viewer_position: Position of viewer

        Returns:
            True if notification was delivered
        """
        return await self.send_notification(
            user_id=user_id,
            notification_type="profile_view",
            title="Profile Viewed",
            message=f"Your profile was viewed by {viewer_company} ({viewer_position})",
            metadata={
                "viewer_company": viewer_company,
                "viewer_position": viewer_position,
            },
        )

    async def broadcast_system_message(
        self, message: str, title: str = "System Update"
    ):
        """
        Broadcast a system message to all connected users.

        Args:
            message: The message content
            title: Message title
        """
        ws_message = WebSocketMessage(
            type=MessageType.SYSTEM_MESSAGE,
            data={
                "title": title,
                "message": message,
                "timestamp": datetime.utcnow().isoformat(),
            },
        )

        await self.manager.broadcast(ws_message)

        logger.info(LogCategory.WEBSOCKET, f"Broadcasted system message: {title}")

    async def send_to_users(
        self, user_ids: List[str], notification_type: str, title: str, message: str
    ) -> Dict[str, bool]:
        """
        Send notification to multiple users.

        Args:
            user_ids: List of user IDs
            notification_type: Type of notification
            title: Notification title
            message: Notification message

        Returns:
            Dictionary mapping user IDs to delivery status
        """
        results = {}

        for user_id in user_ids:
            results[user_id] = await self.send_notification(
                user_id=user_id,
                notification_type=notification_type,
                title=title,
                message=message,
            )

        return results

    async def send_search_suggestions(
        self, user_id: str, query: str, suggestions: List[Dict[str, Any]]
    ) -> bool:
        """
        Send real-time search suggestions.

        Args:
            user_id: The user's ID
            query: The search query
            suggestions: List of suggestion objects

        Returns:
            True if suggestions were delivered
        """
        ws_message = WebSocketMessage(
            type=MessageType.SEARCH_SUGGESTION,
            data={
                "query": query,
                "suggestions": suggestions,
                "total_results": len(suggestions),
            },
        )

        return await self.manager.send_personal_message(user_id, ws_message)

    async def send_analytics_update(
        self, user_id: str, analytics_data: Dict[str, Any]
    ) -> bool:
        """
        Send analytics update notification.

        Args:
            user_id: The user's ID
            analytics_data: Analytics data dictionary

        Returns:
            True if update was delivered
        """
        ws_message = WebSocketMessage(
            type=MessageType.ANALYTICS_UPDATE,
            data=analytics_data,
        )

        return await self.manager.send_personal_message(user_id, ws_message)


# Global service instance
websocket_notification_service = WebSocketNotificationService()
