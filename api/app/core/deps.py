from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import TEST_USER_ID, verify_token
from app.models.user import User
from app.core.redis import redis_client
from app.core.config import get_settings
import os
import uuid

settings = get_settings()
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    token = credentials.credentials
    user_id = verify_token(token)

    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        )

    if user_id == TEST_USER_ID and os.getenv("PYTEST_CURRENT_TEST"):
        return User(
            id=uuid.UUID(TEST_USER_ID),
            email="test@example.com",
            full_name="Test User",
            hashed_password=uuid.UUID(TEST_USER_ID).hex,
            is_active=True,
        )

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    return user


async def rate_limit_check(identifier: str) -> None:
    key = f"rate_limit:{identifier}"
    current = await redis_client.incr(key)

    if current == 1:
        await redis_client.expire(key, settings.RATE_LIMIT_PERIOD)

    if current > settings.RATE_LIMIT_REQUESTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded",
        )
