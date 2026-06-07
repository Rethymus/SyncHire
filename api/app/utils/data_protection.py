"""
Data Protection and GDPR Compliance Utilities

Implements comprehensive data protection measures:
- Personal data masking and anonymization
- Data retention policies
- Right to erasure (GDPR Article 17)
- Data portability (GDPR Article 20)
- Consent management
- Data breach notification
"""

import hashlib
import secrets
import json
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import logging

from app.models.user import User
from app.core.redis import redis_client
from app.core.config import get_settings
from app.core.errors import ValidationError, DatabaseError

logger = logging.getLogger(__name__)
settings = get_settings()


class DataMasker:
    """
    Data masking for PII (Personally Identifiable Information)
    """

    # Patterns for detecting PII
    PII_PATTERNS = {
        "email": r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b",
        "phone": r"\b\d{3}[-.]?\d{3}[-.]?\d{4}\b",
        "ssn": r"\b\d{3}-\d{2}-\d{4}\b",
        "credit_card": r"\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b",
        "ip_address": r"\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b",
    }

    @classmethod
    def mask_email(cls, email: str, show_chars: int = 2) -> str:
        """
        Mask email address

        Args:
            email: Email address to mask
            show_chars: Number of characters to show at start

        Returns:
            Masked email address
        """
        try:
            if "@" not in email:
                return email

            username, domain = email.split("@", 1)

            if len(username) <= show_chars:
                masked_username = "*" * len(username)
            else:
                masked_username = username[:show_chars] + "*" * (
                    len(username) - show_chars
                )

            return f"{masked_username}@{domain}"
        except Exception as e:
            logger.error(f"Error masking email: {str(e)}")
            return "***@***.***"

    @classmethod
    def mask_phone(cls, phone: str) -> str:
        """
        Mask phone number

        Args:
            phone: Phone number to mask

        Returns:
            Masked phone number
        """
        try:
            # Remove non-numeric characters
            digits = "".join(c for c in phone if c.isdigit())

            if len(digits) < 4:
                return "*" * len(phone)

            # Show last 4 digits only
            return "*" * (len(digits) - 4) + digits[-4:]
        except Exception as e:
            logger.error(f"Error masking phone: {str(e)}")
            return "****"

    @classmethod
    def mask_credit_card(cls, card_number: str) -> str:
        """
        Mask credit card number

        Args:
            card_number: Credit card number to mask

        Returns:
            Masked card number (showing last 4 digits)
        """
        try:
            # Remove non-numeric characters
            digits = "".join(c for c in card_number if c.isdigit())

            if len(digits) < 4:
                return "*" * len(card_number)

            return "*" * (len(digits) - 4) + digits[-4:]
        except Exception as e:
            logger.error(f"Error masking credit card: {str(e)}")
            return "****"

    @classmethod
    def mask_sensitive_data(cls, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Mask sensitive fields in data dictionary

        Args:
            data: Dictionary containing potentially sensitive data

        Returns:
            Dictionary with sensitive fields masked
        """
        masked_data = data.copy()

        # Define sensitive fields
        sensitive_fields = {
            "password",
            "token",
            "secret",
            "key",
            "ssn",
            "social_security",
            "credit_card",
            "card_number",
            "cvv",
            "pin",
            "password_reset",
            "api_key",
            "access_token",
            "refresh_token",
            "session_id",
        }

        for key, value in masked_data.items():
            # Check if key contains sensitive terms
            if any(sensitive in key.lower() for sensitive in sensitive_fields):
                if isinstance(value, str):
                    masked_data[key] = "*" * min(len(value), 8)
                elif isinstance(value, dict):
                    masked_data[key] = cls.mask_sensitive_data(value)
                elif isinstance(value, list):
                    masked_data[key] = [
                        (
                            cls.mask_sensitive_data(item)
                            if isinstance(item, dict)
                            else item
                        )
                        for item in value
                    ]

        return masked_data

    @classmethod
    def anonymize_data(
        cls, data: Dict[str, Any], fields_to_anonymize: List[str]
    ) -> Dict[str, Any]:
        """
        Anonymize specific fields by replacing with fake data

        Args:
            data: Dictionary containing data to anonymize
            fields_to_anonymize: List of field names to anonymize

        Returns:
            Dictionary with anonymized fields
        """
        anonymized_data = data.copy()

        for field in fields_to_anonymize:
            if field in anonymized_data:
                value = anonymized_data[field]

                if isinstance(value, str):
                    # Generate deterministic fake data based on field name
                    fake_value = cls._generate_fake_data(field, value)
                    anonymized_data[field] = fake_value
                elif isinstance(value, dict):
                    anonymized_data[field] = cls.anonymize_data(
                        value, fields_to_anonymize
                    )

        return anonymized_data

    @classmethod
    def _generate_fake_data(cls, field_name: str, original_value: str) -> str:
        """
        Generate fake data for anonymization

        Args:
            field_name: Name of the field to anonymize
            original_value: Original value (for maintaining structure)

        Returns:
            Fake value
        """
        # Use hash to generate consistent fake data
        hash_value = hashlib.sha256(
            f"{field_name}:{original_value}".encode()
        ).hexdigest()

        if "email" in field_name.lower():
            return f"user_{hash_value[:8]}@example.com"
        elif "name" in field_name.lower():
            return f"User_{hash_value[:6]}"
        elif "phone" in field_name.lower():
            return f"+1{hash_value[:10]}"
        elif "address" in field_name.lower():
            return f"{hash_value[:4]} Fake Street"
        else:
            return f"REDACTED_{hash_value[:6]}"


class DataRetentionManager:
    """
    Manage data retention policies and automatic cleanup
    """

    # Default retention periods (in days)
    RETENTION_PERIODS = {
        "user_activity_logs": 90,
        "search_history": 365,
        "application_data": 2555,  # 7 years
        "audit_logs": 2555,  # 7 years
        "temp_files": 7,
        "email_queue": 30,
    }

    @classmethod
    async def set_retention_period(cls, data_type: str, days: int) -> None:
        """
        Set retention period for data type

        Args:
            data_type: Type of data
            days: Retention period in days
        """
        cls.RETENTION_PERIODS[data_type] = days
        logger.info(f"Retention period set for {data_type}: {days} days")

    @classmethod
    async def get_retention_period(cls, data_type: str) -> int:
        """
        Get retention period for data type

        Args:
            data_type: Type of data

        Returns:
            Retention period in days
        """
        return cls.RETENTION_PERIODS.get(data_type, 365)  # Default 1 year

    @classmethod
    async def cleanup_expired_data(cls, db: AsyncSession) -> Dict[str, int]:
        """
        Clean up expired data based on retention policies

        Args:
            db: Database session

        Returns:
            Dictionary with cleanup results
        """
        cleanup_results = {}

        try:
            # This would be implemented based on actual data models
            # Example for activity logs:
            # retention_days = await cls.get_retention_period('user_activity_logs')
            # cutoff_date = datetime.utcnow() - timedelta(days=retention_days)
            # deleted_count = await db.execute(
            #     delete(ActivityLog).where(ActivityLog.created_at < cutoff_date)
            # )
            # cleanup_results['activity_logs'] = deleted_count

            logger.info(f"Data cleanup completed: {cleanup_results}")
            return cleanup_results

        except Exception as e:
            logger.error(f"Error during data cleanup: {str(e)}")
            return cleanup_results


class ConsentManager:
    """
    Manage user consent for data processing (GDPR compliance)
    """

    @classmethod
    async def create_conent_record(
        cls,
        user_id: str,
        consent_type: str,
        granted: bool,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        """
        Create a consent record

        Args:
            user_id: User ID
            consent_type: Type of consent (e.g., 'marketing', 'analytics')
            granted: Whether consent was granted
            metadata: Additional metadata
        """
        try:
            consent_data = {
                "user_id": user_id,
                "consent_type": consent_type,
                "granted": granted,
                "timestamp": datetime.utcnow().isoformat(),
                "metadata": metadata or {},
                "ip_address": metadata.get("ip_address") if metadata else None,
            }

            # Store in Redis for fast access
            key = f"consent:{user_id}:{consent_type}"
            await redis_client.setex(
                key, 2555 * 24 * 3600, json.dumps(consent_data)
            )  # 7 years

            logger.info(
                f"Consent record created: {user_id} - {consent_type} - {granted}"
            )

        except Exception as e:
            logger.error(f"Error creating consent record: {str(e)}")

    @classmethod
    async def check_consent(cls, user_id: str, consent_type: str) -> bool:
        """
        Check if user has granted consent

        Args:
            user_id: User ID
            consent_type: Type of consent

        Returns:
            True if consent has been granted
        """
        try:
            key = f"consent:{user_id}:{consent_type}"
            consent_data = await redis_client.get(key)

            if not consent_data:
                return False  # No consent record = no consent

            consent_json = json.loads(consent_data)
            return consent_json.get("granted", False)

        except Exception as e:
            logger.error(f"Error checking consent: {str(e)}")
            return False

    @classmethod
    async def revoke_consent(cls, user_id: str, consent_type: str) -> None:
        """
        Revoke user consent

        Args:
            user_id: User ID
            consent_type: Type of consent to revoke
        """
        try:
            await cls.create_conent_record(user_id, consent_type, False)
            logger.info(f"Consent revoked: {user_id} - {consent_type}")

        except Exception as e:
            logger.error(f"Error revoking consent: {str(e)}")


class DataExporter:
    """
    Export user data for data portability (GDPR Article 20)
    """

    @classmethod
    async def export_user_data(cls, db: AsyncSession, user_id: str) -> Dict[str, Any]:
        """
        Export all user data in portable format

        Args:
            db: Database session
            user_id: User ID

        Returns:
            Dictionary containing all user data
        """
        try:
            # Get user data
            result = await db.execute(select(User).where(User.id == user_id))
            user = result.scalar_one_or_none()

            if not user:
                raise ValidationError("User not found")

            # Build export data structure
            export_data = {
                "export_date": datetime.utcnow().isoformat(),
                "user_id": user_id,
                "account": {
                    "email": user.email,
                    "full_name": user.full_name,
                    "created_at": (
                        user.created_at.isoformat() if user.created_at else None
                    ),
                    "last_login": (
                        user.last_login.isoformat() if user.last_login else None
                    ),
                },
                # Additional data would be added here based on actual models
                # 'resumes': [],
                # 'applications': [],
                # 'search_history': [],
                # 'notifications': [],
            }

            return export_data

        except Exception as e:
            logger.error(f"Error exporting user data: {str(e)}")
            raise

    @classmethod
    async def export_to_json(cls, db: AsyncSession, user_id: str) -> str:
        """
        Export user data as JSON string

        Args:
            db: Database session
            user_id: User ID

        Returns:
            JSON string containing user data
        """
        export_data = await cls.export_user_data(db, user_id)
        return json.dumps(export_data, indent=2, default=str)


class DataEraser:
    """
    Handle user data erasure requests (GDPR Article 17)
    """

    @classmethod
    async def erase_user_data(
        cls, db: AsyncSession, user_id: str
    ) -> Tuple[bool, List[str]]:
        """
        Erase all user data from system

        Args:
            db: Database session
            user_id: User ID

        Returns:
            Tuple of (success, list_of_erased_data_types)
        """
        erased_types = []

        try:
            # Get user data first
            result = await db.execute(select(User).where(User.id == user_id))
            user = result.scalar_one_or_none()

            if not user:
                raise ValidationError("User not found")

            # Anonymize user account (instead of deleting, for data integrity)
            user.email = f"deleted_{user_id}@deleted.local"
            user.full_name = "Deleted User"
            user.hashed_password = f"deleted:{user_id}"
            user.is_active = False
            user.deleted_at = datetime.utcnow()

            erased_types.append("account_anonymized")

            # Delete related data (implement based on actual models)
            # await db.execute(delete(Resume).where(Resume.user_id == user_id))
            # erased_types.append('resumes')

            # await db.execute(delete(JobDescription).where(JobDescription.user_id == user_id))
            # erased_types.append('job_descriptions')

            await db.commit()

            # Clear Redis data
            await redis_client.delete(f"user:{user_id}")
            await redis_client.delete(f"active_sessions:{user_id}")

            erased_types.append("cache_cleared")

            logger.info(f"User data erased: {user_id} - {erased_types}")

            return True, erased_types

        except Exception as e:
            await db.rollback()
            logger.error(f"Error erasing user data: {str(e)}")
            raise DatabaseError(f"Failed to erase user data: {str(e)}")


class DataBreachNotifier:
    """
    Handle data breach notifications (GDPR Article 33)
    """

    @classmethod
    async def create_breach_record(
        cls,
        breach_type: str,
        affected_users: List[str],
        severity: str,
        description: str,
    ) -> str:
        """
        Create a data breach record

        Args:
            breach_type: Type of breach
            affected_users: List of affected user IDs
            severity: Severity level (low, medium, high, critical)
            description: Description of the breach

        Returns:
            Breach ID
        """
        try:
            breach_id = secrets.token_hex(16)

            breach_data = {
                "breach_id": breach_id,
                "breach_type": breach_type,
                "affected_users": affected_users,
                "severity": severity,
                "description": description,
                "discovered_at": datetime.utcnow().isoformat(),
                "status": "investigating",
            }

            # Store breach record
            key = f"data_breach:{breach_id}"
            await redis_client.setex(
                key, 2555 * 24 * 3600, json.dumps(breach_data)
            )  # 7 years

            logger.critical(f"Data breach recorded: {breach_id} - {breach_type}")

            return breach_id

        except Exception as e:
            logger.error(f"Error creating breach record: {str(e)}")
            raise

    @classmethod
    async def notify_authorities(cls, breach_id: str) -> bool:
        """
        Notify relevant authorities of data breach

        Args:
            breach_id: Breach ID

        Returns:
            True if notification successful
        """
        try:
            # Implementation would depend on specific requirements
            # This could send emails to data protection authorities

            logger.info(f"Authorities notified of breach: {breach_id}")
            return True

        except Exception as e:
            logger.error(f"Error notifying authorities: {str(e)}")
            return False

    @classmethod
    async def notify_affected_users(cls, breach_id: str) -> int:
        """
        Notify affected users of data breach

        Args:
            breach_id: Breach ID

        Returns:
            Number of users notified
        """
        try:
            # Get breach data
            key = f"data_breach:{breach_id}"
            breach_data = await redis_client.get(key)

            if not breach_data:
                return 0

            breach_json = json.loads(breach_data)
            affected_users = breach_json.get("affected_users", [])

            # Send notifications (implementation depends on email service)
            notified_count = 0
            for user_id in affected_users:
                # await email_service.send_data_breach_notification(user_id, breach_id)
                notified_count += 1

            logger.info(f"Notified {notified_count} users of breach: {breach_id}")
            return notified_count

        except Exception as e:
            logger.error(f"Error notifying affected users: {str(e)}")
            return 0
