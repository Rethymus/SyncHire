"""
Integration test configuration and fixtures
"""

import pytest
import os
from pathlib import Path

# Add project root to path
import sys
sys.path.insert(0, str(Path(__file__).parent.parent.parent))


@pytest.fixture
def test_user_data():
    """Sample user data for testing"""
    return {
        "email": "test@example.com",
        "password": "SecurePass123!",
        "name": "测试用户",
        "phone": "138-0000-0000"
    }


@pytest.fixture
def sample_resume_file():
    """Path to sample resume for testing"""
    return Path(__file__).parent / "fixtures" / "sample_resume.pdf"


@pytest.fixture
def sample_jd_text():
    """Sample job description for testing"""
    return """
    职位：高级后端开发工程师
    公司：某知名互联网公司

    职责：
    - 负责核心业务系统的后端开发和维护
    - 参与系统架构设计和技术方案评审
    - 优化系统性能，提升用户体验

    要求：
    - 5年以上Java开发经验，熟悉Spring Boot、MyBatis
    - 熟悉MySQL、Redis等数据库，有性能优化经验
    - 有高并发、分布式系统经验者优先
    - 良好的沟通能力和团队协作精神
    """


@pytest.fixture
def expected_workflow_steps():
    """Expected workflow steps and their order"""
    return [
        "user_signup",
        "resume_upload",
        "resume_parse",
        "jd_input",
        "jd_parse",
        "match_calculation",
        "resume_optimize",
        "interview_prep_generate",
        "final_output"
    ]


@pytest.fixture
def api_base_url():
    """Base URL for API testing"""
    return os.getenv("API_BASE_URL", "http://localhost:8000")


@pytest.fixture
def auth_token(api_base_url, test_user_data):
    """Get authentication token for API requests"""
    # This would typically make a login request
    # For now, return a mock token
    return "mock_auth_token_for_testing"


@pytest.fixture
def mock_ai_responses():
    """Mock AI responses for testing"""
    return {
        "jd_analysis": {
            "job_title": "高级后端开发工程师",
            "hard_skills": ["Java", "Spring Boot", "MyBatis", "MySQL", "Redis"],
            "soft_skills": ["沟通能力", "团队协作"],
            "experience_level": "Senior",
            "keywords": ["后端开发", "高并发", "分布式系统"]
        },
        "resume_match": {
            "match_score": 75,
            "matched_skills": ["Java", "MySQL"],
            "skill_gaps": ["Spring Boot", "MyBatis", "Redis", "高并发"],
            "recommendations": ["补充Spring Boot经验", "学习Redis缓存"]
        },
        "optimized_resume": "## 优化后的简历\n### 工作经历\n...",
        "interview_questions": {
            "hr_questions": ["请介绍一下自己", "为什么离职"],
            "technical_questions": ["讲讲Spring Boot的自动配置"],
            "reverse_questions": ["团队目前的技术挑战是什么"]
        },
        "self_introduction": {
            "one_minute": "您好，我是...",
            "three_minute": "您好，我是...详细版本"
        }
    }
