"""Candidate career card API for SyncHire Lite."""

from typing import List
from uuid import uuid4

from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.local_first_helpers import dump_json, get_by_id_or_404, load_json
from app.core.database_lite import get_db
from app.models.candidate_profile_lite import CandidateProfile
from app.models.candidate_role_card_lite import CandidateRoleCard
from app.schemas.schemas_lite import (
    CandidateRoleCardCreate,
    CandidateRoleCardResponse,
    CandidateRoleCardUpdate,
)

router = APIRouter(prefix="/career-cards", tags=["career-cards"])


def _card_response(card: CandidateRoleCard) -> CandidateRoleCardResponse:
    return CandidateRoleCardResponse(
        id=str(card.id),
        profile_id=str(card.profile_id),
        name=card.name,
        target_roles=load_json(card.target_roles_json),
        strengths=load_json(card.strengths_json),
        weaknesses=load_json(card.weaknesses_json),
        core_skills=load_json(card.core_skills_json),
        proof_points=load_json(card.proof_points_json),
        tone_preferences=load_json(card.tone_preferences_json),
        generated_from=load_json(card.generated_from_json),
        model_provider=card.model_provider,
        model_name=card.model_name,
        created_at=card.created_at,
        updated_at=card.updated_at,
    )


@router.post(
    "", response_model=CandidateRoleCardResponse, status_code=status.HTTP_201_CREATED
)
async def create_career_card(
    card: CandidateRoleCardCreate, db: AsyncSession = Depends(get_db)
):
    """Create an editable career card."""
    profile = await get_by_id_or_404(
        db, CandidateProfile, card.profile_id, "profile_id"
    )
    db_card = CandidateRoleCard(
        id=uuid4(),
        profile_id=profile.id,
        name=card.name,
        target_roles_json=dump_json(card.target_roles),
        strengths_json=dump_json(card.strengths),
        weaknesses_json=dump_json(card.weaknesses),
        core_skills_json=dump_json(card.core_skills),
        proof_points_json=dump_json(card.proof_points),
        tone_preferences_json=dump_json(card.tone_preferences),
        generated_from_json=dump_json(card.generated_from),
        model_provider=card.model_provider,
        model_name=card.model_name,
    )

    db.add(db_card)
    await db.commit()
    await db.refresh(db_card)
    return _card_response(db_card)


@router.get("", response_model=List[CandidateRoleCardResponse])
async def list_career_cards(
    profile_id: str | None = None,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
):
    """List editable career cards."""
    query = select(CandidateRoleCard)
    if profile_id:
        profile = await get_by_id_or_404(db, CandidateProfile, profile_id, "profile_id")
        query = query.where(CandidateRoleCard.profile_id == profile.id)
    query = (
        query.offset(skip).limit(limit).order_by(CandidateRoleCard.updated_at.desc())
    )
    result = await db.execute(query)
    return [_card_response(card) for card in result.scalars().all()]


@router.get("/{card_id}", response_model=CandidateRoleCardResponse)
async def get_career_card(card_id: str, db: AsyncSession = Depends(get_db)):
    """Get an editable career card."""
    card = await get_by_id_or_404(db, CandidateRoleCard, card_id, "card_id")
    return _card_response(card)


@router.put("/{card_id}", response_model=CandidateRoleCardResponse)
async def update_career_card(
    card_id: str,
    card: CandidateRoleCardUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update an editable career card."""
    db_card = await get_by_id_or_404(db, CandidateRoleCard, card_id, "card_id")
    updates = card.model_dump(exclude_unset=True)
    json_fields = {
        "target_roles": "target_roles_json",
        "strengths": "strengths_json",
        "weaknesses": "weaknesses_json",
        "core_skills": "core_skills_json",
        "proof_points": "proof_points_json",
        "tone_preferences": "tone_preferences_json",
        "generated_from": "generated_from_json",
    }
    for field, value in updates.items():
        if field in json_fields:
            setattr(db_card, json_fields[field], dump_json(value))
        else:
            setattr(db_card, field, value)

    await db.commit()
    await db.refresh(db_card)
    return _card_response(db_card)


@router.delete("/{card_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_career_card(card_id: str, db: AsyncSession = Depends(get_db)):
    """Delete an editable career card."""
    card = await get_by_id_or_404(db, CandidateRoleCard, card_id, "card_id")
    await db.delete(card)
    await db.commit()
    return None
