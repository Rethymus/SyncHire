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
    BulkDeleteRequest,
    BulkDeleteResponse,
)
from app.services.resume_service import ResumeService
from app.services.ai_service import AIService
from app.services.pdf_generator import get_pdf_generator, PDFGenerationOptions
from app.middleware.rate_limit import rate_limit, RateLimitType
from typing import List

router = APIRouter(prefix="/resumes", tags=["resumes"])


@router.post("/", response_model=ResumeResponse, status_code=status.HTTP_201_CREATED)
@rate_limit(RateLimitType.UPLOAD)
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


@router.post("/bulk-delete", response_model=BulkDeleteResponse)
async def bulk_delete_resumes(
    request: BulkDeleteRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Bulk delete multiple resumes

    Deletes multiple resumes by IDs with partial failure support.
    Returns detailed information about successful and failed deletions.

    - **ids**: List of resume IDs to delete (max 100 at once)
    - **success_count**: Number of successfully deleted resumes
    - **failed_count**: Number of resumes that failed to delete
    - **errors**: List of errors for failed deletions with ID and error message
    """
    logger.info(f"Bulk delete request for {len(request.ids)} resumes by user {current_user.id}")
    return await ResumeService.bulk_delete_resumes(db, current_user.id, request.ids)


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

    # Parse resume data from JSON
    import json

    parsed_data = {}
    if resume.parsed_data:
        try:
            parsed_data = json.loads(resume.parsed_data)
        except json.JSONDecodeError:
            parsed_data = {}

    # Extract data from parsed resume, using safe defaults
    # Handle both parsed resume structure and direct field access
    personal_info = parsed_data.get("personal_info", {})
    work_experience = parsed_data.get("work_experience", [])
    education_list = parsed_data.get("education", [])
    skills_list = parsed_data.get("skills", [])

    # Convert to PDF generator format
    from app.services.pdf_generator import ResumeData

    resume_data = ResumeData(
        name=personal_info.get("name") or current_user.full_name or "User",
        title=personal_info.get("title") or resume.title or "",
        email=personal_info.get("email") or current_user.email,
        phone=personal_info.get("phone"),
        location=personal_info.get("location"),
        linkedin=personal_info.get("linkedin"),
        github=personal_info.get("github"),
        website=personal_info.get("website"),
        summary=personal_info.get("summary") or parsed_data.get("summary"),
        experiences=_convert_experience_format(work_experience),
        education=_convert_education_format(education_list),
        skills=_convert_skills_format(skills_list),
        projects=parsed_data.get("projects", []),
        languages=parsed_data.get("languages", []),
        awards=parsed_data.get("awards", []),
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


def _convert_experience_format(experiences: list) -> list:
    """Convert work experience to PDF generator format"""
    converted = []
    for exp in experiences:
        if isinstance(exp, dict):
            converted.append(
                {
                    "company": exp.get("company", ""),
                    "position": exp.get("position") or exp.get("title", ""),
                    "location": exp.get("location", ""),
                    "start_date": exp.get("start_date", ""),
                    "end_date": exp.get("end_date", "Present"),
                    "description": exp.get("description", ""),
                    "highlights": exp.get("highlights") or exp.get("achievements", []),
                }
            )
    return converted


def _convert_education_format(education: list) -> list:
    """Convert education to PDF generator format"""
    converted = []
    for edu in education:
        if isinstance(edu, dict):
            converted.append(
                {
                    "school": edu.get("school", ""),
                    "degree": edu.get("degree", ""),
                    "field": edu.get("field") or edu.get("major", ""),
                    "start_date": edu.get("start_date", ""),
                    "end_date": edu.get("end_date", ""),
                    "gpa": edu.get("gpa", ""),
                }
            )
    return converted


def _convert_skills_format(skills: list) -> list:
    """Convert skills to PDF generator format"""
    if not skills:
        return []

    # If skills is a list of strings, convert to category format
    if all(isinstance(skill, str) for skill in skills):
        return [{"category": "Skills", "skills": skills}]

    # If skills is already in category format
    converted = []
    for skill_group in skills:
        if isinstance(skill_group, dict):
            if "skills" in skill_group:
                # Already in correct format
                converted.append(skill_group)
            elif "name" in skill_group:
                # Convert {name: "Python", level: 5} format
                converted.append(
                    {
                        "name": skill_group.get("name", ""),
                        "level": skill_group.get("level", 3),
                    }
                )
    return converted


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


@router.post("/{resume_id}/optimize")
async def optimize_resume(
    resume_id: uuid.UUID,
    jd_content: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Optimize resume for a specific job description using AI

    This endpoint analyzes the resume content and optimizes it for the given job description,
    providing improved content while maintaining truthfulness.
    """
    resume = await ResumeService.get_resume(db, resume_id, current_user.id)

    if not resume.content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Resume content not available. Please re-parse the resume first.",
        )

    # Parse JD to extract structured information
    parsed_jd = await AIService.parse_jd(jd_content)

    # Optimize resume content
    optimized = await AIService.optimize_resume(
        resume_content=resume.content,
        jd_content=jd_content,
        parsed_jd=parsed_jd,
    )

    return optimized
