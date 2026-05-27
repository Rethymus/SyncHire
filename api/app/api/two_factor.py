"""
Two-Factor Authentication API Endpoints

Provides endpoints for 2FA setup, verification, and management.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.errors import (
    AuthenticationError,
    ValidationError,
    DatabaseError,
)
from app.services.two_factor_service import TwoFactorService
from app.services.auth_service import AuthService
from app.schemas.two_factor import (
    TwoFactorSetupInitiateResponse,
    TwoFactorSetupVerify,
    TwoFactorSetupCompleteResponse,
    TwoFactorDisable,
    TwoFactorVerify,
    TwoFactorVerifyResponse,
    UserTwoFactorStatus,
    LoginWithTwoFactor,
)
from app.schemas.user import Token
from app.core.security import create_access_token, create_refresh_token
from app.models.user import User
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/two-factor", tags=["two-factor"])


@router.post(
    "/setup/initiate",
    response_model=TwoFactorSetupInitiateResponse,
    status_code=status.HTTP_200_OK,
)
async def initiate_two_factor_setup(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Initiate two-factor authentication setup

    Generates a TOTP secret and QR code for the user to scan with their
    authenticator app (Google Authenticator, Authy, etc.)

    Args:
        current_user: Authenticated user
        db: Database session

    Returns:
        Secret key and QR code for setup

    Raises:
        HTTPException: If setup initiation fails
    """
    try:
        # Check if 2FA is already enabled
        if current_user.two_factor_enabled:
            raise ValidationError(
                message="Two-factor authentication is already enabled",
                details={"user_id": str(current_user.id)},
            )

        # Initiate 2FA setup
        secret, qr_code = await TwoFactorService.initiate_two_factor_setup(
            db, current_user
        )

        return TwoFactorSetupInitiateResponse(
            secret=secret,
            qr_code=qr_code,
            message="Scan the QR code with your authenticator app and verify with a code",
        )

    except ValidationError:
        raise
    except Exception as e:
        logger.error(
            f"Unexpected error during 2FA setup initiation: {str(e)}", exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to initiate two-factor authentication setup",
        )


@router.post(
    "/setup/verify",
    response_model=TwoFactorSetupCompleteResponse,
    status_code=status.HTTP_200_OK,
)
async def verify_and_enable_two_factor(
    setup_data: TwoFactorSetupVerify,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Verify TOTP code and enable two-factor authentication

    After scanning the QR code, user must provide a valid TOTP code
    to complete the setup. Backup codes are returned on success.

    Args:
        setup_data: TOTP verification data
        current_user: Authenticated user
        db: Database session

    Returns:
        Success message and backup codes

    Raises:
        HTTPException: If verification fails
    """
    try:
        # Verify and enable 2FA
        success, message, backup_codes = await TwoFactorService.setup_two_factor(
            db, current_user, setup_data.totp_code
        )

        return TwoFactorSetupCompleteResponse(
            success=success,
            message=message,
            backup_codes=backup_codes,
            warning="Save these backup codes securely. They won't be shown again.",
        )

    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message,
        )
    except DatabaseError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=e.message,
        )
    except Exception as e:
        logger.error(
            f"Unexpected error during 2FA verification: {str(e)}", exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to verify two-factor authentication setup",
        )


@router.post("/disable", status_code=status.HTTP_200_OK)
async def disable_two_factor(
    disable_data: TwoFactorDisable,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Disable two-factor authentication

    Requires a valid TOTP code to disable 2FA for security.

    Args:
        disable_data: TOTP code for verification
        current_user: Authenticated user
        db: Database session

    Returns:
        Success message

    Raises:
        HTTPException: If disabling fails
    """
    try:
        # Disable 2FA
        await TwoFactorService.disable_two_factor(
            db, current_user, disable_data.totp_code
        )

        return {
            "message": "Two-factor authentication disabled successfully",
            "success": True,
        }

    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message,
        )
    except DatabaseError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=e.message,
        )
    except Exception as e:
        logger.error(f"Unexpected error during 2FA disable: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to disable two-factor authentication",
        )


@router.get(
    "/status", response_model=UserTwoFactorStatus, status_code=status.HTTP_200_OK
)
async def get_two_factor_status(
    current_user: User = Depends(get_current_user),
):
    """
    Get user's two-factor authentication status

    Args:
        current_user: Authenticated user

    Returns:
        Current 2FA status information
    """
    try:
        return UserTwoFactorStatus(
            two_factor_enabled=current_user.two_factor_enabled,
            has_backup_codes=bool(
                current_user.backup_codes and len(current_user.backup_codes) > 0
            ),
            backup_codes_count=(
                len(current_user.backup_codes) if current_user.backup_codes else 0
            ),
            two_factor_enabled_at=(
                current_user.two_factor_enabled_at.isoformat()
                if current_user.two_factor_enabled_at
                else None
            ),
        )
    except Exception as e:
        logger.error(f"Error fetching 2FA status: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch two-factor authentication status",
        )


@router.post(
    "/verify", response_model=TwoFactorVerifyResponse, status_code=status.HTTP_200_OK
)
async def verify_two_factor_code(
    verify_data: TwoFactorVerify,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Verify two-factor authentication code

    Validates a TOTP code or backup code. Used during login or
    when requiring additional verification.

    Args:
        verify_data: Code to verify
        current_user: Authenticated user
        db: Database session

    Returns:
        Verification result

    Raises:
        HTTPException: If verification fails
    """
    try:
        # Verify 2FA code
        await TwoFactorService.verify_two_factor(db, current_user, verify_data.code)

        # Determine if backup code was used
        backup_code_used = (
            "-" in verify_data.code  # Backup codes contain hyphens
            and len(verify_data.code.replace("-", "").replace(" ", "")) == 8
        )

        return TwoFactorVerifyResponse(
            success=True,
            message="Authentication code verified successfully",
            backup_code_used=backup_code_used,
            remaining_backup_codes=(
                len(current_user.backup_codes)
                if backup_code_used and current_user.backup_codes
                else None
            ),
        )

    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=e.message,
        )
    except DatabaseError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=e.message,
        )
    except Exception as e:
        logger.error(
            f"Unexpected error during 2FA verification: {str(e)}", exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to verify two-factor authentication code",
        )


@router.post("/login", response_model=Token, status_code=status.HTTP_200_OK)
async def login_with_two_factor(
    credentials: LoginWithTwoFactor,
    db: AsyncSession = Depends(get_db),
):
    """
    Login with two-factor authentication support

    Authenticates user with email/password and optionally verifies
    2FA code if enabled for the account.

    Args:
        credentials: Login credentials and optional 2FA code
        db: Database session

    Returns:
        Access and refresh tokens

    Raises:
        HTTPException: If authentication fails
    """
    try:
        # Validate input
        if not credentials.email or not credentials.email.strip():
            raise ValidationError(message="Email is required", field="email")

        if not credentials.password or not credentials.password.strip():
            raise ValidationError(message="Password is required", field="password")

        # Authenticate user
        user = await AuthService.authenticate(
            db, credentials.email, credentials.password
        )

        if not user:
            # Generic error message for security (prevents email enumeration)
            raise AuthenticationError(message="Invalid email or password")

        # Check if user is active
        if not user.is_active:
            logger.warning(f"Login attempt for disabled user: {user.id}")
            raise AuthenticationError(
                message="User account is disabled. Please contact support.",
                details={"user_id": str(user.id)},
            )

        # Check if 2FA is enabled
        if user.two_factor_enabled:
            # Verify 2FA code
            if not credentials.totp_code and not credentials.backup_code:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail={
                        "message": "Two-factor authentication code required",
                        "two_factor_required": True,
                        "user_id": str(user.id),
                    },
                )

            try:
                # Use TOTP code if provided, otherwise use backup code
                code = (
                    credentials.totp_code
                    if credentials.totp_code
                    else credentials.backup_code
                )
                await TwoFactorService.verify_two_factor(db, user, code)
            except ValidationError:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid two-factor authentication code",
                )
            except DatabaseError as e:
                logger.error(f"Database error during 2FA verification: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to verify two-factor authentication",
                )

        # Generate tokens
        try:
            access_token = create_access_token(str(user.id))
            refresh_token = create_refresh_token(str(user.id))
        except Exception as e:
            logger.error(f"Token generation failed for user {user.id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to generate authentication tokens",
            )

        logger.info(f"Successful login for user: {user.id}")
        return Token(access_token=access_token, refresh_token=refresh_token)

    except (ValidationError, AuthenticationError):
        raise
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error during login: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed. Please try again later.",
        )
