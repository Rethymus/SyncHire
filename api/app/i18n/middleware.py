"""Language detection middleware for the API."""

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from typing import Optional
from app.i18n import is_language_supported, DEFAULT_LANGUAGE


class LanguageMiddleware(BaseHTTPMiddleware):
    """Middleware to detect and set user language preference."""

    async def dispatch(self, request: Request, call_next):
        # Get language from various sources in order of priority
        language = self._get_language(request)

        # Store language in request state for use in endpoints
        request.state.language = language

        response = await call_next(request)
        return response

    def _get_language(self, request: Request) -> str:
        """
        Determine user language preference from multiple sources.

        Priority:
        1. Query parameter (?lang=en-US)
        2. Custom header (X-Language)
        3. Accept-Language header
        4. User preference from database (if authenticated)
        5. Default language
        """
        # 1. Check query parameter
        language = request.query_params.get("lang")
        if language and is_language_supported(language):
            return language

        # 2. Check custom header
        language = request.headers.get("X-Language")
        if language and is_language_supported(language):
            return language

        # 3. Check Accept-Language header
        accept_language = request.headers.get("Accept-Language")
        if accept_language:
            # Parse Accept-Language header
            language = self._parse_accept_language(accept_language)
            if language and is_language_supported(language):
                return language

        # 4. Check user preference (would need database access)
        # This can be implemented later with authentication

        # 5. Fall back to default
        return DEFAULT_LANGUAGE

    def _parse_accept_language(self, accept_language: str) -> Optional[str]:
        """
        Parse Accept-Language header and return best match.

        Example: "en-US,en;q=0.9,zh-CN;q=0.8" -> "en-US"
        """
        languages = accept_language.split(",")
        for lang in languages:
            # Remove quality value and whitespace
            lang = lang.split(";")[0].strip()
            if is_language_supported(lang):
                return lang

        return None


def get_language(request: Request) -> str:
    """
    Helper function to get language from request state.

    Args:
        request: FastAPI request object

    Returns:
        Language code
    """
    return getattr(request.state, "language", DEFAULT_LANGUAGE)