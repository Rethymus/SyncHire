"""
Test suite for JD Analysis prompt

Tests cover:
- JSON format consistency
- Chinese JD parsing
- English JD parsing
- Mixed language handling
- Edge cases (empty, malformed)
"""

import pytest
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from pydantic import BaseModel, Field



class JDAnalysisOutput(BaseModel):
    """Expected output structure for JD analysis"""
    job_title: str
    department: str | None = None
    employment_type: str
    location: str | None = None
    salary_range: str | None = None
    hard_skills: list[str] = Field(default_factory=list)
    soft_skills: list[str] = Field(default_factory=list)
    experience_level: str
    years_of_experience: dict | None = None
    industry_experience: list[str] = Field(default_factory=list)
    education: dict | None = None
    keywords: list[str] = Field(default_factory=list)
    responsibilities: list[str] | None = None
    company_insights: dict | None = None


@pytest.mark.critical
class TestJDAnalysisParsing:
    """Test JD parsing functionality"""

    def test_chinese_jd_parsing(self, openai_llm, jd_analysis_prompt, sample_chinese_jd):
        """Test parsing Chinese job description"""
        parser = PydanticOutputParser(pydantic_object=JDAnalysisOutput)

        prompt = ChatPromptTemplate.from_messages([
            ("system", jd_analysis_prompt),
            ("human", "{jd_text}")
        ])

        chain = prompt | openai_llm | parser

        result = chain.invoke({"jd_text": sample_chinese_jd})

        # Assertions
        assert isinstance(result, JDAnalysisOutput)
        assert result.job_title is not None
        assert len(result.job_title) > 0
        assert "后端" in result.job_title or "开发" in result.job_title or "engineer" in result.job_title.lower()

        # Check skills extracted
        assert len(result.hard_skills) > 0
        assert any("Java" in skill or "java" in skill.lower() for skill in result.hard_skills)
        assert any("Spring" in skill or "spring" in skill.lower() for skill in result.hard_skills)

        # Check experience level
        assert result.experience_level in ["Entry", "Mid", "Senior", "Lead", "Executive"]
        assert result.experience_level == "Senior"  # 5+ years should be Senior

    def test_english_jd_parsing(self, openai_llm, jd_analysis_prompt, sample_english_jd):
        """Test parsing English job description"""
        parser = PydanticOutputParser(pydantic_object=JDAnalysisOutput)

        prompt = ChatPromptTemplate.from_messages([
            ("system", jd_analysis_prompt),
            ("human", "{jd_text}")
        ])

        chain = prompt | openai_llm | parser

        result = chain.invoke({"jd_text": sample_english_jd})

        # Assertions
        assert isinstance(result, JDAnalysisOutput)
        assert result.job_title is not None
        assert "Software Engineer" in result.job_title or "engineer" in result.job_title.lower()

        # Check skills
        assert len(result.hard_skills) > 0
        assert any("Python" in skill or "Go" in skill or "Java" in skill for skill in result.hard_skills)

        # Check employment type
        assert result.employment_type == "Full-time"

    def test_mixed_language_jd_parsing(self, openai_llm, jd_analysis_prompt, sample_mixed_jd):
        """Test parsing mixed Chinese/English job description"""
        parser = PydanticOutputParser(pydantic_object=JDAnalysisOutput)

        prompt = ChatPromptTemplate.from_messages([
            ("system", jd_analysis_prompt),
            ("human", "{jd_text}")
        ])

        chain = prompt | openai_llm | parser

        result = chain.invoke({"jd_text": sample_mixed_jd})

        # Assertions
        assert isinstance(result, JDAnalysisOutput)
        assert result.job_title is not None

        # Should detect both React and Node.js
        skills_lower = [s.lower() for s in result.hard_skills]
        assert any("react" in skill for skill in skills_lower)
        assert any("node" in skill for skill in skills_lower)

        # Should detect both languages
        assert len(result.hard_skills) > 0


@pytest.mark.critical
class TestJDAnalysisOutputFormat:
    """Test output format consistency"""

    def test_json_structure_valid(self, openai_llm, jd_analysis_prompt, sample_chinese_jd):
        """Test that output is valid JSON with correct structure"""
        parser = PydanticOutputParser(pydantic_object=JDAnalysisOutput)

        prompt = ChatPromptTemplate.from_messages([
            ("system", jd_analysis_prompt),
            ("human", "{jd_text}")
        ])

        chain = prompt | openai_llm | parser

        result = chain.invoke({"jd_text": sample_chinese_jd})

        # Verify it's the correct type
        assert isinstance(result, JDAnalysisOutput)

        # Verify all required fields exist
        assert hasattr(result, 'job_title')
        assert hasattr(result, 'hard_skills')
        assert hasattr(result, 'soft_skills')
        assert hasattr(result, 'experience_level')
        assert hasattr(result, 'keywords')

    def test_no_duplicate_skills(self, openai_llm, jd_analysis_prompt, sample_chinese_jd):
        """Test that skills are deduplicated"""
        parser = PydanticOutputParser(pydantic_object=JDAnalysisOutput)

        prompt = ChatPromptTemplate.from_messages([
            ("system", jd_analysis_prompt),
            ("human", "{jd_text}")
        ])

        chain = prompt | openai_llm | parser

        result = chain.invoke({"jd_text": sample_chinese_jd})

        # Check for duplicates (case-insensitive)
        hard_skills_lower = [s.lower() for s in result.hard_skills]
        assert len(hard_skills_lower) == len(set(hard_skills_lower)), "Skills should be deduplicated"

    def test_skill_categorization(self, openai_llm, jd_analysis_prompt, sample_chinese_jd):
        """Test that skills are correctly categorized as hard vs soft"""
        parser = PydanticOutputParser(pydantic_object=JDAnalysisOutput)

        prompt = ChatPromptTemplate.from_messages([
            ("system", jd_analysis_prompt),
            ("human", "{jd_text}")
        ])

        chain = prompt | openai_llm | parser

        result = chain.invoke({"jd_text": sample_chinese_jd})

        # Communication and collaboration should be in soft skills
        soft_skills_lower = " ".join(result.soft_skills).lower()
        assert any(word in soft_skills_lower for word in ["沟通", "communication", "协作", "collaboration"])

        # Technical skills should be in hard skills
        hard_skills_lower = " ".join(result.hard_skills).lower()
        assert any(tech in hard_skills_lower for tech in ["java", "python", "sql", "react"])


@pytest.mark.unit
class TestJDAnalysisEdgeCases:
    """Test edge cases and error handling"""

    def test_empty_jd(self, openai_llm, jd_analysis_prompt):
        """Test handling of empty JD"""
        parser = PydanticOutputParser(pydantic_object=JDAnalysisOutput)

        prompt = ChatPromptTemplate.from_messages([
            ("system", jd_analysis_prompt),
            ("human", "{jd_text}")
        ])

        chain = prompt | openai_llm | parser

        result = chain.invoke({"jd_text": ""})

        # Should still return valid structure with null/empty values
        assert isinstance(result, JDAnalysisOutput)

    def test_minimal_jd(self, openai_llm, jd_analysis_prompt):
        """Test handling of minimal JD"""
        parser = PydanticOutputParser(pydantic_object=JDAnalysisOutput)

        prompt = ChatPromptTemplate.from_messages([
            ("system", jd_analysis_prompt),
            ("human", "{jd_text}")
        ])

        chain = prompt | openai_llm | parser

        result = chain.invoke({"jd_text": "We need a Python developer."})

        # Should extract what little information exists
        assert isinstance(result, JDAnalysisOutput)
        # Job title might be inferred or empty
        # Skills should contain Python
        assert any("python" in skill.lower() for skill in result.hard_skills)

    def test_malformed_jd(self, openai_llm, jd_analysis_prompt):
        """Test handling of malformed JD"""
        parser = PydanticOutputParser(pydantic_object=JDAnalysisOutput)

        prompt = ChatPromptTemplate.from_messages([
            ("system", jd_analysis_prompt),
            ("human", "{jd_text}")
        ])

        chain = prompt | openai_llm | parser

        malformed_jd = """
        JOB!!!111
        skills: everything
        salary: $$$$
        """

        result = chain.invoke({"jd_text": malformed_jd})

        # Should still return valid structure
        assert isinstance(result, JDAnalysisOutput)

    def test_special_characters(self, openai_llm, jd_analysis_prompt):
        """Test handling of special characters in JD"""
        parser = PydanticOutputParser(pydantic_object=JDAnalysisOutput)

        prompt = ChatPromptTemplate.from_messages([
            ("system", jd_analysis_prompt),
            ("human", "{jd_text}")
        ])

        chain = prompt | openai_llm | parser

        jd_with_special = """
        职位：C++开发工程师（底层系统）
        要求：熟悉C++11/14/17标准、STL、Boost库
        工具：CMake, Git, Docker
        薪资：¥30k-50k/月 ⚡️💰
        """

        result = chain.invoke({"jd_text": jd_with_special})

        # Should handle special characters
        assert isinstance(result, JDAnalysisOutput)
        assert any("c++" in skill.lower() or "cpp" in skill.lower() for skill in result.hard_skills)


@pytest.mark.slow
@pytest.mark.integration
class TestJDAnalysisConsistency:
    """Test consistency across multiple runs"""

    def test_consistent_parsing(self, openai_llm, jd_analysis_prompt, sample_chinese_jd):
        """Test that parsing is consistent across multiple runs"""
        parser = PydanticOutputParser(pydantic_object=JDAnalysisOutput)

        prompt = ChatPromptTemplate.from_messages([
            ("system", jd_analysis_prompt),
            ("human", "{jd_text}")
        ])

        chain = prompt | openai_llm | parser

        # Run 3 times
        results = [chain.invoke({"jd_text": sample_chinese_jd}) for _ in range(3)]

        # Job title should be consistent
        job_titles = [r.job_title for r in results]
        assert all(title == job_titles[0] for title in job_titles), \
            f"Job titles should be consistent, got: {job_titles}"

        # Experience level should be consistent
        exp_levels = [r.experience_level for r in results]
        assert all(level == exp_levels[0] for level in exp_levels), \
            f"Experience levels should be consistent, got: {exp_levels}"
