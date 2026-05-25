from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from app.core.config import get_settings
from app.core.database import init_db
from app.core.redis import redis_client
from app.core.errors import (
    SyncHireError,
    synchire_error_handler,
    validation_error_handler,
    http_error_handler,
    general_error_handler,
)
from app.api import auth, resumes, jds, applications, search, notifications, analytics
from app.services.storage_service import StorageService
from app.services.email_service import email_service
from app.middleware.rate_limit import RateLimitMiddleware

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    try:
        await redis_client.connect()
        await email_service.initialize_redis()
        await init_db()
        print("✅ All services initialized successfully")
    except Exception as e:
        print(f"❌ Failed to initialize services: {str(e)}")
        raise
    yield
    # Shutdown
    try:
        await redis_client.disconnect()
        await email_service.close_redis()
        await StorageService.close()
        print("✅ All services shut down successfully")
    except Exception as e:
        print(f"❌ Error during shutdown: {str(e)}")


app = FastAPI(
    title="SyncHire API",
    description="知遇 - AI-powered resume optimization and job matching platform",
    version="1.0.0",
    lifespan=lifespan,
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add rate limiting middleware (after CORS)
app.add_middleware(RateLimitMiddleware)

# Register error handlers
app.add_exception_handler(SyncHireError, synchire_error_handler)
app.add_exception_handler(RequestValidationError, validation_error_handler)
app.add_exception_handler(StarletteHTTPException, http_error_handler)
app.add_exception_handler(Exception, general_error_handler)

# Include routers
app.include_router(auth.router, prefix="/api")
app.include_router(resumes.router, prefix="/api")
app.include_router(jds.router, prefix="/api")
app.include_router(applications.router, prefix="/api")
app.include_router(search.router, prefix="/api")
app.include_router(notifications.router)
app.include_router(analytics.router, prefix="/api")


@app.get("/")
async def root():
    return {
        "message": "SyncHire API",
        "version": "1.0.0",
        "status": "operational"
    }


@app.get("/health")
async def health():
    """Health check endpoint with comprehensive status"""
    health_status = {
        "status": "healthy",
        "services": {
            "api": "operational",
            "redis": "operational" if redis_client.is_connected() else "degraded",
        }
    }
    return health_status
