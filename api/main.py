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
from app.api import (
    auth,
    resumes,
    jds,
    applications,
    search,
    notifications,
    analytics,
    search_history,
    password_reset,
    oauth,
    export,
    gdpr,
    two_factor,
    i18n,
    # compliance,  # TODO: Fix missing audit_service functions
    # tasks,  # TODO: Fix task_service import issues
    upload,
    # csv,  # TODO: Fix task_service import issues
)
from app.websocket import manager
from app.websocket.routes import router as websocket_router
from app.services.storage_service import StorageService
from app.services.email_service import email_service
from app.middleware.rate_limit import RateLimitMiddleware
from app.i18n.middleware import LanguageMiddleware
from app.middleware.error_tracking import (
    ErrorTrackingMiddleware,
    PerformanceMonitoringMiddleware,
    ErrorRateLimitingMiddleware,
)
from app.middleware.security_middleware import (
    SecurityHeadersMiddleware,
    InputValidationMiddleware,
    CSRFMiddleware,
    SecurityMonitoringMiddleware,
    ContentLengthMiddleware,
    SecurityContextMiddleware,
)
from app.middleware.audit_middleware import AuditMiddleware

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
        # Shutdown WebSocket server
        await manager.shutdown()

        # Shutdown Redis connections
        await redis_client.disconnect()
        await email_service.close_redis()

        # Close storage service
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

# Add security middleware (in order of execution)
app.add_middleware(SecurityHeadersMiddleware)  # Add security headers to all responses
app.add_middleware(ContentLengthMiddleware)  # Validate content length
app.add_middleware(InputValidationMiddleware)  # Validate and sanitize input
app.add_middleware(CSRFMiddleware)  # CSRF protection for state-changing operations
app.add_middleware(SecurityContextMiddleware)  # Add security context to requests
app.add_middleware(SecurityMonitoringMiddleware)  # Monitor security events

# Add rate limiting middleware (after security)
app.add_middleware(RateLimitMiddleware)

# Add language detection middleware
app.add_middleware(LanguageMiddleware)

# Add audit middleware for GDPR compliance
app.add_middleware(AuditMiddleware)

# Add error tracking middleware (add last for comprehensive coverage)
app.add_middleware(ErrorTrackingMiddleware)
app.add_middleware(PerformanceMonitoringMiddleware)
app.add_middleware(ErrorRateLimitingMiddleware)

# Register error handlers
app.add_exception_handler(SyncHireError, synchire_error_handler)
app.add_exception_handler(RequestValidationError, validation_error_handler)
app.add_exception_handler(StarletteHTTPException, http_error_handler)
app.add_exception_handler(Exception, general_error_handler)

# Include routers
app.include_router(auth.router, prefix="/api")
app.include_router(two_factor.router, prefix="/api")
app.include_router(resumes.router, prefix="/api")
app.include_router(jds.router, prefix="/api")
app.include_router(applications.router, prefix="/api")
app.include_router(search.router, prefix="/api")
app.include_router(search_history.router, prefix="/api")
app.include_router(notifications.router)
app.include_router(analytics.router, prefix="/api")
app.include_router(password_reset.router, prefix="/api")
app.include_router(oauth.router, prefix="/api")
app.include_router(export.router, prefix="/api")
app.include_router(gdpr.router, prefix="/api")
app.include_router(i18n.router)
# app.include_router(compliance.router)  # TODO: Fix missing audit_service functions
# app.include_router(tasks.router)  # TODO: Fix task_service import issues
app.include_router(upload.router, prefix="/api")
# app.include_router(csv.router)  # TODO: Fix task_service import issues
app.include_router(websocket_router)


@app.get("/")
async def root():
    return {"message": "SyncHire API", "version": "1.0.0", "status": "operational"}


@app.get("/health")
async def health():
    """Health check endpoint with comprehensive status"""
    health_status = {
        "status": "healthy",
        "services": {
            "api": "operational",
            "redis": "operational" if redis_client.is_connected() else "degraded",
        },
    }
    return health_status
