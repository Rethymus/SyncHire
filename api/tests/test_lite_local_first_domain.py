"""Regression tests for the SyncHire Lite local-first domain contract."""

import subprocess
import sys
from collections.abc import AsyncIterator

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import inspect
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.core.database_lite import Base, get_db
from app.models import (  # noqa: F401
    ai_provider_settings_lite,
    application_lite,
    application_material_lite,
    candidate_profile_item_lite,
    candidate_profile_lite,
    candidate_role_card_lite,
    jd_lite,
    resume_export_lite,
    resume_lite,
    resume_variant_lite,
)
from main_lite import app


@pytest.fixture
async def lite_client() -> AsyncIterator[AsyncClient]:
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


async def test_lite_schema_creates_local_first_tables() -> None:
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

        def table_names(sync_conn):
            return set(inspect(sync_conn).get_table_names())

        tables = await conn.run_sync(table_names)

    await engine.dispose()

    assert {
        "candidate_profiles",
        "candidate_profile_items",
        "candidate_role_cards",
        "ai_provider_settings",
        "resume_variants",
        "resume_exports",
        "application_materials",
    }.issubset(tables)


async def test_application_lite_import_registers_foreign_key_targets() -> None:
    script = """
from sqlalchemy.schema import CreateTable
from app.core.database_lite import Base
from app.models import application_lite  # noqa: F401
ddl = str(CreateTable(Base.metadata.tables["applications"]))
assert "resume_variants" in ddl
assert "application_materials" in ddl
"""
    result = subprocess.run(
        [sys.executable, "-c", script],
        check=False,
        capture_output=True,
        text=True,
    )

    assert result.returncode == 0, result.stderr


async def test_candidate_profile_to_resume_materials_flow(
    lite_client: AsyncClient,
) -> None:
    profile_response = await lite_client.post(
        "/api/profile",
        json={
            "display_name": "Lin Qiu",
            "target_title": "Junior Backend Engineer",
            "email": "lin@example.com",
            "phone": "+86 13800000000",
            "location": "Shanghai",
            "links": [{"label": "GitHub", "url": "https://github.com/linqiu"}],
            "summary": "Entry-level engineer focused on Python APIs.",
            "privacy_settings": {"private_fields": ["phone"]},
        },
    )
    assert profile_response.status_code == 201
    profile = profile_response.json()

    item_response = await lite_client.post(
        "/api/profile/items",
        json={
            "profile_id": profile["id"],
            "item_type": "project",
            "title": "Campus Job Tracker",
            "description": "Built a FastAPI job tracking service.",
            "highlights": ["Designed SQLite schema", "Added API tests"],
            "skills": ["Python", "FastAPI", "SQLite"],
            "visibility": "resume",
            "sort_order": 1,
        },
    )
    assert item_response.status_code == 201
    assert item_response.json()["skills"] == ["Python", "FastAPI", "SQLite"]

    card_response = await lite_client.post(
        "/api/career-cards",
        json={
            "profile_id": profile["id"],
            "name": "Backend New Grad",
            "target_roles": ["Backend Engineer", "Python Engineer"],
            "strengths": ["API design", "local-first data modeling"],
            "weaknesses": ["Limited production pager experience"],
            "core_skills": ["Python", "FastAPI", "SQL"],
            "proof_points": [{"source": "project", "title": "Campus Job Tracker"}],
            "tone_preferences": {"style": "concise"},
            "generated_from": {"profile_id": profile["id"]},
            "model_provider": "fallback",
            "model_name": "deterministic",
        },
    )
    assert card_response.status_code == 201
    card = card_response.json()

    resume_response = await lite_client.post(
        "/api/resumes",
        json={
            "title": "Base Resume",
            "content": "Lin Qiu\nPython / FastAPI / SQLite",
        },
    )
    assert resume_response.status_code == 201
    resume = resume_response.json()

    jd_response = await lite_client.post(
        "/api/jds",
        json={
            "company": "Acme Robotics",
            "title": "Junior Backend Engineer",
            "description": "We need Python, FastAPI, SQL, and API testing.",
            "platform": "boss",
            "source_url": "https://example.test/jobs/1",
            "raw_text": "Boss Zhipin JD raw text",
            "language": "zh",
            "parsed_json": {"keywords": ["Python", "FastAPI", "SQL"]},
            "notes": "Entry-level role",
        },
    )
    assert jd_response.status_code == 201
    jd = jd_response.json()
    assert jd["platform"] == "boss"
    assert jd["parsed_json"] == {"keywords": ["Python", "FastAPI", "SQL"]}

    application_response = await lite_client.post(
        "/api/applications",
        json={
            "resume_id": resume["id"],
            "jd_id": jd["id"],
            "status": "targeted",
            "platform": "boss",
            "source_url": "https://example.test/jobs/1",
            "notes": "Prepare tailored PDF before manual submission.",
        },
    )
    assert application_response.status_code == 201
    application = application_response.json()
    assert application["status"] == "targeted"

    variant_response = await lite_client.post(
        "/api/resume-variants",
        json={
            "profile_id": profile["id"],
            "role_card_id": card["id"],
            "jd_id": jd["id"],
            "application_id": application["id"],
            "title": "Acme Robotics - Junior Backend Engineer",
            "language": "zh",
            "template_id": "compact",
            "content_markdown": "# Lin Qiu\n\nPython Backend Engineer",
            "content_json": {"sections": ["summary", "projects"]},
            "match_score": 86.0,
            "keyword_hits": ["Python", "FastAPI", "SQL"],
            "gap_warnings": ["No production on-call experience"],
            "generation_rationale": "Matched projects to JD keywords.",
            "ai_provider": "fallback",
            "ai_model": "deterministic",
            "status": "draft",
        },
    )
    assert variant_response.status_code == 201
    variant = variant_response.json()
    assert variant["keyword_hits"] == ["Python", "FastAPI", "SQL"]

    export_response = await lite_client.post(
        "/api/resume-exports",
        json={
            "resume_variant_id": variant["id"],
            "export_format": "pdf",
            "file_path": "/tmp/acme-lin-qiu.pdf",
            "file_name": "acme-lin-qiu.pdf",
            "checksum": "sha256:test",
            "byte_size": 2048,
            "status": "created",
        },
    )
    assert export_response.status_code == 201
    assert export_response.json()["export_format"] == "pdf"

    material_response = await lite_client.post(
        "/api/application-materials",
        json={
            "profile_id": profile["id"],
            "jd_id": jd["id"],
            "resume_variant_id": variant["id"],
            "application_id": application["id"],
            "language": "zh",
            "platform": "boss",
            "form_fields": {"name": "Lin Qiu", "email": "lin@example.com"},
            "opening_message": "您好，我希望投递这个后端岗位。",
            "self_introduction": "我是一名关注 API 与数据建模的应届生。",
            "checklist": [{"label": "PDF reviewed", "done": True}],
            "review_status": "draft",
        },
    )
    assert material_response.status_code == 201
    material = material_response.json()
    assert material["review_status"] == "draft"

    blocked_response = await lite_client.put(
        f"/api/applications/{application['id']}",
        json={"materials_id": material["id"], "status": "materials_ready"},
    )
    assert blocked_response.status_code == 400
    assert "reviewed or ready" in blocked_response.json()["detail"]

    ready_material_response = await lite_client.put(
        f"/api/application-materials/{material['id']}",
        json={"review_status": "reviewed"},
    )
    assert ready_material_response.status_code == 200

    ready_application_response = await lite_client.put(
        f"/api/applications/{application['id']}",
        json={
            "resume_variant_id": variant["id"],
            "materials_id": material["id"],
            "status": "materials_ready",
            "next_action": "Manual submit on Boss Zhipin",
            "timeline": [{"event": "materials_reviewed"}],
        },
    )
    assert ready_application_response.status_code == 200
    ready_application = ready_application_response.json()
    assert ready_application["status"] == "materials_ready"
    assert ready_application["materials_id"] == material["id"]
    assert ready_application["resume_variant_id"] == variant["id"]
    assert ready_application["timeline"] == [{"event": "materials_reviewed"}]


async def test_ai_settings_never_return_plaintext_api_key(
    lite_client: AsyncClient,
) -> None:
    created_response = await lite_client.post(
        "/api/ai-settings",
        json={
            "provider": "kimi",
            "mode": "cloud",
            "display_name": "Kimi",
            "base_url": "https://api.moonshot.cn/v1",
            "model_name": "moonshot-v1-8k",
            "api_key": "sk-plaintext-secret",
            "enabled": True,
            "send_confirmation_required": True,
        },
    )
    assert created_response.status_code == 201
    created = created_response.json()
    assert created["has_api_key"] is True
    assert "api_key" not in created
    assert "api_key_ref" not in created
    assert "sk-plaintext-secret" not in created_response.text

    listed_response = await lite_client.get("/api/ai-settings")
    assert listed_response.status_code == 200
    assert "sk-plaintext-secret" not in listed_response.text
    assert "api_key_ref" not in listed_response.text
