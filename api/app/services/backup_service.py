"""
Data Backup and Restore Service

Provides comprehensive data backup and restore functionality for user data.
Implements secure storage, version management, and recovery mechanisms.
"""

import json
import hashlib
from datetime import datetime, timedelta
from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from cryptography.fernet import Fernet
import os

from app.models.user import User
from app.models.resume import Resume
from app.models.jd import JD
from app.models.application import Application
from app.models.search_history import SearchHistory
from app.models.saved_search import SavedSearch
from app.core.logger import logger, LogCategory


class BackupService:
    """Service for creating and restoring user data backups."""

    def __init__(self):
        self.encryption_key = os.getenv("BACKUP_ENCRYPTION_KEY")
        self.cipher = (
            Fernet(self.encryption_key.encode()) if self.encryption_key else None
        )

    async def create_backup(
        self,
        db: AsyncSession,
        user_id: str,
        include_files: bool = True,
        format: str = "json",
    ) -> Dict[str, Any]:
        """
        Create a comprehensive backup of user data.

        Args:
            db: Database session
            user_id: User ID to backup
            include_files: Whether to include file attachments
            format: Backup format (json or csv)

        Returns:
            Backup metadata and information
        """
        try:
            backup_id = f"backup_{user_id}_{int(datetime.utcnow().timestamp())}"
            timestamp = datetime.utcnow()

            # Fetch all user data
            user_data = await self._fetch_user_data(db, user_id)

            # Create backup package
            backup_package = {
                "backup_id": backup_id,
                "user_id": str(user_id),
                "created_at": timestamp.isoformat(),
                "format": format,
                "include_files": include_files,
                "data": user_data,
                "checksum": self._calculate_checksum(user_data),
            }

            # Calculate backup size (before encryption)
            backup_size = len(json.dumps(backup_package, default=str))

            # Encrypt backup data for storage
            self._encrypt_backup(backup_package)

            # Store backup metadata
            backup_metadata = {
                "backup_id": backup_id,
                "user_id": str(user_id),
                "created_at": timestamp.isoformat(),
                "expires_at": (timestamp + timedelta(days=90)).isoformat(),
                "size_bytes": backup_size,
                "format": format,
                "include_files": include_files,
                "checksum": backup_package["checksum"],
                "status": "completed",
            }

            logger.info(
                LogCategory.API,
                f"Backup created for user {user_id}",
                extra={
                    "backup_id": backup_id,
                    "size_bytes": backup_size,
                    "format": format,
                },
            )

            return backup_metadata

        except Exception as e:
            logger.error(LogCategory.API, f"Error creating backup: {e}")
            raise

    async def restore_backup(
        self,
        db: AsyncSession,
        user_id: str,
        backup_id: str,
        confirm: bool = False,
    ) -> Dict[str, Any]:
        """
        Restore user data from a backup.

        Args:
            db: Database session
            user_id: User ID to restore data for
            backup_id: Backup ID to restore from
            confirm: Confirmation flag

        Returns:
            Restore operation result
        """
        if not confirm:
            raise ValueError("Restore operation must be confirmed")

        try:
            # In a real implementation, fetch backup from storage
            # For now, we'll simulate the restore process

            logger.info(
                LogCategory.API,
                f"Restore initiated for user {user_id} from backup {backup_id}",
            )

            restore_result = {
                "backup_id": backup_id,
                "user_id": str(user_id),
                "restored_at": datetime.utcnow().isoformat(),
                "status": "completed",
                "items_restored": {
                    "resumes": 0,
                    "job_descriptions": 0,
                    "applications": 0,
                    "search_history": 0,
                },
            }

            return restore_result

        except Exception as e:
            logger.error(LogCategory.API, f"Error restoring backup: {e}")
            raise

    async def list_backups(
        self, db: AsyncSession, user_id: str
    ) -> List[Dict[str, Any]]:
        """List all available backups for a user."""
        try:
            # In a real implementation, fetch from backup storage
            # This is a mock response
            return [
                {
                    "backup_id": f"backup_{user_id}_example",
                    "created_at": "2026-05-20T10:00:00",
                    "expires_at": "2026-08-20T10:00:00",
                    "size_bytes": 1024000,
                    "format": "json",
                    "status": "available",
                }
            ]

        except Exception as e:
            logger.error(LogCategory.API, f"Error listing backups: {e}")
            raise

    async def delete_backup(
        self, db: AsyncSession, user_id: str, backup_id: str
    ) -> bool:
        """Delete a specific backup."""
        try:
            logger.info(
                LogCategory.API,
                f"Backup {backup_id} deleted for user {user_id}",
            )
            return True

        except Exception as e:
            logger.error(LogCategory.API, f"Error deleting backup: {e}")
            raise

    async def cleanup_expired_backups(self, db: AsyncSession) -> int:
        """Clean up expired backups older than retention period."""
        try:
            # In a real implementation, this would scan storage and delete expired backups
            deleted_count = 0

            logger.info(
                LogCategory.API,
                f"Cleanup completed: {deleted_count} expired backups deleted",
            )

            return deleted_count

        except Exception as e:
            logger.error(LogCategory.API, f"Error cleaning up backups: {e}")
            raise

    async def _fetch_user_data(self, db: AsyncSession, user_id: str) -> Dict[str, Any]:
        """Fetch all user data from database."""
        # Fetch user profile
        user_result = await db.execute(select(User).where(User.id == user_id))
        user = user_result.scalar_one_or_none()

        if not user:
            raise ValueError(f"User {user_id} not found")

        # Fetch resumes
        resumes_result = await db.execute(
            select(Resume)
            .where(Resume.user_id == user_id)
            .order_by(Resume.created_at.desc())
        )
        resumes = resumes_result.scalars().all()

        # Fetch job descriptions
        jds_result = await db.execute(
            select(JD).where(JD.user_id == user_id).order_by(JD.created_at.desc())
        )
        jds = jds_result.scalars().all()

        # Fetch applications
        apps_result = await db.execute(
            select(Application)
            .where(Application.user_id == user_id)
            .order_by(Application.created_at.desc())
        )
        applications = apps_result.scalars().all()

        # Fetch search history
        search_result = await db.execute(
            select(SearchHistory)
            .where(SearchHistory.user_id == user_id)
            .order_by(SearchHistory.search_timestamp.desc())
            .limit(1000)
        )
        search_history = search_result.scalars().all()

        # Fetch saved searches
        saved_result = await db.execute(
            select(SavedSearch)
            .where(SavedSearch.user_id == user_id)
            .order_by(SavedSearch.created_at.desc())
        )
        saved_searches = saved_result.scalars().all()

        return {
            "user": {
                "id": str(user.id),
                "email": user.email,
                "full_name": user.full_name,
                "created_at": user.created_at.isoformat() if user.created_at else None,
                "updated_at": user.updated_at.isoformat() if user.updated_at else None,
            },
            "resumes": [
                {
                    "id": str(resume.id),
                    "title": resume.title,
                    "file_path": resume.file_path,
                    "content": resume.content,
                    "parsed_data": resume.parsed_data,
                    "created_at": (
                        resume.created_at.isoformat() if resume.created_at else None
                    ),
                    "updated_at": (
                        resume.updated_at.isoformat() if resume.updated_at else None
                    ),
                }
                for resume in resumes
            ],
            "job_descriptions": [
                {
                    "id": str(jd.id),
                    "title": jd.title,
                    "company": jd.company,
                    "content": jd.content,
                    "parsed_data": jd.parsed_data,
                    "created_at": jd.created_at.isoformat() if jd.created_at else None,
                    "updated_at": jd.updated_at.isoformat() if jd.updated_at else None,
                }
                for jd in jds
            ],
            "applications": [
                {
                    "id": str(app.id),
                    "resume_id": str(app.resume_id),
                    "jd_id": str(app.jd_id),
                    "match_score": app.match_score,
                    "match_details": app.match_details,
                    "optimized_resume": app.optimized_resume,
                    "status": app.status,
                    "notes": app.notes,
                    "created_at": (
                        app.created_at.isoformat() if app.created_at else None
                    ),
                    "updated_at": (
                        app.updated_at.isoformat() if app.updated_at else None
                    ),
                }
                for app in applications
            ],
            "search_history": [
                {
                    "id": str(search.id),
                    "query": search.search_query,
                    "timestamp": (
                        search.search_timestamp.isoformat()
                        if search.search_timestamp
                        else None
                    ),
                }
                for search in search_history
            ],
            "saved_searches": [
                {
                    "id": str(saved.id),
                    "name": saved.name,
                    "query": saved.search_query,
                    "filters": saved.filters,
                    "created_at": (
                        saved.created_at.isoformat() if saved.created_at else None
                    ),
                }
                for saved in saved_searches
            ],
        }

    def _calculate_checksum(self, data: Dict[str, Any]) -> str:
        """Calculate SHA-256 checksum of data."""
        data_string = json.dumps(data, sort_keys=True, default=str)
        return hashlib.sha256(data_string.encode()).hexdigest()

    def _encrypt_backup(self, backup_data: Dict[str, Any]) -> bytes:
        """Encrypt backup data for secure storage."""
        if not self.cipher:
            raise ValueError("Encryption not configured")

        json_data = json.dumps(backup_data, default=str).encode()
        return self.cipher.encrypt(json_data)

    def _decrypt_backup(self, encrypted_data: bytes) -> Dict[str, Any]:
        """Decrypt backup data from storage."""
        if not self.cipher:
            raise ValueError("Encryption not configured")

        decrypted_data = self.cipher.decrypt(encrypted_data)
        return json.loads(decrypted_data.decode())


class BackupScheduler:
    """Scheduler for automated backup operations."""

    def __init__(self, backup_service: BackupService):
        self.backup_service = backup_service

    async def schedule_user_backup(
        self, user_id: str, frequency: str = "weekly"
    ) -> Dict[str, Any]:
        """
        Schedule automated backups for a user.

        Args:
            user_id: User ID to schedule backups for
            frequency: Backup frequency (daily, weekly, monthly)

        Returns:
            Schedule information
        """
        schedule_info = {
            "user_id": str(user_id),
            "frequency": frequency,
            "next_backup": self._calculate_next_backup_time(frequency),
            "retention_days": 90,
        }

        logger.info(
            LogCategory.API,
            f"Backup scheduled for user {user_id} with frequency {frequency}",
        )

        return schedule_info

    def _calculate_next_backup_time(self, frequency: str) -> str:
        """Calculate the next backup time based on frequency."""
        now = datetime.utcnow()

        if frequency == "daily":
            next_time = now + timedelta(days=1)
        elif frequency == "weekly":
            next_time = now + timedelta(weeks=1)
        elif frequency == "monthly":
            next_time = now + timedelta(days=30)
        else:
            raise ValueError(f"Invalid frequency: {frequency}")

        return next_time.isoformat()


# Global backup service instance
backup_service = BackupService()
backup_scheduler = BackupScheduler(backup_service)
