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
