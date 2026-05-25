"""
Notification Service

Coordinates sending notifications based on user events and preferences.
"""

import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional, Dict, Any

from app.models.user import User, NotificationFrequency
from app.models.application import Application
from app.models.jd import JD
from app.models.notification import Notification, NotificationType
from app.services.email_service import email_service
from app.core.logger import logger, LogCategory


class NotificationService:
    """Service for managing user notifications based on preferences."""

    @staticmethod
    async def create_in_app_notification(
        db: AsyncSession,
        user_id: uuid.UUID,
        notification_type: NotificationType,
        title: str,
        message: str,
        action_url: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Notification:
        """Create an in-app notification for a user."""
        try:
            notification = Notification(
                user_id=user_id,
                type=notification_type,
                title=title,
                message=message,
                action_url=action_url,
                metadata=metadata
            )

            db.add(notification)
            await db.commit()
            await db.refresh(notification)

            logger.info(
                LogCategory.API,
                f"Created in-app notification for user {user_id}: {title}"
            )

            return notification

        except Exception as e:
            logger.error(
                LogCategory.API,
                f"Error creating in-app notification: {e}"
            )
            await db.rollback()
            return None

    @staticmethod
    async def get_user_notification_preferences(
        db: AsyncSession,
        user_id: uuid.UUID
    ) -> Dict[str, Any]:
        """Get user's notification preferences."""
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()

        if not user:
            return {}

        return user.notification_preferences or {
            "email_enabled": True,
            "application_status_updates": True,
            "interview_reminders": True,
            "weekly_digest": False,
            "job_recommendations": True,
            "profile_views": True,
            "notification_frequency": NotificationFrequency.IMMEDIATE.value
        }

    @staticmethod
    def should_send_notification(
        preferences: Dict[str, Any],
        notification_type: str
    ) -> bool:
        """Check if notification should be sent based on preferences."""
        if not preferences.get("email_enabled", True):
            return False

        if notification_type == "application_status":
            return preferences.get("application_status_updates", True)
        elif notification_type == "interview_reminder":
            return preferences.get("interview_reminders", True)
        elif notification_type == "weekly_digest":
            return preferences.get("weekly_digest", False)
        elif notification_type == "job_recommendations":
            return preferences.get("job_recommendations", True)
        elif notification_type == "profile_views":
            return preferences.get("profile_views", True)

        return False

    @staticmethod
    async def notify_application_status_change(
        db: AsyncSession,
        application: Application,
        old_status: Optional[str],
        new_status: str,
        notes: Optional[str] = None
    ):
        """Send notification when application status changes."""
        try:
            # Get user with notification preferences
            result = await db.execute(
                select(User).where(User.id == application.user_id)
            )
            user = result.scalar_one_or_none()

            if not user:
                logger.warning(
                    LogCategory.API,
                    f"User not found for application {application.id}"
                )
                return

            # Check if user is unsubscribed
            if user.email_unsubscribed:
                logger.info(
                    LogCategory.API,
                    f"User {user.id} is unsubscribed, skipping notification"
                )
                return

            # Get notification preferences
            preferences = user.notification_preferences or {}

            # Check if notification should be sent
            if not NotificationService.should_send_notification(
                preferences,
                "application_status"
            ):
                logger.info(
                    LogCategory.API,
                    f"Application status notifications disabled for user {user.id}"
                )
                return

            # Get JD info
            jd_result = await db.execute(
                select(JD).where(JD.id == application.jd_id)
            )
            jd = jd_result.scalar_one_or_none()

            company_name = jd.company_name if jd else "Company"
            position = jd.position if jd else None

            # Status messages
            status_messages = {
                "pending": {
                    "text": "Application Created",
                    "message": "Your application has been created and is pending review.",
                    "next_steps": [
                        "Review your resume and ensure it's tailored to the position",
                        "Consider using our AI optimization feature",
                        "Prepare for the application process"
                    ]
                },
                "optimized": {
                    "text": "Resume Optimized",
                    "message": "Your resume has been optimized for this position.",
                    "next_steps": [
                        "Review the optimized resume",
                        "Make any additional edits if needed",
                        "Submit your application when ready"
                    ]
                },
                "applied": {
                    "text": "Application Submitted",
                    "message": "Your application has been successfully submitted!",
                    "next_steps": [
                        "Keep an eye on your email for updates",
                        "Prepare for potential interviews",
                        "Continue searching for other opportunities"
                    ]
                },
                "interview": {
                    "text": "Interview Scheduled",
                    "message": "Congratulations! Your application has moved to the interview stage.",
                    "next_steps": [
                        "Review the interview preparation materials",
                        "Research the company and position",
                        "Practice common interview questions"
                    ]
                },
                "offer": {
                    "text": "Offer Received",
                    "message": "Congratulations! You have received an offer!",
                    "next_steps": [
                        "Review the offer details carefully",
                        "Consider negotiating if appropriate",
                        "Respond to the offer within the given timeframe"
                    ]
                },
                "rejected": {
                    "text": "Application Not Selected",
                    "message": "Your application was not selected for this position.",
                    "next_steps": [
                        "Don't get discouraged - this is normal",
                        "Ask for feedback if possible",
                        "Continue applying to other positions"
                    ]
                }
            }

            status_info = status_messages.get(new_status, {
                "text": new_status.title(),
                "message": notes or "Your application status has been updated.",
                "next_steps": []
            })

            # Send email
            success = await email_service.send_application_status_update(
                to_email=user.email,
                user_name=user.full_name or "there",
                company_name=company_name,
                status=new_status,
                status_text=status_info["text"],
                message=status_info["message"],
                application_id=str(application.id)
            )

            if success:
                logger.info(
                    LogCategory.API,
                    f"Application status notification sent for application {application.id}"
                )
            else:
                logger.error(
                    LogCategory.API,
                    f"Failed to send application status notification for {application.id}"
                )

            # Create in-app notification
            await NotificationService.create_in_app_notification(
                db=db,
                user_id=application.user_id,
                notification_type=NotificationType.SUCCESS if new_status in ["applied", "interview", "offer"] else NotificationType.INFO if new_status in ["pending", "optimized"] else NotificationType.WARNING,
                title=f"{company_name}: {status_info['text']}",
                message=status_info["message"],
                action_url=f"/dashboard?application={application.id}",
                metadata={
                    "application_id": str(application.id),
                    "status": new_status,
                    "company": company_name,
                    "position": position
                }
            )

        except Exception as e:
            logger.error(
                LogCategory.API,
                f"Error in notify_application_status_change: {e}"
            )

    @staticmethod
    async def notify_interview_scheduled(
        db: AsyncSession,
        application: Application,
        interview_date: str,
        interview_time: str,
        interview_location: Optional[str] = None,
        interview_type: Optional[str] = None
    ):
        """Send interview reminder notification."""
        try:
            # Get user with notification preferences
            result = await db.execute(
                select(User).where(User.id == application.user_id)
            )
            user = result.scalar_one_or_none()

            if not user or user.email_unsubscribed:
                return

            # Get notification preferences
            preferences = user.notification_preferences or {}

            # Check if notification should be sent
            if not NotificationService.should_send_notification(
                preferences,
                "interview_reminder"
            ):
                return

            # Get JD info
            jd_result = await db.execute(
                select(JD).where(JD.id == application.jd_id)
            )
            jd = jd_result.scalar_one_or_none()

            company_name = jd.company_name if jd else "Company"
            position = jd.position if jd else "Position"

            # Send email
            success = await email_service.send_interview_reminder(
                to_email=user.email,
                user_name=user.full_name or "there",
                company_name=company_name,
                position=position,
                interview_date=interview_date,
                interview_time=interview_time,
                interview_location=interview_location,
                interview_type=interview_type,
                application_id=str(application.id)
            )

            if success:
                logger.info(
                    LogCategory.API,
                    f"Interview reminder notification sent for application {application.id}"
                )

            # Create in-app notification
            await NotificationService.create_in_app_notification(
                db=db,
                user_id=application.user_id,
                notification_type=NotificationType.WARNING,
                title=f"Interview Reminder: {company_name}",
                message=f"You have an interview scheduled for {position} on {interview_date} at {interview_time}",
                action_url=f"/dashboard?application={application.id}",
                metadata={
                    "application_id": str(application.id),
                    "company": company_name,
                    "position": position,
                    "interview_date": interview_date,
                    "interview_time": interview_time
                }
            )

        except Exception as e:
            logger.error(
                LogCategory.API,
                f"Error in notify_interview_scheduled: {e}"
            )

    @staticmethod
    async def send_weekly_digest(
        db: AsyncSession,
        user_id: uuid.UUID,
        week_start: str,
        week_end: str
    ):
        """Send weekly digest email."""
        try:
            # Get user with notification preferences
            result = await db.execute(
                select(User).where(User.id == user_id)
            )
            user = result.scalar_one_or_none()

            if not user or user.email_unsubscribed:
                return

            # Get notification preferences
            preferences = user.notification_preferences or {}

            # Check if weekly digest is enabled
            if not NotificationService.should_send_notification(
                preferences,
                "weekly_digest"
            ):
                return

            # Calculate actual weekly statistics from database
            from sqlalchemy import func, and_
            from app.models.application import Application
            from app.models.jd import JD
            from datetime import timedelta

            # Get applications submitted this week
            applications_result = await db.execute(
                select(func.count(Application.id))
                .where(
                    and_(
                        Application.user_id == user_id,
                        Application.created_at >= week_start_dt,
                        Application.created_at < week_end_dt
                    )
                )
            )
            applications_submitted = applications_result.scalar() or 0

            # Get interviews scheduled (status = 'interview')
            interviews_result = await db.execute(
                select(func.count(Application.id))
                .where(
                    and_(
                        Application.user_id == user_id,
                        Application.status == 'interview',
                        Application.updated_at >= week_start_dt
                    )
                )
            )
            interviews_scheduled = interviews_result.scalar() or 0

            # Get top new matches (applications with high match scores)
            matches_result = await db.execute(
                select(Application)
                .where(
                    and_(
                        Application.user_id == user_id,
                        Application.match_score.isnot(None),
                        Application.match_score >= 70,
                        Application.created_at >= week_start_dt
                    )
                )
                .order_by(Application.match_score.desc())
                .limit(5)
            )
            new_matches = [
                {
                    "company": match.jd.company_name if match.jd else "Unknown",
                    "position": match.jd.position if match.jd else "Unknown",
                    "match_score": match.match_score
                }
                for match in matches_result.scalars().all()
            ]

            # Get upcoming interviews (next 7 days)
            upcoming_interviews_result = await db.execute(
                select(Application)
                .where(
                    and_(
                        Application.user_id == user_id,
                        Application.status == 'interview',
                        Application.updated_at >= datetime.utcnow()
                    )
                )
                .order_by(Application.updated_at)
                .limit(3)
            )
            upcoming_interviews = [
                {
                    "company": interview.jd.company_name if interview.jd else "Unknown",
                    "position": interview.jd.position if interview.jd else "Unknown",
                    "date": (interview.updated_at + timedelta(days=7)).strftime("%Y-%m-%d")
                }
                for interview in upcoming_interviews_result.scalars().all()
            ]

            profile_views = 0  # Would need profile view tracking

            # Send email
            success = await email_service.send_weekly_digest(
                to_email=user.email,
                user_name=user.full_name or "there",
                week_start=week_start,
                week_end=week_end,
                applications_submitted=applications_submitted,
                interviews_scheduled=interviews_scheduled,
                profile_views=profile_views,
                new_matches=new_matches,
                upcoming_interviews=upcoming_interviews
            )

            if success:
                logger.info(
                    LogCategory.API,
                    f"Weekly digest sent for user {user_id}"
                )

        except Exception as e:
            logger.error(
                LogCategory.API,
                f"Error in send_weekly_digest: {e}"
            )


# Singleton instance
notification_service = NotificationService()
