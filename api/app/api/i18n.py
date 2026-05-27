"""Internationalization API endpoints."""

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from app.i18n import (
    get_supported_languages,
    is_language_supported,
    DEFAULT_LANGUAGE,
    t,
)
from app.i18n.middleware import get_language

router = APIRouter(prefix="/api/i18n", tags=["internationalization"])


class LanguagePreference(BaseModel):
    """Language preference model."""

    language: str


class LanguageResponse(BaseModel):
    """Language response model."""

    current_language: str
    supported_languages: list[str]
    default_language: str


class TranslationResponse(BaseModel):
    """Translation response model."""

    translations: dict


@router.get("/languages", response_model=LanguageResponse)
async def get_languages(request: Request):
    """
    Get available languages and current language setting.

    Returns:
        Current language and list of supported languages
    """
    current_language = get_language(request)

    return LanguageResponse(
        current_language=current_language,
        supported_languages=get_supported_languages(),
        default_language=DEFAULT_LANGUAGE,
    )


@router.post("/language")
async def set_language(
    preference: LanguagePreference,
    request: Request,
):
    """
    Set user language preference.

    Args:
        preference: Language preference model

    Returns:
        Success message
    """
    if not is_language_supported(preference.language):
        return {
            "error": t("errors.invalid_language", get_language(request)),
            "supported_languages": get_supported_languages(),
        }

    # Store in request state (in production, this would be stored in user profile)
    request.state.language = preference.language

    return {
        "message": t("success.updated", preference.language),
        "language": preference.language,
    }


@router.get("/translations", response_model=TranslationResponse)
async def get_translations(
    request: Request,
    language: str = None,
):
    """
    Get all translations for a language.

    Args:
        language: Language code (optional, defaults to current language)

    Returns:
        All translations for the specified language
    """
    if language and not is_language_supported(language):
        language = get_language(request)
    elif not language:
        language = get_language(request)

    # Import here to avoid circular dependency
    from app.i18n import translator

    translations = translator.get_all_translations(language)

    return TranslationResponse(translations=translations)


@router.get("/translations/{key}")
async def get_translation(
    key: str,
    request: Request,
    language: str = None,
):
    """
    Get a specific translation.

    Args:
        key: Translation key (e.g., 'errors.required')
        language: Language code (optional)

    Returns:
        Translated string
    """
    if not language:
        language = get_language(request)

    translation = t(key, language)

    return {"key": key, "translation": translation, "language": language}
