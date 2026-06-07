"""
Enhanced Authentication Service with Security Features

Implements secure authentication with:
- Password policy enforcement
- Account lockout mechanisms
- Secure session management
- Multi-factor authentication support
- Security event logging
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from datetime import datetime
import logging
import secrets

from app.models.user import User
from app.schemas.user import UserCreate, UserLogin, UserResponse
from app.core.security import get_password_hash, verify_password
from app.core.security_enhanced import (
    PasswordPolicy,
    AccountLockout,
    SessionManager,
    SecurityAuditor,
)
from app.core.errors import (
    ValidationError,
    ConflictError,
    AuthenticationError,
)
from app.core.email_service import email_service
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class AuthServiceEnhanced:
    """
    Enhanced authentication service with comprehensive security measures
    """

    @staticmethod
    async def register(
        db: AsyncSession, user_data: UserCreate, ip_address: str = "unknown"
    ) -> UserResponse:
        """
        Register a new user with enhanced security validation

        Args:
            db: Database session
            user_data: User registration data
            ip_address: Client IP address for security logging

        Returns:
            Created user object

        Raises:
            ValidationError: If input data is invalid
            ConflictError: If email already exists
        """
        try:
            # Check if user already exists
            result = await db.execute(select(User).where(User.email == user_data.email))
            existing_user = result.scalar_one_or_none()

            if existing_user:
                await SecurityAuditor.log_security_event(
                    "duplicate_registration_attempt",
                    None,
                    {"email": user_data.email, "ip": ip_address},
                    "warning",
                )
                raise ConflictError(
                    message="Email already registered",
                    details={"email": user_data.email},
                )

            # Validate password strength
            is_valid, errors = PasswordPolicy.validate_password(
                user_data.password, user_data.email
            )

            if not is_valid:
                await SecurityAuditor.log_security_event(
                    "weak_password_attempt",
                    None,
                    {"email": user_data.email, "ip": ip_address, "errors": errors},
                    "info",
                )
                raise ValidationError(
                    message="Password does not meet security requirements",
                    details={"password_errors": errors},
                )

            # Hash password
            try:
                hashed_password = get_password_hash(user_data.password)
            except Exception as e:
                logger.error(f"Password hashing failed: {str(e)}")
                raise ValidationError(
                    message="Failed to process password",
                    details={"error": "Password hashing failed"},
                )

            # Create user
            db_user = User(
                email=user_data.email,
                full_name=user_data.full_name,
                hashed_password=hashed_password,
                is_active=True,
                is_verified=False,  # Require email verification
            )

            # Save to database
            try:
                db.add(db_user)
                await db.commit()
                await db.refresh(db_user)

                # Log successful registration
                await SecurityAuditor.log_security_event(
                    "user_registered",
                    str(db_user.id),
                    {"email": user_data.email, "ip": ip_address},
                    "info",
                )

                logger.info(f"New user registered: {db_user.id}")

                # Send verification email
                await AuthServiceEnhanced._send_verification_email(db_user)

            except Exception as e:
                await db.rollback()
                raise ConflictError(
                    message="Registration failed due to database error",
                    details={"error": str(e)},
                )

            return UserResponse.model_validate(db_user)

        except (ConflictError, ValidationError):
            raise
        except Exception as e:
            logger.error(
                f"Unexpected error during registration: {str(e)}", exc_info=True
            )
            raise ValidationError(
                message="Registration failed due to an unexpected error",
                details={"error": str(e)},
            )

    @staticmethod
    async def authenticate(
        db: AsyncSession, credentials: UserLogin, ip_address: str = "unknown"
    ) -> Optional[User]:
        """
        Authenticate user with account lockout protection

        Args:
            db: Database session
            credentials: User login credentials
            ip_address: Client IP address for security logging

        Returns:
            User object if authentication successful, None otherwise

        Raises:
            AuthenticationError: If account is locked or disabled
        """
        try:
            # Check account lockout status
            is_locked, retry_after = await AccountLockout.is_locked_out(
                credentials.email
            )

            if is_locked:
                await SecurityAuditor.log_security_event(
                    "locked_account_login_attempt",
                    None,
                    {"email": credentials.email, "ip": ip_address},
                    "warning",
                )
                raise AuthenticationError(
                    message="Account temporarily locked due to multiple failed attempts. Please try again later.",
                    details={"retry_after": retry_after},
                )

            # Check IP-based lockout (prevent distributed brute force)
            ip_locked, ip_retry_after = await AccountLockout.is_locked_out(ip_address)

            if ip_locked:
                await SecurityAuditor.log_security_event(
                    "ip_locked_login_attempt", None, {"ip": ip_address}, "warning"
                )
                raise AuthenticationError(
                    message="Too many login attempts from your location. Please try again later.",
                    details={"retry_after": ip_retry_after},
                )

            # Query user by email
            result = await db.execute(
                select(User).where(User.email == credentials.email)
            )
            user = result.scalar_one_or_none()

            # Check if user exists
            if not user:
                # Record failed attempt for email
                await AccountLockout.record_failed_attempt(credentials.email)
                # Record failed attempt for IP
                await AccountLockout.record_failed_attempt(ip_address)

                await SecurityAuditor.log_security_event(
                    "failed_login_nonexistent_user",
                    None,
                    {"email": credentials.email, "ip": ip_address},
                    "warning",
                )

                return None

            # Check if user is active
            if not user.is_active:
                await SecurityAuditor.log_security_event(
                    "disabled_account_login_attempt",
                    str(user.id),
                    {"email": credentials.email, "ip": ip_address},
                    "warning",
                )
                raise AuthenticationError(
                    message="User account is disabled. Please contact support.",
                    details={"user_id": str(user.id)},
                )

            # Verify password
            try:
                if not verify_password(credentials.password, user.hashed_password):
                    # Record failed attempts
                    email_attempts = await AccountLockout.record_failed_attempt(
                        credentials.email
                    )
                    ip_attempts = await AccountLockout.record_failed_attempt(ip_address)

                    await SecurityAuditor.log_security_event(
                        "failed_login_wrong_password",
                        str(user.id),
                        {
                            "email": credentials.email,
                            "ip": ip_address,
                            "email_attempts": email_attempts,
                            "ip_attempts": ip_attempts,
                        },
                        "warning",
                    )

                    # Get remaining attempts
                    remaining = await AccountLockout.get_remaining_attempts(
                        credentials.email
                    )

                    if remaining > 0:
                        raise AuthenticationError(
                            message="Invalid email or password",
                            details={"remaining_attempts": remaining},
                        )
                    else:
                        raise AuthenticationError(
                            message="Account temporarily locked due to multiple failed attempts",
                        )

            except Exception as e:
                if isinstance(e, AuthenticationError):
                    raise
                logger.error(
                    f"Password verification error for user {user.id}: {str(e)}"
                )
                return None

            # Successful authentication - reset failed attempts
            await AccountLockout.reset_attempts(credentials.email)
            await AccountLockout.reset_attempts(ip_address)

            # Update last login
            user.last_login = datetime.utcnow()
            await db.commit()

            # Log successful login
            await SecurityAuditor.log_security_event(
                "successful_login",
                str(user.id),
                {"email": credentials.email, "ip": ip_address},
                "info",
            )

            logger.info(f"Successful authentication for user: {user.id}")
            return user

        except AuthenticationError:
            raise
        except Exception as e:
            logger.error(
                f"Unexpected error during authentication: {str(e)}", exc_info=True
            )
            return None

    @staticmethod
    async def create_user_session(
        user_id: str, user_agent: str = "unknown", ip_address: str = "unknown"
    ) -> str:
        """
        Create a secure user session

        Args:
            user_id: User ID
            user_agent: User agent string
            ip_address: Client IP address

        Returns:
            Session ID
        """
        try:
            session_data = {
                "user_id": user_id,
                "user_agent": user_agent,
                "ip_address": ip_address,
                "created_at": datetime.utcnow().isoformat(),
                "last_activity": datetime.utcnow().isoformat(),
            }

            session_id = await SessionManager.create_session(user_id, session_data)

            await SecurityAuditor.log_security_event(
                "session_created",
                user_id,
                {"session_id": session_id, "ip": ip_address},
                "info",
            )

            return session_id

        except Exception as e:
            logger.error(f"Failed to create session: {str(e)}")
            raise

    @staticmethod
    async def validate_session(user_id: str, session_id: str) -> bool:
        """
        Validate user session

        Args:
            user_id: User ID
            session_id: Session ID to validate

        Returns:
            True if session is valid
        """
        try:
            session_data = await SessionManager.get_session(user_id, session_id)

            if not session_data:
                await SecurityAuditor.log_security_event(
                    "invalid_session_attempt",
                    user_id,
                    {"session_id": session_id},
                    "warning",
                )
                return False

            # Update last activity
            session_data["last_activity"] = datetime.utcnow().isoformat()
            return True

        except Exception as e:
            logger.error(f"Session validation failed: {str(e)}")
            return False

    @staticmethod
    async def revoke_session(user_id: str, session_id: str) -> bool:
        """
        Revoke a user session

        Args:
            user_id: User ID
            session_id: Session ID to revoke

        Returns:
            True if session was revoked
        """
        try:
            result = await SessionManager.destroy_session(user_id, session_id)

            if result:
                await SecurityAuditor.log_security_event(
                    "session_revoked", user_id, {"session_id": session_id}, "info"
                )

            return result

        except Exception as e:
            logger.error(f"Failed to revoke session: {str(e)}")
            return False

    @staticmethod
    async def revoke_all_sessions(user_id: str) -> int:
        """
        Revoke all user sessions (e.g., after password change)

        Args:
            user_id: User ID

        Returns:
            Number of sessions revoked
        """
        try:
            count = await SessionManager.destroy_all_sessions(user_id)

            await SecurityAuditor.log_security_event(
                "all_sessions_revoked", user_id, {"session_count": count}, "info"
            )

            return count

        except Exception as e:
            logger.error(f"Failed to revoke all sessions: {str(e)}")
            return 0

    @staticmethod
    async def change_password(
        db: AsyncSession,
        user_id: str,
        current_password: str,
        new_password: str,
        ip_address: str = "unknown",
    ) -> bool:
        """
        Change user password with security validation

        Args:
            db: Database session
            user_id: User ID
            current_password: Current password
            new_password: New password
            ip_address: Client IP address

        Returns:
            True if password was changed successfully

        Raises:
            ValidationError: If new password doesn't meet requirements
            AuthenticationError: If current password is incorrect
        """
        try:
            # Get user
            result = await db.execute(select(User).where(User.id == user_id))
            user = result.scalar_one_or_none()

            if not user:
                raise AuthenticationError(message="User not found")

            # Verify current password
            if not verify_password(current_password, user.hashed_password):
                await SecurityAuditor.log_security_event(
                    "failed_password_change_wrong_password",
                    user_id,
                    {"ip": ip_address},
                    "warning",
                )
                raise AuthenticationError(message="Current password is incorrect")

            # Validate new password
            is_valid, errors = PasswordPolicy.validate_password(
                new_password, user.email
            )

            if not is_valid:
                raise ValidationError(
                    message="New password does not meet security requirements",
                    details={"password_errors": errors},
                )

            # Hash new password
            try:
                hashed_password = get_password_hash(new_password)
            except Exception as e:
                logger.error(f"Password hashing failed: {str(e)}")
                raise ValidationError(
                    message="Failed to process password",
                    details={"error": "Password hashing failed"},
                )

            # Update password
            user.hashed_password = hashed_password
            user.password_changed_at = datetime.utcnow()

            await db.commit()

            # Revoke all existing sessions (force re-login)
            await AuthServiceEnhanced.revoke_all_sessions(user_id)

            await SecurityAuditor.log_security_event(
                "password_changed", user_id, {"ip": ip_address}, "info"
            )

            logger.info(f"Password changed for user: {user_id}")
            return True

        except (AuthenticationError, ValidationError):
            raise
        except Exception as e:
            logger.error(f"Failed to change password: {str(e)}", exc_info=True)
            raise ValidationError(
                message="Password change failed due to an unexpected error",
                details={"error": str(e)},
            )

    @staticmethod
    async def _send_verification_email(user: User) -> None:
        """
        Send email verification link to user

        Args:
            user: User object
        """
        try:
            verification_token = secrets.token_urlsafe(32)

            # Send email
            await email_service.send_email(
                to_email=user.email,
                subject="Verify your SyncHire account",
                template_name="email_verification",
                template_data={
                    "full_name": user.full_name,
                    "verification_link": f"{settings.FRONTEND_URL}/verify-email?token={verification_token}",
                },
            )

            logger.info(f"Verification email sent to user: {user.id}")

        except Exception as e:
            logger.error(f"Failed to send verification email: {str(e)}")
            # Don't raise exception - registration should succeed even if email fails
