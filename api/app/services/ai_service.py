import json
from typing import Any
from openai import AsyncOpenAI
from app.core.config import get_settings

settings = get_settings()
client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)


class AIService:
    @staticmethod
    async def generate_embedding(text: str) -> list[float]:
        response = await client.embeddings.create(
            model="text-embedding-3-small",
            input=text,
        )
        return response.data[0].embedding

    @staticmethod
    async def parse_jd(content: str) -> dict[str, Any]:
        return await AIService.analyze_jd(content)

    @staticmethod
    async def analyze_jd(content: str) -> dict[str, Any]:
        prompt = f"""Extract structured information from this job description:

{content}

Return a JSON object with:
- skills: array of required/mentioned skills
- experience_level: junior/mid/senior/lead
- requirements: array of key requirements
- responsibilities: array of key responsibilities
- nice_to_have: array of bonus qualifications
"""

        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
        )

        return json.loads(response.choices[0].message.content)

    @staticmethod
    async def match_resume(resume_content: str, jd_content: str) -> dict[str, Any]:
        prompt = f"""Compare this resume against the job description and provide a detailed match analysis.

Resume:
{resume_content}

Job Description:
{jd_content}

Return a JSON object with:
- match_score: float (0-100)
- matched_skills: array of matching skills
- missing_skills: array of missing skills
- strengths: array of candidate strengths
- gaps: array of experience gaps
- recommendations: array of specific suggestions
"""

        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
        )

        return json.loads(response.choices[0].message.content)

    @staticmethod
    async def optimize_resume(
        resume_content: str, jd_content: str, parsed_jd: dict[str, Any]
    ) -> dict[str, Any]:
        prompt = f"""Rewrite and optimize this resume for the specific job description while maintaining truthfulness.

Original Resume:
{resume_content}

Job Description:
{jd_content}

Key Requirements from JD:
{json.dumps(parsed_jd, indent=2)}

Return a JSON object with:
- optimized_content: the full rewritten resume content
- changes_made: array of specific improvements
- keywords_added: array of new keywords included
- sections_improved: array of enhanced sections
"""

        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
        )

        return json.loads(response.choices[0].message.content)

    @staticmethod
    async def generate_interview_prep(
        resume_content: str, jd_content: str
    ) -> dict[str, Any]:
        prompt = f"""Generate comprehensive interview preparation materials based on this resume and job description.

Resume:
{resume_content}

Job Description:
{jd_content}

Return a JSON object with:
- likely_questions: array of expected interview questions with suggested answers
- technical_topics: array of technical topics to review
- company_research: array of key points to research about the company
- questions_to_ask: array of insightful questions for the interviewer
- key_talking_points: array of candidate's strengths to emphasize
"""

        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
        )

        return json.loads(response.choices[0].message.content)
