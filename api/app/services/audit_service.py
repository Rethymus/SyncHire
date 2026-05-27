"""
Audit Service for GDPR Compliance

This service provides comprehensive audit trail functionality for compliance requirements.
Tracks all data access, modifications, and user actions.
"""

import uuid
import csv
import json
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, desc
from sqlalchemy.dialects.postgresql import UUID
from fastapi import HTTPException, Response
from io import StringIO
import logging

from app.models.audit_log import (
    AuditLog,
    AuditAction,
    ResourceType,
    DataRetentionLog,
    ConsentLog,
)
from app.models.user import User
from app.core.logger import get_logger

logger = get_logger(__name__)


class AuditService:
    """Service for managing audit logs and compliance reporting."""

    @staticmethod
    async def log_action(
        db: AsyncSession,
        user_id: Optional[uuid.UUID],
        action: AuditAction,
        resource_type: ResourceType,
        resource_id: Optional[uuid.UUID] = None,
        old_values: Optional[Dict[str, Any]] = None,
        new_values: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        request_id: Optional[str] = None,
        description: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> AuditLog:
        """
        Log an auditable action to the database.

        Args:
            db: Database session
            user_id: ID of the user performing the action (None for system actions)
            action: Type of action performed
            resource_type: Type of resource affected
            resource_id: ID of the specific resource affected
            old_values: Previous state (for UPDATE/DELETE actions)
            new_values: New state (for CREATE/UPDATE actions)
            ip_address: Client IP address
            user_agent: Client user agent string
            request_id: Unique request identifier for tracing
            description: Human-readable description of the action
            metadata: Additional context

        Returns:
            Created AuditLog entry
        """
        try:
            audit_log = AuditLog(
                user_id=user_id,
                action=action.value,
                resource_type=resource_type.value,
                resource_id=resource_id,
                old_values=old_values,
                new_values=new_values,
                ip_address=ip_address,
                user_agent=user_agent,
                request_id=request_id,
                description=description,
                metadata=metadata,
                timestamp=datetime.utcnow(),
            )

            db.add(audit_log)
            await db.commit()
            await db.refresh(audit_log)

            logger.info(
                f"Audit log created: {action.value} on {resource_type.value}:{resource_id} by user:{user_id}"
            )
            return audit_log

        except Exception as e:
            logger.error(f"Failed to create audit log: {str(e)}")
            await db.rollback()
            raise HTTPException(status_code=500, detail="Failed to create audit log")

    @staticmethod
    async def get_user_audit_history(
        db: AsyncSession,
        user_id: uuid.UUID,
        skip: int = 0,
        limit: int = 100,
        action_type: Optional[AuditAction] = None,
        resource_type: Optional[ResourceType] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> List[AuditLog]:
        """
        Get audit history for a specific user with filtering and pagination.

        Args:
            db: Database session
            user_id: User ID to get history for
            skip: Number of records to skip (pagination)
            limit: Maximum number of records to return
            action_type: Filter by action type
            resource_type: Filter by resource type
            start_date: Filter by start date
            end_date: Filter by end date

        Returns:
            List of audit log entries
        """
        try:
            query = select(AuditLog).where(AuditLog.user_id == user_id)

            # Apply filters
            if action_type:
                query = query.where(AuditLog.action == action_type.value)
            if resource_type:
                query = query.where(AuditLog.resource_type == resource_type.value)
            if start_date:
                query = query.where(AuditLog.timestamp >= start_date)
            if end_date:
                query = query.where(AuditLog.timestamp <= end_date)

            # Order by timestamp descending (newest first)
            query = query.order_by(desc(AuditLog.timestamp))

            # Apply pagination
            query = query.offset(skip).limit(limit)

            result = await db.execute(query)
            audit_logs = result.scalars().all()

            logger.info(f"Retrieved {len(audit_logs)} audit logs for user {user_id}")
            return audit_logs

        except Exception as e:
            logger.error(f"Failed to retrieve audit history: {str(e)}")
            raise HTTPException(
                status_code=500, detail="Failed to retrieve audit history"
            )

    @staticmethod
    async def get_audit_logs(
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100,
        user_id: Optional[uuid.UUID] = None,
        action_type: Optional[AuditAction] = None,
        resource_type: Optional[ResourceType] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> List[AuditLog]:
        """
        Get all audit logs with filtering (admin function).

        Args:
            db: Database session
            skip: Number of records to skip
            limit: Maximum number of records to return
            user_id: Filter by specific user
            action_type: Filter by action type
            resource_type: Filter by resource type
            start_date: Filter by start date
            end_date: Filter by end date

        Returns:
            List of audit log entries
        """
        try:
            query = select(AuditLog)

            # Apply filters
            if user_id:
                query = query.where(AuditLog.user_id == user_id)
            if action_type:
                query = query.where(AuditLog.action == action_type.value)
            if resource_type:
                query = query.where(AuditLog.resource_type == resource_type.value)
            if start_date:
                query = query.where(AuditLog.timestamp >= start_date)
            if end_date:
                query = query.where(AuditLog.timestamp <= end_date)

            # Order by timestamp descending
            query = query.order_by(desc(AuditLog.timestamp))

            # Apply pagination
            query = query.offset(skip).limit(limit)

            result = await db.execute(query)
            audit_logs = result.scalars().all()

            logger.info(f"Retrieved {len(audit_logs)} audit logs")
            return audit_logs

        except Exception as e:
            logger.error(f"Failed to retrieve audit logs: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to retrieve audit logs")

    @staticmethod
    async def export_audit_log(
        db: AsyncSession,
        start_date: datetime,
        end_date: datetime,
        user_id: Optional[uuid.UUID] = None,
        format: str = "csv",
    ) -> Response:
        """
        Export audit logs for compliance reporting.

        Args:
            db: Database session
            start_date: Start of date range
            end_date: End of date range
            user_id: Optional user ID filter
            format: Export format ('csv' or 'json')

        Returns:
            File response with audit data
        """
        try:
            # Get audit logs for the date range
            query = select(AuditLog).where(
                and_(
                    AuditLog.timestamp >= start_date,
                    AuditLog.timestamp <= end_date,
                )
            )

            if user_id:
                query = query.where(AuditLog.user_id == user_id)

            query = query.order_by(desc(AuditLog.timestamp))

            result = await db.execute(query)
            audit_logs = result.scalars().all()

            if format.lower() == "csv":
                return await AuditService._export_csv(audit_logs)
            elif format.lower() == "json":
                return await AuditService._export_json(audit_logs)
            else:
                raise HTTPException(status_code=400, detail="Invalid export format")

        except Exception as e:
            logger.error(f"Failed to export audit logs: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to export audit logs")

    @staticmethod
    async def _export_csv(audit_logs: List[AuditLog]) -> Response:
        """Export audit logs as CSV file."""
        output = StringIO()
        writer = csv.writer(output)

        # Write header
        writer.writerow(
            [
                "Timestamp",
                "User ID",
                "Action",
                "Resource Type",
                "Resource ID",
                "Description",
                "IP Address",
                "Request ID",
                "Old Values",
                "New Values",
                "Metadata",
            ]
        )

        # Write data rows
        for log in audit_logs:
            writer.writerow(
                [
                    log.timestamp.isoformat(),
                    str(log.user_id) if log.user_id else "",
                    log.action,
                    log.resource_type,
                    str(log.resource_id) if log.resource_id else "",
                    log.description or "",
                    log.ip_address or "",
                    log.request_id or "",
                    json.dumps(log.old_values) if log.old_values else "",
                    json.dumps(log.new_values) if log.new_values else "",
                    json.dumps(log.metadata) if log.metadata else "",
                ]
            )

        # Create response
        output.seek(0)
        return Response(
            content=output.getvalue(),
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename=audit_log_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
            },
        )

    @staticmethod
    async def _export_json(audit_logs: List[AuditLog]) -> Response:
        """Export audit logs as JSON file."""
        data = []
        for log in audit_logs:
            data.append(
                {
                    "timestamp": log.timestamp.isoformat(),
                    "user_id": str(log.user_id) if log.user_id else None,
                    "action": log.action,
                    "resource_type": log.resource_type,
                    "resource_id": str(log.resource_id) if log.resource_id else None,
                    "description": log.description,
                    "ip_address": log.ip_address,
                    "request_id": log.request_id,
                    "old_values": log.old_values,
                    "new_values": log.new_values,
                    "metadata": log.metadata,
                }
            )

        json_data = json.dumps(data, indent=2, default=str)
        return Response(
            content=json_data,
            media_type="application/json",
            headers={
                "Content-Disposition": f"attachment; filename=audit_log_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
            },
        )

    @staticmethod
    async def log_data_deletion(
        db: AsyncSession,
        user_id: uuid.UUID,
        resource_type: str,
        resource_id: uuid.UUID,
        deletion_reason: str,
        deleted_by: Optional[uuid.UUID] = None,
        gdpr_request_id: Optional[str] = None,
        retention_period_days: str = "indefinite",
    ) -> DataRetentionLog:
        """
        Log data deletion for GDPR Article 7(3) compliance.

        Args:
            db: Database session
            user_id: User whose data is being deleted
            resource_type: Type of resource being deleted
            resource_id: ID of resource being deleted
            deletion_reason: Reason for deletion
            deleted_by: User or system ID performing deletion
            gdpr_request_id: Related GDPR request ID
            retention_period_days: Retention policy (e.g., "30", "365", "indefinite")

        Returns:
            Created DataRetentionLog entry
        """
        try:
            retention_log = DataRetentionLog(
                user_id=user_id,
                resource_type=resource_type,
                resource_id=resource_id,
                retention_period_days=retention_period_days,
                deletion_reason=deletion_reason,
                deleted_at=datetime.utcnow(),
                deleted_by=deleted_by,
                backup_deleted=False,  # Assume backups not deleted by default
                gdpr_request_id=gdpr_request_id,
            )

            db.add(retention_log)
            await db.commit()
            await db.refresh(retention_log)

            logger.info(
                f"Data deletion logged: {resource_type}:{resource_id} for user {user_id}, reason: {deletion_reason}"
            )
            return retention_log

        except Exception as e:
            logger.error(f"Failed to log data deletion: {str(e)}")
            await db.rollback()
            raise HTTPException(status_code=500, detail="Failed to log data deletion")

    @staticmethod
    async def log_consent(
        db: AsyncSession,
        user_id: uuid.UUID,
        consent_type: str,
        granted: bool,
        legal_basis: str,
        privacy_policy_version: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> ConsentLog:
        """
        Log user consent for GDPR Article 7 compliance.

        Args:
            db: Database session
            user_id: User granting consent
            consent_type: Type of consent (marketing, analytics, data_processing)
            granted: Whether consent was granted or revoked
            legal_basis: Legal basis for processing
            privacy_policy_version: Version of privacy policy accepted
            ip_address: Client IP address
            user_agent: Client user agent

        Returns:
            Created ConsentLog entry
        """
        try:
            consent_log = ConsentLog(
                user_id=user_id,
                consent_type=consent_type,
                granted=granted,
                granted_at=datetime.utcnow(),
                revoked_at=None if granted else datetime.utcnow(),
                legal_basis=legal_basis,
                privacy_policy_version=privacy_policy_version,
                ip_address=ip_address,
                user_agent=user_agent,
            )

            db.add(consent_log)
            await db.commit()
            await db.refresh(consent_log)

            logger.info(
                f"Consent logged: {consent_type} {'granted' if granted else 'revoked'} by user {user_id}"
            )
            return consent_log

        except Exception as e:
            logger.error(f"Failed to log consent: {str(e)}")
            await db.rollback()
            raise HTTPException(status_code=500, detail="Failed to log consent")

    @staticmethod
    async def get_user_consent_history(
        db: AsyncSession,
        user_id: uuid.UUID,
        consent_type: Optional[str] = None,
    ) -> List[ConsentLog]:
        """
        Get consent history for a user.

        Args:
            db: Database session
            user_id: User ID to get consent history for
            consent_type: Optional filter by consent type

        Returns:
            List of consent log entries
        """
        try:
            query = select(ConsentLog).where(ConsentLog.user_id == user_id)

            if consent_type:
                query = query.where(ConsentLog.consent_type == consent_type)

            query = query.order_by(desc(ConsentLog.granted_at))

            result = await db.execute(query)
            consent_logs = result.scalars().all()

            logger.info(
                f"Retrieved {len(consent_logs)} consent logs for user {user_id}"
            )
            return consent_logs

        except Exception as e:
            logger.error(f"Failed to retrieve consent history: {str(e)}")
            raise HTTPException(
                status_code=500, detail="Failed to retrieve consent history"
            )

    @staticmethod
    async def get_audit_statistics(
        db: AsyncSession,
        start_date: datetime,
        end_date: datetime,
    ) -> Dict[str, Any]:
        """
        Get audit statistics for compliance reporting.

        Args:
            db: Database session
            start_date: Start of date range
            end_date: End of date range

        Returns:
            Dictionary with audit statistics
        """
        try:
            query = select(AuditLog).where(
                and_(
                    AuditLog.timestamp >= start_date,
                    AuditLog.timestamp <= end_date,
                )
            )

            result = await db.execute(query)
            audit_logs = result.scalars().all()

            # Calculate statistics
            stats = {
                "total_actions": len(audit_logs),
                "by_action": {},
                "by_resource_type": {},
                "by_user": {},
                "date_range": {
                    "start": start_date.isoformat(),
                    "end": end_date.isoformat(),
                },
            }

            for log in audit_logs:
                # Count by action
                stats["by_action"][log.action] = (
                    stats["by_action"].get(log.action, 0) + 1
                )

                # Count by resource type
                stats["by_resource_type"][log.resource_type] = (
                    stats["by_resource_type"].get(log.resource_type, 0) + 1
                )

                # Count by user
                if log.user_id:
                    user_str = str(log.user_id)
                    stats["by_user"][user_str] = stats["by_user"].get(user_str, 0) + 1

            logger.info(f"Generated audit statistics for {start_date} to {end_date}")
            return stats

        except Exception as e:
            logger.error(f"Failed to generate audit statistics: {str(e)}")
            raise HTTPException(
                status_code=500, detail="Failed to generate audit statistics"
            )


# Convenience functions for common audit operations
async def log_read(
    db: AsyncSession,
    user_id: uuid.UUID,
    resource_type: ResourceType,
    resource_id: uuid.UUID,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> AuditLog:
    """Log a data read operation."""
    return await AuditService.log_action(
        db=db,
        user_id=user_id,
        action=AuditAction.READ,
        resource_type=resource_type,
        resource_id=resource_id,
        ip_address=ip_address,
        user_agent=user_agent,
        description=f"Read {resource_type.value}:{resource_id}",
    )


async def log_create(
    db: AsyncSession,
    user_id: uuid.UUID,
    resource_type: ResourceType,
    resource_id: uuid.UUID,
    new_values: Dict[str, Any],
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> AuditLog:
    """Log a data creation operation."""
    return await AuditService.log_action(
        db=db,
        user_id=user_id,
        action=AuditAction.CREATE,
        resource_type=resource_type,
        resource_id=resource_id,
        new_values=new_values,
        ip_address=ip_address,
        user_agent=user_agent,
        description=f"Created {resource_type.value}:{resource_id}",
    )


async def log_update(
    db: AsyncSession,
    user_id: uuid.UUID,
    resource_type: ResourceType,
    resource_id: uuid.UUID,
    old_values: Dict[str, Any],
    new_values: Dict[str, Any],
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> AuditLog:
    """Log a data update operation."""
    return await AuditService.log_action(
        db=db,
        user_id=user_id,
        action=AuditAction.UPDATE,
        resource_type=resource_type,
        resource_id=resource_id,
        old_values=old_values,
        new_values=new_values,
        ip_address=ip_address,
        user_agent=user_agent,
        description=f"Updated {resource_type.value}:{resource_id}",
    )


async def log_delete(
    db: AsyncSession,
    user_id: uuid.UUID,
    resource_type: ResourceType,
    resource_id: uuid.UUID,
    old_values: Dict[str, Any],
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> AuditLog:
    """Log a data deletion operation."""
    return await AuditService.log_action(
        db=db,
        user_id=user_id,
        action=AuditAction.DELETE,
        resource_type=resource_type,
        resource_id=resource_id,
        old_values=old_values,
        ip_address=ip_address,
        user_agent=user_agent,
        description=f"Deleted {resource_type.value}:{resource_id}",
    )


async def log_auth_event(
    db: AsyncSession,
    user_id: Optional[uuid.UUID],
    event_type: AuditAction,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> AuditLog:
    """Log authentication events."""
    return await AuditService.log_action(
        db=db,
        user_id=user_id,
        action=event_type,
        resource_type=ResourceType.USER,
        resource_id=user_id,
        ip_address=ip_address,
        user_agent=user_agent,
        metadata=metadata,
        description=f"Authentication event: {event_type.value}",
    )


async def log_from_request_metadata(
    db: AsyncSession,
    user_id: uuid.UUID,
    resource_type: ResourceType,
    resource_id: uuid.UUID,
    action: AuditAction,
    old_values: Optional[Dict[str, Any]] = None,
    new_values: Optional[Dict[str, Any]] = None,
    description: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> AuditLog:
    """
    Create audit log from endpoint handler.

    This function is meant to be called from endpoint handlers
    to create audit logs using the database session.

    Args:
        db: Database session
        user_id: User performing the action
        resource_type: Type of resource
        resource_id: ID of resource
        action: Audit action type
        old_values: Previous state
        new_values: New state
        description: Human-readable description
        metadata: Additional context

    Returns:
        Created AuditLog entry
    """
    return await AuditService.log_action(
        db=db,
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        old_values=old_values,
        new_values=new_values,
        description=description,
        metadata=metadata,
    )
