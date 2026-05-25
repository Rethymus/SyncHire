"""
Mock MCP Server Helper

This module provides mock MCP server implementations for testing without actual servers.
It simulates the behavior of real MCP servers with realistic responses and error scenarios.
"""

from typing import Dict, Any, Optional, List
from datetime import datetime
import random


class MockMCPServer:
    """Base class for mock MCP servers."""

    def __init__(self, server_name: str):
        self.server_name = server_name
        self.call_count = 0
        self.last_call_time: Optional[datetime] = None

    def _track_call(self):
        """Track server calls for testing."""
        self.call_count += 1
        self.last_call_time = datetime.now()

    def _success_response(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate standard success response."""
        return {
            "success": True,
            "data": data,
            "metadata": {
                "server": self.server_name,
                "timestamp": datetime.now().isoformat(),
                "call_count": self.call_count,
            },
        }

    def _error_response(
        self,
        error_code: str,
        message: str,
        details: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Generate standard error response."""
        return {
            "success": False,
            "error": {
                "code": error_code,
                "message": message,
                "details": details,
            },
            "metadata": {
                "server": self.server_name,
                "timestamp": datetime.now().isoformat(),
            },
        }


class MockResumeAnalyzerServer(MockMCPServer):
    """Mock resume analyzer MCP server."""

    def __init__(self):
        super().__init__("resume-analyzer")
        self.confidence_scores = [0.85, 0.90, 0.92, 0.95, 0.88]

    def parse_resume(
        self,
        file_path: str,
        file_content: Optional[bytes] = None,
    ) -> Dict[str, Any]:
        """Simulate resume parsing."""
        self._track_call()

        # Simulate parsing errors for certain files
        if "error" in file_path.lower():
            return self._error_response(
                error_code="PARSE_ERROR",
                message="Failed to parse resume file",
                details=f"File {file_path} is corrupted or invalid",
            )

        # Generate realistic resume data
        resume_data = {
            "contact": {
                "name": "John Doe",
                "email": "john.doe@example.com",
                "phone": "+1-555-0123-4567",
                "location": "San Francisco, CA",
                "linkedin": "linkedin.com/in/johndoe",
            },
            "summary": "Senior Software Engineer with 8+ years of experience",
            "experience": [
                {
                    "title": "Senior Software Engineer",
                    "company": "Tech Corp",
                    "duration": "3 years",
                    "location": "San Francisco, CA",
                    "description": (
                        "Led development of microservices architecture "
                        "serving 1M+ users. Implemented CI/CD pipelines "
                        "reducing deployment time by 60%."
                    ),
                },
                {
                    "title": "Software Engineer",
                    "company": "Startup Inc",
                    "duration": "2 years",
                    "location": "Remote",
                    "description": (
                        "Built full-stack web applications using React "
                        "and Python. Improved application performance "
                        "by 40%."
                    ),
                },
            ],
            "education": [
                {
                    "degree": "B.S. Computer Science",
                    "school": "Stanford University",
                    "year": "2018",
                    "gpa": "3.8",
                }
            ],
            "skills": [
                "Python",
                "JavaScript",
                "React",
                "Node.js",
                "AWS",
                "Docker",
                "Kubernetes",
                "PostgreSQL",
                "MongoDB",
                "Git",
            ],
            "projects": [
                {
                    "name": "E-commerce Platform",
                    "description": "Built scalable e-commerce platform",
                    "technologies": ["React", "Node.js", "PostgreSQL"],
                }
            ],
            "certifications": [
                "AWS Solutions Architect",
                "Google Cloud Professional",
            ],
        }

        return self._success_response(
            {
                **resume_data,
                "metadata": {
                    "parsed_at": datetime.now().isoformat(),
                    "confidence_score": random.choice(self.confidence_scores),
                    "file_type": "PDF",
                },
            }
        )


class MockJDParserServer(MockMCPServer):
    """Mock JD parser MCP server."""

    def __init__(self):
        super().__init__("jd-parser")
        self.confidence_scores = [0.88, 0.91, 0.94, 0.89, 0.93]

    def parse_jd(self, jd_text: str) -> Dict[str, Any]:
        """Simulate JD parsing."""
        self._track_call()

        # Simulate parsing errors
        if len(jd_text) < 50:
            return self._error_response(
                error_code="INVALID_JD",
                message="Job description is too short",
                details="Job description must be at least 50 characters",
            )

        # Extract structured data
        jd_data = {
            "title": "Senior Full Stack Developer",
            "company": "Innovation Inc",
            "location": "Remote / San Francisco, CA",
            "description": (
                "We are looking for a Senior Full Stack Developer to join "
                "our growing team. You will be responsible for developing "
                "and maintaining web applications, collaborating with cross-"
                "functional teams, and mentoring junior developers."
            ),
            "requirements": [
                "5+ years of professional software development experience",
                "Proficiency in Python and JavaScript/TypeScript",
                "Experience with modern frontend frameworks (React, Vue, or Angular)",
                "Strong understanding of cloud platforms (AWS, GCP, or Azure)",
                "Experience with microservices architecture",
                "Knowledge of database systems (PostgreSQL, MongoDB)",
                "Familiarity with containerization (Docker, Kubernetes)",
                "Excellent problem-solving and communication skills",
            ],
            "nice_to_have": [
                "Experience with machine learning or AI",
                "Contributions to open-source projects",
                "Experience with agile methodologies",
                "Knowledge of DevOps practices",
            ],
            "salary": {
                "min": 120000,
                "max": 180000,
                "currency": "USD",
                "period": "annual",
            },
            "employment_type": "Full-time",
            "experience_level": "Senior",
        }

        return self._success_response(
            {
                **jd_data,
                "metadata": {
                    "parsed_at": datetime.now().isoformat(),
                    "confidence_score": random.choice(self.confidence_scores),
                    "source_text_length": len(jd_text),
                },
            }
        )


class MockJobMatcherServer(MockMCPServer):
    """Mock job matcher MCP server."""

    def __init__(self):
        super().__init__("job-matcher")
        self.match_scores = [0.65, 0.75, 0.85, 0.90, 0.70]

    def match(
        self,
        resume: Dict[str, Any],
        jd: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Simulate job matching."""
        self._track_call()

        # Calculate match score
        match_score = random.choice(self.match_scores)

        # Generate match analysis
        match_data = {
            "match_score": match_score,
            "match_reasoning": self._generate_match_reasoning(match_score),
            "strengths": self._identify_strengths(resume, jd),
            "gaps": self._identify_gaps(resume, jd),
            "recommendations": self._generate_recommendations(match_score),
        }

        return self._success_response(
            {
                **match_data,
                "metadata": {
                    "matched_at": datetime.now().isoformat(),
                    "model_version": "v1.0",
                    "processing_time_ms": random.randint(100, 500),
                },
            }
        )

    def _generate_match_reasoning(self, score: float) -> str:
        """Generate reasoning based on match score."""
        if score >= 0.90:
            return "Excellent match with strong alignment in all key areas"
        elif score >= 0.75:
            return "Good match with solid overlap in required skills"
        elif score >= 0.60:
            return "Moderate match with some gaps in experience"
        else:
            return "Limited match, significant skill gaps identified"

    def _identify_strengths(
        self,
        resume: Dict[str, Any],
        jd: Dict[str, Any],
    ) -> List[str]:
        """Identify match strengths."""
        return [
            "Meets all technical requirements",
            "Relevant industry experience",
            "Strong educational background",
            "Demonstrated leadership skills",
            "Proven track record of success",
        ]

    def _identify_gaps(
        self,
        resume: Dict[str, Any],
        jd: Dict[str, Any],
    ) -> List[str]:
        """Identify experience gaps."""
        return [
            "Missing some nice-to-have skills",
            "Limited experience with specific tools",
            "Could emphasize project outcomes more",
        ]

    def _generate_recommendations(self, score: float) -> List[str]:
        """Generate improvement recommendations."""
        if score >= 0.90:
            return [
                "Highlight leadership experiences",
                "Emphasize project impact",
            ]
        elif score >= 0.75:
            return [
                "Add more specific project examples",
                "Quantify achievements",
                "Highlight relevant certifications",
            ]
        else:
            return [
                "Consider acquiring additional skills",
                "Gain more experience in key areas",
                "Highlight transferable skills",
            ]

    def optimize_resume(
        self,
        resume: Dict[str, Any],
        jd: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Simulate resume optimization."""
        self._track_call()

        optimization_data = {
            "optimized_resume": {
                "summary": "Enhanced resume with targeted keywords and structure",
                "changes": [
                    "Added cloud computing keywords throughout",
                    "Restructured experience section for impact",
                    "Emphasized leadership and mentorship experience",
                    "Added quantifiable achievements",
                    "Improved formatting for ATS optimization",
                ],
            },
            "ats_score": random.uniform(0.85, 0.98),
            "keyword_matches": [
                "Python",
                "JavaScript",
                "React",
                "AWS",
                "microservices",
                "agile",
                "CI/CD",
            ],
            "suggestions": [
                "Quantify more achievements with specific metrics",
                "Add more industry-specific keywords",
                "Include links to portfolio or GitHub",
            ],
        }

        return self._success_response(
            {
                **optimization_data,
                "metadata": {
                    "optimized_at": datetime.now().isoformat(),
                    "improvement_score": random.uniform(0.10, 0.25),
                    "processing_time_ms": random.randint(200, 600),
                },
            }
        )


class MockInterviewPrepServer(MockMCPServer):
    """Mock interview preparation MCP server."""

    def __init__(self):
        super().__init__("interview-prep")

    def generate_interview_prep(
        self,
        resume: Dict[str, Any],
        jd: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Simulate interview prep generation."""
        self._track_call()

        prep_data = {
            "technical_questions": [
                {
                    "question": (
                        "Explain how you would design a scalable microservices "
                        "architecture for a high-traffic application"
                    ),
                    "category": "System Design",
                    "difficulty": "Advanced",
                    "suggested_answer": (
                        "I would start by identifying the core services and their "
                        "boundaries, then implement API Gateway for routing, use "
                        "message queues for async communication, implement service "
                        "discovery, and ensure proper monitoring and logging..."
                    ),
                },
                {
                    "question": (
                        "Describe your experience with cloud platforms and "
                        "containerization technologies"
                    ),
                    "category": "Cloud & DevOps",
                    "difficulty": "Intermediate",
                    "suggested_answer": (
                        "I have extensive experience with AWS including EC2, S3, "
                        "Lambda, and RDS. For containerization, I've used Docker "
                        "for packaging applications and Kubernetes for orchestration..."
                    ),
                },
            ],
            "behavioral_questions": [
                {
                    "question": (
                        "Tell me about a time you led a team through a "
                        "challenging technical project"
                    ),
                    "category": "Leadership",
                    "star_method_hint": (
                        "Situation: Describe the project and challenges. "
                        "Task: Explain your role and responsibilities. "
                        "Action: Detail the actions you took. "
                        "Result: Share the outcomes and impact."
                    ),
                },
                {
                    "question": (
                        "Describe a situation where you had to resolve a "
                        "conflict within your team"
                    ),
                    "category": "Teamwork",
                    "star_method_hint": (
                        "Focus on your communication skills, empathy, and "
                        "problem-solving approach"
                    ),
                },
            ],
            "company_research": [
                "Innovation Inc focuses on AI-driven solutions",
                "Recently launched a new product line in Q1 2026",
                "Values innovation, collaboration, and continuous learning",
                "Uses modern tech stack: Python, React, AWS, Kubernetes",
            ],
            "preparation_tips": [
                "Review their tech stack and projects thoroughly",
                "Prepare specific examples from your experience",
                "Research their company culture and values",
                "Prepare thoughtful questions to ask the interviewer",
                "Practice explaining complex technical concepts clearly",
            ],
        }

        return self._success_response(
            {
                **prep_data,
                "metadata": {
                    "generated_at": datetime.now().isoformat(),
                    "question_count": len(prep_data["technical_questions"])
                    + len(prep_data["behavioral_questions"]),
                    "processing_time_ms": random.randint(300, 800),
                },
            }
        )


class MockMCPServerFactory:
    """Factory for creating mock MCP servers."""

    _servers = {
        "resume-analyzer": MockResumeAnalyzerServer,
        "jd-parser": MockJDParserServer,
        "job-matcher": MockJobMatcherServer,
        "interview-prep": MockInterviewPrepServer,
    }

    @classmethod
    def create_server(cls, server_name: str) -> MockMCPServer:
        """Create a mock MCP server instance."""
        server_class = cls._servers.get(server_name)
        if not server_class:
            raise ValueError(f"Unknown server: {server_name}")
        return server_class()

    @classmethod
    def create_all_servers(cls) -> Dict[str, MockMCPServer]:
        """Create all mock MCP servers."""
        return {name: cls.create_server(name) for name in cls._servers.keys()}


# Convenience functions for testing
def create_mock_resume_analyzer() -> MockResumeAnalyzerServer:
    """Create a mock resume analyzer server."""
    return MockResumeAnalyzerServer()


def create_mock_jd_parser() -> MockJDParserServer:
    """Create a mock JD parser server."""
    return MockJDParserServer()


def create_mock_job_matcher() -> MockJobMatcherServer:
    """Create a mock job matcher server."""
    return MockJobMatcherServer()


def create_mock_interview_prep() -> MockInterviewPrepServer:
    """Create a mock interview prep server."""
    return MockInterviewPrepServer()
