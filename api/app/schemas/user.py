from pydantic import BaseModel, ConfigDict, EmailStr
from datetime import datetime
import uuid


class UserBase(BaseModel):
    email: EmailStr
    full_name: str | None = None


class UserCreate(UserBase):
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    is_active: bool
    is_onboarded: bool = False
    created_at: datetime
    updated_at: datetime


class OnboardingUpdate(BaseModel):
    is_onboarded: bool
    completed_steps: list[str] = []


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenRefresh(BaseModel):
    refresh_token: str
