"""
SyncHire Lite - Local-First Job Application Tool

A lightweight version of SyncHire that runs locally without cloud dependencies.
Preserves AI functionality while removing authentication and cloud services.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config_lite import get_lite_settings
from app.core.database_lite import init_db, close_db
from app.core.logger import LogCategory, logger
from app.api.ai_settings_lite import router as ai_settings_router
from app.api.resumes_lite import router as resumes_router
from app.api.application_materials_lite import router as application_materials_router
from app.api.jds_lite import router as jds_router
from app.api.applications_lite import router as applications_router
from app.api.career_cards_lite import router as career_cards_router
from app.api.profile_lite import items_router as profile_items_router
from app.api.profile_lite import router as profile_router
from app.api.search_lite import router as search_router
from app.api.portability import router as portability_router
from app.api.resume_exports_lite import router as resume_exports_router
from app.api.resume_variants_lite import router as resume_variants_router

settings = get_lite_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager.

    Handles startup and shutdown events for the lightweight application.
    """
    # Startup
    logger.info(LogCategory.API, "Starting SyncHire Lite...")
    logger.info(LogCategory.API, f"Data directory: {settings.DATA_DIR}")
    logger.info(LogCategory.API, f"Database: {settings.DATABASE_PATH}")

    # Initialize database
    await init_db()
    logger.info(LogCategory.DATABASE, "Database initialized successfully")

    # Create necessary directories
    settings.DATA_DIR.mkdir(parents=True, exist_ok=True)
    settings.FILES_DIR.mkdir(parents=True, exist_ok=True)
    settings.BACKUPS_DIR.mkdir(parents=True, exist_ok=True)
    settings.EXPORTS_DIR.mkdir(parents=True, exist_ok=True)
    settings.EXTENSIONS_DIR.mkdir(parents=True, exist_ok=True)

    yield

    # Shutdown
    logger.info(LogCategory.API, "Shutting down SyncHire Lite...")
    await close_db()
    logger.info(LogCategory.DATABASE, "Database connections closed")


# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="Local-first job application tool with AI-powered features",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring."""
    return {"status": "healthy", "version": settings.VERSION, "mode": "lite"}


# Include simplified API routers
app.include_router(resumes_router, prefix="/api", tags=["resumes"])
app.include_router(jds_router, prefix="/api", tags=["job-descriptions"])
app.include_router(applications_router, prefix="/api", tags=["applications"])
app.include_router(
    profile_items_router, prefix="/api", tags=["candidate-profile-items"]
)
app.include_router(profile_router, prefix="/api", tags=["candidate-profile"])
app.include_router(ai_settings_router, prefix="/api", tags=["ai-settings"])
app.include_router(career_cards_router, prefix="/api", tags=["career-cards"])
app.include_router(resume_variants_router, prefix="/api", tags=["resume-variants"])
app.include_router(resume_exports_router, prefix="/api", tags=["resume-exports"])
app.include_router(
    application_materials_router, prefix="/api", tags=["application-materials"]
)
app.include_router(search_router, prefix="/api", tags=["search"])
app.include_router(portability_router, prefix="/api", tags=["portability"])


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "name": settings.APP_NAME,
        "version": settings.VERSION,
        "description": "Local-first job application tool",
        "docs": "/docs",
        "mode": "lite",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main_lite:app",
        host="127.0.0.1",
        port=8000,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower(),
    )
