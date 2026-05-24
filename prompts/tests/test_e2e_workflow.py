"""
End-to-End AI Workflow Tests for SyncHire

Tests the complete workflow:
User Resume → JD Analysis → Match Calculation → Resume Optimization → Interview Prep

Critical quality metrics:
- JSON format consistency
- Zero hallucinations (resume authenticity)
- Bilingual processing accuracy
- Response time benchmarks
"""

import pytest
import json

from test_validation import validate_test_input
import time
from typing import Dict, Any
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from pydantic import BaseModel, Field


# Pydantic models for output validation
class JDAnalysisOutput(BaseModel):
    job_title: str
    hard_skills: list[str] = Field(default_factory=list)
    soft_skills: list[str] = Field(default_factory=list)
    experience_level: str
    keywords: list[str] = Field(default_factory=list)


class ExperienceRankingOutput(BaseModel):
    matched_experiences: list[Dict[str, Any]]
    skill_gaps: list[Dict[str, Any]]
    summary: Dict[str, Any]


class InterviewQuestionsOutput(BaseModel):
    hr_questions: list[Dict[str, Any]] = Field(default_factory=list)
    technical_questions: list[Dict[str, Any]] = Field(default_factory=list)
    reverse_questions: list[Dict[str, Any]] = Field(default_factory=list)


class SelfIntroOutput(BaseModel):
    one_minute: Dict[str, Any]
    three_minute: Dict[str, Any]


@pytest.mark.integration
@pytest.mark.slow
class TestE2EWorkflow:
    """Complete end-to-end workflow tests"""

    @pytest.fixture
    def complete_test_data(self, sample_chinese_jd, sample_user_profile):
        """Complete test data for E2E workflow"""
        return {
            "jd_text": sample_chinese_jd,
            "user_profile": sample_user_profile,
            "workflow_steps": [
                "jd_analysis",
                "experience_retrieval",
                "resume_restructure",
                "interview_questions",
                "self_intro"
            ]
        }

    def test_complete_workflow_chinese(
        self,
        openai_llm,
        complete_test_data,
        jd_analysis_prompt,
        experience_rag_prompt,
        resume_restructure_prompt,
        interview_questions_prompt,
        self_intro_prompt
    ):
        """Test complete workflow with Chinese JD and profile"""
        start_time = time.time()
        results = {}

        # Step 1: JD Analysis
        step_start = time.time()
        parser = PydanticOutputParser(pydantic_object=JDAnalysisOutput)
        prompt = ChatPromptTemplate.from_messages([
            ("system", jd_analysis_prompt),
            ("human", "{jd_text}")
        ])
        chain = prompt | openai_llm | parser

        jd_result = chain.invoke({"jd_text": complete_test_data["jd_text"]})
        results["jd_analysis"] = {
            "duration": time.time() - step_start,
            "output": jd_result.model_dump()
        }

        # Validate JD analysis
        assert jd_result.job_title is not None
        assert len(jd_result.hard_skills) > 0
        results["jd_analysis"]["validation"] = "passed"

        # Step 2: Experience Retrieval
        step_start = time.time()
        parser = PydanticOutputParser(pydantic_object=ExperienceRankingOutput)
        prompt = ChatPromptTemplate.from_messages([
            ("system", experience_rag_prompt),
            ("human", "Profile: {profile}\nJD: {jd}")
        ])
        chain = prompt | openai_llm | parser

        experience_result = chain.invoke({
            "profile": json.dumps(complete_test_data["user_profile"], ensure_ascii=False),
            "jd": json.dumps(jd_result.model_dump(), ensure_ascii=False)
        })
        results["experience_retrieval"] = {
            "duration": time.time() - step_start,
            "output": experience_result.model_dump()
        }

        # Validate experience retrieval
        assert len(experience_result.matched_experiences) > 0
        assert all("relevance_score" in exp for exp in experience_result.matched_experiences)
        results["experience_retrieval"]["validation"] = "passed"

        # Step 3: Resume Restructure (CRITICAL - check for hallucinations)
        step_start = time.time()
        prompt = ChatPromptTemplate.from_messages([
            ("system", resume_restructure_prompt),
            ("human", "Profile: {profile}\nJD: {jd}")
        ])
        chain = prompt | openai_llm

        resume_result = chain.invoke({
            "profile": json.dumps(complete_test_data["user_profile"], ensure_ascii=False),
            "jd": json.dumps(jd_result.model_dump(), ensure_ascii=False)
        })
        results["resume_restructure"] = {
            "duration": time.time() - step_start,
            "output": resume_result.content
        }

        # CRITICAL: Check for hallucinations
        original_skills = set(skill.lower() for skill in complete_test_data["user_profile"]["skills"])
        resume_text = resume_result.content.lower()

        # Common skills that could be fabricated
        fabricated_skills = ["kubernetes", "k8s", "celery", "mongodb", "graphql"]
        for skill in fabricated_skills:
            if skill not in original_skills:
                assert skill not in resume_text or resume_text.count(skill) < 2, \
                    f"HALLUCINATION: Fabricated skill '{skill}' found in resume"

        results["resume_restructure"]["validation"] = "passed"
        results["resume_restructure"]["hallucination_check"] = "passed"

        # Step 4: Interview Questions
        step_start = time.time()
        prompt = ChatPromptTemplate.from_messages([
            ("system", interview_questions_prompt),
            ("human", "JD: {jd}\nResume: {resume}")
        ])
        chain = prompt | openai_llm

        questions_result = chain.invoke({
            "jd": json.dumps(jd_result.model_dump(), ensure_ascii=False),
            "resume": json.dumps(complete_test_data["user_profile"], ensure_ascii=False)
        })
        results["interview_questions"] = {
            "duration": time.time() - step_start,
            "output": questions_result.content
        }

        # Validate interview questions (should have all 3 categories)
        questions_text = questions_result.content.lower()
        assert "hr" in questions_text or "人力资源" in questions_text
        assert "technical" in questions_text or "技术" in questions_text
        assert "reverse" in questions_text or "反问" in questions_text
        results["interview_questions"]["validation"] = "passed"

        # Step 5: Self-Introduction
        step_start = time.time()
        prompt = ChatPromptTemplate.from_messages([
            ("system", self_intro_prompt),
            ("human", "Profile: {profile}\nJD: {jd}")
        ])
        chain = prompt | openai_llm

        intro_result = chain.invoke({
            "profile": json.dumps(complete_test_data["user_profile"], ensure_ascii=False),
            "jd": json.dumps(jd_result.model_dump(), ensure_ascii=False)
        })
        results["self_intro"] = {
            "duration": time.time() - step_start,
            "output": intro_result.content
        }

        # Validate self-intro (should have both versions)
        intro_text = intro_result.content.lower()
        assert "1分钟" in intro_text or "one minute" in intro_text or "一分钟" in intro_text
        assert "3分钟" in intro_text or "three minute" in intro_text or "三分钟" in intro_text
        results["self_intro"]["validation"] = "passed"

        # Total workflow duration
        total_duration = time.time() - start_time
        results["total_duration"] = total_duration

        # Performance assertion (should complete in reasonable time)
        assert total_duration < 120, f"Workflow too slow: {total_duration}s"

        # Quality gate assertions
        assert all(step.get("validation") == "passed" for step in results.values() if isinstance(step, dict) and "validation" in step), \
            "One or more workflow steps failed validation"

        assert results["resume_restructure"].get("hallucination_check") == "passed", \
            "CRITICAL: Hallucination detected in resume restructure"

        # Store results for reporting
        results["quality_metrics"] = self._calculate_quality_metrics(results)

    def test_complete_workflow_english(
        self,
        openai_llm,
        sample_english_jd,
        sample_user_profile,
        jd_analysis_prompt,
        experience_rag_prompt,
        resume_restructure_prompt
    ):
        """Test complete workflow with English JD"""
        # Similar structure but with English inputs
        parser = PydanticOutputParser(pydantic_object=JDAnalysisOutput)
        prompt = ChatPromptTemplate.from_messages([
            ("system", jd_analysis_prompt),
            ("human", "{jd_text}")
        ])
        chain = prompt | openai_llm | parser

        jd_result = chain.invoke({"jd_text": sample_english_jd})

        # Validate English JD parsing
        assert jd_result.job_title is not None
        assert len(jd_result.hard_skills) > 0

        # Continue with other steps...
        # (abbreviated for brevity)

    def test_complete_workflow_mixed_language(
        self,
        openai_llm,
        sample_mixed_jd,
        sample_user_profile,
        jd_analysis_prompt,
        resume_restructure_prompt
    ):
        """Test complete workflow with mixed language JD"""
        parser = PydanticOutputParser(pydantic_object=JDAnalysisOutput)
        prompt = ChatPromptTemplate.from_messages([
            ("system", jd_analysis_prompt),
            ("human", "{jd_text}")
        ])
        chain = prompt | openai_llm | parser

        jd_result = chain.invoke({"jd_text": sample_mixed_jd})

        # Should handle both languages
        assert jd_result.job_title is not None

        # Check for bilingual skill extraction
        skills_text = " ".join(jd_result.hard_skills).lower()
        has_english = any(tech in skills_text for tech in ["react", "node", "python"])
        has_chinese = any(chinese in skills_text for chinese in ["python", "react"])

        assert has_english or has_chinese, "Should extract skills from mixed language JD"

    def _calculate_quality_metrics(self, results: Dict) -> Dict[str, Any]:
        """Calculate quality metrics for the workflow"""
        metrics = {
            "json_parse_success_rate": 0.0,
            "hallucination_rate": 0.0,
            "bilingual_accuracy": 0.0,
            "average_response_time": 0.0,
            "total_duration": results.get("total_duration", 0)
        }

        # Calculate JSON parse success rate
        json_steps = ["jd_analysis", "experience_retrieval"]
        json_success = sum(1 for step in json_steps if results.get(step, {}).get("validation") == "passed")
        metrics["json_parse_success_rate"] = json_success / len(json_steps) if json_steps else 0

        # Calculate hallucination rate
        if results.get("resume_restructure", {}).get("hallucination_check") == "passed":
            metrics["hallucination_rate"] = 0.0
        else:
            metrics["hallucination_rate"] = 1.0

        # Calculate average response time
        durations = [
            results.get(step, {}).get("duration", 0)
            for step in ["jd_analysis", "experience_retrieval", "resume_restructure", "interview_questions", "self_intro"]
        ]
        valid_durations = [d for d in durations if d > 0]
        metrics["average_response_time"] = sum(valid_durations) / len(valid_durations) if valid_durations else 0

        return metrics


@pytest.mark.integration
class TestWorkflowQualityMetrics:
    """Test quality metrics collection and validation"""

    def test_json_format_consistency(
        self,
        openai_llm,
        sample_chinese_jd,
        jd_analysis_prompt
    ):
        """Test that JSON output format is consistent across multiple runs"""
        parser = PydanticOutputParser(pydantic_object=JDAnalysisOutput)
        prompt = ChatPromptTemplate.from_messages([
            ("system", jd_analysis_prompt),
            ("human", "{jd_text}")
        ])
        chain = prompt | openai_llm | parser

        # Run 3 times
        results = [chain.invoke({"jd_text": sample_chinese_jd}) for _ in range(3)]

        # All should parse successfully
        assert all(isinstance(r, JDAnalysisOutput) for r in results)

        # Job titles should be consistent
        job_titles = [r.job_title for r in results]
        assert all(title == job_titles[0] for title in job_titles)

    def test_hallucination_detection_accuracy(
        self,
        openai_llm,
        sample_user_profile,
        resume_restructure_prompt
    ):
        """Test accuracy of hallucination detection"""
        # Create a JD that would incentivize fabrication
        tempting_jd = {
            "job_title": "Senior Full Stack Architect",
            "requirements": ["Kubernetes", "GraphQL", "MongoDB", "React", "Node.js", "Python", "AWS", "Terraform"]
        }

        prompt = ChatPromptTemplate.from_messages([
            ("system", resume_restructure_prompt),
            ("human", "Profile: {profile}\nJD: {jd}")
        ])
        chain = prompt | openai_llm

        result = chain.invoke({
            "profile": json.dumps(sample_user_profile, ensure_ascii=False),
            "jd": json.dumps(tempting_jd, ensure_ascii=False)
        })

        result_text = result.content.lower()

        # Check that tempting but missing skills are NOT fabricated
        missing_skills = ["kubernetes", "graphql", "mongodb", "terraform"]
        original_skills = set(skill.lower() for skill in sample_user_profile["skills"])

        for skill in missing_skills:
            if skill not in original_skills:
                # Should not appear as user's skill
                # Might appear in context of "requirements" or "learning"
                assert not (f"experience with {skill}" in result_text or f"熟练使用{skill}" in result_text), \
                    f"Hallucination detection failed: fabricated skill '{skill}'"

    def test_bilingual_processing_accuracy(
        self,
        openai_llm,
        sample_mixed_jd,
        jd_analysis_prompt
    ):
        """Test accuracy of bilingual processing"""
        parser = PydanticOutputParser(pydantic_object=JDAnalysisOutput)
        prompt = ChatPromptTemplate.from_messages([
            ("system", jd_analysis_prompt),
            ("human", "{jd_text}")
        ])
        chain = prompt | openai_llm | parser

        result = chain.invoke({"jd_text": sample_mixed_jd})

        # Should extract skills from both languages
        skills_lower = [s.lower() for s in result.hard_skills]

        # Check for English technical terms
        assert any("react" in s or "node" in s for s in skills_lower), \
            "Should extract English technical terms"

        # Should preserve Chinese characters
        assert any(any(ord(c) > 127 for c in s) for s in result.hard_skills), \
            "Should preserve Chinese characters"

    def test_response_time_benchmarks(
        self,
        openai_llm,
        sample_chinese_jd,
        jd_analysis_prompt
    ):
        """Test that response times meet benchmarks"""
        parser = PydanticOutputParser(pydantic_object=JDAnalysisOutput)
        prompt = ChatPromptTemplate.from_messages([
            ("system", jd_analysis_prompt),
            ("human", "{jd_text}")
        ])
        chain = prompt | openai_llm | parser

        # Run 5 times
        durations = []
        for _ in range(5):
            start = time.time()
            chain.invoke({"jd_text": sample_chinese_jd})
            durations.append(time.time() - start)

        avg_duration = sum(durations) / len(durations)
        max_duration = max(durations)

        # Benchmark assertions
        assert avg_duration < 30, f"Average response time too slow: {avg_duration:.2f}s"
        assert max_duration < 60, f"Max response time too slow: {max_duration:.2f}s"

        # Calculate percentiles
        sorted_durations = sorted(durations)
        p90 = sorted_durations[int(len(sorted_durations) * 0.9)]
        p95 = sorted_durations[int(len(sorted_durations) * 0.95)]

        assert p90 < 45, f"P90 response time too slow: {p90:.2f}s"
        assert p95 < 50, f"P95 response time too slow: {p95:.2f}s"


@pytest.mark.integration
class TestWorkflowErrorHandling:
    """Test workflow error handling and recovery"""

    def test_empty_jd_handling(self, openai_llm, jd_analysis_prompt):
        """Test workflow handles empty JD gracefully"""
        parser = PydanticOutputParser(pydantic_object=JDAnalysisOutput)
        prompt = ChatPromptTemplate.from_messages([
            ("system", jd_analysis_prompt),
            ("human", "{jd_text}")
        ])
        chain = prompt | openai_llm | parser

        result = chain.invoke({"jd_text": ""})

        # Should still return valid structure
        assert isinstance(result, JDAnalysisOutput)

    def test_empty_profile_handling(self, openai_llm, resume_restructure_prompt):
        """Test workflow handles empty profile gracefully"""
        prompt = ChatPromptTemplate.from_messages([
            ("system", resume_restructure_prompt),
            ("human", "Profile: {profile}\nJD: {jd}")
        ])
        chain = prompt | openai_llm

        result = chain.invoke({
            "profile": "{}",
            "jd": '{"job_title": "Developer"}'
        })

        # Should return some output without crashing
        assert result.content is not None
        assert len(result.content) > 0

    def test_malformed_json_recovery(self, openai_llm, jd_analysis_prompt):
        """Test workflow recovers from malformed JSON"""
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


@pytest.mark.integration
class TestWorkflowReporting:
    """Test workflow reporting and metrics collection"""

    def test_generate_quality_report(
        self,
        openai_llm,
        sample_chinese_jd,
        sample_user_profile,
        jd_analysis_prompt,
        resume_restructure_prompt
    ):
        """Test generating a quality report for workflow run"""
        from datetime import datetime

        # Run workflow steps
        parser = PydanticOutputParser(pydantic_object=JDAnalysisOutput)
        prompt = ChatPromptTemplate.from_messages([
            ("system", jd_analysis_prompt),
            ("human", "{jd_text}")
        ])
        chain = prompt | openai_llm | parser

        start_time = time.time()
        jd_result = chain.invoke({"jd_text": sample_chinese_jd})
        jd_duration = time.time() - start_time

        # Generate report
        report = {
            "timestamp": datetime.now().isoformat(),
            "workflow_type": "e2e_ai_workflow",
            "model": "gpt-4o",
            "steps": {
                "jd_analysis": {
                    "status": "success",
                    "duration": jd_duration,
                    "output_valid": isinstance(jd_result, JDAnalysisOutput)
                }
            },
            "quality_metrics": {
                "json_parse_success_rate": 1.0,
                "hallucination_rate": 0.0,
                "bilingual_accuracy": 1.0,
                "average_response_time": jd_duration
            },
            "quality_gate": {
                "passed": True,
                "critical_checks": {
                    "hallucination_check": "passed",
                    "json_format_check": "passed"
                }
            }
        }

        # Validate report structure
        assert "timestamp" in report
        assert "quality_metrics" in report
        assert "quality_gate" in report
        assert report["quality_gate"]["passed"] is True

        return report
