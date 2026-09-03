"""Tests for the PII scrubbing layer used on outbound LLM payloads.

Covers app.services.pii_scrub (detection, masking, idempotency, payload
shapes) plus one route-level check that the resume optimize endpoint
sends masked - not raw - contact details to the LLM client.
"""

import copy
from collections.abc import AsyncIterator
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.core.config_lite import get_lite_settings
from app.core.database_lite import Base, get_db
from app.models import (  # noqa: F401
    application_lite,
    application_material_lite,
    jd_lite,
    resume_lite,
    resume_variant_lite,
)
from app.services.ai_service_lite import ai_service
from app.services.pii_scrub import (
    detect_pii,
    restore_text,
    scrub_resume_payload,
    scrub_text,
    scrub_text_mapped,
)
from main_lite import app

VALID_ID = "11010519491231002X"


def test_valid_id_card_detected_and_masked() -> None:
    text = f"Id: {VALID_ID}"
    findings = detect_pii(text)
    assert [finding.type for finding in findings] == ["id_card"]
    assert (findings[0].start, findings[0].end) == (4, 22)
    assert scrub_text(text) == "Id: 110105********002X"


def test_checksum_invalid_id_not_detected() -> None:
    # Same digits as VALID_ID but the check digit must be X, not 0.
    invalid = "110105194912310020"
    text = f"Ref: {invalid}"
    assert detect_pii(text) == []
    assert scrub_text(text) == text


def test_mobile_masked() -> None:
    assert detect_pii("13812345678")[0].type == "mobile"
    assert scrub_text("Call 13812345678 now") == "Call 138****5678 now"


def test_email_masked() -> None:
    assert detect_pii("alice@example.com")[0].type == "email"
    assert scrub_text("Mail alice@example.com") == "Mail a***@example.com"


def test_international_phone_masked() -> None:
    assert detect_pii("+8613812345678")[0].type == "phone_intl"
    assert scrub_text("+8613812345678") == "+86****5678"


def test_id_card_wins_over_phone_overlap() -> None:
    findings = detect_pii(VALID_ID)
    assert len(findings) == 1
    assert findings[0].type == "id_card"
    assert findings[0].masked == "110105********002X"


def test_scrub_is_idempotent() -> None:
    text = (
        "Contact alice@example.com or 13812345678, "
        f"id {VALID_ID}, intl +8613812345678"
    )
    once = scrub_text(text)
    assert once != text
    assert scrub_text(once) == once


def test_scrub_text_mapped_round_trip() -> None:
    text = "Reach me at 13812345678"
    scrubbed, mapping = scrub_text_mapped(text)
    assert scrubbed == "Reach me at 138****5678"
    assert mapping == {"138****5678": "13812345678"}
    assert restore_text(scrubbed, mapping) == text


def test_scrub_resume_payload_same_shape_without_mutation() -> None:
    payload = {
        "contact": {"email": "alice@example.com", "phone": "13812345678"},
        "ids": [VALID_ID, 42, None],
        "score": 3.14,
    }
    original = copy.deepcopy(payload)

    result = scrub_resume_payload(payload)

    assert result == {
        "contact": {"email": "a***@example.com", "phone": "138****5678"},
        "ids": ["110105********002X", 42, None],
        "score": 3.14,
    }
    assert payload == original


@pytest.fixture
async def lite_client(monkeypatch: pytest.MonkeyPatch) -> AsyncIterator[AsyncClient]:
    """Isolated SyncHire Lite client with a fake OpenAI backend."""
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

    fake_content = "Optimized: Ping 138****5678 or a***@example.com for details"
    fake_response = SimpleNamespace(
        choices=[SimpleNamespace(message=SimpleNamespace(content=fake_content))]
    )
    fake_openai = AsyncMock()
    fake_openai.chat.completions.create = AsyncMock(return_value=fake_response)
    monkeypatch.setattr(ai_service, "openai_client", fake_openai)
    monkeypatch.setattr(get_lite_settings(), "PII_SCRUB_ENABLED", True)

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


async def test_optimize_endpoint_sends_masked_payload_to_llm(
    lite_client: AsyncClient,
) -> None:
    resume = (
        await lite_client.post(
            "/api/resumes",
            json={
                "title": "Resume",
                "content": "Ping 13812345678 or alice@example.com for details",
            },
        )
    ).json()

    response = await lite_client.post(f"/api/resumes/{resume['id']}/optimize")
    assert response.status_code == 200

    outbound = ai_service.openai_client.chat.completions.create.call_args.kwargs[
        "messages"
    ][1]["content"]
    assert "13812345678" not in outbound
    assert "alice@example.com" not in outbound
    assert "138****5678" in outbound
    assert "a***@example.com" in outbound

    # The persisted resume keeps the original values; only the LLM payload
    # was masked.
    refreshed = (await lite_client.get(f"/api/resumes/{resume['id']}")).json()
    assert refreshed["content"] == (
        "Optimized: Ping 13812345678 or alice@example.com for details"
    )
