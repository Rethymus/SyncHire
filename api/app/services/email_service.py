"""
Email Notification Service

Handles sending emails using SMTP with template support and queue management.
"""

from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, Dict, Any, List
from datetime import datetime
from pathlib import Path
from jinja2 import Template
import json
import inspect
import aiosmtplib
import redis.asyncio as redis
from app.core.config import get_settings
from app.core.logger import logger, LogCategory

settings = get_settings()


class EmailTemplate:
    """Base class for email templates."""

    def __init__(self, template_name: str):
        self.template_name = template_name
        self.template = self._load_template()

    def _load_template(self) -> Template:
        """Load template from file or use default."""
        template_path = (
            Path(__file__).resolve().parents[1]
            / "templates"
            / "email"
            / f"{self.template_name}.html"
        )
        try:
            with template_path.open("r", encoding="utf-8") as f:
                return Template(f.read())
        except FileNotFoundError:
            logger.warning(
                LogCategory.API,
                f"Template file not found: {template_path}, using default",
            )
            return self.get_default_template()

    def get_default_template(self) -> Template:
        """Fallback template if file not found."""
        return Template("""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>{{ subject }}</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
                    .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
                    .button { display: inline-block; padding: 10px 20px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
                    .footer { text-align: center; margin-top: 20px; color: #777; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>{{ subject }}</h1>
                    </div>
                    <div class="content">
                        {{ content }}
                    </div>
                    <div class="footer">
                        <p>You received this email because you signed up for SyncHire.</p>
                        <p><a href="{{ unsubscribe_url }}">Unsubscribe</a> | <a href="{{ settings_url }}">Manage Notifications</a></p>
                    </div>
                </div>
            </body>
            </html>
            """)

    def render(self, context: Dict[str, Any]) -> str:
        """Render template with context."""
        return self.template.render(**context)


class ApplicationStatusTemplate(EmailTemplate):
    """Template for application status change notifications."""

    def __init__(self):
        super().__init__("application_status")

    def get_default_template(self) -> Template:
        return Template("""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Application Status Update</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
                    .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
                    .status-badge { display: inline-block; padding: 5px 15px; border-radius: 20px; font-weight: bold; margin: 10px 0; }
                    .status-pending { background: #ffc107; color: #333; }
                    .status-optimized { background: #17a2b8; color: white; }
                    .status-applied { background: #28a745; color: white; }
                    .status-interview { background: #007bff; color: white; }
                    .status-offer { background: #28a745; color: white; }
                    .status-rejected { background: #dc3545; color: white; }
                    .button { display: inline-block; padding: 10px 20px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
                    .footer { text-align: center; margin-top: 20px; color: #777; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Application Status Update</h1>
                    </div>
                    <div class="content">
                        <p>Hello {{ user_name }},</p>
                        <p>Your application for <strong>{{ company_name }}</strong> has been updated!</p>

                        <div style="text-align: center; margin: 20px 0;">
                            <span class="status-badge status-{{ status }}">{{ status_text }}</span>
                        </div>

                        {% if message %}
                        <p style="background: white; padding: 15px; border-left: 4px solid #667eea; margin: 15px 0;">
                            {{ message }}
                        </p>
                        {% endif %}

                        <p>
                            <a href="{{ application_url }}" class="button">View Application</a>
                        </p>

                        {% if next_steps %}
                        <h3>Next Steps:</h3>
                        <ul>
                            {% for step in next_steps %}
                            <li>{{ step }}</li>
                            {% endfor %}
                        </ul>
                        {% endif %}
                    </div>
                    <div class="footer">
                        <p>You received this email because you signed up for SyncHire.</p>
                        <p><a href="{{ unsubscribe_url }}">Unsubscribe</a> | <a href="{{ settings_url }}">Manage Notifications</a></p>
                    </div>
                </div>
            </body>
            </html>
            """)


class InterviewReminderTemplate(EmailTemplate):
    """Template for interview reminder notifications."""

    def __init__(self):
        super().__init__("interview_reminder")

    def get_default_template(self) -> Template:
        return Template("""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Interview Reminder</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
                    .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
                    .interview-details { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
                    .detail-row { display: flex; margin: 10px 0; }
                    .detail-label { font-weight: bold; width: 120px; }
                    .button { display: inline-block; padding: 10px 20px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
                    .footer { text-align: center; margin-top: 20px; color: #777; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Interview Reminder</h1>
                    </div>
                    <div class="content">
                        <p>Hello {{ user_name }},</p>
                        <p>This is a reminder that you have an upcoming interview!</p>

                        <div class="interview-details">
                            <div class="detail-row">
                                <span class="detail-label">Company:</span>
                                <span>{{ company_name }}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Position:</span>
                                <span>{{ position }}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Date:</span>
                                <span>{{ interview_date }}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Time:</span>
                                <span>{{ interview_time }}</span>
                            </div>
                            {% if interview_location %}
                            <div class="detail-row">
                                <span class="detail-label">Location:</span>
                                <span>{{ interview_location }}</span>
                            </div>
                            {% endif %}
                            {% if interview_type %}
                            <div class="detail-row">
                                <span class="detail-label">Type:</span>
                                <span>{{ interview_type }}</span>
                            </div>
                            {% endif %}
                        </div>

                        {% if preparation_tips %}
                        <h3>Preparation Tips:</h3>
                        <ul>
                            {% for tip in preparation_tips %}
                            <li>{{ tip }}</li>
                            {% endfor %}
                        </ul>
                        {% endif %}

                        <p>
                            <a href="{{ application_url }}" class="button">View Application Details</a>
                        </p>
                    </div>
                    <div class="footer">
                        <p>You received this email because you signed up for SyncHire.</p>
                        <p><a href="{{ unsubscribe_url }}">Unsubscribe</a> | <a href="{{ settings_url }}">Manage Notifications</a></p>
                    </div>
                </div>
            </body>
            </html>
            """)


class PasswordResetTemplate(EmailTemplate):
    """Template for password reset emails."""

    def __init__(self):
        super().__init__("password_reset")

    def get_default_template(self) -> Template:
        return Template("""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Reset Your Password</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
                    .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
                    .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 15px 0; }
                    .footer { text-align: center; margin-top: 20px; color: #777; font-size: 12px; }
                    .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 15px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Reset Your Password</h1>
                    </div>
                    <div class="content">
                        <p>Hello {{ user_name }},</p>
                        <p>We received a request to reset your password for your SyncHire account.</p>

                        <p style="text-align: center;">
                            <a href="{{ reset_url }}" class="button">Reset Password</a>
                        </p>

                        <p>Or copy and paste this link into your browser:</p>
                        <p style="word-break: break-all; color: #667eea;">{{ reset_url }}</p>

                        <div class="warning">
                            <p><strong>Important:</strong></p>
                            <ul>
                                <li>This link will expire in {{ expiry_hours }} hour(s)</li>
                                <li>If you didn't request this, please ignore this email</li>
                                <li>Your password won't change until you access the link above</li>
                            </ul>
                        </div>

                        <p>If you have any questions, feel free to contact our support team.</p>
                    </div>
                    <div class="footer">
                        <p>You received this email because you signed up for SyncHire.</p>
                        <p><a href="{{ unsubscribe_url }}">Unsubscribe</a> | <a href="{{ settings_url }}">Manage Notifications</a></p>
                    </div>
                </div>
            </body>
            </html>
            """)


class WeeklyDigestTemplate(EmailTemplate):
    """Template for weekly digest notifications."""

    def __init__(self):
        super().__init__("weekly_digest")

    def get_default_template(self) -> Template:
        return Template("""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Your Weekly Job Search Digest</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
                    .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
                    .stats { display: flex; justify-content: space-around; margin: 20px 0; }
                    .stat-box { text-align: center; padding: 15px; background: white; border-radius: 5px; flex: 1; margin: 0 5px; }
                    .stat-number { font-size: 24px; font-weight: bold; color: #667eea; }
                    .stat-label { font-size: 12px; color: #777; }
                    .job-item { background: white; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #667eea; }
                    .button { display: inline-block; padding: 10px 20px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
                    .footer { text-align: center; margin-top: 20px; color: #777; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Your Weekly Job Search Digest</h1>
                        <p>{{ week_start }} - {{ week_end }}</p>
                    </div>
                    <div class="content">
                        <p>Hello {{ user_name }},</p>
                        <p>Here's a summary of your job search activity this week:</p>

                        <div class="stats">
                            <div class="stat-box">
                                <div class="stat-number">{{ applications_submitted }}</div>
                                <div class="stat-label">Applications</div>
                            </div>
                            <div class="stat-box">
                                <div class="stat-number">{{ interviews_scheduled }}</div>
                                <div class="stat-label">Interviews</div>
                            </div>
                            <div class="stat-box">
                                <div class="stat-number">{{ profile_views }}</div>
                                <div class="stat-label">Profile Views</div>
                            </div>
                        </div>

                        {% if new_matches %}
                        <h3>New Job Matches</h3>
                        {% for job in new_matches %}
                        <div class="job-item">
                            <strong>{{ job.company }}</strong> - {{ job.position }}
                            <br><small>{{ job.match_score }}% match</small>
                        </div>
                        {% endfor %}
                        {% endif %}

                        {% if upcoming_interviews %}
                        <h3>Upcoming Interviews</h3>
                        {% for interview in upcoming_interviews %}
                        <div class="job-item">
                            <strong>{{ interview.company }}</strong> - {{ interview.position }}
                            <br><small>{{ interview.date }} at {{ interview.time }}</small>
                        </div>
                        {% endfor %}
                        {% endif %}

                        <p>
                            <a href="{{ dashboard_url }}" class="button">View Dashboard</a>
                        </p>
                    </div>
                    <div class="footer">
                        <p>You received this email because you signed up for SyncHire.</p>
                        <p><a href="{{ unsubscribe_url }}">Unsubscribe</a> | <a href="{{ settings_url }}">Manage Notifications</a></p>
                    </div>
                </div>
            </body>
            </html>
            """)


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
            "queued_at": datetime.utcnow().isoformat(),
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
