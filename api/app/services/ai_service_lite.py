"""
AI Service - Lightweight Version

Wrapper for AI APIs (OpenAI, Anthropic) with caching and error handling.
"""

import asyncio
import json
from typing import Optional
from functools import lru_cache
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
                    {"role": "system", "content": "You are an expert resume writer and career coach."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=4000,
            )

            optimized = response.choices[0].message.content or resume_content

            logger.info(LogCategory.AI, f"Resume optimized using {model}")
            return optimized

        except Exception as e:
            logger.error(LogCategory.AI, f"Resume optimization failed: {str(e)}", exc_info=True)
            # Return original content on failure
            return resume_content

    async def parse_jd(self, jd_content: str, model: str = "claude-3-5-sonnet-20241022") -> dict:
        """
        Parse job description using AI.

        Args:
            jd_content: Raw JD content
            model: AI model to use

        Returns:
            Parsed JD data as dictionary
        """
        try:
            if not self.anthropic_client:
                # Fallback to OpenAI if Anthropic not available
                return await self._parse_jd_openai(jd_content)

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
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )

            content = response.content[0].text

            # Parse JSON response
            parsed = json.loads(content)

            logger.info(LogCategory.AI, f"JD parsed using {model}")
            return parsed

        except Exception as e:
            logger.error(LogCategory.AI, f"JD parsing failed: {str(e)}", exc_info=True)
            # Return basic parsed data on failure
            return {
                "company": "",
                "title": "",
                "description": jd_content,
                "requirements": [],
                "benefits": [],
                "skills": [],
                "experience": "",
                "salary_min": None,
                "salary_max": None,
                "location": "",
                "remote": "unknown",
                "employment_type": "unknown"
            }

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
                    {"role": "system", "content": "You are an expert at parsing job descriptions."},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.3,
            )

            content = response.choices[0].message.content or "{}"
            parsed = json.loads(content)

            logger.info(LogCategory.AI, "JD parsed using OpenAI (fallback)")
            return parsed

        except Exception as e:
            logger.error(LogCategory.AI, f"OpenAI JD parsing failed: {str(e)}", exc_info=True)
            # Return basic parsed data on failure
            return {
                "company": "",
                "title": "",
                "description": jd_content,
                "requirements": [],
                "benefits": [],
                "skills": [],
                "experience": "",
                "salary_min": None,
                "salary_max": None,
                "location": "",
                "remote": "unknown",
                "employment_type": "unknown"
            }

    async def calculate_match_score(
        self,
        resume_content: str,
        jd_content: str,
        model: str = "gpt-4"
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
                return 50.0  # Default score if no AI available

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
                    {"role": "system", "content": "You are an expert at matching candidates to jobs."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=10,
            )

            score_text = response.choices[0].message.content or "50"

            # Extract numeric score
            try:
                score = float(''.join(filter(lambda c: c.isdigit() or c == '.', score_text)))
                score = max(0, min(100, score))  # Clamp to 0-100
            except ValueError:
                score = 50.0

            logger.info(LogCategory.AI, f"Match score calculated: {score}")
            return score

        except Exception as e:
            logger.error(LogCategory.AI, f"Match score calculation failed: {str(e)}", exc_info=True)
            return 50.0  # Default score on failure

    async def generate_interview_questions(
        self,
        jd_content: str,
        num_questions: int = 5,
        model: str = "gpt-4"
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
                    "What are your strengths and weaknesses?"
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
                    {"role": "system", "content": "You are an expert interviewer and career coach."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=1000,
            )

            content = response.choices[0].message.content or ""

            # Parse questions
            questions = [q.strip() for q in content.split('\n') if q.strip()][:num_questions]

            logger.info(LogCategory.AI, f"Generated {len(questions)} interview questions")
            return questions

        except Exception as e:
            logger.error(LogCategory.AI, f"Interview question generation failed: {str(e)}", exc_info=True)
            # Return default questions on failure
            return [
                "Tell me about yourself.",
                "Why do you want to work here?",
                "What are your strengths and weaknesses?",
                "Describe a challenging work situation and how you handled it.",
                "Where do you see yourself in 5 years?"
            ]


# Global AI service instance
ai_service = AIService()
