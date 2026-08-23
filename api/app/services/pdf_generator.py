"""
PDF Generation Service for SyncHire

Handles resume PDF generation with support for:
- Multiple templates (minimal, professional, creative, executive)
- Chinese-English mixed content with proper fonts
- Smart pagination to prevent content cutoff
- High DPI export for print
"""

import asyncio
from pathlib import Path
from typing import Optional, Dict, Any, List

from pydantic import BaseModel
from playwright.async_api import async_playwright, Browser


class ResumeData(BaseModel):
    """Structured resume data for PDF generation"""

    # Personal Information
    name: str
    title: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    linkedin: Optional[str] = None
    github: Optional[str] = None
    website: Optional[str] = None

    # Professional Summary
    summary: Optional[str] = None

    # Experience
    experiences: List[Dict[str, Any]] = []

    # Education
    education: List[Dict[str, Any]] = []

    # Skills
    skills: List[Dict[str, Any]] = []

    # Projects
    projects: List[Dict[str, Any]] = []

    # Languages
    languages: List[Dict[str, Any]] = []

    # Awards & Certifications
    awards: List[Dict[str, Any]] = []

    # Custom sections
    custom_sections: Dict[str, List[Dict[str, Any]]] = {}


class PDFGenerationOptions(BaseModel):
    """Options for PDF generation"""

    template: str = "minimal"  # minimal, professional, creative, executive
    dpi: int = 300
    format: str = "letter"
    margin_top: str = "0.75in"
    margin_bottom: str = "0.75in"
    margin_left: str = "1in"
    margin_right: str = "1in"
    display_header_footer: bool = False
    prefer_css_page_size: bool = True
    print_background: bool = True


class TemplateEngine:
    """Template engine for rendering resume templates"""

    def __init__(self, templates_dir: Path = None):
        if templates_dir is None:
            templates_dir = Path(__file__).parent.parent.parent / "templates"
        self.templates_dir = Path(templates_dir)
        self._templates = {}

    def get_template(self, template_name: str) -> str:
        """Load and cache template HTML"""
        if template_name not in self._templates:
            template_path = self.templates_dir / f"{template_name}.html"
            if not template_path.exists():
                raise ValueError(
                    f"Template '{template_name}' not found at {template_path}"
                )
            with open(template_path, "r", encoding="utf-8") as f:
                self._templates[template_name] = f.read()
        return self._templates[template_name]

    def render(
        self, template_name: str, data: ResumeData, options: PDFGenerationOptions
    ) -> str:
        """Render template with resume data"""
        template = self.get_template(template_name)

        # Build contact HTML
        contact_html = self._render_contact(data)

        # Build content sections
        content_html = self._render_content(data, template_name)

        # For two-column templates, render sidebar
        sidebar_html = ""
        if template_name == "professional":
            sidebar_html = self._render_sidebar(data)

        # Replace placeholders
        html = template.replace("{{content}}", content_html)
        html = html.replace("{{sidebar}}", sidebar_html)
        html = html.replace("{{name}}", data.name)
        html = html.replace("{{title}}", data.title or "")
        html = html.replace("{{contact}}", contact_html)

        return html

    def _render_contact(self, data: ResumeData) -> str:
        """Render contact information HTML"""
        items = []

        if data.email:
            items.append(f'<span class="contact-item">✉ {data.email}</span>')
        if data.phone:
            items.append(f'<span class="contact-item">📱 {data.phone}</span>')
        if data.location:
            items.append(f'<span class="contact-item">📍 {data.location}</span>')
        if data.linkedin:
            items.append(f'<span class="contact-item">in {data.linkedin}</span>')
        if data.github:
            items.append(f'<span class="contact-item">gh {data.github}</span>')
        if data.website:
            items.append(f'<span class="contact-item">🔗 {data.website}</span>')

        return "\n".join(items)

    def _render_content(self, data: ResumeData, template_name: str) -> str:
        """Render main content sections"""
        sections = []

        # Executive summary (first for executive template)
        if template_name == "executive" and data.summary:
            sections.append(f"""
            <div class="section">
                <h2 class="section-title">Executive Summary</h2>
                <p class="summary">{data.summary}</p>
            </div>
            """)

        # Experience
        if data.experiences:
            sections.append(self._render_experience(data.experiences, template_name))

        # Education
        if data.education:
            sections.append(self._render_education(data.education))

        # Projects
        if data.projects:
            sections.append(self._render_projects(data.projects, template_name))

        # Skills (in main content for single-column templates)
        if template_name != "professional" and data.skills:
            sections.append(self._render_skills(data.skills, template_name))

        # Languages
        if data.languages:
            sections.append(self._render_languages(data.languages))

        # Awards
        if data.awards:
            sections.append(self._render_awards(data.awards))

        # Custom sections
        for section_name, section_data in data.custom_sections.items():
            sections.append(self._render_custom_section(section_name, section_data))

        return "\n".join(sections)

    def _render_sidebar(self, data: ResumeData) -> str:
        """Render sidebar content for two-column templates"""
        sections = []

        # Contact
        sections.append("""
        <div class="sidebar-section">
            <h3 class="sidebar-title">Contact</h3>
            <div class="sidebar-content">
        """)

        if data.email:
            sections.append(
                f'<div class="contact-item"><span class="contact-icon">@</span>{data.email}</div>'
            )
        if data.phone:
            sections.append(
                f'<div class="contact-item"><span class="contact-icon">📱</span>{data.phone}</div>'
            )
        if data.location:
            sections.append(
                f'<div class="contact-item"><span class="contact-icon">📍</span>{data.location}</div>'
            )
        if data.linkedin:
            sections.append(
                f'<div class="contact-item"><span class="contact-icon">in</span>{data.linkedin}</div>'
            )
        if data.github:
            sections.append(
                f'<div class="contact-item"><span class="contact-icon">gh</span>{data.github}</div>'
            )

        sections.append("</div></div>")

        # Skills
        if data.skills:
            sections.append("""
            <div class="sidebar-section">
                <h3 class="sidebar-title">Skills</h3>
                <div class="sidebar-content">
            """)

            for skill_group in data.skills:
                skill_name = skill_group.get("name", "")
                skill_level = skill_group.get("level", 3)
                sections.append(
                    f'<div class="skill-item"><div class="skill-name">{skill_name}</div>'
                )
                sections.append('<div class="skill-level">')

                for i in range(5):
                    filled = "filled" if i < skill_level else ""
                    sections.append(f'<span class="skill-dot {filled}"></span>')

                sections.append("</div></div>")

            sections.append("</div></div>")

        # Languages
        if data.languages:
            sections.append("""
            <div class="sidebar-section">
                <h3 class="sidebar-title">Languages</h3>
                <div class="sidebar-content">
            """)

            for lang in data.languages:
                sections.append(f"""
                <div class="language-item">
                    <span class="language-name">{lang.get("name", "")}</span>
                    <span class="language-level">{lang.get("level", "")}</span>
                </div>
                """)

            sections.append("</div></div>")

        return "\n".join(sections)

    def _render_experience(self, experiences: List[Dict], template_name: str) -> str:
        """Render work experience section"""
        items = []

        for exp in experiences:
            company = exp.get("company", "")
            position = exp.get("position", "")
            location = exp.get("location", "")
            start_date = exp.get("start_date", "")
            end_date = exp.get("end_date", "Present")
            description = exp.get("description", "")
            highlights = exp.get("highlights", [])

            html = f"""
            <div class="experience-item">
                <div class="experience-header">
                    <span class="company-name">{company}</span>
                    <span class="experience-date">{start_date} - {end_date}</span>
                </div>
                <div class="position-title">{position}</div>
            """

            if location:
                html += f'<div class="experience-location">{location}</div>'

            if template_name == "executive" and highlights:
                html += '<div class="highlight-box">'
                html += "<ul>"
                for highlight in highlights[:3]:
                    html += f"<li>{highlight}</li>"
                html += "</ul></div>"
            elif description:
                html += f'<div class="experience-description">{description}</div>'
            elif highlights:
                html += '<div class="experience-description"><ul>'
                for highlight in highlights:
                    html += f"<li>{highlight}</li>"
                html += "</ul></div>"

            html += "</div>"
            items.append(html)

        return f"""
        <div class="section">
            <h2 class="section-title">Professional Experience</h2>
            {"".join(items)}
        </div>
        """

    def _render_education(self, education: List[Dict]) -> str:
        """Render education section"""
        items = []

        for edu in education:
            school = edu.get("school", "")
            degree = edu.get("degree", "")
            field = edu.get("field", "")
            start_date = edu.get("start_date", "")
            end_date = edu.get("end_date", "")
            gpa = edu.get("gpa", "")

            html = f"""
            <div class="education-item">
                <div class="education-header">
                    <span class="school-name">{school}</span>
                    <span class="education-date">{start_date} - {end_date}</span>
                </div>
                <div class="degree">{degree}"""

            if field:
                html += f" in {field}"
            if gpa:
                html += f" (GPA: {gpa})"

            html += "</div></div>"
            items.append(html)

        return f"""
        <div class="section">
            <h2 class="section-title">Education</h2>
            {"".join(items)}
        </div>
        """

    def _render_projects(self, projects: List[Dict], template_name: str) -> str:
        """Render projects section"""
        items = []

        for project in projects:
            name = project.get("name", "")
            description = project.get("description", "")
            tech = project.get("technologies", [])
            link = project.get("link", "")

            html = '<div class="project-item">'
            html += f'<div class="project-name">{name}'

            if link:
                html += (
                    f' <a href="{link}" style="font-size: 8pt; color: #6c5ce7;">→</a>'
                )

            html += "</div>"
            html += f'<div class="project-description">{description}'

            if tech:
                html += f'<br><em>Tech: {", ".join(tech)}</em>'

            html += "</div></div>"
            items.append(html)

        return f"""
        <div class="section">
            <h2 class="section-title">Projects</h2>
            {"".join(items)}
        </div>
        """

    def _render_skills(self, skills: List[Dict], template_name: str) -> str:
        """Render skills section"""
        if template_name == "creative":
            items = []
            for skill_group in skills:
                skills_list = skill_group.get("skills", [])
                for skill in skills_list:
                    items.append(f'<span class="skill-pill">{skill}</span>')

            return f"""
            <div class="section">
                <h2 class="section-title">Skills</h2>
                <div class="skills-list">{"".join(items)}</div>
            </div>
            """
        else:
            categories = []
            for skill_group in skills:
                category = skill_group.get("category", "Skills")
                skills_list = skill_group.get("skills", [])
                categories.append(
                    f"<strong>{category}:</strong> {', '.join(skills_list)}"
                )

            return f"""
            <div class="section">
                <h2 class="section-title">Skills</h2>
                <p class="skills-list">{'<br>'.join(categories)}</p>
            </div>
            """

    def _render_languages(self, languages: List[Dict]) -> str:
        """Render languages section"""
        items = []

        for lang in languages:
            name = lang.get("name", "")
            level = lang.get("level", "")
            items.append(f"""
            <div class="language-item">
                <span class="language-name">{name}</span>
                <span class="language-level">{level}</span>
            </div>
            """)

        return f"""
        <div class="section">
            <h2 class="section-title">Languages</h2>
            {"".join(items)}
        </div>
        """

    def _render_awards(self, awards: List[Dict]) -> str:
        """Render awards section"""
        items = []

        for award in awards:
            name = award.get("name", "")
            year = award.get("year", "")
            issuer = award.get("issuer", "")
            items.append(f"""
            <div class="award-item">
                <span class="award-name">{name} {f"({issuer})" if issuer else ""}</span>
                <span class="award-year">{year}</span>
            </div>
            """)

        return f"""
        <div class="section">
            <h2 class="section-title">Awards & Certifications</h2>
            {"".join(items)}
        </div>
        """

    def _render_custom_section(self, name: str, data: List[Dict]) -> str:
        """Render custom section"""
        items = []

        for item in data:
            title = item.get("title", "")
            description = item.get("description", "")
            date = item.get("date", "")

            items.append(f"""
            <div style="margin-bottom: 8pt;">
                <div style="font-weight: 600;">{title}</div>
            """)

            if date:
                items.append(f'<div style="font-size: 9pt; color: #666;">{date}</div>')

            if description:
                items.append(f'<div style="font-size: 9pt;">{description}</div>')

            items.append("</div>")

        return f"""
        <div class="section">
            <h2 class="section-title">{name}</h2>
            {"".join(items)}
        </div>
        """


class PDFGenerator:
    """
    PDF generation service using Playwright

    Supports:
    - Multiple resume templates
    - Chinese font rendering
    - Smart pagination
    - High DPI export
    """

    def __init__(self):
        self.template_engine = TemplateEngine()
        self._browser: Optional[Browser] = None
        self._playwright = None

    async def _get_browser(self) -> Browser:
        """Get or create browser instance"""
        if self._browser is None:
            self._playwright = await async_playwright().start()
            self._browser = await self._playwright.chromium.launch()
        return self._browser

    async def close(self):
        """Close browser instance"""
        if self._browser:
            await self._browser.close()
            self._browser = None
        if self._playwright:
            await self._playwright.stop()
            self._playwright = None

    async def generate_pdf(
        self,
        resume_data: ResumeData,
        options: PDFGenerationOptions,
        output_path: Optional[Path] = None,
    ) -> bytes:
        """
        Generate PDF from resume data

        Args:
            resume_data: Structured resume data
            options: PDF generation options
            output_path: Optional path to save PDF

        Returns:
            PDF bytes
        """
        # Render template
        html = self.template_engine.render(options.template, resume_data, options)

        # Create temporary HTML file
        browser = await self._get_browser()
        page = await browser.new_page()

        # Set content
        await page.set_content(html, wait_until="networkidle")

        # Generate PDF
        pdf_bytes = await page.pdf(
            format=options.format,
            print_background=options.print_background,
            margin={
                "top": options.margin_top,
                "bottom": options.margin_bottom,
                "left": options.margin_left,
                "right": options.margin_right,
            },
            display_header_footer=options.display_header_footer,
            prefer_css_page_size=options.prefer_css_page_size,
        )

        await page.close()

        # Save to file if path provided
        if output_path:
            output_path = Path(output_path)
            output_path.parent.mkdir(parents=True, exist_ok=True)
            with open(output_path, "wb") as f:
                f.write(pdf_bytes)

        return pdf_bytes

    async def generate_pdf_from_markdown(
        self,
        markdown: str,
        options: PDFGenerationOptions,
        output_path: Optional[Path] = None,
    ) -> bytes:
        """
        Generate PDF from markdown resume

        Args:
            markdown: Resume in markdown format
            options: PDF generation options
            output_path: Optional path to save PDF

        Returns:
            PDF bytes
        """
        # Parse markdown to structured data
        resume_data = self._parse_markdown(markdown)
        return await self.generate_pdf(resume_data, options, output_path)

    def _parse_markdown(self, markdown: str) -> ResumeData:
        """
        Parse markdown resume to structured data

        Simple parser for common markdown resume formats
        """
        lines = markdown.split("\n")
        data = ResumeData(
            name="",
            experiences=[],
            education=[],
            skills=[],
            projects=[],
            languages=[],
            awards=[],
        )

        current_section = None
        current_item = {}

        for line in lines:
            line = line.strip()

            # Headers
            if line.startswith("# "):
                data.name = line[2:].strip()
                current_section = None
            elif line.startswith("## "):
                current_section = line[3:].strip().lower()
                current_item = {}
            elif line.startswith("### "):
                if current_section == "experience":
                    current_item = {"company": line[4:].strip(), "highlights": []}
                elif current_section == "education":
                    current_item = {"school": line[4:].strip()}
                elif current_section == "projects":
                    current_item = {"name": line[4:].strip(), "technologies": []}
            elif line.startswith("- ") or line.startswith("* "):
                content = line[2:].strip()
                if current_section == "experience" and current_item:
                    current_item["highlights"].append(content)
                elif current_section == "skills":
                    # Parse skill items
                    if "skills" not in [
                        s.get("category", "").lower() for s in data.skills
                    ]:
                        data.skills.append({"category": "Skills", "skills": []})
                    data.skills[0]["skills"].append(content)
                elif current_section == "projects" and current_item:
                    if content.startswith("**Tech:**"):
                        tech = content.replace("**Tech:**", "").strip()
                        current_item["technologies"] = [
                            t.strip() for t in tech.split(",")
                        ]
                    else:
                        current_item["description"] = content
            elif line.startswith("**") and line.endswith("**"):
                # Bold items (could be position, degree, etc)
                key_value = line[2:-2].split(":", 1)
                if len(key_value) == 2:
                    key, value = key_value
                    key = key.strip().lower()
                    value = value.strip()

                    if key in ["email", "phone", "location"]:
                        setattr(data, key, value)
                    elif key == "title":
                        data.title = value
            elif current_item:
                # Add item to appropriate list
                if current_section == "experience" and current_item.get("highlights"):
                    data.experiences.append(current_item)
                    current_item = {}
                elif current_section == "education":
                    data.education.append(current_item)
                    current_item = {}
                elif current_section == "projects" and current_item.get("description"):
                    data.projects.append(current_item)
                    current_item = {}

        # Add any remaining items
        if current_item.get("highlights"):
            data.experiences.append(current_item)
        elif current_item.get("school"):
            data.education.append(current_item)
        elif current_item.get("name"):
            data.projects.append(current_item)

        return data


class BatchPDFGenerator:
    """
    Batch PDF generation for multiple resumes

    Useful for:
    - Generating resumes in multiple templates
    - Exporting resumes for multiple users
    """

    def __init__(self):
        self.generator = PDFGenerator()

    async def generate_batch(
        self, resumes: List[tuple[ResumeData, PDFGenerationOptions, Path]]
    ) -> List[Path]:
        """
        Generate multiple PDFs in parallel

        Args:
            resumes: List of (resume_data, options, output_path) tuples

        Returns:
            List of output paths
        """
        tasks = [
            self.generator.generate_pdf(data, options, path)
            for data, options, path in resumes
        ]

        await asyncio.gather(*tasks)
        return [path for _, _, path in resumes]

    async def close(self):
        """Close generator"""
        await self.generator.close()


# Singleton instance
_pdf_generator: Optional[PDFGenerator] = None


async def get_pdf_generator() -> PDFGenerator:
    """Get singleton PDF generator instance"""
    global _pdf_generator
    if _pdf_generator is None:
        _pdf_generator = PDFGenerator()
    return _pdf_generator
