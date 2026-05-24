"""
Pytest configuration and fixtures for SyncHire prompt testing
"""

import os
import re
import json
import pytest
from typing import Dict, Any
from pathlib import Path

from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from pydantic import BaseModel, Field


def validate_test_input(input_data: Any, max_length: int = 10000) -> Any:
    """
    Validate test input data to prevent injection attacks.

    Args:
        input_data: Input data to validate (str, dict, list)
        max_length: Maximum length for string inputs

    Returns:
        Validated input data

    Raises:
        ValueError: If input contains dangerous patterns
    """
    if isinstance(input_data, str):
        if len(input_data) > max_length:
            raise ValueError(f"Input exceeds maximum length of {max_length}")

        # Check for prompt injection patterns
        dangerous_patterns = [
            r'ignore\s+(all\s+)?(previous|earlier)\s+instructions',
            r'forget\s+(everything|all\s+previous)',
            r'disregard\s+(all\s+)?(previous|earlier)\s+instructions',
        ]

        for pattern in dangerous_patterns:
            if re.search(pattern, input_data, re.IGNORECASE):
                raise ValueError(f"Input contains potentially dangerous pattern")

        # Remove control characters
        return re.sub(r'[\x00-\x08\x0b-\x0c\x0e-\x1f\x7f]', '', input_data)

    elif isinstance(input_data, dict):
        return {k: validate_test_input(v, max_length) for k, v in input_data.items()}

    elif isinstance(input_data, list):
        return [validate_test_input(item, max_length) for item in input_data]

    else:
        return input_data


# Test data directory
FIXTURES_DIR = Path(__file__).parent / "fixtures"


class JDAnalysisOutput(BaseModel):
    """Expected output structure for JD analysis"""
    job_title: str
    hard_skills: list[str] = Field(default_factory=list)
    soft_skills: list[str] = Field(default_factory=list)
    experience_level: str
    keywords: list[str] = Field(default_factory=list)


class ExperienceRankingOutput(BaseModel):
    """Expected output structure for experience retrieval"""
    matched_experiences: list[Dict[str, Any]]
    skill_gaps: list[Dict[str, Any]]
    summary: Dict[str, Any]


@pytest.fixture
def sample_chinese_jd() -> str:
    """Sample Chinese job description"""
    return """
    职位：高级后端开发工程师
    部门：技术研发部
    类型：全职
    地点：上海

    职责：
    - 负责核心业务系统的后端开发和维护
    - 参与系统架构设计和技术方案评审
    - 优化系统性能，提升用户体验

    要求：
    - 本科及以上学历，计算机相关专业
    - 5年以上Java开发经验，熟悉Spring Boot、MyBatis
    - 熟悉MySQL、Redis等数据库，有性能优化经验
    - 有高并发、分布式系统经验者优先
    - 良好的沟通能力和团队协作精神
    """


@pytest.fixture
def sample_english_jd() -> str:
    """Sample English job description"""
    return """
    Senior Software Engineer

    Department: Engineering
    Type: Full-time
    Location: San Francisco

    Responsibilities:
    - Design and develop scalable backend services
    - Collaborate with cross-functional teams
    - Participate in code reviews and architectural decisions

    Requirements:
    - 5+ years of experience in software development
    - Proficiency in Python, Go, or Java
    - Experience with cloud platforms (AWS, GCP, or Azure)
    - Knowledge of microservices architecture
    - Strong problem-solving skills
    """


@pytest.fixture
def sample_mixed_jd() -> str:
    """Sample mixed Chinese/English job description"""
    return """
    职位：Full Stack Developer 全栈开发工程师

    Team: Platform Team 平台团队
    Type: Fulltime 全职

    Responsibilities 职责:
    - Develop responsive web applications using React and Node.js
    - 设计并实现RESTful API
    - Collaborate with designers and product managers 与产品经理协作

    Requirements 要求:
    - 3+ years of full-stack development experience
    - Proficient in React, TypeScript, Node.js 熟练使用React/TS/Node
    - Experience with PostgreSQL and Redis
    - Good communication skills in English and Chinese 中英文沟通能力
    """


@pytest.fixture
def sample_user_profile() -> Dict[str, Any]:
    """Sample user profile for testing"""
    return {
        "name": "张明",
        "email": "zhangming@example.com",
        "summary": "3年后端开发经验，专注Python和Django",
        "education": {
            "degree": "学士",
            "major": "计算机科学与技术",
            "school": "上海交通大学",
            "year": "2021"
        },
        "skills": [
            "Python", "Django", "Flask", "PostgreSQL",
            "Redis", "Docker", "Git", "RESTful API"
        ],
        "experience": [
            {
                "id": "exp_001",
                "title": "后端开发工程师",
                "company": "上海某互联网公司",
                "dates": "2021.03 - 至今",
                "description": "负责电商平台的后端开发和维护",
                "achievements": [
                    "使用Django重构订单系统，性能提升40%",
                    "实现Redis缓存策略，页面加载时间减少60%"
                ],
                "technologies": ["Python", "Django", "PostgreSQL", "Redis"]
            }
        ],
        "projects": [
            {
                "id": "proj_001",
                "name": "个人博客系统",
                "role": "独立开发者",
                "technologies": ["Django", "Bootstrap", "SQLite"]
            }
        ]
    }


@pytest.fixture
def sample_career_changer_profile() -> Dict[str, Any]:
    """Sample career changer profile for edge case testing"""
    return {
        "name": "李华",
        "summary": "从传统行业转行做程序员",
        "education": {
            "degree": "硕士",
            "major": "机械工程",
            "school": "同济大学",
            "year": "2019"
        },
        "skills": ["Python", "JavaScript", "HTML/CSS", "SQL"],
        "experience": [
            {
                "id": "exp_001",
                "title": "机械工程师",
                "company": "某制造企业",
                "dates": "2019 - 2023",
                "description": "负责设备维护和工艺优化",
                "achievements": ["优化生产线流程，效率提升15%"]
            }
        ],
        "projects": [
            {
                "id": "proj_001",
                "name": "自学编程项目",
                "role": "独立学习",
                "technologies": ["Python", "Django"]
            }
        ]
    }


@pytest.fixture
def openai_llm():
    """Create OpenAI LLM instance for testing"""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        pytest.skip("OPENAI_API_KEY not set")
    return ChatOpenAI(
        model="gpt-4o",
        temperature=0.1,
        timeout=60,
        max_retries=2
    )


@pytest.fixture
def anthropic_llm():
    """Create Anthropic LLM instance for testing"""
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        pytest.skip("ANTHROPIC_API_KEY not set")
    return ChatAnthropic(
        model="claude-3-5-sonnet-20241022",
        temperature=0.1,
        timeout=60,
        max_retries=2
    )


@pytest.fixture
def jd_analysis_prompt() -> str:
    """Load JD analysis prompt template"""
    prompt_path = Path(__file__).parent.parent / "jd_analysis.md"
    with open(prompt_path, "r", encoding="utf-8") as f:
        return f.read()


@pytest.fixture
def resume_restructure_prompt() -> str:
    """Load resume restructure prompt template"""
    prompt_path = Path(__file__).parent.parent / "resume_restructure.md"
    with open(prompt_path, "r", encoding="utf-8") as f:
        return f.read()


@pytest.fixture
def experience_rag_prompt() -> str:
    """Load experience RAG prompt template"""
    prompt_path = Path(__file__).parent.parent / "experience_rag.md"
    with open(prompt_path, "r", encoding="utf-8") as f:
        return f.read()


@pytest.fixture
def interview_questions_prompt() -> str:
    """Load interview questions prompt template"""
    prompt_path = Path(__file__).parent.parent / "interview_questions.md"
    with open(prompt_path, "r", encoding="utf-8") as f:
        return f.read()


@pytest.fixture
def self_intro_prompt() -> str:
    """Load self-introduction prompt template"""
    prompt_path = Path(__file__).parent.parent / "self_intro.md"
    with open(prompt_path, "r", encoding="utf-8") as f:
        return f.read()


@pytest.fixture
def langsmith_config():
    """Configure LangSmith tracing"""
    api_key = os.getenv("LANGCHAIN_API_KEY")
    if api_key:
        os.environ["LANGCHAIN_API_KEY"] = api_key
        os.environ["LANGCHAIN_TRACING_V2"] = "true"
        os.environ["LANGCHAIN_PROJECT"] = "synchire-prompt-testing"
    return api_key is not None


def load_fixture_json(filename: str) -> Dict[str, Any]:
    """Load JSON fixture file"""
    filepath = FIXTURES_DIR / filename
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)


@pytest.fixture
def real_jd_samples() -> Dict[str, str]:
    """Load real JD samples from fixtures"""
    return {
        "chinese_backend": load_fixture_json("jds.json")["chinese_backend"],
        "english_frontend": load_fixture_json("jds.json")["english_frontend"],
        "mixed_fullstack": load_fixture_json("jds.json")["mixed_fullstack"]
    }


@pytest.fixture
def real_resume_samples() -> Dict[str, Dict]:
    """Load real resume samples from fixtures"""
    return load_fixture_json("resumes.json")


# Custom pytest markers
def pytest_configure(config):
    """Configure custom pytest markers"""
    config.addinivalue_line(
        "markers", "slow: marks tests as slow (deselect with '-m \"not slow\"')"
    )
    config.addinivalue_line(
        "markers", "integration: marks tests as integration tests"
    )
    config.addinivalue_line(
        "markers", "unit: marks tests as unit tests"
    )
    config.addinivalue_line(
        "markers", "critical: marks critical tests that must pass"
    )
