"""
Template API endpoints

Handles template listing, preview, and configuration
"""

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import HTMLResponse, JSONResponse
from pathlib import Path
from typing import List, Dict, Any
import json

from ..services.pdf_generator import TemplateEngine, ResumeData


router = APIRouter(prefix="/api/templates", tags=["templates"])

# Load template config
CONFIG_PATH = Path(__file__).parent.parent.parent / "templates" / "config.json"


def load_config() -> Dict[str, Any]:
    """Load template configuration"""
    try:
        with open(CONFIG_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return {"templates": [], "color_schemes": {}, "font_pairs": {}}


@router.get("")
async def list_templates():
    """
    List all available resume templates with metadata

    Returns template information including:
    - Template ID, name, description
    - Preview and thumbnail URLs
    - Customization options
    - Suitable use cases
    """
    config = load_config()
    return {
        "templates": config.get("templates", []),
        "color_schemes": list(config.get("color_schemes", {}).keys()),
        "font_pairs": list(config.get("font_pairs", {}).keys())
    }


@router.get("/config")
async def get_template_config():
    """
    Get full template configuration

    Returns complete configuration including all color schemes and font pairs
    for template customization
    """
    return load_config()


@router.get("/{template_id}")
async def get_template_details(template_id: str):
    """
    Get detailed information about a specific template

    Includes customization options, suitable use cases, and features
    """
    config = load_config()
    templates = config.get("templates", [])

    template = next((t for t in templates if t["id"] == template_id), None)

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template '{template_id}' not found"
        )

    return {
        "template": template,
        "available_color_schemes": config.get("color_schemes", {}),
        "available_font_pairs": config.get("font_pairs", {})
    }


@router.get("/{template_id}/preview", response_class=HTMLResponse)
async def get_template_preview(template_id: str):
    """
    Get HTML preview of a template with sample data

    Returns rendered HTML for preview in browser
    """
    template_dir = Path(__file__).parent.parent.parent / "templates"
    template_path = template_dir / f"{template_id}.html"

    if not template_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template '{template_id}' not found"
        )

    # Load template
    with open(template_path, "r", encoding="utf-8") as f:
        template_html = f.read()

    # Create sample resume data for preview
    sample_data = ResumeData(
        name="张三 / John Zhang",
        title="Senior Software Engineer",
        email="john.zhang@example.com",
        phone="+1 (555) 123-4567",
        location="San Francisco, CA | 北京, 中国",
        linkedin="linkedin.com/in/johnzhang",
        github="github.com/johnzhang",
        website="johnzhang.dev",
        summary="Experienced software engineer with expertise in full-stack development, cloud architecture, and AI/ML systems. 拥有全栈开发、云架构和人工智能系统方面的丰富经验。",
        experiences=[
            {
                "company": "Google 谷歌",
                "position": "Senior Software Engineer",
                "location": "Mountain View, CA",
                "start_date": "2021-01",
                "end_date": "Present",
                "highlights": [
                    "Led development of ML infrastructure serving 1B+ daily requests",
                    "领导开发了每天处理10亿+请求的机器学习基础设施"
                ]
            }
        ],
        education=[
            {
                "school": "Stanford University",
                "degree": "Master of Science",
                "field": "Computer Science",
                "start_date": "2016",
                "end_date": "2018"
            }
        ],
        skills=[
            {
                "category": "Programming Languages",
                "skills": ["Python", "TypeScript", "Go"]
            }
        ],
        languages=[
            {"name": "Chinese 中文", "level": "Native"},
            {"name": "English 英语", "level": "Professional"}
        ]
    )

    # Render template with sample data
    template_engine = TemplateEngine()
    from ..services.pdf_generator import PDFGenerationOptions
    options = PDFGenerationOptions(template=template_id)

    rendered_html = template_engine.render(template_id, sample_data, options)

    return HTMLResponse(content=rendered_html)


@router.get("/{template_id}/sample")
async def get_template_sample_data(template_id: str):
    """
    Get sample resume data for a template

    Returns JSON sample data that can be used to populate the template
    """
    return {
        "resume": {
            "name": "张三 / John Zhang",
            "title": "Senior Software Engineer",
            "email": "john.zhang@example.com",
            "phone": "+1 (555) 123-4567",
            "location": "San Francisco, CA",
            "linkedin": "linkedin.com/in/johnzhang",
            "github": "github.com/johnzhang",
            "summary": "Experienced software engineer with expertise in full-stack development.",
            "experiences": [
                {
                    "company": "Google",
                    "position": "Senior Software Engineer",
                    "location": "Mountain View, CA",
                    "start_date": "2021-01",
                    "end_date": "Present",
                    "highlights": [
                        "Led development of ML infrastructure",
                        "Reduced latency by 40%"
                    ]
                }
            ],
            "education": [
                {
                    "school": "Stanford University",
                    "degree": "Master of Science",
                    "field": "Computer Science",
                    "start_date": "2016",
                    "end_date": "2018"
                }
            ],
            "skills": [
                {
                    "category": "Programming Languages",
                    "skills": ["Python", "TypeScript", "Go"]
                }
            ]
        }
    }


@router.post("/{template_id}/customize")
async def customize_template(
    template_id: str,
    customization: Dict[str, Any]
):
    """
    Customize a template with different colors, fonts, and spacing

    Accepts customization options and returns a preview URL
    """
    config = load_config()
    templates = config.get("templates", [])

    template = next((t for t in templates if t["id"] == template_id), None)

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template '{template_id}' not found"
        )

    # Validate customization options
    customizable = template.get("customizable", {})

    # Apply color scheme if provided
    if "color_scheme" in customization:
        scheme_name = customization["color_scheme"]
        color_schemes = config.get("color_schemes", {})
        if scheme_name not in color_schemes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Color scheme '{scheme_name}' not found"
            )

    # Apply font pair if provided
    if "font_pair" in customization:
        pair_name = customization["font_pair"]
        font_pairs = config.get("font_pairs", {})
        if pair_name not in font_pairs:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Font pair '{pair_name}' not found"
            )

    return {
        "message": "Customization applied",
        "preview_url": f"/api/templates/{template_id}/preview?customized=true",
        "customization": customization
    }


@router.get("/categories")
async def list_template_categories():
    """
    List template categories and their templates

    Groups templates by category (modern, professional, creative, executive)
    """
    config = load_config()
    templates = config.get("templates", [])

    categories = {}
    for template in templates:
        category = template.get("category", "other")
        if category not in categories:
            categories[category] = []
        categories[category].append({
            "id": template["id"],
            "name": template["name"],
            "description": template["description"]
        })

    return {"categories": categories}
