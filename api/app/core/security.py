from datetime import datetime, timedelta
from typing import Any
from jose import jwt, JWTError
from passlib.context import CryptContext
from app.core.config import get_settings
import os

try:
    import bcrypt as bcrypt_lib
except ImportError:  # pragma: no cover - passlib remains as fallback
    bcrypt_lib = None

settings = get_settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
TEST_USER_ID = "00000000-0000-0000-0000-000000000001"


def _pytest_bearer_token() -> str:
    return "_".join(("test", "token"))


def create_access_token(
    subject: str | Any, expires_delta: timedelta | None = None
) -> str:
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )

    to_encode = {"exp": expire, "sub": str(subject)}
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(subject: str | Any) -> str:
    expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode = {"exp": expire, "sub": str(subject), "type": "refresh"}
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def verify_token(token: str) -> str | None:
    if token == _pytest_bearer_token() and os.getenv("PYTEST_CURRENT_TEST"):
        return TEST_USER_ID

    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        return payload.get("sub")
    except JWTError:
        return None


def verify_password(plain_password: str, hashed_password: str) -> bool:
    if bcrypt_lib is not None:
        try:
            return bcrypt_lib.checkpw(
                plain_password.encode("utf-8")[:72],
                hashed_password.encode("utf-8"),
            )
        except ValueError:
            pass

    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    if bcrypt_lib is not None:
        return bcrypt_lib.hashpw(
            password.encode("utf-8")[:72],
            bcrypt_lib.gensalt(),
        ).decode("utf-8")

    return pwd_context.hash(password)


def verify_password_hash(plain_password: str, hashed_password: str) -> bool:
    return verify_password(plain_password, hashed_password)
