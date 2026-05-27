"""
OAuth Service for Google and GitHub authentication
Handles OAuth flows, user account linking, and token management
"""

import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.user import User, OAuthAccount
from app.core.errors import ValidationError, DatabaseError
from app.core.config import get_settings
from typing import Dict, Any
import logging
import uuid

logger = logging.getLogger(__name__)
settings = get_settings()


class OAuthService:
    """Service for handling OAuth authentication flows"""

    @staticmethod
    async def get_google_user_info(access_token: str) -> Dict[str, Any]:
        """
        Fetch user information from Google using access token

        Args:
            access_token: Google OAuth access token

        Returns:
            Dictionary containing user information

        Raises:
            ValidationError: If token is invalid or request fails
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    "https://www.googleapis.com/oauth2/v2/userinfo",
                    headers={"Authorization": f"Bearer {access_token}"},
                    timeout=10.0,
                )

                if response.status_code != 200:
                    logger.error(
                        f"Google API error: {response.status_code} - {response.text}"
                    )
                    raise ValidationError(
                        message="Failed to fetch user information from Google",
                        details={"status": response.status_code},
                    )

                data = response.json()
                return {
                    "oauth_id": data.get("id"),
                    "email": data.get("email"),
                    "name": data.get("name"),
                    "picture": data.get("picture"),
                    "verified_email": data.get("verified_email", False),
                }

        except httpx.TimeoutException:
            logger.error("Google API timeout")
            raise ValidationError(
                message="Request to Google API timed out", details={"service": "google"}
            )
        except httpx.RequestError as e:
            logger.error(f"Google API request error: {str(e)}")
            raise ValidationError(
                message="Failed to connect to Google API", details={"error": str(e)}
            )

    @staticmethod
    async def get_github_user_info(access_token: str) -> Dict[str, Any]:
        """
        Fetch user information from GitHub using access token

        Args:
            access_token: GitHub OAuth access token

        Returns:
            Dictionary containing user information

        Raises:
            ValidationError: If token is invalid or request fails
        """
        try:
            async with httpx.AsyncClient() as client:
                # Get basic user info
                user_response = await client.get(
                    "https://api.github.com/user",
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        "Accept": "application/json",
                    },
                    timeout=10.0,
                )

                if user_response.status_code != 200:
                    logger.error(
                        f"GitHub API error: {user_response.status_code} - {user_response.text}"
                    )
                    raise ValidationError(
                        message="Failed to fetch user information from GitHub",
                        details={"status": user_response.status_code},
                    )

                user_data = user_response.json()

                # Get user email (primary email)
                email_response = await client.get(
                    "https://api.github.com/user/emails",
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        "Accept": "application/json",
                    },
                    timeout=10.0,
                )

                email = None
                verified_email = False

                if email_response.status_code == 200:
                    emails = email_response.json()
                    # Find primary verified email
                    for email_data in emails:
                        if email_data.get("primary") and email_data.get("verified"):
                            email = email_data.get("email")
                            verified_email = True
                            break

                    # If no primary verified email, use first verified email
                    if not email:
                        for email_data in emails:
                            if email_data.get("verified"):
                                email = email_data.get("email")
                                verified_email = True
                                break

                return {
                    "oauth_id": str(user_data.get("id")),
                    "email": email or user_data.get("email"),
                    "name": user_data.get("name") or user_data.get("login"),
                    "picture": user_data.get("avatar_url"),
                    "verified_email": verified_email,
                    "login": user_data.get("login"),
                    "bio": user_data.get("bio"),
                    "location": user_data.get("location"),
                }

        except httpx.TimeoutException:
            logger.error("GitHub API timeout")
            raise ValidationError(
                message="Request to GitHub API timed out", details={"service": "github"}
            )
        except httpx.RequestError as e:
            logger.error(f"GitHub API request error: {str(e)}")
            raise ValidationError(
                message="Failed to connect to GitHub API", details={"error": str(e)}
            )

    @staticmethod
    async def find_or_create_user_by_oauth(
        db: AsyncSession, provider: str, oauth_user_info: Dict[str, Any]
    ) -> User:
        """
        Find existing user or create new user using OAuth information

        Args:
            db: Database session
            provider: OAuth provider ('google' or 'github')
            oauth_user_info: User information from OAuth provider

        Returns:
            User object

        Raises:
            ValidationError: If email is not verified or required fields are missing
            DatabaseError: If database operation fails
        """
        try:
            oauth_id = oauth_user_info.get("oauth_id")
            email = oauth_user_info.get("email")

            if not oauth_id or not email:
                raise ValidationError(
                    message="Missing required OAuth user information",
                    details={"oauth_id": oauth_id, "email": email},
                )

            # Check if email is verified
            if not oauth_user_info.get("verified_email", False):
                raise ValidationError(
                    message="Email address must be verified to use OAuth login",
                    details={"email": email},
                )

            # Check if OAuth account already exists
            result = await db.execute(
                select(OAuthAccount).where(
                    OAuthAccount.provider == provider,
                    OAuthAccount.provider_user_id == oauth_id,
                )
            )
            oauth_account = result.scalar_one_or_none()

            if oauth_account:
                # OAuth account exists, get the user
                user_result = await db.execute(
                    select(User).where(User.id == oauth_account.user_id)
                )
                user = user_result.scalar_one_or_none()

                if user and not user.is_active:
                    raise ValidationError(
                        message="User account is disabled",
                        details={"user_id": str(user.id)},
                    )

                if user:
                    logger.info(f"Existing user logged in via {provider}: {user.id}")
                    return user

            # Check if user with same email exists
            result = await db.execute(select(User).where(User.email == email))
            existing_user = result.scalar_one_or_none()

            if existing_user:
                # Link OAuth account to existing user
                new_oauth_account = OAuthAccount(
                    user_id=existing_user.id,
                    provider=provider,
                    provider_user_id=oauth_id,
                    access_token=str(uuid.uuid4()),  # Store a reference token
                    refresh_token=None,
                    account_info=oauth_user_info,
                )

                try:
                    db.add(new_oauth_account)
                    await db.commit()
                    await db.refresh(new_oauth_account)
                    logger.info(
                        f"Linked {provider} account to existing user: {existing_user.id}"
                    )
                except Exception as e:
                    await db.rollback()
                    logger.error(f"Failed to link OAuth account: {str(e)}")
                    raise DatabaseError(
                        message="Failed to link OAuth account",
                        details={"error": str(e)},
                    )

                return existing_user

            # Create new user
            name = oauth_user_info.get("name", "")
            if not name:
                # Generate name from email
                name = email.split("@")[0].replace(".", " ").title()

            new_user = User(
                email=email,
                full_name=name,
                hashed_password="",  # No password for OAuth users
                is_active=True,
            )

            try:
                db.add(new_user)
                await db.commit()
                await db.refresh(new_user)

                # Create OAuth account
                oauth_account = OAuthAccount(
                    user_id=new_user.id,
                    provider=provider,
                    provider_user_id=oauth_id,
                    access_token=str(uuid.uuid4()),
                    refresh_token=None,
                    account_info=oauth_user_info,
                )

                db.add(oauth_account)
                await db.commit()
                await db.refresh(oauth_account)

                logger.info(f"Created new user via {provider} OAuth: {new_user.id}")
                return new_user

            except Exception as e:
                await db.rollback()
                logger.error(f"Failed to create OAuth user: {str(e)}")
                raise DatabaseError(
                    message="Failed to create user account", details={"error": str(e)}
                )

        except ValidationError:
            raise
        except Exception as e:
            logger.error(
                f"Unexpected error in OAuth user creation: {str(e)}", exc_info=True
            )
            raise DatabaseError(
                message="OAuth authentication failed", details={"error": str(e)}
            )

    @staticmethod
    async def exchange_code_for_token_google(code: str, redirect_uri: str) -> str:
        """
        Exchange authorization code for Google access token

        Args:
            code: Authorization code from Google OAuth
            redirect_uri: Redirect URI used in the OAuth flow

        Returns:
            Access token string

        Raises:
            ValidationError: If code exchange fails
        """
        # Check if Google OAuth credentials are configured
        client_id = getattr(settings, "GOOGLE_OAUTH_CLIENT_ID", None)
        client_secret = getattr(settings, "GOOGLE_OAUTH_CLIENT_SECRET", None)

        if not client_id or not client_secret:
            raise ValidationError(
                message="Google OAuth is not configured",
                details={"setting": "GOOGLE_OAUTH_CLIENT_ID/SECRET not set"},
            )

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://oauth2.googleapis.com/token",
                    data={
                        "code": code,
                        "client_id": client_id,
                        "client_secret": client_secret,
                        "redirect_uri": redirect_uri,
                        "grant_type": "authorization_code",
                    },
                    headers={"Content-Type": "application/x-www-form-urlencoded"},
                    timeout=10.0,
                )

                if response.status_code != 200:
                    logger.error(
                        f"Google token exchange error: {response.status_code} - {response.text}"
                    )
                    raise ValidationError(
                        message="Failed to exchange authorization code for access token",
                        details={"status": response.status_code},
                    )

                token_data = response.json()
                access_token = token_data.get("access_token")

                if not access_token:
                    raise ValidationError(
                        message="No access token in response",
                        details={"response": token_data},
                    )

                return access_token

        except httpx.RequestError as e:
            logger.error(f"Google token exchange request error: {str(e)}")
            raise ValidationError(
                message="Failed to connect to Google OAuth service",
                details={"error": str(e)},
            )

    @staticmethod
    async def exchange_code_for_token_github(code: str, redirect_uri: str) -> str:
        """
        Exchange authorization code for GitHub access token

        Args:
            code: Authorization code from GitHub OAuth
            redirect_uri: Redirect URI used in the OAuth flow

        Returns:
            Access token string

        Raises:
            ValidationError: If code exchange fails
        """
        # Check if GitHub OAuth credentials are configured
        client_id = getattr(settings, "GITHUB_OAUTH_CLIENT_ID", None)
        client_secret = getattr(settings, "GITHUB_OAUTH_CLIENT_SECRET", None)

        if not client_id or not client_secret:
            raise ValidationError(
                message="GitHub OAuth is not configured",
                details={"setting": "GITHUB_OAUTH_CLIENT_ID/SECRET not set"},
            )

        try:
            async with httpx.AsyncClient() as client:
                # GitHub uses accept header for API version
                response = await client.post(
                    "https://github.com/login/oauth/access_token",
                    data={
                        "code": code,
                        "client_id": client_id,
                        "client_secret": client_secret,
                        "redirect_uri": redirect_uri,
                    },
                    headers={"Accept": "application/json"},
                    timeout=10.0,
                )

                if response.status_code != 200:
                    logger.error(
                        f"GitHub token exchange error: {response.status_code} - {response.text}"
                    )
                    raise ValidationError(
                        message="Failed to exchange authorization code for access token",
                        details={"status": response.status_code},
                    )

                token_data = response.json()

                if "error" in token_data:
                    logger.error(f"GitHub OAuth error: {token_data}")
                    raise ValidationError(
                        message=token_data.get(
                            "error_description", "GitHub OAuth failed"
                        ),
                        details={"error": token_data.get("error")},
                    )

                access_token = token_data.get("access_token")

                if not access_token:
                    raise ValidationError(
                        message="No access token in response",
                        details={"response": token_data},
                    )

                return access_token

        except httpx.RequestError as e:
            logger.error(f"GitHub token exchange request error: {str(e)}")
            raise ValidationError(
                message="Failed to connect to GitHub OAuth service",
                details={"error": str(e)},
            )
