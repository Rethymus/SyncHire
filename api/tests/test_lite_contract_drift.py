"""Contract tests for lite endpoints added to close frontend/backend drift.

Covers the endpoints the frontend actually calls but the lite backend was
missing (see the API contract drift audit):

- PATCH /api/applications/{id}/status
- GET  /api/applications/{id}/history
- GET  /api/applications/{id}/match        (frontend used GET, lite only had POST)
- GET  /api/applications/{id}/interview-prep
- POST /api/resumes/{id}/optimize          (response shape aligned with frontend)
"""

from collections.abc import AsyncIterator
from unittest.mock import AsyncMock

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.core.database_lite import Base, get_db
from app.models import (  # noqa: F401
    application_lite,
    application_material_lite,
    jd_lite,
    resume_lite,
    resume_variant_lite,
)
from app.services.ai_service_lite import ai_service
from main_lite import app


@pytest.fixture
async def lite_client(monkeypatch: pytest.MonkeyPatch) -> AsyncIterator[AsyncClient]:
    """Create an isolated SyncHire Lite client backed by in-memory SQLite."""
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    session_factory = async_sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Keep AI-dependent endpoints deterministic and hermetic regardless of
    # whether the host environment has API keys configured.
    monkeypatch.setattr(
        ai_service, "calculate_match_score", AsyncMock(return_value=82.5)
    )
    monkeypatch.setattr(
        ai_service,
        "generate_interview_questions",
        AsyncMock(return_value=[f"Question {i}?" for i in range(9)]),
    )
    monkeypatch.setattr(
        ai_service,
        "optimize_resume",
        AsyncMock(return_value="Optimized resume with kubernetes"),
    )

    async def override_get_db() -> AsyncIterator[AsyncSession]:
        async with session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client

    app.dependency_overrides.clear()
    await engine.dispose()


async def _create_application(client: AsyncClient) -> dict:
    resume = (
        await client.post(
            "/api/resumes",
            json={"title": "Base Resume", "content": "Python FastAPI engineer"},
        )
    ).json()
    jd = (
        await client.post(
            "/api/jds",
            json={
                "company": "Acme",
                "title": "Platform Engineer",
                "description": "Python kubernetes docker reliability",
            },
        )
    ).json()
    application = (
        await client.post(
            "/api/applications",
            json={"resume_id": resume["id"], "jd_id": jd["id"]},
        )
    ).json()
    return application


async def test_patch_status_updates_and_records_history(
    lite_client: AsyncClient,
) -> None:
    application = await _create_application(lite_client)

    patch_response = await lite_client.patch(
        f"/api/applications/{application['id']}/status",
        json={"status": "interview", "notes": "Phone screen passed"},
    )
    assert patch_response.status_code == 200
    patched = patch_response.json()
    assert patched["status"] == "interview"
    assert patched["notes"] == "Phone screen passed"

    history_response = await lite_client.get(
        f"/api/applications/{application['id']}/history"
    )
    assert history_response.status_code == 200
    history = history_response.json()
    assert len(history) == 1
    assert history[0]["old_status"] == "saved"
    assert history[0]["new_status"] == "interview"
    assert history[0]["notes"] == "Phone screen passed"
    assert history[0]["changed_at"]
    assert history[0]["id"]


async def test_patch_status_accepts_legacy_frontend_aliases(
    lite_client: AsyncClient,
) -> None:
    application = await _create_application(lite_client)

    legacy_response = await lite_client.patch(
        f"/api/applications/{application['id']}/status",
        json={"status": "optimized"},
    )
    assert legacy_response.status_code == 200
    assert legacy_response.json()["status"] == "targeted"


async def test_patch_status_rejects_invalid_status(lite_client: AsyncClient) -> None:
    application = await _create_application(lite_client)

    invalid_response = await lite_client.patch(
        f"/api/applications/{application['id']}/status",
        json={"status": "definitely-not-a-status"},
    )
    assert invalid_response.status_code == 400

    missing_response = await lite_client.patch(
        "/api/applications/00000000-0000-0000-0000-000000000000/status",
        json={"status": "interview"},
    )
    assert missing_response.status_code == 404


async def test_get_match_returns_frontend_shape_and_persists(
    lite_client: AsyncClient,
) -> None:
    application = await _create_application(lite_client)

    match_response = await lite_client.get(
        f"/api/applications/{application['id']}/match"
    )
    assert match_response.status_code == 200
    payload = match_response.json()
    assert payload["match_score"] == 82.5
    details = payload["match_details"]
    assert set(details) == {
        "skills_match",
        "experience_match",
        "education_match",
        "missing_skills",
        "recommendations",
    }
    assert "kubernetes" in details["missing_skills"]

    refreshed = (await lite_client.get(f"/api/applications/{application['id']}")).json()
    assert refreshed["match_score"] == 82.5


async def test_get_interview_prep_returns_frontend_payload(
    lite_client: AsyncClient,
) -> None:
    application = await _create_application(lite_client)

    prep_response = await lite_client.get(
        f"/api/applications/{application['id']}/interview-prep"
    )
    assert prep_response.status_code == 200
    prep = prep_response.json()
    assert set(prep) == {
        "hrQuestions",
        "technicalQuestions",
        "behavioralQuestions",
        "selfIntroduction",
        "reverseQuestions",
        "checklist",
        "generatedAt",
        "targetRole",
        "targetCompany",
    }
    assert prep["targetRole"] == "Platform Engineer"
    assert prep["targetCompany"] == "Acme"
    total = (
        len(prep["hrQuestions"])
        + len(prep["technicalQuestions"])
        + len(prep["behavioralQuestions"])
    )
    assert total == 9
    for question in prep["hrQuestions"]:
        assert question["question"]
        assert question["category"] in {"hr", "technical", "behavioral"}
        assert question["priority"] in {"high", "medium", "low"}
        assert isinstance(question["talkingPoints"], list)


async def test_resume_optimize_returns_optimization_result_shape(
    lite_client: AsyncClient,
) -> None:
    resume = (
        await lite_client.post(
            "/api/resumes", json={"title": "Resume", "content": "original"}
        )
    ).json()

    optimize_response = await lite_client.post(
        f"/api/resumes/{resume['id']}/optimize",
        json={"jd_content": "kubernetes docker python"},
    )
    assert optimize_response.status_code == 200
    payload = optimize_response.json()
    assert set(payload) == {
        "optimized_content",
        "changes_made",
        "keywords_added",
        "sections_improved",
    }
    assert payload["optimized_content"] == "Optimized resume with kubernetes"
    assert "kubernetes" in payload["keywords_added"]

    refreshed = (await lite_client.get(f"/api/resumes/{resume['id']}")).json()
    assert refreshed["content"] == payload["optimized_content"]

    missing = await lite_client.post(
        "/api/resumes/00000000-0000-0000-0000-000000000000/optimize", json={}
    )
    assert missing.status_code == 404
