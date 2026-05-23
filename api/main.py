from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import get_settings
from app.core.database import init_db
from app.core.redis import redis_client
from app.api import auth, resumes, jds, applications, search
from app.services.storage_service import StorageService

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await redis_client.connect()
    await init_db()
    yield
    # Shutdown
    await redis_client.disconnect()
    await StorageService.close()


app = FastAPI(
    title="SyncHire API",
    description="知遇 - AI-powered resume optimization and job matching platform",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(resumes.router, prefix="/api")
app.include_router(jds.router, prefix="/api")
app.include_router(applications.router, prefix="/api")
app.include_router(search.router, prefix="/api")


@app.get("/")
async def root():
    return {"message": "SyncHire API", "version": "1.0.0"}


@app.get("/health")
async def health():
    return {"status": "healthy"}
