import uuid

import pytest

from app.api.csv import ExportProgressTracker, ImportProgressTracker
from app.middleware.rate_limit import RateLimitType
from app.models.audit_log import AuditAction, ResourceType
from app.services.audit_service import AuditService


def test_restored_api_routers_are_registered():
    from main import app

    paths = app.openapi()["paths"]

    assert "/api/compliance/health" in paths
    assert "/api/tasks/" in paths
    assert "/api/csv/export/{job_id}/status" in paths
    assert "/api/advanced-search/health" in paths
    assert "/api/advanced-search/analytics/popular/{search_type}" in paths


def test_default_rate_limit_type_is_general_alias():
    assert RateLimitType.DEFAULT is RateLimitType.GENERAL


@pytest.mark.asyncio
async def test_csv_progress_trackers_fallback_to_memory_without_redis():
    export_job_id = str(uuid.uuid4())
    import_job_id = str(uuid.uuid4())

    await ExportProgressTracker.update_progress(
        export_job_id,
        {"status": "completed", "progress": 100, "processed": 3, "total": 3},
    )
    await ImportProgressTracker.update_progress(
        import_job_id,
        {"status": "pending", "progress": 10, "processed": 1, "total": 10},
    )

    assert await ExportProgressTracker.get_progress(export_job_id) == {
        "status": "completed",
        "progress": 100,
        "processed": 3,
        "total": 3,
    }
    assert await ImportProgressTracker.get_progress(import_job_id) == {
        "status": "pending",
        "progress": 10,
        "processed": 1,
        "total": 10,
    }


@pytest.mark.asyncio
async def test_audit_service_writes_request_metadata(db_session, test_user):
    resource_id = uuid.uuid4()

    audit_log = await AuditService.log_action(
        db=db_session,
        user_id=test_user.id,
        action=AuditAction.READ,
        resource_type=ResourceType.USER,
        resource_id=resource_id,
        request_id="request-123",
        metadata={"path": "/api/auth/me", "status_code": 200},
    )

    assert audit_log.request_metadata == {
        "path": "/api/auth/me",
        "status_code": 200,
    }
