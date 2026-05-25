"""
Data Export API Endpoints

Provides endpoints for exporting user data in various formats.
"""

import csv
import io
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.application import Application
from app.models.resume import Resume
from app.models.jd import JD
from app.middleware.rate_limit import rate_limit, RateLimitType
from app.core.logger import logger, LogCategory

router = APIRouter(prefix="/export", tags=["export"])


@router.get("/applications/csv")
@rate_limit(RateLimitType.GENERAL)
async def export_applications_csv(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Export all applications as CSV file."""
    try:
        # Fetch all applications with related data
        result = await db.execute(
            select(Application)
            .where(Application.user_id == current_user.id)
            .order_by(Application.created_at.desc())
        )
        applications = result.scalars().all()
        
        # Create CSV content
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write header
        writer.writerow([
            'ID', 'Company', 'Position', 'Status', 'Match Score',
            'Created Date', 'Updated Date', 'Notes'
        ])
        
        # Write data rows
        for app in applications:
            company_name = app.jd.company_name if app.jd else "N/A"
            position = app.jd.position if app.jd else "N/A"
            
            writer.writerow([
                str(app.id),
                company_name,
                position,
                app.status,
                app.match_score or 0,
                app.created_at.strftime('%Y-%m-%d %H:%M:%S') if app.created_at else 'N/A',
                app.updated_at.strftime('%Y-%m-%d %H:%M:%S') if app.updated_at else 'N/A',
                app.notes or ''
            ])
        
        # Prepare response
        csv_content = output.getvalue()
        filename = f"applications_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        
        logger.info(
            LogCategory.API,
            f"User {current_user.id} exported {len(applications)} applications"
        )
        
        return StreamingResponse(
            io.BytesIO(csv_content.encode('utf-8')),
            media_type='text/csv',
            headers={
                'Content-Disposition': f'attachment; filename="{filename}"'
            }
        )
        
    except Exception as e:
        logger.error(
            LogCategory.API,
            f"Error exporting applications: {e}"
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to export applications"
        )


@router.get("/resumes/csv")
@rate_limit(RateLimitType.GENERAL)
async def export_resumes_csv(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Export all resumes as CSV file."""
    try:
        result = await db.execute(
            select(Resume)
            .where(Resume.user_id == current_user.id)
            .order_by(Resume.created_at.desc())
        )
        resumes = result.scalars().all()
        
        output = io.StringIO()
        writer = csv.writer(output)
        
        writer.writerow([
            'ID', 'Title', 'Created Date', 'Updated Date', 'File Name'
        ])
        
        for resume in resumes:
            writer.writerow([
                str(resume.id),
                resume.title or 'Untitled',
                resume.created_at.strftime('%Y-%m-%d %H:%M:%S') if resume.created_at else 'N/A',
                resume.updated_at.strftime('%Y-%m-%d %H:%M:%S') if resume.updated_at else 'N/A',
                resume.file_name or 'N/A'
            ])
        
        csv_content = output.getvalue()
        filename = f"resumes_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        
        logger.info(
            LogCategory.API,
            f"User {current_user.id} exported {len(resumes)} resumes"
        )
        
        return StreamingResponse(
            io.BytesIO(csv_content.encode('utf-8')),
            media_type='text/csv',
            headers={
                'Content-Disposition': f'attachment; filename="{filename}"'
            }
        )
        
    except Exception as e:
        logger.error(
            LogCategory.API,
            f"Error exporting resumes: {e}"
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to export resumes"
        )


@router.get("/jds/csv")
@rate_limit(RateLimitType.GENERAL)
async def export_jds_csv(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Export all job descriptions as CSV file."""
    try:
        result = await db.execute(
            select(JD)
            .where(JD.user_id == current_user.id)
            .order_by(JD.created_at.desc())
        )
        jds = result.scalars().all()
        
        output = io.StringIO()
        writer = csv.writer(output)
        
        writer.writerow([
            'ID', 'Title', 'Company', 'Created Date', 'Updated Date'
        ])
        
        for jd in jds:
            writer.writerow([
                str(jd.id),
                jd.title or 'Untitled',
                jd.company_name or 'N/A',
                jd.created_at.strftime('%Y-%m-%d %H:%M:%S') if jd.created_at else 'N/A',
                jd.updated_at.strftime('%Y-%m-%d %H:%M:%S') if jd.updated_at else 'N/A'
            ])
        
        csv_content = output.getvalue()
        filename = f"jds_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        
        logger.info(
            LogCategory.API,
            f"User {current_user.id} exported {len(jds)} job descriptions"
        )
        
        return StreamingResponse(
            io.BytesIO(csv_content.encode('utf-8')),
            media_type='text/csv',
            headers={
                'Content-Disposition': f'attachment; filename="{filename}"'
            }
        )
        
    except Exception as e:
        logger.error(
            LogCategory.API,
            f"Error exporting job descriptions: {e}"
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to export job descriptions"
        )
