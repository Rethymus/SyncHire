"""
OAuth API endpoints for Google and GitHub authentication
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional, Literal
from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.security import create_access_token, create_refresh_token
from app.core.errors import ValidationError, RateLimitError
from app.core.config import get_settings
from app.services.oauth_service import OAuthService
from app.middleware.rate_limit import rate_limit, RateLimitType
from app.models.user import User
import logging

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter(prefix="/oauth", tags=["oauth"])


class OAuthCodeRequest(BaseModel):
    """Request model for OAuth code exchange"""

    code: str
    redirect_uri: str
    provider: Literal["google", "github"]


class OAuthTokenResponse(BaseModel):
    """Response model for OAuth token exchange"""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user_info: Optional[dict] = None


@router.get("/authorize/{provider}")
async def get_oauth_authorization_url(provider: str):
    """
    Get the OAuth authorization URL for the specified provider

    Args:
        provider: OAuth provider ('google' or 'github')

    Returns:
        Dictionary containing authorization URL and state parameter
    """
    try:
        if provider == "google":
            client_id = getattr(settings, "GOOGLE_OAUTH_CLIENT_ID", None)
            if not client_id:
                raise HTTPException(
                    status_code=status.HTTP_501_NOT_IMPLEMENTED,
                    detail="Google OAuth is not configured",
                )

            # Google OAuth 2.0 authorization URL
            auth_url = (
                f"https://accounts.google.com/o/oauth2/v2/auth"
                f"?client_id={client_id}"
                f"&redirect_uri={settings.FRONTEND_URL}/auth/callback/google"
                f"&response_type=code"
                f"&scope=openid%20email%20profile"
            )

            return {"authorization_url": auth_url, "provider": "google"}

        elif provider == "github":
            client_id = getattr(settings, "GITHUB_OAUTH_CLIENT_ID", None)
            if not client_id:
                raise HTTPException(
                    status_code=status.HTTP_501_NOT_IMPLEMENTED,
                    detail="GitHub OAuth is not configured",
                )

            # GitHub OAuth authorization URL
            auth_url = (
                f"https://github.com/login/oauth/authorize"
                f"?client_id={client_id}"
                f"&redirect_uri={settings.FRONTEND_URL}/auth/callback/github"
                f"&scope=user:email"
            )

            return {"authorization_url": auth_url, "provider": "github"}

        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported OAuth provider: {provider}",
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"Error generating OAuth authorization URL: {str(e)}", exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate authorization URL",
        )


@router.post("/callback", response_model=OAuthTokenResponse)
@rate_limit(RateLimitType.AUTH)
async def oauth_callback(
    request: Request, oauth_data: OAuthCodeRequest, db: AsyncSession = Depends(get_db)
):
    """
    Handle OAuth callback and exchange authorization code for tokens

    Args:
        request: FastAPI request object
        oauth_data: OAuth code exchange request
        db: Database session

    Returns:
        Access and refresh tokens along with user info
    """
    try:
        provider = oauth_data.provider
        code = oauth_data.code
        redirect_uri = oauth_data.redirect_uri

        # Exchange code for access token
        if provider == "google":
            access_token = await OAuthService.exchange_code_for_token_google(
                code, redirect_uri
            )
            user_info = await OAuthService.get_google_user_info(access_token)
        elif provider == "github":
            access_token = await OAuthService.exchange_code_for_token_github(
                code, redirect_uri
            )
            user_info = await OAuthService.get_github_user_info(access_token)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported OAuth provider: {provider}",
            )

        # Find or create user
        user = await OAuthService.find_or_create_user_by_oauth(db, provider, user_info)

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="User account is disabled"
            )

        # Generate JWT tokens
        try:
            jwt_access_token = create_access_token(str(user.id))
            jwt_refresh_token = create_refresh_token(str(user.id))
        except Exception as e:
            logger.error(f"Token generation failed for user {user.id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to generate authentication tokens",
            )

        logger.info(f"Successful OAuth login via {provider} for user: {user.id}")

        return OAuthTokenResponse(
            access_token=jwt_access_token,
            refresh_token=jwt_refresh_token,
            user_info={
                "id": str(user.id),
                "email": user.email,
                "full_name": user.full_name,
                "is_active": user.is_active,
                "provider": provider,
            },
        )

    except ValidationError as e:
        logger.warning(f"OAuth validation error: {str(e)}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=e.message)
    except RateLimitError:
        raise
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error during OAuth callback: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="OAuth authentication failed",
        )


@router.get("/providers")
async def get_available_providers():
    """
    Get list of available OAuth providers

    Returns:
        Dictionary with available providers and their configuration status
    """
    try:
        google_configured = bool(
            getattr(settings, "GOOGLE_OAUTH_CLIENT_ID", None)
            and getattr(settings, "GOOGLE_OAUTH_CLIENT_SECRET", None)
        )

        github_configured = bool(
            getattr(settings, "GITHUB_OAUTH_CLIENT_ID", None)
            and getattr(settings, "GITHUB_OAUTH_CLIENT_SECRET", None)
        )

        return {
            "providers": {
                "google": {"available": google_configured, "display_name": "Google"},
                "github": {"available": github_configured, "display_name": "GitHub"},
            }
        }

    except Exception as e:
        logger.error(f"Error fetching OAuth providers: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch available providers",
        )


@router.post("/unlink/{provider}")
async def unlink_oauth_account(
    provider: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Unlink an OAuth account from the current user

    Args:
        provider: OAuth provider to unlink ('google' or 'github')
        current_user: Current authenticated user
        db: Database session

    Returns:
        Success message
    """
    try:
        if provider not in ["google", "github"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported OAuth provider: {provider}",
            )

        # Import here to avoid circular dependency
        from sqlalchemy import delete
        from app.models.user import OAuthAccount

        # Delete the OAuth account
        stmt = delete(OAuthAccount).where(
            OAuthAccount.user_id == current_user.id, OAuthAccount.provider == provider
        )
        await db.execute(stmt)
        await db.commit()

        logger.info(f"Unlinked {provider} account from user: {current_user.id}")

        return {"message": f"Successfully unlinked {provider} account"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error unlinking OAuth account: {str(e)}", exc_info=True)
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to unlink OAuth account",
        )
