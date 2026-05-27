"""Internationalization (i18n) module for the API."""

from .translations import (
    translator,
    t,
    get_supported_languages,
    is_language_supported,
    SUPPORTED_LANGUAGES,
    DEFAULT_LANGUAGE,
)

__all__ = [
    "translator",
    "t",
    "get_supported_languages",
    "is_language_supported",
    "SUPPORTED_LANGUAGES",
    "DEFAULT_LANGUAGE",
]
