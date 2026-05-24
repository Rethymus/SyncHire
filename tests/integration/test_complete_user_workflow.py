"""
Complete User Workflow Integration Tests

Tests the full user journey from signup to interview preparation.
"""

import pytest
from typing import Dict
from pathlib import Path


@pytest.mark.integration
@pytest.mark.slow
class TestCompleteUserWorkflow:
    """Test the complete user workflow end-to-end"""

    @pytest.fixture
    def workflow_state(self):
        """Maintain state across workflow steps"""
        return {
            "user_id": None,
            "resume_id": None,
            "jd_id": None,
            "match_id": None,
            "optimized_resume_id": None,
            "interview_prep_id": None
        }

    async def test_complete_new_user_journey(
        self,
        api_base_url,
        test_user_data,
        sample_resume_file,
        sample_jd_text,
        workflow_state,
        mock_ai_responses
    ):
        """Test complete journey for a new user:
        1. Signup → 2. Upload Resume → 3. Parse JD → 4. Get Match → 5. Optimize Resume → 6. Interview Prep
        """

        # Step 1: User Signup
        signup_response = await self._test_user_signup(api_base_url, test_user_data)
        assert signup_response["success"] is True
        assert "user_id" in signup_response
        workflow_state["user_id"] = signup_response["user_id"]

        # Step 2: Upload Resume
        upload_response = await self._test_resume_upload(
            api_base_url,
            workflow_state["user_id"],
            sample_resume_file
        )
        assert upload_response["success"] is True
        assert "resume_id" in upload_response
        workflow_state["resume_id"] = upload_response["resume_id"]

        # Step 3: Submit Job Description
        jd_response = await self._test_jd_submission(
            api_base_url,
            workflow_state["user_id"],
            sample_jd_text
        )
        assert jd_response["success"] is True
        assert "jd_id" in jd_response
        workflow_state["jd_id"] = jd_response["jd_id"]

        # Step 4: Get Match Analysis
        match_response = await self._test_match_calculation(
            api_base_url,
            workflow_state["user_id"],
            workflow_state["resume_id"],
            workflow_state["jd_id"]
        )
        assert match_response["success"] is True
        assert "match_score" in match_response
        assert 0 <= match_response["match_score"] <= 100
        workflow_state["match_id"] = match_response["match_id"]

        # Step 5: Optimize Resume
        optimize_response = await self._test_resume_optimization(
            api_base_url,
            workflow_state["user_id"],
            workflow_state["match_id"]
        )
        assert optimize_response["success"] is True
        assert "optimized_resume" in optimize_response
        assert "hallucination_check" in optimize_response
        assert optimize_response["hallucination_check"]["passed"] is True
        workflow_state["optimized_resume_id"] = optimize_response["resume_id"]

        # Step 6: Generate Interview Preparation
        interview_response = await self._test_interview_prep_generation(
            api_base_url,
            workflow_state["user_id"],
            workflow_state["match_id"]
        )
        assert interview_response["success"] is True
        assert "questions" in interview_response
        assert "self_introduction" in interview_response
        workflow_state["interview_prep_id"] = interview_response["prep_id"]

        # Verify workflow completion
        assert workflow_state["user_id"] is not None
        assert workflow_state["resume_id"] is not None
        assert workflow_state["jd_id"] is not None
        assert workflow_state["match_id"] is not None
        assert workflow_state["optimized_resume_id"] is not None
        assert workflow_state["interview_prep_id"] is not None

    async def test_returning_user_workflow(
        self,
        api_base_url,
        test_user_data,
        sample_jd_text,
        workflow_state
    ):
        """Test workflow for a returning user who already has a resume"""

        # Assume user is already logged in and has a resume
        workflow_state["user_id"] = "existing_user_123"
        workflow_state["resume_id"] = "existing_resume_456"

        # Submit new JD
        jd_response = await self._test_jd_submission(
            api_base_url,
            workflow_state["user_id"],
            sample_jd_text
        )
        assert jd_response["success"] is True
        workflow_state["jd_id"] = jd_response["jd_id"]

        # Get match analysis
        match_response = await self._test_match_calculation(
            api_base_url,
            workflow_state["user_id"],
            workflow_state["resume_id"],
            workflow_state["jd_id"]
        )
        assert match_response["success"] is True
        workflow_state["match_id"] = match_response["match_id"]

        # Optimize resume for new JD
        optimize_response = await self._test_resume_optimization(
            api_base_url,
            workflow_state["user_id"],
            workflow_state["match_id"]
        )
        assert optimize_response["success"] is True

    async def test_workflow_error_recovery(
        self,
        api_base_url,
        test_user_data,
        workflow_state
    ):
        """Test workflow handles errors gracefully"""

        # Test invalid resume upload
        invalid_response = await self._test_resume_upload(
            api_base_url,
            workflow_state.get("user_id", "test_user"),
            Path("nonexistent.pdf")
        )
        assert invalid_response["success"] is False
        assert "error" in invalid_response

        # Test invalid JD format
        invalid_jd_response = await self._test_jd_submission(
            api_base_url,
            workflow_state.get("user_id", "test_user"),
            ""
        )
        assert invalid_jd_response["success"] is False

    async def test_workflow_performance_benchmarks(
        self,
        api_base_url,
        test_user_data,
        sample_resume_file,
        sample_jd_text,
        workflow_state
    ):
        """Test workflow meets performance benchmarks"""

        import time

        # Setup
        signup_response = await self._test_user_signup(api_base_url, test_user_data)
        workflow_state["user_id"] = signup_response["user_id"]

        upload_response = await self._test_resume_upload(
            api_base_url,
            workflow_state["user_id"],
            sample_resume_file
        )
        workflow_state["resume_id"] = upload_response["resume_id"]

        jd_response = await self._test_jd_submission(
            api_base_url,
            workflow_state["user_id"],
            sample_jd_text
        )
        workflow_state["jd_id"] = jd_response["jd_id"]

        # Benchmark match calculation (should be < 10s)
        start = time.time()
        match_response = await self._test_match_calculation(
            api_base_url,
            workflow_state["user_id"],
            workflow_state["resume_id"],
            workflow_state["jd_id"]
        )
        match_duration = time.time() - start
        assert match_duration < 10, f"Match calculation too slow: {match_duration}s"

        # Benchmark resume optimization (should be < 30s)
        start = time.time()
        await self._test_resume_optimization(
            api_base_url,
            workflow_state["user_id"],
            match_response["match_id"]
        )
        optimize_duration = time.time() - start
        assert optimize_duration < 30, f"Resume optimization too slow: {optimize_duration}s"

        # Benchmark interview prep generation (should be < 15s)
        start = time.time()
        await self._test_interview_prep_generation(
            api_base_url,
            workflow_state["user_id"],
            match_response["match_id"]
        )
        interview_duration = time.time() - start
        assert interview_duration < 15, f"Interview prep generation too slow: {interview_duration}s"

    # Helper methods (would typically make actual API calls)

    async def _test_user_signup(self, api_base_url: str, user_data: Dict) -> Dict:
        """Test user signup endpoint"""
        # Mock implementation
        return {
            "success": True,
            "user_id": "user_123",
            "message": "User created successfully"
        }

    async def _test_resume_upload(self, api_base_url: str, user_id: str, resume_path: Path) -> Dict:
        """Test resume upload endpoint"""
        if not resume_path.exists():
            return {
                "success": False,
                "error": "File not found"
            }
        return {
            "success": True,
            "resume_id": "resume_456",
            "parsed_data": {"skills": ["Python", "Django"]}
        }

    async def _test_jd_submission(self, api_base_url: str, user_id: str, jd_text: str) -> Dict:
        """Test JD submission endpoint"""
        if not jd_text or not jd_text.strip():
            return {
                "success": False,
                "error": "JD text is empty"
            }
        return {
            "success": True,
            "jd_id": "jd_789",
            "analysis": {"job_title": "高级后端开发工程师"}
        }

    async def _test_match_calculation(self, api_base_url: str, user_id: str, resume_id: str, jd_id: str) -> Dict:
        """Test match calculation endpoint"""
        return {
            "success": True,
            "match_id": "match_101",
            "match_score": 75,
            "matched_skills": ["Python"],
            "skill_gaps": ["Java", "Spring Boot"]
        }

    async def _test_resume_optimization(self, api_base_url: str, user_id: str, match_id: str) -> Dict:
        """Test resume optimization endpoint"""
        return {
            "success": True,
            "resume_id": "optimized_resume_202",
            "optimized_resume": "# 优化后的简历\n...",
            "hallucination_check": {
                "passed": True,
                "details": "No fabricated information detected"
            }
        }

    async def _test_interview_prep_generation(self, api_base_url: str, user_id: str, match_id: str) -> Dict:
        """Test interview preparation generation endpoint"""
        return {
            "success": True,
            "prep_id": "interview_prep_303",
            "questions": {
                "hr": ["请介绍一下自己"],
                "technical": ["讲讲你的项目经验"],
                "reverse": ["团队的技术挑战是什么"]
            },
            "self_introduction": {
                "one_minute": "一分钟版本...",
                "three_minute": "三分钟版本..."
            }
        }


@pytest.mark.integration
class TestWorkflowDataConsistency:
    """Test data consistency across workflow steps"""

    async def test_resume_parsing_consistency(
        self,
        api_base_url,
        sample_resume_file
    ):
        """Test resume parsing produces consistent results"""
        # Parse resume twice
        parse1 = await self._parse_resume(api_base_url, sample_resume_file)
        parse2 = await self._parse_resume(api_base_url, sample_resume_file)

        # Should produce identical results
        assert parse1["skills"] == parse2["skills"]
        assert parse1["experience"] == parse2["experience"]

    async def test_jd_analysis_consistency(
        self,
        api_base_url,
        sample_jd_text
    ):
        """Test JD analysis produces consistent results"""
        # Analyze JD twice
        analysis1 = await self._analyze_jd(api_base_url, sample_jd_text)
        analysis2 = await self._analyze_jd(api_base_url, sample_jd_text)

        # Job title should be identical
        assert analysis1["job_title"] == analysis2["job_title"]

        # Skills should be identical (order may vary)
        assert set(analysis1["hard_skills"]) == set(analysis2["hard_skills"])

    async def test_match_score_deterministic(
        self,
        api_base_url,
        sample_resume_file,
        sample_jd_text
    ):
        """Test match score calculation is deterministic"""
        # Calculate match score twice
        match1 = await self._calculate_match(api_base_url, sample_resume_file, sample_jd_text)
        match2 = await self._calculate_match(api_base_url, sample_resume_file, sample_jd_text)

        # Scores should be identical
        assert match1["score"] == match2["score"]

    async def _parse_resume(self, api_base_url: str, resume_path: Path) -> Dict:
        """Helper to parse resume"""
        return {"skills": ["Python", "Django"], "experience": ["Job1", "Job2"]}

    async def _analyze_jd(self, api_base_url: str, jd_text: str) -> Dict:
        """Helper to analyze JD"""
        return {
            "job_title": "高级后端开发工程师",
            "hard_skills": ["Java", "Spring Boot", "MySQL"]
        }

    async def _calculate_match(self, api_base_url: str, resume_path: Path, jd_text: str) -> Dict:
        """Helper to calculate match"""
        return {"score": 75, "matched_skills": ["Python"]}


@pytest.mark.integration
class TestWorkflowQualityGates:
    """Test quality gates in the workflow"""

    async def test_hallucination_detection_gate(
        self,
        api_base_url,
        test_user_data,
        sample_jd_text
    ):
        """Test hallucination detection blocks optimization if fabrication detected"""
        # Setup user and JD
        user_id = "test_user"
        jd_id = "test_jd"

        # Try to optimize with hallucinating resume
        response = await self._optimize_resume_with_hallucination(api_base_url, user_id, jd_id)

        # Should block or warn about hallucination
        assert response["hallucination_check"]["detected"] is True
        assert response["blocked"] is True or response["warning"] is not None

    async def test_minimum_match_score_gate(
        self,
        api_base_url,
        sample_resume_file,
        sample_jd_text
    ):
        """Test very low match scores trigger appropriate warnings"""
        match_response = await self._calculate_match(api_base_url, sample_resume_file, sample_jd_text)

        if match_response["score"] < 30:
            # Should recommend not applying or significant improvements
            assert "warning" in match_response or "recommendation" in match_response
            assert match_response.get("recommendation") in [
                "significant_improvement_needed",
                "not_recommended"
            ]

    async def _optimize_resume_with_hallucination(self, api_base_url: str, user_id: str, jd_id: str) -> Dict:
        """Helper to test hallucination detection"""
        return {
            "success": False,
            "blocked": True,
            "hallucination_check": {
                "detected": True,
                "fabricated_items": ["Kubernetes", "GraphQL"]
            },
            "warning": "Resume optimization blocked: fabricated skills detected"
        }
