"""
Enhanced Security Module for SyncHire Platform

Implements comprehensive security measures including:
- Password strength validation and policies
- Account lockout mechanisms
- Secure session management
- CSRF protection
- Data encryption at rest
- Security audit logging
"""

import re
import hashlib
import secrets
import time
import json
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Tuple
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2
import base64

from app.core.config import get_settings
from app.core.redis import redis_client
import logging

logger = logging.getLogger(__name__)
settings = get_settings()


class PasswordPolicy:
    """
    Comprehensive password policy enforcement
    """

    # Password requirements
    MIN_LENGTH = 12
    MAX_LENGTH = 128
    REQUIRE_UPPERCASE = True
    REQUIRE_LOWERCASE = True
    REQUIRE_DIGITS = True
    REQUIRE_SPECIAL = True
    FORBIDDEN_COMMON_PATTERNS = [
        "password",
        "123456",
        "qwerty",
        "admin",
        "letmein",
        "welcome",
        "monkey",
        "dragon",
        "master",
        "hello",
    ]
    FORBIDDEN_SEQUENCES = ["123456", "abcdef", "qwerty", "password"]

    # Special characters that are required
    SPECIAL_CHARS = "!@#$%^&*()_+-=[]{}|;:,.<>?"

    @classmethod
    def validate_password(
        cls, password: str, user_email: str = ""
    ) -> Tuple[bool, list[str]]:
        """
        Validate password against security policy

        Args:
            password: The password to validate
            user_email: User's email (to prevent password-email similarity)

        Returns:
            Tuple of (is_valid, list_of_errors)
        """
        errors = []

        # Check length
        if len(password) < cls.MIN_LENGTH:
            errors.append(f"Password must be at least {cls.MIN_LENGTH} characters long")
        if len(password) > cls.MAX_LENGTH:
            errors.append(f"Password must not exceed {cls.MAX_LENGTH} characters")

        # Check character requirements
        if cls.REQUIRE_UPPERCASE and not re.search(r"[A-Z]", password):
            errors.append("Password must contain at least one uppercase letter")

        if cls.REQUIRE_LOWERCASE and not re.search(r"[a-z]", password):
            errors.append("Password must contain at least one lowercase letter")

        if cls.REQUIRE_DIGITS and not re.search(r"\d", password):
            errors.append("Password must contain at least one digit")

        if cls.REQUIRE_SPECIAL and not re.search(
            rf"[{re.escape(cls.SPECIAL_CHARS)}]", password
        ):
            errors.append(
                f"Password must contain at least one special character ({cls.SPECIAL_CHARS})"
            )

        # Check for common patterns
        password_lower = password.lower()
        for pattern in cls.FORBIDDEN_COMMON_PATTERNS:
            if pattern in password_lower:
                errors.append(
                    f"Password cannot contain common patterns like '{pattern}'"
                )

        # Check for sequential characters
        for seq in cls.FORBIDDEN_SEQUENCES:
            if seq in password_lower:
                errors.append(
                    f"Password cannot contain sequential characters like '{seq}'"
                )

        # Check for email similarity
        if user_email:
            email_parts = user_email.split("@")[0].lower()
            if email_parts and len(email_parts) > 3 and email_parts in password_lower:
                errors.append("Password cannot contain parts of your email address")

        # Check for repeated characters
        if re.search(r"(.)\1{2,}", password):
            errors.append("Password cannot contain repeated characters")

        is_valid = len(errors) == 0
        return is_valid, errors

    @classmethod
    def get_password_strength(cls, password: str) -> Dict[str, Any]:
        """
        Calculate password strength score

        Returns:
            Dict with strength score (0-100) and feedback
        """
        score = 0

        # Length score (up to 40 points)
        length_score = min(len(password) * 2, 40)
        score += length_score

        # Character variety (up to 40 points)
        if re.search(r"[a-z]", password):
            score += 10
        if re.search(r"[A-Z]", password):
            score += 10
        if re.search(r"\d", password):
            score += 10
        if re.search(rf"[{re.escape(cls.SPECIAL_CHARS)}]", password):
            score += 10

        # Complexity bonus (up to 20 points)
        if len(password) >= 16:
            score += 5
        if re.search(r"[a-z].*[A-Z]|[A-Z].*[a-z]", password):
            score += 5
        if re.search(r"\d.*\D|\D.*\d", password):
            score += 5
        if len(set(password)) >= len(password) * 0.7:
            score += 5

        # Determine strength level
        if score < 40:
            level = "weak"
            feedback = "Password is too weak. Add more characters and variety."
        elif score < 60:
            level = "fair"
            feedback = "Password is fair but could be stronger."
        elif score < 80:
            level = "good"
            feedback = "Password is good but could be more complex."
        else:
            level = "strong"
            feedback = "Password is strong!"

        return {"score": min(score, 100), "level": level, "feedback": feedback}


class AccountLockout:
    """
    Account lockout mechanism to prevent brute force attacks
    """

    LOCKOUT_THRESHOLD = 5  # Failed attempts before lockout
    LOCKOUT_DURATION = 900  # 15 minutes in seconds
    ATTEMPT_WINDOW = 300  # 5 minutes in seconds

    @classmethod
    async def record_failed_attempt(cls, identifier: str) -> int:
        """
        Record a failed login attempt

        Args:
            identifier: User email or IP address

        Returns:
            Number of failed attempts
        """
        key = f"failed_attempts:{identifier}"
        attempts = await redis_client.incr(key)

        # Set expiry on first attempt
        if attempts == 1:
            await redis_client.expire(key, cls.ATTEMPT_WINDOW)

        # Check if should lock out
        if attempts >= cls.LOCKOUT_THRESHOLD:
            lockout_key = f"locked_out:{identifier}"
            await redis_client.setex(
                lockout_key,
                cls.LOCKOUT_DURATION,
                str(int(time.time()) + cls.LOCKOUT_DURATION),
            )
            logger.warning(
                f"Account locked out for {identifier} after {attempts} failed attempts"
            )

        return attempts

    @classmethod
    async def is_locked_out(cls, identifier: str) -> Tuple[bool, Optional[int]]:
        """
        Check if account is currently locked out

        Args:
            identifier: User email or IP address

        Returns:
            Tuple of (is_locked, seconds_until_unlock)
        """
        lockout_key = f"locked_out:{identifier}"
        locked_until = await redis_client.get(lockout_key)

        if not locked_until:
            return False, None

        locked_until_timestamp = int(locked_until)
        current_time = int(time.time())
        remaining = locked_until_timestamp - current_time

        if remaining > 0:
            return True, remaining
        else:
            # Lockout expired, clean up
            await redis_client.delete(lockout_key)
            return False, None

    @classmethod
    async def reset_attempts(cls, identifier: str) -> None:
        """
        Reset failed attempt counter (after successful login)

        Args:
            identifier: User email or IP address
        """
        key = f"failed_attempts:{identifier}"
        await redis_client.delete(key)

    @classmethod
    async def get_remaining_attempts(cls, identifier: str) -> int:
        """
        Get remaining attempts before lockout

        Args:
            identifier: User email or IP address

        Returns:
            Number of remaining attempts
        """
        key = f"failed_attempts:{identifier}"
        attempts = await redis_client.get(key)
        current_attempts = int(attempts) if attempts else 0
        return max(0, cls.LOCKOUT_THRESHOLD - current_attempts)


class DataEncryption:
    """
    Data encryption at rest using Fernet symmetric encryption
    """

    def __init__(self):
        self._cipher = None
        self._initialize_cipher()

    def _initialize_cipher(self):
        """Initialize the encryption cipher"""
        try:
            # Use a fixed key for encryption (in production, use proper key management)
            encryption_key = settings.JWT_SECRET.encode()[:32].ljust(32, b"0")
            # Generate Fernet key from encryption key
            kdf = PBKDF2(
                algorithm=hashes.SHA256(),
                length=32,
                salt=b"synchire_encryption_salt",  # In production, use proper salt
                iterations=100000,
            )
            key = base64.urlsafe_b64encode(kdf.derive(encryption_key))
            self._cipher = Fernet(key)
        except Exception as e:
            logger.error(f"Failed to initialize encryption cipher: {e}")
            raise

    def encrypt(self, data: str) -> str:
        """
        Encrypt sensitive data

        Args:
            data: Plain text data to encrypt

        Returns:
            Encrypted data (base64 encoded)
        """
        if not self._cipher:
            raise RuntimeError("Encryption cipher not initialized")

        try:
            encrypted = self._cipher.encrypt(data.encode())
            return base64.urlsafe_b64encode(encrypted).decode()
        except Exception as e:
            logger.error(f"Encryption failed: {e}")
            raise

    def decrypt(self, encrypted_data: str) -> str:
        """
        Decrypt sensitive data

        Args:
            encrypted_data: Encrypted data (base64 encoded)

        Returns:
            Decrypted plain text
        """
        if not self._cipher:
            raise RuntimeError("Encryption cipher not initialized")

        try:
            encrypted_bytes = base64.urlsafe_b64decode(encrypted_data.encode())
            decrypted = self._cipher.decrypt(encrypted_bytes)
            return decrypted.decode()
        except Exception as e:
            logger.error(f"Decryption failed: {e}")
            raise

    def hash_sensitive_data(self, data: str) -> str:
        """
        Hash sensitive data for comparison (e.g., PII)

        Args:
            data: Data to hash

        Returns:
            Hashed data
        """
        return hashlib.sha256(data.encode()).hexdigest()


class SecurityAuditor:
    """
    Security audit logging for compliance and monitoring
    """

    AUDIT_LOG_KEY = "security_audit"
    RETENTION_DAYS = 90

    @classmethod
    async def log_security_event(
        cls,
        event_type: str,
        user_id: Optional[str],
        details: Dict[str, Any],
        severity: str = "info",
    ) -> None:
        """
        Log security-related events

        Args:
            event_type: Type of security event
            user_id: User ID (if applicable)
            details: Event details
            severity: Event severity (debug, info, warning, error, critical)
        """
        try:
            timestamp = datetime.utcnow().isoformat()
            event = {
                "timestamp": timestamp,
                "event_type": event_type,
                "user_id": user_id,
                "severity": severity,
                "details": details,
                "ip": details.get("ip", "unknown"),
            }

            # Store in Redis list for temporary storage
            key = f"{cls.AUDIT_LOG_KEY}:{severity}"
            await redis_client.redis.rpush(key, str(event))

            # Set expiry for retention
            await redis_client.expire(key, cls.RETENTION_DAYS * 24 * 3600)

            # Also log to application logger for immediate monitoring
            log_func = getattr(logger, severity, logger.info)
            log_func(f"Security event: {event_type} - {details}")

        except Exception as e:
            logger.error(f"Failed to log security event: {e}")

    @classmethod
    async def get_recent_events(
        cls, severity: str = "info", limit: int = 100
    ) -> list[Dict[str, Any]]:
        """
        Get recent security events

        Args:
            severity: Event severity filter
            limit: Maximum number of events to return

        Returns:
            List of security events
        """
        try:
            key = f"{cls.AUDIT_LOG_KEY}:{severity}"
            events = await redis_client.redis.lrange(key, 0, limit - 1)

            return [
                json.loads(event) if isinstance(event, (str, bytes)) else event
                for event in events
            ]
        except Exception as e:
            logger.error(f"Failed to retrieve security events: {e}")
            return []


class CSRFProtection:
    """
    CSRF protection utilities
    """

    @staticmethod
    def generate_csrf_token() -> str:
        """
        Generate a secure CSRF token

        Returns:
            CSRF token
        """
        return secrets.token_urlsafe(32)

    @staticmethod
    async def validate_csrf_token(token: str, session_id: str) -> bool:
        """
        Validate CSRF token against session

        Args:
            token: CSRF token to validate
            session_id: User session ID

        Returns:
            True if token is valid
        """
        try:
            stored_token = await redis_client.get(f"csrf_token:{session_id}")
            return stored_token == token
        except Exception as e:
            logger.error(f"CSRF token validation failed: {e}")
            return False

    @staticmethod
    async def store_csrf_token(token: str, session_id: str, expiry: int = 3600) -> None:
        """
        Store CSRF token for session

        Args:
            token: CSRF token to store
            session_id: User session ID
            expiry: Token expiry in seconds (default 1 hour)
        """
        try:
            await redis_client.setex(f"csrf_token:{session_id}", expiry, token)
        except Exception as e:
            logger.error(f"Failed to store CSRF token: {e}")


class SessionManager:
    """
    Secure session management
    """

    SESSION_EXPIRY = 24 * 3600  # 24 hours
    MAX_SESSIONS_PER_USER = 5

    @classmethod
    async def create_session(cls, user_id: str, session_data: Dict[str, Any]) -> str:
        """
        Create a new user session

        Args:
            user_id: User ID
            session_data: Session data to store

        Returns:
            Session ID
        """
        try:
            session_id = secrets.token_urlsafe(32)
            session_key = f"session:{user_id}:{session_id}"

            # Store session data
            await redis_client.setex(session_key, cls.SESSION_EXPIRY, str(session_data))

            # Track active sessions
            active_sessions_key = f"active_sessions:{user_id}"
            await redis_client.redis.sadd(active_sessions_key, session_id)

            # Enforce max sessions limit
            active_sessions = await redis_client.redis.smembers(active_sessions_key)
            if len(active_sessions) > cls.MAX_SESSIONS_PER_USER:
                # Remove oldest session
                oldest_session = min(active_sessions)
                await cls.destroy_session(user_id, oldest_session)

            return session_id

        except Exception as e:
            logger.error(f"Failed to create session: {e}")
            raise

    @classmethod
    async def get_session(
        cls, user_id: str, session_id: str
    ) -> Optional[Dict[str, Any]]:
        """
        Get session data

        Args:
            user_id: User ID
            session_id: Session ID

        Returns:
            Session data or None if not found
        """
        try:
            session_key = f"session:{user_id}:{session_id}"
            session_data = await redis_client.get(session_key)

            if session_data:
                try:
                    return (
                        json.loads(session_data)
                        if isinstance(session_data, (str, bytes))
                        else session_data
                    )
                except (json.JSONDecodeError, TypeError):
                    return None
            return None

        except Exception as e:
            logger.error(f"Failed to get session: {e}")
            return None

    @classmethod
    async def destroy_session(cls, user_id: str, session_id: str) -> bool:
        """
        Destroy a user session

        Args:
            user_id: User ID
            session_id: Session ID

        Returns:
            True if session was destroyed
        """
        try:
            session_key = f"session:{user_id}:{session_id}"
            await redis_client.delete(session_key)

            # Remove from active sessions
            active_sessions_key = f"active_sessions:{user_id}"
            await redis_client.redis.srem(active_sessions_key, session_id)

            return True

        except Exception as e:
            logger.error(f"Failed to destroy session: {e}")
            return False

    @classmethod
    async def destroy_all_sessions(cls, user_id: str) -> int:
        """
        Destroy all sessions for a user

        Args:
            user_id: User ID

        Returns:
            Number of sessions destroyed
        """
        try:
            active_sessions_key = f"active_sessions:{user_id}"
            session_ids = await redis_client.redis.smembers(active_sessions_key)

            destroyed_count = 0
            for session_id in session_ids:
                if await cls.destroy_session(user_id, session_id):
                    destroyed_count += 1

            return destroyed_count

        except Exception as e:
            logger.error(f"Failed to destroy all sessions: {e}")
            return 0


# Initialize global instances
data_encryption = DataEncryption()
password_policy = PasswordPolicy()
account_lockout = AccountLockout()
security_auditor = SecurityAuditor()
csrf_protection = CSRFProtection()
session_manager = SessionManager()
