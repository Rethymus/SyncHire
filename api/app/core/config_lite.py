"""
Lightweight Configuration for Local-First SyncHire

This configuration removes all cloud dependencies and simplifies the setup
for local-only operation while preserving AI functionality.
"""

import os
from pathlib import Path
from secrets import token_urlsafe
from pydantic_settings import BaseSettings
from functools import lru_cache


class LiteSettings(BaseSettings):
    # Application
    APP_NAME: str = "SyncHire Lite"
    DEBUG: bool = False
    VERSION: str = "1.0.0"

    # Data Directory (Local Storage)
    DATA_DIR: Path = Path.home() / ".synchire"
    DATABASE_PATH: Path = DATA_DIR / "synchire.db"
    FILES_DIR: Path = DATA_DIR / "files"
    BACKUPS_DIR: Path = DATA_DIR / "backups"
    EXPORTS_DIR: Path = DATA_DIR / "exports"

    # Security (Minimal - local tool)
    SECRET_KEY: str = os.getenv("SECRET_KEY", token_urlsafe(32))

    # CORS (Allow local development)
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:3001"]

    # File Upload
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB
    ALLOWED_EXTENSIONS: set[str] = {".pdf", ".doc", ".docx", ".txt"}

    # AI APIs (Preserved - these require network)
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    AI_TIMEOUT: int = 30  # seconds
    AI_MAX_RETRIES: int = 3

    # MCP Servers (Local - preserved)
    MCP_JD_PARSER_URL: str = os.getenv("MCP_JD_PARSER_URL", "http://localhost:3001")
    MCP_RESUME_ANALYZER_URL: str = os.getenv("MCP_RESUME_ANALYZER_URL", "http://localhost:3002")
    MCP_JOB_MATCHER_URL: str = os.getenv("MCP_JOB_MATCHER_URL", "http://localhost:3003")
    MCP_INTERVIEW_PREP_URL: str = os.getenv("MCP_INTERVIEW_PREP_URL", "http://localhost:3004")

    # Extensions (Future platform integrations)
    EXTENSIONS_ENABLED: bool = False
    EXTENSIONS_DIR: Path = DATA_DIR / "extensions"

    # Frontend
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")

    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FILE: Path = DATA_DIR / "synchire.log"

    class Config:
        env_file = ".env.lite"
        case_sensitive = True

    @property
    def database_url(self) -> str:
        """SQLite database URL for local storage."""
        # Ensure data directory exists
        self.DATA_DIR.mkdir(parents=True, exist_ok=True)
        self.FILES_DIR.mkdir(parents=True, exist_ok=True)
        self.BACKUPS_DIR.mkdir(parents=True, exist_ok=True)
        self.EXPORTS_DIR.mkdir(parents=True, exist_ok=True)
        self.EXTENSIONS_DIR.mkdir(parents=True, exist_ok=True)

        return f"sqlite:///{self.DATABASE_PATH}"

    @property
    def async_database_url(self) -> str:
        """Async SQLite database URL."""
        return f"sqlite+aiosqlite:///{self.DATABASE_PATH}"


@lru_cache()
def get_lite_settings() -> LiteSettings:
    """Get cached LiteSettings instance."""
    return LiteSettings()


# Convenience export
settings = get_lite_settings()
