"""
AI Service - Lightweight Version

Wrapper for AI APIs (OpenAI, Anthropic) with caching and error handling.
"""

import json
import re
from typing import Optional
from openai import AsyncOpenAI
from anthropic import AsyncAnthropic

from app.core.config_lite import get_lite_settings
from app.core.logger import logger, LogCategory

settings = get_lite_settings()


class AIService:
    """AI service wrapper for resume and JD processing."""

    def __init__(self):
        self.openai_client: Optional[AsyncOpenAI] = None
        self.anthropic_client: Optional[AsyncAnthropic] = None
        self._initialize_clients()

    def _initialize_clients(self):
        """Initialize AI clients if API keys are available."""
        if settings.OPENAI_API_KEY:
            self.openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            logger.info(LogCategory.AI, "OpenAI client initialized")

        if settings.ANTHROPIC_API_KEY:
            self.anthropic_client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
            logger.info(LogCategory.AI, "Anthropic client initialized")

    async def optimize_resume(self, resume_content: str, model: str = "gpt-4") -> str:
        """
        Optimize resume content using AI.

        Args:
            resume_content: Current resume content
            model: AI model to use

        Returns:
            Optimized resume content
        """
        try:
            if not self.openai_client:
                raise ValueError("OpenAI client not initialized. Check API key.")

            prompt = f"""
            Please optimize the following resume for better ATS compatibility and impact.
            Keep the same structure but improve wording, formatting, and clarity.

            Resume:
            {resume_content}

            Return only the optimized resume content.
            """

            response = await self.openai_client.chat.completions.create(
                model=model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert resume writer and career coach.",
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=0.7,
                max_tokens=4000,
            )

            optimized = response.choices[0].message.content or resume_content

            logger.info(LogCategory.AI, f"Resume optimized using {model}")
            return optimized

        except Exception as e:
            logger.error(
                LogCategory.AI, f"Resume optimization failed: {str(e)}", exc_info=True
            )
            return self._basic_optimize_resume(resume_content)

    def _basic_optimize_resume(self, resume_content: str) -> str:
        """Make a conservative local ATS improvement when cloud AI is unavailable."""
        if "ATS Keywords" in resume_content:
            return resume_content

        known_skills = [
            "React",
            "Next.js",
            "TypeScript",
            "JavaScript",
            "HTML",
            "CSS",
            "Tailwind CSS",
            "FastAPI",
            "Python",
            "SQLite",
            "PostgreSQL",
            "REST APIs",
            "Playwright",
            "Git",
            "Docker",
            "Accessibility",
        ]
        lower_content = resume_content.lower()
        detected = [
            skill
            for skill in known_skills
            if skill.lower().replace(" apis", " api") in lower_content
        ]
        if not detected:
            return resume_content

        keywords = ", ".join(dict.fromkeys(detected))
        return f"{resume_content.rstrip()}\n\nATS Keywords\n{keywords}\n"

    async def parse_jd(
        self, jd_content: str, model: str = "claude-3-5-sonnet-20241022"
    ) -> dict:
        """
        Parse job description using AI.

        Args:
            jd_content: Raw JD content
            model: AI model to use

        Returns:
            Parsed JD data as dictionary
        """
        if not self.anthropic_client:
            # Fallback to OpenAI if Anthropic not available
            return await self._parse_jd_openai(jd_content)

        try:
            prompt = f"""
            Parse the following job description and extract key information in JSON format:

            {jd_content}

            Return a JSON object with:
            - company: Company name
            - title: Job title
            - description: Clean job description
            - requirements: List of requirements
            - benefits: List of benefits
            - skills: List of required skills
            - experience: Required experience level
            - salary_min: Minimum salary (if mentioned)
            - salary_max: Maximum salary (if mentioned)
            - location: Job location
            - remote: Remote work option (remote/hybrid/onsite)
            - employment_type: Employment type (full-time/part-time/contract/etc.)
            """

            response = await self.anthropic_client.messages.create(
                model=model,
                max_tokens=4000,
                messages=[{"role": "user", "content": prompt}],
            )

            content = response.content[0].text

            # Parse JSON response
            parsed = json.loads(content)

            logger.info(LogCategory.AI, f"JD parsed using {model}")
            return parsed

        except Exception as e:
            logger.warning(
                LogCategory.AI,
                f"Anthropic JD parsing failed, trying OpenAI fallback: {str(e)}",
                exc_info=True,
            )
            return await self._parse_jd_openai(jd_content)

    async def _parse_jd_openai(self, jd_content: str) -> dict:
        """Fallback JD parsing using OpenAI."""
        try:
            if not self.openai_client:
                raise ValueError("No AI clients available")

            prompt = f"""
            Parse the following job description and extract key information in JSON format:

            {jd_content}

            Return a JSON object with:
            - company: Company name
            - title: Job title
            - description: Clean job description
            - requirements: List of requirements
            - benefits: List of benefits
            - skills: List of required skills
            - experience: Required experience level
            - salary_min: Minimum salary (if mentioned)
            - salary_max: Maximum salary (if mentioned)
            - location: Job location
            - remote: Remote work option (remote/hybrid/onsite)
            - employment_type: Employment type (full-time/part-time/contract/etc.)
            """

            response = await self.openai_client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert at parsing job descriptions.",
                    },
                    {"role": "user", "content": prompt},
                ],
                response_format={"type": "json_object"},
                temperature=0.3,
            )

            content = response.choices[0].message.content or "{}"
            parsed = json.loads(content)

            logger.info(LogCategory.AI, "JD parsed using OpenAI (fallback)")
            return parsed

        except Exception as e:
            logger.error(
                LogCategory.AI, f"OpenAI JD parsing failed: {str(e)}", exc_info=True
            )
            return self._basic_parse_jd(jd_content)

    def _basic_parse_jd(self, jd_content: str) -> dict:
        """Parse common JD fields locally when cloud AI is unavailable."""
        fields: dict[str, str] = {}
        for raw_line in jd_content.splitlines():
            line = raw_line.strip()
            if ":" not in line:
                continue
            key, value = line.split(":", 1)
            normalized_key = key.strip().lower().replace(" ", "_")
            fields[normalized_key] = value.strip()

        salary_min = None
        salary_max = None
        salary_text = fields.get("salary", "")
        salary_numbers = [int(n.replace(",", "")) for n in re.findall(r"\d[\d,]*", salary_text)]
        if salary_numbers:
            salary_min = salary_numbers[0]
            salary_max = salary_numbers[-1] if len(salary_numbers) > 1 else salary_numbers[0]

        lower_content = jd_content.lower()
        remote = fields.get("remote", "")
        if not remote:
            if "remote" in lower_content:
                remote = "remote"
            elif "hybrid" in lower_content:
                remote = "hybrid"
            else:
                remote = "onsite"

        known_skills = [
            "react",
            "next.js",
            "typescript",
            "javascript",
            "html",
            "css",
            "tailwind",
            "fastapi",
            "python",
            "sqlite",
            "postgresql",
            "rest api",
            "playwright",
            "git",
            "accessibility",
        ]
        skills = [skill for skill in known_skills if skill in lower_content]

        requirements = [
            line[1:].strip()
            for line in jd_content.splitlines()
            if line.strip().startswith("-")
        ]

        return {
            "company": fields.get("company", "Unknown Company"),
            "title": fields.get("title", "Unknown Position"),
            "description": jd_content,
            "requirements": requirements,
            "benefits": [],
            "skills": skills,
            "experience": fields.get("experience", ""),
            "salary_min": salary_min,
            "salary_max": salary_max,
            "location": fields.get("location", ""),
            "remote": remote,
            "employment_type": fields.get("employment_type", "unknown").lower(),
        }

    async def calculate_match_score(
        self, resume_content: str, jd_content: str, model: str = "gpt-4"
    ) -> float:
        """
        Calculate match score between resume and job description.

        Args:
            resume_content: Resume content
            jd_content: Job description content
            model: AI model to use

        Returns:
            Match score (0-100)
        """
        try:
            if not self.openai_client:
                return self._calculate_local_match_score(resume_content, jd_content)

            prompt = f"""
            Calculate a match score (0-100) between this resume and job description.

            Resume:
            {resume_content[:2000]}

            Job Description:
            {jd_content[:2000]}

            Consider:
            - Skills match
            - Experience level
            - Qualifications
            - Requirements fit

            Return only a number between 0 and 100.
            """

            response = await self.openai_client.chat.completions.create(
                model=model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert at matching candidates to jobs.",
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=0.3,
                max_tokens=10,
            )

            score_text = response.choices[0].message.content or "50"

            # Extract numeric score
            try:
                score = float(
                    "".join(filter(lambda c: c.isdigit() or c == ".", score_text))
                )
                score = max(0, min(100, score))  # Clamp to 0-100
            except ValueError:
                score = 50.0

            logger.info(LogCategory.AI, f"Match score calculated: {score}")
            return score

        except Exception as e:
            logger.error(
                LogCategory.AI,
                f"Match score calculation failed: {str(e)}",
                exc_info=True,
            )
            return self._calculate_local_match_score(resume_content, jd_content)

    def _calculate_local_match_score(self, resume_content: str, jd_content: str) -> float:
        """Calculate a deterministic local match score when AI is unavailable."""
        resume_words = set(re.findall(r"[a-zA-Z][a-zA-Z0-9.+#-]*", resume_content.lower()))
        jd_words = set(re.findall(r"[a-zA-Z][a-zA-Z0-9.+#-]*", jd_content.lower()))
        if not resume_words or not jd_words:
            return 50.0

        stop_words = {
            "and",
            "or",
            "the",
            "a",
            "an",
            "to",
            "for",
            "of",
            "in",
            "with",
            "using",
            "we",
            "are",
            "is",
            "this",
            "that",
            "you",
            "your",
        }
        resume_words -= stop_words
        jd_words -= stop_words
        overlap = resume_words & jd_words
        lexical_score = len(overlap) / max(1, len(jd_words)) * 100

        key_skills = {
            "react",
            "next.js",
            "typescript",
            "javascript",
            "html",
            "css",
            "fastapi",
            "python",
            "sqlite",
            "postgresql",
            "rest",
            "api",
            "playwright",
            "git",
            "accessibility",
        }
        jd_skills = jd_words & key_skills
        resume_skills = resume_words & key_skills
        skill_score = len(jd_skills & resume_skills) / max(1, len(jd_skills)) * 100

        score = (lexical_score * 0.35) + (skill_score * 0.65)
        return round(max(0, min(100, score)), 1)

    async def generate_interview_questions(
        self, jd_content: str, num_questions: int = 5, model: str = "gpt-4"
    ) -> list[str]:
        """
        Generate interview questions based on job description.

        Args:
            jd_content: Job description content
            num_questions: Number of questions to generate
            model: AI model to use

        Returns:
            List of interview questions
        """
        try:
            if not self.openai_client:
                return [
                    "Tell me about yourself.",
                    "Why do you want to work here?",
                    "What are your strengths and weaknesses?",
                ]

            prompt = f"""
            Generate {num_questions} interview questions based on this job description:

            {jd_content}

            Questions should be specific to the role and requirements.
            Return each question on a separate line.
            """

            response = await self.openai_client.chat.completions.create(
                model=model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert interviewer and career coach.",
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=0.7,
                max_tokens=1000,
            )

            content = response.choices[0].message.content or ""

            # Parse questions
            questions = [q.strip() for q in content.split("\n") if q.strip()][
                :num_questions
            ]

            logger.info(
                LogCategory.AI, f"Generated {len(questions)} interview questions"
            )
            return questions

        except Exception as e:
            logger.error(
                LogCategory.AI,
                f"Interview question generation failed: {str(e)}",
                exc_info=True,
            )
            # Return default questions on failure
            return [
                "Tell me about yourself.",
                "Why do you want to work here?",
                "What are your strengths and weaknesses?",
                "Describe a challenging work situation and how you handled it.",
                "Where do you see yourself in 5 years?",
            ]


# Global AI service instance
ai_service = AIService()
