import os
from secrets import token_urlsafe
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Database
    POSTGRES_USER: str = "synchire"
    POSTGRES_PASSWORD: str = "synchire_dev"
    POSTGRES_DB: str = "synchire"
    DATABASE_URL: str = ""

    # Redis
    REDIS_URL: str = "redis://localhost:6379"

    # JWT - Use environment variable or generate a secure random key
    JWT_SECRET: str = os.getenv("JWT_SECRET", token_urlsafe(32))
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRES_IN: int = 7 * 24 * 60 * 60  # 7 days

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    # Rate Limiting
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_PERIOD: int = 60  # 1 minute
    RATE_LIMIT_REQUESTS: int = 100  # 100 requests per period (default)

    # Rate Limiting by Endpoint Type
    RATE_LIMIT_SEARCH: int = 100  # 100 requests/minute for search endpoints
    RATE_LIMIT_AUTH: int = 10  # 10 requests/minute for auth endpoints
    RATE_LIMIT_UPLOAD: int = 5  # 5 requests/minute for file uploads
    RATE_LIMIT_GENERAL: int = 60  # 60 requests/minute for general API

    # Rate Limiting Configuration
    RATE_LIMIT_USE_IP_FALLBACK: bool = (
        True  # Use IP-based limiting for unauthenticated requests
    )
    RATE_LIMIT_WINDOW_SIZE: int = 60  # Time window in seconds

    # File Upload
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB
    ALLOWED_EXTENSIONS: set[str] = {".pdf", ".doc", ".docx", ".txt"}

    # AI APIs
    OPENAI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""

    # MCP Server
    MCP_SERVER_URL: str = "http://localhost:3000"

    # Minio
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
    MINIO_SECRET_KEY: str = os.getenv("MINIO_SECRET_KEY", "minioadmin")
    MINIO_USE_SSL: bool = False

    # Email/SMTP Configuration
    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USERNAME: str = os.getenv("SMTP_USERNAME", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    SMTP_USE_TLS: bool = os.getenv("SMTP_USE_TLS", "true").lower() == "true"
    FROM_EMAIL: str = os.getenv("FROM_EMAIL", "noreply@synchire.com")
    FROM_NAME: str = os.getenv("FROM_NAME", "SyncHire")

    # Email Queue Configuration
    EMAIL_QUEUE_ENABLED: bool = (
        os.getenv("EMAIL_QUEUE_ENABLED", "true").lower() == "true"
    )
    EMAIL_QUEUE_BATCH_SIZE: int = int(os.getenv("EMAIL_QUEUE_BATCH_SIZE", "10"))
    EMAIL_QUEUE_PROCESS_INTERVAL: int = int(
        os.getenv("EMAIL_QUEUE_PROCESS_INTERVAL", "60")
    )  # seconds

    # Frontend URLs
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")

    # OAuth Configuration
    GOOGLE_OAUTH_CLIENT_ID: str = os.getenv("GOOGLE_OAUTH_CLIENT_ID", "")
    GOOGLE_OAUTH_CLIENT_SECRET: str = os.getenv("GOOGLE_OAUTH_CLIENT_SECRET", "")
    GITHUB_OAUTH_CLIENT_ID: str = os.getenv("GITHUB_OAUTH_CLIENT_ID", "")
    GITHUB_OAUTH_CLIENT_SECRET: str = os.getenv("GITHUB_OAUTH_CLIENT_SECRET", "")

    class Config:
        env_file = ".env"
        case_sensitive = True

    @property
    def async_database_url(self) -> str:
        if self.DATABASE_URL:
            return self.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")
        return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@localhost:5432/{self.POSTGRES_DB}"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
