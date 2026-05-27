"""
Password Reset API Endpoints

Handles forgot password and reset password functionality with secure tokens.
Uses database persistence for token storage.
"""

import uuid
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.errors import ValidationError, RateLimitError
from app.models.user import User
from app.models.password_reset_token import PasswordResetToken
from app.services.email_service import email_service
from app.middleware.rate_limit import rate_limit, RateLimitType
from app.core.logger import logger, LogCategory
from app.core.deps import get_current_user

router = APIRouter(prefix="/password-reset", tags=["password-reset"])


@router.post("/request")
@rate_limit(RateLimitType.AUTH)
async def request_password_reset(
    email: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Request a password reset email.

    Args:
        email: User email address
        request: FastAPI request object
        db: Database session

    Returns:
        Success message (always returns success to prevent email enumeration)

    Raises:
        RateLimitError: If rate limit is exceeded
    """
    try:
        # Validate input
        if not email or not email.strip():
            raise ValidationError(message="Email is required", field="email")

        # Find user by email
        result = await db.execute(select(User).where(User.email == email.strip()))
        user = result.scalar_one_or_none()

        # Generate reset token if user exists
        if user:
            # Generate secure reset token
            reset_token = str(uuid.uuid4())
            expiry_time = datetime.utcnow() + timedelta(
                hours=1
            )  # Token expires in 1 hour

            # Store token in database
            password_reset_token = PasswordResetToken(
                id=uuid.uuid4(),
                user_id=user.id,
                token=reset_token,
                expires_at=expiry_time,
                used=False,
            )
            db.add(password_reset_token)
            await db.commit()

            # Send reset email
            try:
                await email_service.send_email(
                    to_email=email,
                    subject="Reset Your Password",
                    template_name="password_reset",
                    context={
                        "user_name": user.full_name or "there",
                        "reset_url": f"https://synchire.com/reset-password?token={reset_token}",
                        "expiry_hours": 1,
                    },
                )
                logger.info(LogCategory.AUTH, f"Password reset email sent to {email}")
            except Exception as e:
                logger.error(
                    LogCategory.AUTH, f"Failed to send password reset email: {e}"
                )
                # Don't raise error to prevent email enumeration

        # Always return success to prevent email enumeration
        return {
            "message": "If an account exists with this email, a password reset link has been sent."
        }

    except (ValidationError, RateLimitError):
        raise
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            LogCategory.AUTH,
            f"Unexpected error in password reset request: {str(e)}",
            exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Password reset request failed. Please try again later.",
        )


@router.post("/validate-token")
async def validate_reset_token(
    token: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Validate a password reset token.

    Args:
        token: Password reset token
        db: Database session

    Returns:
        Validation result

    Raises:
        ValidationError: If token is invalid or expired
    """
    try:
        # Validate input
        if not token or not token.strip():
            raise ValidationError(message="Token is required", field="token")

        # Check if token exists and is valid
        result = await db.execute(
            select(PasswordResetToken)
            .where(PasswordResetToken.token == token.strip())
            .where(PasswordResetToken.used == False)
        )
        reset_token_obj = result.scalar_one_or_none()

        if not reset_token_obj:
            raise ValidationError(
                message="Invalid or expired reset token", field="token"
            )

        # Check token expiry
        if datetime.utcnow() > reset_token_obj.expires_at:
            raise ValidationError(message="Reset token has expired", field="token")

        # Get user email
        user_result = await db.execute(
            select(User).where(User.id == reset_token_obj.user_id)
        )
        user = user_result.scalar_one_or_none()

        return {"valid": True, "email": user.email if user else ""}

    except ValidationError:
        raise
    except Exception as e:
        logger.error(
            LogCategory.AUTH,
            f"Unexpected error in token validation: {str(e)}",
            exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Token validation failed. Please try again later.",
        )


@router.post("/reset")
@rate_limit(RateLimitType.AUTH)
async def reset_password(
    token: str,
    new_password: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Reset password using valid token.

    Args:
        token: Password reset token
        new_password: New password
        request: FastAPI request object
        db: Database session

    Returns:
        Success message

    Raises:
        ValidationError: If token is invalid or password is weak
        RateLimitError: If rate limit is exceeded
    """
    try:
        # Validate input
        if not token or not token.strip():
            raise ValidationError(message="Token is required", field="token")

        if not new_password or not new_password.strip():
            raise ValidationError(message="Password is required", field="new_password")

        if len(new_password) < 12:
            raise ValidationError(
                message="Password must be at least 12 characters long",
                field="new_password",
            )

        # Get token from database
        result = await db.execute(
            select(PasswordResetToken)
            .where(PasswordResetToken.token == token.strip())
            .where(PasswordResetToken.used == False)
        )
        reset_token_obj = result.scalar_one_or_none()

        if not reset_token_obj:
            raise ValidationError(
                message="Invalid or expired reset token", field="token"
            )

        # Check token expiry
        if datetime.utcnow() > reset_token_obj.expires_at:
            raise ValidationError(message="Reset token has expired", field="token")

        # Get user
        user_result = await db.execute(
            select(User).where(User.id == reset_token_obj.user_id)
        )
        user = user_result.scalar_one_or_none()

        if not user:
            raise ValidationError(message="User not found", field="token")

        # Import password hashing function
        from app.core.security import get_password_hash

        # Update password
        user.hashed_password = get_password_hash(new_password)
        user.updated_at = datetime.utcnow()

        # Mark token as used
        reset_token_obj.used = True

        await db.commit()

        logger.info(LogCategory.AUTH, f"Password reset successfully for user {user.id}")

        return {
            "message": "Password has been reset successfully. You can now login with your new password."
        }

    except (ValidationError, RateLimitError):
        raise
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            LogCategory.AUTH,
            f"Unexpected error in password reset: {str(e)}",
            exc_info=True,
        )
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Password reset failed. Please try again later.",
        )


@router.post("/change")
async def change_password(
    current_password: str,
    new_password: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Change password for authenticated user.

    Args:
        current_password: Current password
        new_password: New password
        db: Database session
        current_user: Current authenticated user

    Returns:
        Success message

    Raises:
        ValidationError: If current password is wrong or new password is weak
    """
    try:
        # Validate input
        if not current_password or not current_password.strip():
            raise ValidationError(
                message="Current password is required", field="current_password"
            )

        if not new_password or not new_password.strip():
            raise ValidationError(
                message="New password is required", field="new_password"
            )

        if len(new_password) < 12:
            raise ValidationError(
                message="Password must be at least 12 characters long",
                field="new_password",
            )

        # Verify current password
        from app.core.security import verify_password_hash

        if not verify_password_hash(current_password, current_user.hashed_password):
            raise ValidationError(
                message="Current password is incorrect", field="current_password"
            )

        # Update password
        from app.core.security import get_password_hash

        current_user.hashed_password = get_password_hash(new_password)
        current_user.updated_at = datetime.utcnow()

        await db.commit()

        logger.info(
            LogCategory.AUTH,
            f"Password changed successfully for user {current_user.id}",
        )

        return {
            "message": "Password changed successfully. Please login with your new password."
        }

    except ValidationError:
        raise
    except Exception as e:
        logger.error(
            LogCategory.AUTH,
            f"Unexpected error in password change: {str(e)}",
            exc_info=True,
        )
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Password change failed. Please try again later.",
        )
