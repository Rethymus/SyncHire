import uuid
from pathlib import Path
import tempfile
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.resume import (
    ResumeResponse,
    ResumeUpdate,
    ResumeExportRequest,
)
from app.services.resume_service import ResumeService
from app.services.pdf_generator import get_pdf_generator, PDFGenerationOptions
from typing import List

router = APIRouter(prefix="/resumes", tags=["resumes"])


@router.post("/", response_model=ResumeResponse, status_code=status.HTTP_201_CREATED)
async def upload_resume(
    file: UploadFile = File(...),
    title: str = Form(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await ResumeService.create_resume(db, current_user.id, file, title)


@router.get("/", response_model=List[ResumeResponse])
async def list_resumes(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await ResumeService.get_resumes(db, current_user.id)


@router.get("/{resume_id}", response_model=ResumeResponse)
async def get_resume(
    resume_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await ResumeService.get_resume(db, resume_id, current_user.id)


@router.put("/{resume_id}", response_model=ResumeResponse)
async def update_resume(
    resume_id: uuid.UUID,
    update_data: ResumeUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await ResumeService.update_resume(
        db, resume_id, current_user.id, update_data
    )


@router.delete("/{resume_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_resume(
    resume_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await ResumeService.delete_resume(db, resume_id, current_user.id)


@router.post("/{resume_id}/reparse", response_model=ResumeResponse)
async def reparse_resume(
    resume_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Re-parse resume using MCP client"""
    return await ResumeService.reparse_resume(db, resume_id, current_user.id)


@router.post("/{resume_id}/export")
async def export_resume_pdf(
    resume_id: uuid.UUID,
    export_request: ResumeExportRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Export resume as PDF

    Supports:
    - Multiple templates (minimal, professional, creative, executive)
    - High DPI export for print
    - Chinese-English mixed content
    """
    # Get resume data from database
    resume = await ResumeService.get_resume(db, resume_id, current_user.id)

    # Convert to PDF generator format
    from app.services.pdf_generator import ResumeData

    resume_data = ResumeData(
        name=current_user.full_name or "User",
        title=resume.title or "",
        email=current_user.email,
        phone=resume.phone,
        location=resume.location,
        linkedin=resume.linkedin,
        github=resume.github,
        website=resume.website,
        summary=resume.summary,
        experiences=resume.experiences or [],
        education=resume.education or [],
        skills=resume.skills or [],
        projects=resume.projects or [],
        languages=resume.languages or [],
        awards=resume.awards or [],
    )

    # Configure PDF options
    options = PDFGenerationOptions(
        template=export_request.template, dpi=export_request.dpi or 300, format="letter"
    )

    # Generate PDF
    generator = await get_pdf_generator()

    # Create temporary file
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        output_path = Path(tmp.name)

    try:
        await generator.generate_pdf(
            resume_data=resume_data, options=options, output_path=output_path
        )

        # Generate filename
        safe_name = "".join(
            c for c in resume_data.name if c.isalnum() or c in (" ", "-", "_")
        )
        filename = f"{safe_name}_{export_request.template}_resume.pdf"

        return FileResponse(
            path=output_path, media_type="application/pdf", filename=filename
        )

    except Exception as e:
        # Clean up file if generation failed
        if output_path.exists():
            output_path.unlink()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"PDF generation failed: {str(e)}",
        )


@router.get("/templates")
async def list_templates():
    """List available resume templates"""
    return {
        "templates": [
            {
                "id": "minimal",
                "name": "Minimal",
                "description": "Clean single-column, ATS-friendly design",
            },
            {
                "id": "professional",
                "name": "Professional",
                "description": "Two-column layout with sidebar for contact and skills",
            },
            {
                "id": "creative",
                "name": "Creative",
                "description": "Modern design with accent colors and decorative elements",
            },
            {
                "id": "executive",
                "name": "Executive",
                "description": "Conservative design for senior roles and executives",
            },
        ]
    }
