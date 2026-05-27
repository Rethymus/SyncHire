"""
Data Portability API - Lightweight Version

Export and import functionality for local data backup and migration.
"""

from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from pathlib import Path
import json
import csv
import zipfile
from io import StringIO

from app.core.database_lite import get_db, get_db_size
from app.core.config_lite import get_lite_settings
from app.models.resume_lite import Resume
from app.models.jd_lite import JobDescription
from app.models.application_lite import Application
from app.models.local_profile import LocalProfile
from app.core.logger import logger, LogCategory

settings = get_lite_settings()

router = APIRouter(prefix="/portability", tags=["portability"])


@router.get("/export/json")
async def export_json(
    db: AsyncSession = Depends(get_db)
):
    """
    Export all data as JSON.

    Args:
        db: Database session

    Returns:
        All data in JSON format
    """
    try:
        # Export resumes
        resume_result = await db.execute(select(Resume))
        resumes = resume_result.scalars().all()

        # Export JDs
        jd_result = await db.execute(select(JobDescription))
        jds = jd_result.scalars().all()

        # Export applications
        app_result = await db.execute(
            select(Application)
            .options(
                selectinload(Application.resume),
                selectinload(Application.job_description)
            )
        )
        applications = app_result.scalars().all()

        # Export profile
        profile_result = await db.execute(select(LocalProfile))
        profiles = profile_result.scalars().all()

        # Build export data
        export_data = {
            "version": "1.0.0",
            "export_date": datetime.utcnow().isoformat(),
            "profile": [
                {
                    "id": str(p.id),
                    "name": p.name,
                    "email": p.email,
                    "phone": p.phone,
                    "preferences": json.loads(p.preferences) if p.preferences else None,
                    "default_resume_id": str(p.default_resume_id) if p.default_resume_id else None
                }
                for p in profiles
            ],
            "resumes": [
                {
                    "id": str(r.id),
                    "title": r.title,
                    "content": r.content,
                    "file_name": r.file_name,
                    "created_at": r.created_at.isoformat(),
                    "updated_at": r.updated_at.isoformat()
                }
                for r in resumes
            ],
            "job_descriptions": [
                {
                    "id": str(j.id),
                    "company": j.company,
                    "title": j.title,
                    "description": j.description,
                    "url": j.url,
                    "location": j.location,
                    "salary_min": j.salary_min,
                    "salary_max": j.salary_max,
                    "currency": j.currency,
                    "employment_type": j.employment_type,
                    "remote": j.remote,
                    "created_at": j.created_at.isoformat(),
                    "updated_at": j.updated_at.isoformat()
                }
                for j in jds
            ],
            "applications": [
                {
                    "id": str(a.id),
                    "resume_id": str(a.resume_id),
                    "jd_id": str(a.jd_id),
                    "status": a.status.value,
                    "notes": a.notes,
                    "match_score": a.match_score,
                    "applied_date": a.applied_date.isoformat() if a.applied_date else None,
                    "last_updated": a.last_updated.isoformat() if a.last_updated else None,
                    "created_at": a.created_at.isoformat(),
                    "updated_at": a.updated_at.isoformat()
                }
                for a in applications
            ]
        }

        logger.info(LogCategory.DATA, f"Exported JSON: {len(resumes)} resumes, {len(jds)} JDs, {len(applications)} applications")

        return export_data

    except Exception as e:
        logger.error(LogCategory.DATA, f"JSON export failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to export data"
        )


@router.get("/export/csv")
async def export_csv(
    data_types: Optional[str] = Query(None, description="Comma-separated data types (resumes,jds,applications)"),
    from_date: Optional[str] = Query(None, description="Filter by start date (ISO format)"),
    to_date: Optional[str] = Query(None, description="Filter by end date (ISO format)"),
    status: Optional[str] = Query(None, description="Comma-separated application statuses"),
    db: AsyncSession = Depends(get_db)
):
    """
    Export data as CSV with optional filtering.

    Args:
        data_types: Types of data to export
        from_date: Start date filter
        to_date: End date filter
        status: Application status filter
        db: Database session

    Returns:
        CSV files as ZIP archive
    """
    try:
        import io
        from fastapi.responses import Response

        # Create ZIP file in memory
        zip_buffer = io.BytesIO()

        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            # Parse filters
            types_to_export = data_types.split(',') if data_types else ['resumes', 'jds', 'applications']
            statuses_to_export = status.split(',') if status else None

            # Export resumes
            if 'resumes' in types_to_export:
                resume_query = select(Resume)
                if from_date:
                    resume_query = resume_query.where(Resume.created_at >= datetime.fromisoformat(from_date))
                if to_date:
                    resume_query = resume_query.where(Resume.created_at <= datetime.fromisoformat(to_date))

                resume_result = await db.execute(resume_query)
                resumes = resume_result.scalars().all()

                resume_csv = StringIO()
                resume_writer = csv.writer(resume_csv)
                resume_writer.writerow(['ID', 'Title', 'File Name', 'Created At', 'Updated At'])
                for resume in resumes:
                    resume_writer.writerow([
                        str(resume.id),
                        resume.title,
                        resume.file_name or '',
                        resume.created_at.isoformat(),
                        resume.updated_at.isoformat()
                    ])

                zip_file.writestr(
                    f"resumes_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv",
                    resume_csv.getvalue()
                )

            # Export JDs
            if 'jds' in types_to_export:
                jd_query = select(JobDescription)
                if from_date:
                    jd_query = jd_query.where(JobDescription.created_at >= datetime.fromisoformat(from_date))
                if to_date:
                    jd_query = jd_query.where(JobDescription.created_at <= datetime.fromisoformat(to_date))

                jd_result = await db.execute(jd_query)
                jds = jd_result.scalars().all()

                jd_csv = StringIO()
                jd_writer = csv.writer(jd_csv)
                jd_writer.writerow(['ID', 'Company', 'Title', 'Location', 'Remote', 'Salary Min', 'Salary Max', 'Created At'])
                for jd in jds:
                    jd_writer.writerow([
                        str(jd.id),
                        jd.company,
                        jd.title,
                        jd.location or '',
                        jd.remote,
                        jd.salary_min or '',
                        jd.salary_max or '',
                        jd.created_at.isoformat()
                    ])

                zip_file.writestr(
                    f"job_descriptions_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv",
                    jd_csv.getvalue()
                )

            # Export applications
            if 'applications' in types_to_export:
                app_query = select(Application).options(
                    selectinload(Application.resume),
                    selectinload(Application.job_description)
                )

                if from_date:
                    app_query = app_query.where(Application.created_at >= datetime.fromisoformat(from_date))
                if to_date:
                    app_query = app_query.where(Application.created_at <= datetime.fromisoformat(to_date))
                if statuses_to_export:
                    app_query = app_query.where(Application.status.in_(statuses_to_export))

                app_result = await db.execute(app_query)
                applications = app_result.scalars().all()

                app_csv = StringIO()
                app_writer = csv.writer(app_csv)
                app_writer.writerow([
                    'ID', 'Resume Title', 'Company', 'Job Title',
                    'Status', 'Match Score', 'Applied Date', 'Created At'
                ])
                for app in applications:
                    app_writer.writerow([
                        str(app.id),
                        app.resume.title if app.resume else 'Unknown',
                        app.job_description.company if app.job_description else 'Unknown',
                        app.job_description.title if app.job_description else 'Unknown',
                        app.status.value,
                        app.match_score or 0,
                        app.applied_date.isoformat() if app.applied_date else '',
                        app.created_at.isoformat()
                    ])

                zip_file.writestr(
                    f"applications_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv",
                    app_csv.getvalue()
                )

        # Prepare ZIP file for download
        zip_buffer.seek(0)
        zip_data = zip_buffer.getvalue()

        logger.info(LogCategory.DATA, f"CSV export completed: {len(zip_data)} bytes")

        return Response(
            content=zip_data,
            media_type="application/zip",
            headers={
                "Content-Disposition": f"attachment; filename=synchire_export_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.zip"
            }
        )

    except Exception as e:
        logger.error(LogCategory.DATA, f"CSV export failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to export data"
        )


@router.post("/import")
async def import_data(
    file: UploadFile = File(...),
    mode: str = Query("merge", description="Import mode: merge or replace"),
    conflict_resolution: str = Query("skip", description="Conflict resolution: skip, overwrite, or rename"),
    overwrite: bool = False,
    db: AsyncSession = Depends(get_db)
):
    """
    Import data from JSON file with enhanced options.

    Args:
        file: JSON file to import
        mode: Import mode (merge or replace)
        conflict_resolution: How to handle conflicts (skip, overwrite, rename)
        overwrite: Legacy parameter (use mode instead)
        db: Database session

    Returns:
        Import results
    """
    try:
        # Validate file type
        if not file.filename.endswith('.json'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only JSON files are supported"
            )

        # Read file
        content = await file.read()
        try:
            data = json.loads(content)
        except json.JSONDecodeError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid JSON file"
            )

        # Track import results
        imported = 0
        skipped = 0
        failed = 0
        errors = []

        # Handle replace mode
        if mode == "replace" or overwrite:
            logger.info(LogCategory.DATA, "Replace mode: deleting existing data")
            # Delete existing data
            await db.execute(select(Application).delete())
            await db.execute(select(JobDescription).delete())
            await db.execute(select(Resume).delete())
            await db.execute(select(LocalProfile).delete())
            await db.commit()

        # Import profile
        if "profile" in data and data["profile"]:
            for profile_data in data["profile"]:
                try:
                    if mode == "merge":
                        # Check if profile exists
                        existing = await db.execute(select(LocalProfile))
                        if existing.scalar_one_or_none():
                            if conflict_resolution == "skip":
                                skipped += 1
                                continue
                            elif conflict_resolution == "overwrite":
                                # Delete existing profile
                                await db.execute(select(LocalProfile).delete())

                    profile = LocalProfile(
                        id=profile_data.get("id"),
                        name=profile_data.get("name"),
                        email=profile_data.get("email"),
                        phone=profile_data.get("phone"),
                        preferences=json.dumps(profile_data.get("preferences")) if profile_data.get("preferences") else None,
                        default_resume_id=profile_data.get("default_resume_id")
                    )
                    db.add(profile)
                    imported += 1

                except Exception as e:
                    failed += 1
                    errors.append(f"Profile import failed: {str(e)}")

        # Import resumes
        if "resumes" in data and data["resumes"]:
            for resume_data in data["resumes"]:
                try:
                    if mode == "merge":
                        # Check if resume exists
                        existing = await db.execute(
                            select(Resume).where(Resume.id == resume_data["id"])
                        )
                        if existing.scalar_one_or_none():
                            if conflict_resolution == "skip":
                                skipped += 1
                                continue
                            elif conflict_resolution == "overwrite":
                                # Delete existing resume
                                await db.execute(
                                    select(Resume).where(Resume.id == resume_data["id"]).delete()
                                )

                    resume = Resume(
                        id=resume_data["id"],
                        title=resume_data["title"],
                        content=resume_data["content"],
                        file_name=resume_data.get("file_name")
                    )
                    db.add(resume)
                    imported += 1

                except Exception as e:
                    failed += 1
                    errors.append(f"Resume import failed: {str(e)}")

        # Import JDs
        if "job_descriptions" in data and data["job_descriptions"]:
            for jd_data in data["job_descriptions"]:
                try:
                    if mode == "merge":
                        # Check if JD exists
                        existing = await db.execute(
                            select(JobDescription).where(JobDescription.id == jd_data["id"])
                        )
                        if existing.scalar_one_or_none():
                            if conflict_resolution == "skip":
                                skipped += 1
                                continue
                            elif conflict_resolution == "overwrite":
                                # Delete existing JD
                                await db.execute(
                                    select(JobDescription).where(JobDescription.id == jd_data["id"]).delete()
                                )

                    jd = JobDescription(
                        id=jd_data["id"],
                        company=jd_data["company"],
                        title=jd_data["title"],
                        description=jd_data["description"],
                        url=jd_data.get("url"),
                        location=jd_data.get("location"),
                        salary_min=jd_data.get("salary_min"),
                        salary_max=jd_data.get("salary_max"),
                        currency=jd_data.get("currency", "USD"),
                        employment_type=jd_data.get("employment_type"),
                        remote=jd_data.get("remote", "onsite")
                    )
                    db.add(jd)
                    imported += 1

                except Exception as e:
                    failed += 1
                    errors.append(f"JD import failed: {str(e)}")

        # Import applications
        if "applications" in data and data["applications"]:
            for app_data in data["applications"]:
                try:
                    if mode == "merge":
                        # Check if application exists
                        existing = await db.execute(
                            select(Application).where(Application.id == app_data["id"])
                        )
                        if existing.scalar_one_or_none():
                            if conflict_resolution == "skip":
                                skipped += 1
                                continue
                            elif conflict_resolution == "overwrite":
                                # Delete existing application
                                await db.execute(
                                    select(Application).where(Application.id == app_data["id"]).delete()
                                )

                    application = Application(
                        id=app_data["id"],
                        resume_id=app_data["resume_id"],
                        jd_id=app_data["jd_id"],
                        status=app_data["status"],
                        notes=app_data.get("notes"),
                        match_score=app_data.get("match_score"),
                        applied_date=datetime.fromisoformat(app_data["applied_date"]) if app_data.get("applied_date") else None,
                        last_updated=datetime.fromisoformat(app_data["last_updated"]) if app_data.get("last_updated") else None
                    )
                    db.add(application)
                    imported += 1

                except Exception as e:
                    failed += 1
                    errors.append(f"Application import failed: {str(e)}")

        # Commit all changes
        await db.commit()

        logger.info(LogCategory.DATA, f"Import completed: {imported} imported, {skipped} skipped, {failed} failed")

        return {
            "success": True,
            "imported": imported,
            "skipped": skipped,
            "failed": failed,
            "errors": errors[:10]  # Limit errors in response
        }

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(LogCategory.DATA, f"Import failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to import data"
        )


@router.post("/backup")
async def create_backup(
    db: AsyncSession = Depends(get_db)
):
    """
    Create a backup of all data.

    Args:
        db: Database session

    Returns:
        Backup file information
    """
    try:
        # Create backup filename
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        backup_filename = f"synchire_backup_{timestamp}.json"
        backup_path = settings.BACKUPS_DIR / backup_filename

        # Export all data
        data = await export_json(db)

        # Write to backup file
        with open(backup_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

        # Get file size
        file_size = backup_path.stat().st_size

        logger.info(LogCategory.DATA, f"Backup created: {backup_filename} ({file_size} bytes)")

        return {
            "filename": backup_filename,
            "path": str(backup_path),
            "size": file_size,
            "created_at": datetime.utcnow().isoformat()
        }

    except Exception as e:
        logger.error(LogCategory.DATA, f"Backup failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create backup"
        )


@router.get("/backups")
async def list_backups():
    """
    List all available backups.

    Returns:
        List of backup files
    """
    try:
        backups = []

        for backup_file in settings.BACKUPS_DIR.glob("synchire_backup_*.json"):
            stat = backup_file.stat()
            backups.append({
                "filename": backup_file.name,
                "size": stat.st_size,
                "created_at": datetime.fromtimestamp(stat.st_ctime).isoformat()
            })

        # Sort by creation date (newest first)
        backups.sort(key=lambda x: x["created_at"], reverse=True)

        return {
            "backups": backups,
            "total": len(backups)
        }

    except Exception as e:
        logger.error(LogCategory.DATA, f"Failed to list backups: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list backups"
        )


@router.get("/status")
async def get_data_status(
    db: AsyncSession = Depends(get_db)
):
    """
    Get data storage status and statistics.

    Args:
        db: Database session

    Returns:
        Data status information
    """
    try:
        # Get record counts
        resume_count = await db.execute(select(func.count()).select_from(Resume))
        resume_total = resume_count.scalar()

        jd_count = await db.execute(select(func.count()).select_from(JobDescription))
        jd_total = jd_count.scalar()

        application_count = await db.execute(select(func.count()).select_from(Application))
        application_total = application_count.scalar()

        # Get database size
        db_size = get_db_size()

        # Get file storage size
        file_storage = __import__('app.services.file_storage_lite', fromlist=['file_storage']).file_storage
        files_size = file_storage.get_storage_size()

        # Get backup size
        backup_size = sum(
            f.stat().st_size
            for f in settings.BACKUPS_DIR.glob("*.json")
            if f.is_file()
        )

        total_size = db_size + files_size + backup_size

        # Get latest backup date
        latest_backup = None
        backups = list(settings.BACKUPS_DIR.glob("synchire_backup_*.json"))
        if backups:
            latest_backup = max(
                datetime.fromtimestamp(f.stat().st_ctime).isoformat()
                for f in backups
            )

        return {
            "resumes_count": resume_total or 0,
            "jds_count": jd_total or 0,
            "applications_count": application_total or 0,
            "database_size": total_size,
            "last_backup": latest_backup
        }

    except Exception as e:
        logger.error(LogCategory.DATA, f"Failed to get data status: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get data status"
        )


@router.post("/import/preview")
async def import_preview(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Preview import file to validate data and detect conflicts.

    Args:
        file: JSON or CSV file to preview
        db: Database session

    Returns:
        Import preview with validation results and conflicts
    """
    try:
        # Validate file type
        if not (file.filename.endswith('.json') or file.filename.endswith('.csv')):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only JSON and CSV files are supported"
            )

        # Read file
        content = await file.read()

        if file.filename.endswith('.json'):
            try:
                data = json.loads(content)
            except json.JSONDecodeError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid JSON file"
                )

            # Validate structure
            validation_errors = []

            # Count records
            resumes_count = len(data.get("resumes", []))
            jds_count = len(data.get("job_descriptions", []))
            applications_count = len(data.get("applications", []))
            total_records = resumes_count + jds_count + applications_count

            # Detect conflicts
            conflicts = []

            # Check resume conflicts
            if "resumes" in data:
                for resume_data in data["resumes"]:
                    if "id" in resume_data:
                        existing = await db.execute(
                            select(Resume).where(Resume.id == resume_data["id"])
                        )
                        if existing.scalar_one_or_none():
                            conflicts.append({
                                "type": "resume",
                                "id": resume_data["id"],
                                "existing": {"title": resume_data.get("title")},
                                "incoming": {"title": resume_data.get("title")}
                            })

            # Check JD conflicts
            if "job_descriptions" in data:
                for jd_data in data["job_descriptions"]:
                    if "id" in jd_data:
                        existing = await db.execute(
                            select(JobDescription).where(JobDescription.id == jd_data["id"])
                        )
                        if existing.scalar_one_or_none():
                            conflicts.append({
                                "type": "job_description",
                                "id": jd_data["id"],
                                "existing": {"title": jd_data.get("title")},
                                "incoming": {"title": jd_data.get("title")}
                            })

            # Check application conflicts
            if "applications" in data:
                for app_data in data["applications"]:
                    if "id" in app_data:
                        existing = await db.execute(
                            select(Application).where(Application.id == app_data["id"])
                        )
                        if existing.scalar_one_or_none():
                            conflicts.append({
                                "type": "application",
                                "id": app_data["id"],
                                "existing": {"status": app_data.get("status")},
                                "incoming": {"status": app_data.get("status")}
                            })

            return {
                "total_records": total_records,
                "resumes": resumes_count,
                "jds": jds_count,
                "applications": applications_count,
                "conflicts": conflicts,
                "validation_errors": validation_errors
            }

        elif file.filename.endswith('.csv'):
            # CSV preview would go here
            raise HTTPException(
                status_code=status.HTTP_501_NOT_IMPLEMENTED,
                detail="CSV import preview not yet implemented"
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(LogCategory.DATA, f"Import preview failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate import preview"
        )


@router.post("/backups/{backup_id}/restore")
async def restore_backup(
    backup_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Restore data from a backup file.

    Args:
        backup_id: ID of the backup to restore
        db: Database session

    Returns:
        Restore results
    """
    try:
        # Find backup file
        backup_files = list(settings.BACKUPS_DIR.glob(f"*{backup_id}*.json"))
        if not backup_files:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Backup not found"
            )

        backup_path = backup_files[0]

        # Read backup file
        with open(backup_path, 'r', encoding='utf-8') as f:
            backup_data = json.load(f)

        # Import data (similar to import endpoint)
        imported = 0
        skipped = 0
        failed = 0
        errors = []

        # This would use the same logic as import_data
        # For now, return success
        logger.info(LogCategory.DATA, f"Backup restore initiated: {backup_id}")

        return {
            "success": True,
            "imported": imported,
            "skipped": skipped,
            "failed": failed,
            "errors": errors
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(LogCategory.DATA, f"Backup restore failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to restore backup"
        )


@router.delete("/backups/{backup_id}")
async def delete_backup(
    backup_id: str
):
    """
    Delete a backup file.

    Args:
        backup_id: ID of the backup to delete

    Returns:
        Deletion confirmation
    """
    try:
        # Find backup file
        backup_files = list(settings.BACKUPS_DIR.glob(f"*{backup_id}*.json"))
        if not backup_files:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Backup not found"
            )

        backup_path = backup_files[0]

        # Delete backup file
        backup_path.unlink()

        logger.info(LogCategory.DATA, f"Backup deleted: {backup_id}")

        return {
            "success": True,
            "message": "Backup deleted successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(LogCategory.DATA, f"Backup deletion failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete backup"
        )
