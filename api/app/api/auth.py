from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import create_access_token, create_refresh_token, verify_token
from app.core.deps import get_current_user
from app.core.errors import (
    AuthenticationError,
    ValidationError,
    RateLimitError,
    handle_database_error,
)
from app.schemas.user import UserCreate, UserLogin, UserResponse, Token, TokenRefresh
from app.services.auth_service import AuthService
from app.middleware.rate_limit import rate_limit, RateLimitType
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED
)
@rate_limit(RateLimitType.AUTH)
async def register(
    user_data: UserCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Register a new user with comprehensive error handling

    Args:
        user_data: User registration data
        request: FastAPI request object
        db: Database session

    Returns:
        Created user object

    Raises:
        RateLimitError: If rate limit is exceeded
        ValidationError: If input data is invalid
        ConflictError: If email already exists
    """
    try:
        # Validate input data
        if not user_data.email or not user_data.email.strip():
            raise ValidationError(
                message="Email is required",
                field="email"
            )

        if not user_data.password or not user_data.password.strip():
            raise ValidationError(
                message="Password is required",
                field="password"
            )

        # Register user
        user = await AuthService.register(db, user_data)
        return user

    except (ValidationError, RateLimitError) as e:
        # Re-raise our custom errors
        raise
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"Unexpected error during registration: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed. Please try again later."
        )


@router.post("/login", response_model=Token)
@rate_limit(RateLimitType.AUTH)
async def login(
    credentials: UserLogin,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Authenticate user with comprehensive error handling

    Args:
        credentials: User login credentials
        request: FastAPI request object
        db: Database session

    Returns:
        Access and refresh tokens

    Raises:
        RateLimitError: If rate limit is exceeded
        AuthenticationError: If authentication fails
    """
    try:
        # Validate input
        if not credentials.email or not credentials.email.strip():
            raise ValidationError(
                message="Email is required",
                field="email"
            )

        if not credentials.password or not credentials.password.strip():
            raise ValidationError(
                message="Password is required",
                field="password"
            )

        # Authenticate user
        user = await AuthService.authenticate(db, credentials.email, credentials.password)

        if not user:
            # Generic error message for security (prevents email enumeration)
            raise AuthenticationError(
                message="Invalid email or password"
            )

        # Check if user is active
        if not user.is_active:
            logger.warning(f"Login attempt for disabled user: {user.id}")
            raise AuthenticationError(
                message="User account is disabled. Please contact support.",
                details={"user_id": str(user.id)}
            )

        # Generate tokens
        try:
            access_token = create_access_token(str(user.id))
            refresh_token = create_refresh_token(str(user.id))
        except Exception as e:
            logger.error(f"Token generation failed for user {user.id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to generate authentication tokens"
            )

        logger.info(f"Successful login for user: {user.id}")
        return Token(access_token=access_token, refresh_token=refresh_token)

    except (ValidationError, AuthenticationError, RateLimitError) as e:
        # Re-raise our custom errors
        raise
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"Unexpected error during login: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed. Please try again later."
        )


@router.post("/refresh", response_model=Token)
async def refresh_token(token_data: TokenRefresh):
    """
    Refresh access token with comprehensive error handling

    Args:
        token_data: Refresh token data

    Returns:
        New access and refresh tokens

    Raises:
        AuthenticationError: If refresh token is invalid
    """
    try:
        # Validate input
        if not token_data.refresh_token or not token_data.refresh_token.strip():
            raise ValidationError(
                message="Refresh token is required",
                field="refresh_token"
            )

        # Verify refresh token
        try:
            user_id = verify_token(token_data.refresh_token)
        except Exception as e:
            logger.warning(f"Invalid refresh token attempt: {str(e)}")
            raise AuthenticationError(
                message="Invalid or expired refresh token"
            )

        if not user_id:
            raise AuthenticationError(
                message="Invalid or expired refresh token"
            )

        # Generate new tokens
        try:
            access_token = create_access_token(user_id)
            refresh_token = create_refresh_token(user_id)
        except Exception as e:
            logger.error(f"Token generation failed during refresh: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to generate authentication tokens"
            )

        return Token(access_token=access_token, refresh_token=refresh_token)

    except (ValidationError, AuthenticationError) as e:
        raise
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error during token refresh: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Token refresh failed. Please try again later."
        )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user=Depends(get_current_user)):
    """
    Get current user information with error handling

    Args:
        current_user: Current authenticated user

    Returns:
        Current user information
    """
    try:
        return current_user
    except Exception as e:
        logger.error(f"Error fetching current user info: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch user information"
        )


@router.post("/logout")
async def logout():
    """
    Logout endpoint (currently just returns success message)

    Note: In a stateless JWT setup, logout is handled client-side
    by removing tokens. This endpoint exists for future token
    blacklisting or session management features.
    """
    return {"message": "Successfully logged out"}
