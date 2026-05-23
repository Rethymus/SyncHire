# FastAPI application factory pattern
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import get_settings

settings = get_settings()


def create_app() -> FastAPI:
    app = FastAPI(
        title="SyncHire API",
        description="AI-powered job application platform",
        version="0.1.0",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    return app
