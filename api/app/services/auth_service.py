from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status
from app.models.user import User
from app.schemas.user import UserCreate
from app.core.security import get_password_hash, verify_password


class AuthService:
    @staticmethod
    async def register(db: AsyncSession, user_data: UserCreate) -> User:
        result = await db.execute(select(User).where(User.email == user_data.email))
        existing_user = result.scalar_one_or_none()

        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )

        hashed_password = get_password_hash(user_data.password)
        db_user = User(
            email=user_data.email,
            full_name=user_data.full_name,
            hashed_password=hashed_password,
        )

        db.add(db_user)
        await db.commit()
        await db.refresh(db_user)

        return db_user

    @staticmethod
    async def authenticate(db: AsyncSession, email: str, password: str) -> User | None:
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()

        if not user or not verify_password(password, user.hashed_password):
            return None

        return user
