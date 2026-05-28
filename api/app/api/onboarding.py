from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.user import UserResponse, OnboardingUpdate

router = APIRouter()


@router.get("/status", response_model=UserResponse)
async def get_onboarding_status(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """
    Get current user's onboarding status
    """
    return current_user


@router.post("/complete", response_model=UserResponse)
async def complete_onboarding(
    onboarding_data: OnboardingUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Mark user as onboarded and record completion details
    """
    if onboarding_data.is_onboarded and not current_user.is_onboarded:
        current_user.is_onboarded = True
        current_user.onboarding_completed_at = datetime.utcnow()

    db.commit()
    db.refresh(current_user)

    return current_user


@router.post("/skip", response_model=UserResponse)
async def skip_onboarding(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """
    Skip onboarding flow
    """
    current_user.is_onboarded = True
    current_user.onboarding_completed_at = datetime.utcnow()

    db.commit()
    db.refresh(current_user)

    return current_user


@router.post("/reset", response_model=UserResponse)
async def reset_onboarding(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """
    Reset onboarding status (for testing or re-onboarding)
    """
    current_user.is_onboarded = False
    current_user.onboarding_completed_at = None

    db.commit()
    db.refresh(current_user)

    return current_user
