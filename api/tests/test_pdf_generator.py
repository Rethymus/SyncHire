"""
Test script for PDF generation

Run with: python -m api.tests.test_pdf_generator
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from app.services.pdf_generator import (
    PDFGenerator,
    PDFGenerationOptions,
    ResumeData
)


async def test_pdf_generation():
    """Test PDF generation with sample data"""

    # Sample resume data with Chinese-English mixed content
    resume_data = ResumeData(
        name="张三 / John Zhang",
        title="Senior Software Engineer",
        email="john.zhang@example.com",
        phone="+1 (555) 123-4567",
        location="San Francisco, CA | 北京, 中国",
        linkedin="linkedin.com/in/johnzhang",
        github="github.com/johnzhang",
        website="johnzhang.dev",
        summary="Experienced software engineer with expertise in full-stack development, cloud architecture, and AI/ML systems. 拥有全栈开发、云架构和人工智能系统方面的丰富经验。Proven track record of delivering scalable solutions at leading tech companies.",
        experiences=[
            {
                "company": "Google 谷歌",
                "position": "Senior Software Engineer",
                "location": "Mountain View, CA",
                "start_date": "2021-01",
                "end_date": "Present",
                "highlights": [
                    "Led development of ML infrastructure serving 1B+ daily requests",
                    "Reduced model inference latency by 40% through optimization",
                    "Mentored team of 5 engineers on best practices",
                    "领导开发了每天处理10亿+请求的机器学习基础设施"
                ]
            },
            {
                "company": "Meta",
                "position": "Software Engineer",
                "location": "Menlo Park, CA",
                "start_date": "2018-06",
                "end_date": "2020-12",
                "highlights": [
                    "Built real-time collaboration features for Workplace",
                    "Improved system reliability from 99.9% to 99.99% uptime",
                    "构建了Workplace的实时协作功能"
                ]
            }
        ],
        education=[
            {
                "school": "Stanford University",
                "degree": "Master of Science",
                "field": "Computer Science",
                "start_date": "2016",
                "end_date": "2018",
                "gpa": "3.9"
            },
            {
                "school": "Tsinghua University 清华大学",
                "degree": "Bachelor of Engineering",
                "field": "Computer Science and Technology",
                "start_date": "2012",
                "end_date": "2016"
            }
        ],
        skills=[
            {
                "category": "Programming Languages 编程语言",
                "skills": ["Python", "TypeScript", "Go", "Java", "C++"]
            },
            {
                "category": "Frameworks & Tools",
                "skills": ["React", "Next.js", "FastAPI", "Django", "TensorFlow"]
            },
            {
                "category": "Cloud & Infrastructure 云计算",
                "skills": ["AWS", "GCP", "Kubernetes", "Docker", "Terraform"]
            }
        ],
        projects=[
            {
                "name": "AI Resume Optimizer 简历优化器",
                "description": "Built an AI-powered platform that helps job seekers optimize their resumes for specific roles using NLP and machine learning. 使用自然语言处理和机器学习帮助求职者优化简历。",
                "technologies": ["Python", "FastAPI", "OpenAI", "React", "PostgreSQL"],
                "link": "https://github.com/johnzhang/resume-optimizer"
            }
        ],
        languages=[
            {"name": "Chinese 中文", "level": "Native 母语"},
            {"name": "English 英语", "level": "Professional 专业"}
        ],
        awards=[
            {
                "name": "Google Peer Bonus",
                "year": "2023",
                "issuer": "Google"
            }
        ]
    )

    # Test all templates
    templates = ["minimal", "professional", "creative", "executive"]
    generator = PDFGenerator()

    try:
        for template in templates:
            print(f"Generating PDF with template: {template}...")

            options = PDFGenerationOptions(
                template=template,
                dpi=300,
                format="letter"
            )

            output_path = Path(__file__).parent.parent.parent / "test_outputs" / f"resume_{template}.pdf"
            output_path.parent.mkdir(exist_ok=True)

            pdf_bytes = await generator.generate_pdf(
                resume_data=resume_data,
                options=options,
                output_path=output_path
            )

            print(f"✓ Generated {template} template: {output_path}")
            print(f"  File size: {len(pdf_bytes)} bytes")

        print("\n✓ All PDFs generated successfully!")

    finally:
        await generator.close()


if __name__ == "__main__":
    asyncio.run(test_pdf_generation())
