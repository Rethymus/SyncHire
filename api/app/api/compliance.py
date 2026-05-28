"""
Compliance API Endpoints for GDPR

Provides endpoints for audit reports, data exports, and compliance documentation.
"""

import uuid
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.logger import logger
from app.services.audit_service import (
    get_audit_logs,
    export_audit_log,
    get_audit_statistics,
    get_user_audit_history,
)
from app.services.auth_service_enhanced import get_current_user
from app.models.user import User
from app.models.audit_log import AuditAction, ResourceType

router = APIRouter(prefix="/api/compliance", tags=["compliance"])


@router.get("/audit-report")
async def get_audit_report(
    start_date: Optional[datetime] = Query(
        None, description="Start date for report range"
    ),
    end_date: Optional[datetime] = Query(None, description="End date for report range"),
    user_id: Optional[uuid.UUID] = Query(None, description="Filter by specific user"),
    action_type: Optional[str] = Query(None, description="Filter by action type"),
    resource_type: Optional[str] = Query(None, description="Filter by resource type"),
    format: str = Query("csv", description="Export format (csv or json)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum records to return"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get audit report for compliance reporting.

    Requires authentication. Admin users can access all logs, regular users only their own.

    Args:
        start_date: Start of date range (defaults to 30 days ago)
        end_date: End of date range (defaults to now)
        user_id: Filter by specific user (admin only)
        action_type: Filter by action type
        resource_type: Filter by resource type
        format: Export format (csv or json)
        skip: Pagination offset
        limit: Maximum records to return

    Returns:
        Audit log data in requested format
    """
    try:
        # Set default date range if not provided
        if not start_date:
            start_date = datetime.utcnow() - timedelta(days=30)
        if not end_date:
            end_date = datetime.utcnow()

        # Validate date range
        if start_date >= end_date:
            raise HTTPException(
                status_code=400, detail="start_date must be before end_date"
            )

        # Validate format
        if format not in ["csv", "json"]:
            raise HTTPException(
                status_code=400, detail="format must be 'csv' or 'json'"
            )

        # Check permissions - regular users can only access their own logs
        is_admin = getattr(current_user, "is_admin", False)
        if not is_admin and user_id and user_id != current_user.id:
            raise HTTPException(
                status_code=403, detail="You can only access your own audit logs"
            )

        # If not admin, force filter to current user
        if not is_admin:
            user_id = current_user.id

        # Convert string filters to enums if provided
        action_enum = None
        if action_type:
            try:
                action_enum = AuditAction(action_type.upper())
            except ValueError:
                raise HTTPException(
                    status_code=400, detail=f"Invalid action_type: {action_type}"
                )

        resource_enum = None
        if resource_type:
            try:
                resource_enum = ResourceType(resource_type.lower())
            except ValueError:
                raise HTTPException(
                    status_code=400, detail=f"Invalid resource_type: {resource_type}"
                )

        # Export audit log
        return await export_audit_log(
            db=db,
            start_date=start_date,
            end_date=end_date,
            user_id=user_id,
            format=format,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to generate audit report: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate audit report")


@router.get("/audit-logs")
async def get_audit_logs_endpoint(
    start_date: Optional[datetime] = Query(
        None, description="Start date for filtering"
    ),
    end_date: Optional[datetime] = Query(None, description="End date for filtering"),
    user_id: Optional[uuid.UUID] = Query(None, description="Filter by specific user"),
    action_type: Optional[str] = Query(None, description="Filter by action type"),
    resource_type: Optional[str] = Query(None, description="Filter by resource type"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum records to return"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get audit logs with pagination and filtering.

    Requires authentication. Admin users can access all logs, regular users only their own.

    Args:
        start_date: Start of date range
        end_date: End of date range
        user_id: Filter by specific user (admin only)
        action_type: Filter by action type
        resource_type: Filter by resource type
        skip: Pagination offset
        limit: Maximum records to return

    Returns:
        List of audit log entries
    """
    try:
        # Check permissions
        is_admin = getattr(current_user, "is_admin", False)
        if not is_admin and user_id and user_id != current_user.id:
            raise HTTPException(
                status_code=403, detail="You can only access your own audit logs"
            )

        # If not admin, force filter to current user
        if not is_admin:
            user_id = current_user.id

        # Convert string filters to enums if provided
        action_enum = None
        if action_type:
            try:
                action_enum = AuditAction(action_type.upper())
            except ValueError:
                raise HTTPException(
                    status_code=400, detail=f"Invalid action_type: {action_type}"
                )

        resource_enum = None
        if resource_type:
            try:
                resource_enum = ResourceType(resource_type.lower())
            except ValueError:
                raise HTTPException(
                    status_code=400, detail=f"Invalid resource_type: {resource_type}"
                )

        # Get audit logs
        logs = await get_audit_logs(
            db=db,
            skip=skip,
            limit=limit,
            user_id=user_id,
            action_type=action_enum,
            resource_type=resource_enum,
            start_date=start_date,
            end_date=end_date,
        )

        # Convert to response format
        return {
            "logs": [
                {
                    "id": str(log.id),
                    "user_id": str(log.user_id) if log.user_id else None,
                    "action": log.action,
                    "resource_type": log.resource_type,
                    "resource_id": str(log.resource_id) if log.resource_id else None,
                    "description": log.description,
                    "ip_address": log.ip_address,
                    "user_agent": log.user_agent,
                    "request_id": log.request_id,
                    "old_values": log.old_values,
                    "new_values": log.new_values,
                    "metadata": log.metadata,
                    "timestamp": log.timestamp.isoformat(),
                }
                for log in logs
            ],
            "count": len(logs),
            "skip": skip,
            "limit": limit,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to retrieve audit logs: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve audit logs")


@router.get("/my-audit-logs")
async def get_my_audit_logs(
    action_type: Optional[str] = Query(None, description="Filter by action type"),
    resource_type: Optional[str] = Query(None, description="Filter by resource type"),
    start_date: Optional[datetime] = Query(
        None, description="Start date for filtering"
    ),
    end_date: Optional[datetime] = Query(None, description="End date for filtering"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum records to return"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get current user's audit history.

    Regular users can access their own audit logs for transparency.

    Args:
        action_type: Filter by action type
        resource_type: Filter by resource type
        start_date: Start of date range
        end_date: End of date range
        skip: Pagination offset
        limit: Maximum records to return

    Returns:
        List of user's audit log entries
    """
    try:
        # Convert string filters to enums if provided
        action_enum = None
        if action_type:
            try:
                action_enum = AuditAction(action_type.upper())
            except ValueError:
                raise HTTPException(
                    status_code=400, detail=f"Invalid action_type: {action_type}"
                )

        resource_enum = None
        if resource_type:
            try:
                resource_enum = ResourceType(resource_type.lower())
            except ValueError:
                raise HTTPException(
                    status_code=400, detail=f"Invalid resource_type: {resource_type}"
                )

        # Get user's audit history
        logs = await get_user_audit_history(
            db=db,
            user_id=current_user.id,
            skip=skip,
            limit=limit,
            action_type=action_enum,
            resource_type=resource_enum,
            start_date=start_date,
            end_date=end_date,
        )

        # Convert to response format
        return {
            "logs": [
                {
                    "id": str(log.id),
                    "action": log.action,
                    "resource_type": log.resource_type,
                    "resource_id": str(log.resource_id) if log.resource_id else None,
                    "description": log.description,
                    "timestamp": log.timestamp.isoformat(),
                }
                for log in logs
            ],
            "count": len(logs),
            "skip": skip,
            "limit": limit,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to retrieve user audit logs: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve audit logs")


@router.get("/audit-statistics")
async def get_audit_statistics_endpoint(
    start_date: Optional[datetime] = Query(
        None, description="Start date for statistics"
    ),
    end_date: Optional[datetime] = Query(None, description="End date for statistics"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get audit statistics for compliance reporting.

    Admin only. Provides aggregated statistics about system activity.

    Args:
        start_date: Start of date range (defaults to 30 days ago)
        end_date: End of date range (defaults to now)

    Returns:
        Audit statistics
    """
    try:
        # Check admin permissions
        is_admin = getattr(current_user, "is_admin", False)
        if not is_admin:
            raise HTTPException(status_code=403, detail="Admin access required")

        # Set default date range if not provided
        if not start_date:
            start_date = datetime.utcnow() - timedelta(days=30)
        if not end_date:
            end_date = datetime.utcnow()

        # Get statistics
        stats = await get_audit_statistics(
            db=db,
            start_date=start_date,
            end_date=end_date,
        )

        return stats

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to generate audit statistics: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate statistics")


@router.get("/compliance-report")
async def get_compliance_report(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate comprehensive compliance report for GDPR.

    Includes:
    - Data retention summary
    - User consent history
    - Data access logs
    - Data modification logs

    Args:
        current_user: Authenticated user
        db: Database session

    Returns:
        Comprehensive compliance report
    """
    try:
        # Get date range for report (last 90 days)
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=90)

        # Get audit statistics
        stats = await get_audit_statistics(
            db=db,
            start_date=start_date,
            end_date=end_date,
        )

        # Get user's audit history
        audit_logs = await get_user_audit_history(
            db=db,
            user_id=current_user.id,
            skip=0,
            limit=1000,
            start_date=start_date,
            end_date=end_date,
        )

        # Get consent history
        from app.services.audit_service import get_user_consent_history

        consent_logs = await get_user_consent_history(
            db=db,
            user_id=current_user.id,
        )

        # Build compliance report
        report = {
            "report_generated": end_date.isoformat(),
            "report_period": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat(),
            },
            "user": {
                "id": str(current_user.id),
                "email": current_user.email,
                "created_at": current_user.created_at.isoformat(),
            },
            "audit_summary": stats,
            "recent_activity": {
                "total_actions": len(audit_logs),
                "actions_by_type": {},
                "last_access": None,
            },
            "consent_history": [
                {
                    "type": log.consent_type,
                    "granted": log.granted,
                    "granted_at": log.granted_at.isoformat(),
                    "revoked_at": (
                        log.revoked_at.isoformat() if log.revoked_at else None
                    ),
                    "legal_basis": log.legal_basis,
                    "policy_version": log.privacy_policy_version,
                }
                for log in consent_logs
            ],
            "data_retention": {
                "user_data_since": current_user.created_at.isoformat(),
                "retention_policy": "indefinite until account deletion or GDPR request",
            },
        }

        # Aggregate recent activity
        for log in audit_logs:
            action = log.action
            report["recent_activity"]["actions_by_type"][action] = (
                report["recent_activity"]["actions_by_type"].get(action, 0) + 1
            )

            # Track last access
            if action in [AuditAction.READ.value, AuditAction.UPDATE.value]:
                if not report["recent_activity"][
                    "last_access"
                ] or log.timestamp > datetime.fromisoformat(
                    report["recent_activity"]["last_access"]
                ):
                    report["recent_activity"]["last_access"] = log.timestamp.isoformat()

        return report

    except Exception as e:
        logger.error(f"Failed to generate compliance report: {str(e)}")
        raise HTTPException(
            status_code=500, detail="Failed to generate compliance report"
        )


@router.get("/health")
async def compliance_health_check():
    """
    Health check endpoint for compliance module.

    Returns:
        Status of compliance module
    """
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "module": "compliance",
        "features": {
            "audit_logging": "enabled",
            "data_retention": "enabled",
            "consent_tracking": "enabled",
            "compliance_reporting": "enabled",
        },
    }
