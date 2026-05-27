"""Translation management for the API."""

from typing import Dict, Any
from pathlib import Path
import json
from functools import lru_cache

# Supported languages
SUPPORTED_LANGUAGES = ["en-US", "zh-CN"]
DEFAULT_LANGUAGE = "zh-CN"


class TranslationManager:
    """Manages translations for the API."""

    def __init__(self, translations_dir: Path = Path(__file__).parent / "locales"):
        self.translations_dir = translations_dir
        self._translations: Dict[str, Dict[str, Any]] = {}
        self._load_translations()

    def _load_translations(self):
        """Load all translation files."""
        self.translations_dir.mkdir(exist_ok=True)

        for lang in SUPPORTED_LANGUAGES:
            lang_file = self.translations_dir / f"{lang}.json"
            if lang_file.exists():
                with open(lang_file, "r", encoding="utf-8") as f:
                    self._translations[lang] = json.load(f)
            else:
                # Create empty translation dict if file doesn't exist
                self._translations[lang] = {}

    def get_translation(
        self, key: str, language: str = DEFAULT_LANGUAGE, **kwargs
    ) -> str:
        """
        Get a translation string.

        Args:
            key: Translation key in dot notation (e.g., 'errors.required')
            language: Language code
            **kwargs: Variables for string formatting

        Returns:
            Translated string
        """
        if language not in SUPPORTED_LANGUAGES:
            language = DEFAULT_LANGUAGE

        # Navigate through the nested structure
        keys = key.split(".")
        value = self._translations.get(language, {})

        for k in keys:
            if isinstance(value, dict):
                value = value.get(k, key)
            else:
                value = key
                break

        # Format the string if kwargs provided
        if kwargs and isinstance(value, str):
            try:
                return value.format(**kwargs)
            except (KeyError, ValueError):
                return value

        return value if isinstance(value, str) else key

    def get_all_translations(self, language: str = DEFAULT_LANGUAGE) -> Dict[str, Any]:
        """Get all translations for a language."""
        if language not in SUPPORTED_LANGUAGES:
            language = DEFAULT_LANGUAGE
        return self._translations.get(language, {})


# Global translation manager instance
translator = TranslationManager()


def t(key: str, language: str = DEFAULT_LANGUAGE, **kwargs) -> str:
    """
    Convenience function to get translations.

    Args:
        key: Translation key in dot notation
        language: Language code
        **kwargs: Variables for string formatting

    Returns:
        Translated string
    """
    return translator.get_translation(key, language, **kwargs)


def get_supported_languages() -> list[str]:
    """Get list of supported language codes."""
    return SUPPORTED_LANGUAGES.copy()


def is_language_supported(language: str) -> bool:
    """Check if a language is supported."""
    return language in SUPPORTED_LANGUAGES
