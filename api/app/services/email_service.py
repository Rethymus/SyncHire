"""
Email Notification Service

Handles sending emails using SMTP with template support and queue management.
"""

from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, Dict, Any, List
from pathlib import Path
from jinja2 import Environment, FileSystemLoader, TemplateNotFound
import json
import inspect
import aiosmtplib
import redis.asyncio as redis
from app.core.config import get_settings
from app.core.logger import logger, LogCategory
from app.core.clock import utcnow

settings = get_settings()

TEMPLATES_DIR = Path(__file__).resolve().parents[1] / "templates" / "email"

# Context values (names, messages) are user-influenced, so autoescape must
# stay on to keep them out of raw HTML. All templates are rendered through
# this shared environment; none are ever built from raw strings.
env = Environment(loader=FileSystemLoader(TEMPLATES_DIR), autoescape=True)


class EmailTemplate:
    """Base class for email templates."""

    # Fallback template (in TEMPLATES_DIR) used when the template file for
    # this email does not exist. Subclasses override this.
    default_template_name = "default_base.html"

    def __init__(self, template_name: str):
        self.template_name = template_name
        self.template = self._load_template()

    def _load_template(self):
        """Load template from file or use default."""
        try:
            return env.get_template(f"{self.template_name}.html")
        except TemplateNotFound:
            logger.warning(
                LogCategory.API,
                f"Template file not found: {TEMPLATES_DIR / (self.template_name + '.html')}, using default",
            )
            return env.get_template(self.default_template_name)

    def render(self, context: Dict[str, Any]) -> str:
        """Render template with context."""
        return self.template.render(**context)


class ApplicationStatusTemplate(EmailTemplate):
    """Template for application status change notifications."""

    default_template_name = "default_application_status.html"

    def __init__(self):
        super().__init__("application_status")


class InterviewReminderTemplate(EmailTemplate):
    """Template for interview reminder notifications."""

    default_template_name = "default_interview_reminder.html"

    def __init__(self):
        super().__init__("interview_reminder")


class PasswordResetTemplate(EmailTemplate):
    """Template for password reset emails."""

    default_template_name = "default_password_reset.html"

    def __init__(self):
        super().__init__("password_reset")


class WeeklyDigestTemplate(EmailTemplate):
    """Template for weekly digest notifications."""

    default_template_name = "default_weekly_digest.html"

    def __init__(self):
        super().__init__("weekly_digest")


class EmailService:
    """Service for sending emails via SMTP."""

    def __init__(self):
        self.smtp_host = getattr(settings, "SMTP_HOST", "smtp.gmail.com")
        self.smtp_port = getattr(settings, "SMTP_PORT", 587)
        self.smtp_username = getattr(settings, "SMTP_USERNAME", "")
        self.smtp_password = getattr(settings, "SMTP_PASSWORD", "")
        self.smtp_use_tls = getattr(settings, "SMTP_USE_TLS", True)
        self.from_email = getattr(settings, "FROM_EMAIL", "noreply@synchire.com")
        self.from_name = getattr(settings, "FROM_NAME", "SyncHire")

        # Redis connection for queue
        self.redis_client: Optional[redis.Redis] = None

        # Template registry
        self.templates = {
            "application_status": ApplicationStatusTemplate(),
            "interview_reminder": InterviewReminderTemplate(),
            "weekly_digest": WeeklyDigestTemplate(),
            "password_reset": PasswordResetTemplate(),
        }

    async def initialize_redis(self):
        """Initialize Redis connection for email queue."""
        try:
            self.redis_client = await redis.from_url(
                settings.REDIS_URL, encoding="utf-8", decode_responses=True
            )
            logger.info(LogCategory.API, "Email service Redis connection established")
        except Exception as e:
            logger.error(
                LogCategory.API, f"Failed to connect to Redis for email queue: {e}"
            )

    async def close_redis(self):
        """Close Redis connection."""
        if self.redis_client:
            close = getattr(self.redis_client, "aclose", self.redis_client.close)
            result = close()
            if inspect.isawaitable(result):
                await result
            logger.info(LogCategory.API, "Email service Redis connection closed")

    def _render_template(self, template_name: str, context: Dict[str, Any]) -> str:
        """Render email template with context."""
        template = self.templates.get(template_name)
        if not template:
            logger.error(LogCategory.API, f"Template not found: {template_name}")
            return ""

        # Add base context
        base_context = {
            "settings_url": "https://synchire.com/settings/notifications",
            "unsubscribe_url": "https://synchire.com/unsubscribe",
        }
        context.update(base_context)

        return template.render(context)

    def _create_message(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        plain_text: Optional[str] = None,
    ) -> MIMEMultipart:
        """Create email message."""
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{self.from_name} <{self.from_email}>"
        msg["To"] = to_email

        # Add plain text version
        if plain_text:
            msg.attach(MIMEText(plain_text, "plain"))

        # Add HTML version
        msg.attach(MIMEText(html_content, "html"))

        return msg

    async def _send_async(self, to_email: str, message: MIMEMultipart) -> bool:
        """Send email asynchronously via SMTP."""
        try:
            async with aiosmtplib.SMTP(
                hostname=self.smtp_host, port=self.smtp_port, use_tls=self.smtp_use_tls
            ) as server:
                if self.smtp_username and self.smtp_password:
                    await server.login(self.smtp_username, self.smtp_password)

                await server.send_message(message)

            logger.info(LogCategory.API, f"Email sent successfully to {to_email}")
            return True

        except Exception as e:
            logger.error(LogCategory.API, f"Failed to send email to {to_email}: {e}")
            return False

    async def send_email(
        self,
        to_email: str,
        subject: str,
        template_name: str,
        context: Dict[str, Any],
        plain_text: Optional[str] = None,
        queue: bool = True,
    ) -> bool:
        """Send email using template."""
        try:
            # Render template
            html_content = self._render_template(template_name, context)
            if not html_content:
                return False

            # Create message
            message = self._create_message(to_email, subject, html_content, plain_text)

            if queue and self.redis_client:
                # Add to queue for async processing
                await self._queue_email(to_email, subject, html_content, plain_text)
                logger.info(LogCategory.API, f"Email queued for {to_email}")
                return True
            else:
                # Send immediately
                return await self._send_async(to_email, message)

        except Exception as e:
            logger.error(LogCategory.API, f"Error in send_email: {e}")
            return False

    async def _queue_email(
        self, to_email: str, subject: str, html_content: str, plain_text: Optional[str]
    ):
        """Queue email for async processing."""
        if not self.redis_client:
            return

        email_data = {
            "to": to_email,
            "subject": subject,
            "html": html_content,
            "plain_text": plain_text or "",
            "queued_at": utcnow().isoformat(),
        }

        await self.redis_client.lpush("email_queue", json.dumps(email_data))

    async def process_queue(self, batch_size: int = 10) -> int:
        """Process queued emails."""
        if not self.redis_client:
            return 0

        processed = 0

        for _ in range(batch_size):
            # Get email from queue
            email_data = await self.redis_client.rpop("email_queue")
            if not email_data:
                break

            try:
                data = json.loads(email_data)
                message = self._create_message(
                    data["to"], data["subject"], data["html"], data.get("plain_text")
                )

                success = await self._send_async(data["to"], message)

                if success:
                    processed += 1
                else:
                    # Re-queue failed emails
                    await self.redis_client.lpush("email_queue", email_data)

            except Exception as e:
                logger.error(LogCategory.API, f"Error processing queued email: {e}")
                # Re-queue on error
                await self.redis_client.lpush("email_queue", email_data)

        return processed

    async def send_application_status_update(
        self,
        to_email: str,
        user_name: str,
        company_name: str,
        status: str,
        status_text: str,
        message: Optional[str] = None,
        application_id: Optional[str] = None,
    ) -> bool:
        """Send application status update email."""
        context = {
            "user_name": user_name,
            "company_name": company_name,
            "status": status,
            "status_text": status_text,
            "message": message,
            "application_url": (
                f"https://synchire.com/applications/{application_id}"
                if application_id
                else "https://synchire.com/applications"
            ),
        }

        return await self.send_email(
            to_email=to_email,
            subject=f"Application Status Update - {company_name}",
            template_name="application_status",
            context=context,
        )

    async def send_interview_reminder(
        self,
        to_email: str,
        user_name: str,
        company_name: str,
        position: str,
        interview_date: str,
        interview_time: str,
        interview_location: Optional[str] = None,
        interview_type: Optional[str] = None,
        application_id: Optional[str] = None,
    ) -> bool:
        """Send interview reminder email."""
        context = {
            "user_name": user_name,
            "company_name": company_name,
            "position": position,
            "interview_date": interview_date,
            "interview_time": interview_time,
            "interview_location": interview_location,
            "interview_type": interview_type,
            "application_url": (
                f"https://synchire.com/applications/{application_id}"
                if application_id
                else "https://synchire.com/applications"
            ),
        }

        return await self.send_email(
            to_email=to_email,
            subject=f"Interview Reminder - {company_name}",
            template_name="interview_reminder",
            context=context,
        )

    async def send_weekly_digest(
        self,
        to_email: str,
        user_name: str,
        week_start: str,
        week_end: str,
        applications_submitted: int,
        interviews_scheduled: int,
        profile_views: int,
        new_matches: Optional[List[Dict[str, Any]]] = None,
        upcoming_interviews: Optional[List[Dict[str, Any]]] = None,
    ) -> bool:
        """Send weekly digest email."""
        context = {
            "user_name": user_name,
            "week_start": week_start,
            "week_end": week_end,
            "applications_submitted": applications_submitted,
            "interviews_scheduled": interviews_scheduled,
            "profile_views": profile_views,
            "new_matches": new_matches or [],
            "upcoming_interviews": upcoming_interviews or [],
            "dashboard_url": "https://synchire.com/dashboard",
        }

        return await self.send_email(
            to_email=to_email,
            subject="Your Weekly Job Search Digest",
            template_name="weekly_digest",
            context=context,
        )


# Singleton instance
email_service = EmailService()
