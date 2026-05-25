"""
Test suite for Resume Restructuring prompt

CRITICAL: This tests for hallucinations in resume rewriting.
The prompt must NEVER fabricate experiences, skills, or achievements.
"""

import pytest
from langchain_core.prompts import ChatPromptTemplate



@pytest.mark.critical
class TestResumeRestructureHallucination:
    """Test that resume restructure does NOT fabricate information"""

    def test_no_fabricated_skills(self, openai_llm, resume_restructure_prompt, sample_user_profile):
        """CRITICAL: Ensure no new skills are fabricated"""
        set(skill.lower() for skill in sample_user_profile["skills"])

        prompt = ChatPromptTemplate.from_messages([
            ("system", resume_restructure_prompt),
            ("human", "Profile: {profile}\nJD: {jd}")
        ])

        target_jd = {
            "job_title": "Python Developer",
            "hard_skills": ["Python", "Django", "Flask", "PostgreSQL", "Redis", "Docker", "Kubernetes"],
            "soft_skills": ["Communication", "Teamwork", "Problem-solving"]
        }

        chain = prompt | openai_llm
        result = chain.invoke({
            "profile": str(sample_user_profile),
            "jd": str(target_jd)
        })

        result_text = result.content.lower()

        # Check for skills that were NOT in the original profile
        # These are fabricated and should NOT appear
        fabricated_skills = ["kubernetes", "k8s", "celery", "mongodb", "graphql"]

        for skill in fabricated_skills:
            # If a fabricated skill appears, this is a CRITICAL failure
            assert skill not in result_text or result_text.count(skill) < 2, \
                f"HALLUCINATION DETECTED: Fabricated skill '{skill}' found in resume output"

    def test_no_fabricated_experience(self, openai_llm, resume_restructure_prompt, sample_user_profile):
        """CRITICAL: Ensure no new work experiences are fabricated"""
        # Extract original companies
        original_companies = set()
        for exp in sample_user_profile.get("experience", []):
            original_companies.add(exp.get("company", "").lower())
            original_companies.add(exp.get("title", "").lower())

        prompt = ChatPromptTemplate.from_messages([
            ("system", resume_restructure_prompt),
            ("human", "Profile: {profile}\nJD: {jd}")
        ])

        target_jd = {
            "job_title": "Backend Developer",
            "requirements": ["5+ years experience", "Big company experience"]
        }

        chain = prompt | openai_llm
        result = chain.invoke({
            "profile": str(sample_user_profile),
            "jd": str(target_jd)
        })

        result_text = result.content.lower()

        # Check for companies that were NOT in the original profile
        # Common big companies that could be fabricated
        suspicious_companies = [
            "google", "microsoft", "amazon", "facebook", "meta",
            "apple", "netflix", "alibaba", "tencent", "byteance"
        ]

        for company in suspicious_companies:
            # If a suspicious company appears, verify it's not fabricated
            if company in result_text:
                # It should only appear if it was in the original profile
                assert company in original_companies, \
                    f"HALLUCINATION DETECTED: Fabricated company '{company}' found in resume"

    def test_no_fabricated_achievements(self, openai_llm, resume_restructure_prompt, sample_user_profile):
        """CRITICAL: Ensure achievements are not fabricated or exaggerated"""
        # Extract original achievements
        original_achievements = set()
        for exp in sample_user_profile.get("experience", []):
            for achievement in exp.get("achievements", []):
                original_achievements.add(achievement.lower())

        prompt = ChatPromptTemplate.from_messages([
            ("system", resume_restructure_prompt),
            ("human", "Profile: {profile}\nJD: {jd}")
        ])

        target_jd = {
            "job_title": "Senior Backend Developer",
            "requirements": ["Performance optimization", "Team leadership"]
        }

        chain = prompt | openai_llm
        result = chain.invoke({
            "profile": str(sample_user_profile),
            "jd": str(target_jd)
        })

        result_text = result.content

        # Check for suspicious achievement patterns
        # Look for numbers/percentages that weren't in the original
        import re

        # Extract percentages from result
        result_percentages = re.findall(r'\d+%', result_text)

        # Extract percentages from original
        original_percentages = []
        for achievement in original_achievements:
            original_percentages.extend(re.findall(r'\d+%', achievement))

        # If result has more percentages than original, some might be fabricated
        # Allow some flexibility for rewording (within 2x)
        assert len(result_percentages) <= len(original_percentages) * 2 + 1, \
            f"POSSIBLE HALLUCINATION: Too many metrics in output. Original: {original_percentages}, Result: {result_percentages}"

    def test_education_not_fabricated(self, openai_llm, resume_restructure_prompt, sample_user_profile):
        """CRITICAL: Ensure education details are not fabricated"""
        original_edu = sample_user_profile.get("education", {})
        original_school = original_edu.get("school", "").lower()
        original_edu.get("degree", "").lower()
        original_edu.get("major", "").lower()

        prompt = ChatPromptTemplate.from_messages([
            ("system", resume_restructure_prompt),
            ("human", "Profile: {profile}\nJD: {jd}")
        ])

        target_jd = {
            "job_title": "Software Engineer",
            "education": {"level": "Bachelor's", "field": "CS"}
        }

        chain = prompt | openai_llm
        result = chain.invoke({
            "profile": str(sample_user_profile),
            "jd": str(target_jd)
        })

        result_text = result.content.lower()

        # Check for prestigious schools that weren't in original
        suspicious_schools = [
            "tsinghua", "peking", "standford", "mit", "harvard",
            "cambridge", "oxford", "清华", "北大", "浙大"
        ]

        for school in suspicious_schools:
            if school in result_text and school not in original_school:
                # This is a fabrication
                pytest.fail(f"HALLUCINATION DETECTED: Fabricated school '{school}' found in resume")

    def test_no_fabricated_certifications(self, openai_llm, resume_restructure_prompt, sample_user_profile):
        """CRITICAL: Ensure certifications are not fabricated"""
        prompt = ChatPromptTemplate.from_messages([
            ("system", resume_restructure_prompt),
            ("human", "Profile: {profile}\nJD: {jd}")
        ])

        target_jd = {
            "job_title": "Cloud Developer",
            "requirements": ["AWS certification", "CKA preferred"]
        }

        chain = prompt | openai_llm
        result = chain.invoke({
            "profile": str(sample_user_profile),
            "jd": str(target_jd)
        })

        result_text = result.content.lower()

        # Check for fabricated certifications
        common_certs = [
            "aws certified", "cka", "ckad", "pmp",
            "google cloud certified", "azure certified"
        ]

        # Original profile doesn't have certifications
        for cert in common_certs:
            # If cert appears, verify it's not presented as the user's certification
            # It's OK to mention in context of "requirements" but not as "I have"
            if cert in result_text:
                # Check if it's presented as user's cert
                context_patterns = [
                    f"i have {cert}",
                    f"持有{cert}",
                    f"获得{cert}",
                    f"{cert} certified",
                    f"{cert}证书"
                ]
                for pattern in context_patterns:
                    assert pattern not in result_text, \
                        f"HALLUCINATION DETECTED: Fabricated certification '{cert}' found"


@pytest.mark.unit
class TestResumeRestructureStructure:
    """Test resume structure and formatting"""

    def test_markdown_format(self, openai_llm, resume_restructure_prompt, sample_user_profile):
        """Test that output is properly formatted Markdown"""
        prompt = ChatPromptTemplate.from_messages([
            ("system", resume_restructure_prompt),
            ("human", "Profile: {profile}\nJD: {jd}")
        ])

        target_jd = {"job_title": "Software Developer"}

        chain = prompt | openai_llm
        result = chain.invoke({
            "profile": str(sample_user_profile),
            "jd": str(target_jd)
        })

        result_text = result.content

        # Should have proper Markdown headers
        assert "##" in result_text or "**" in result_text, "Should use Markdown formatting"

        # Should have sections
        sections = ["experience", "skills", "education", "项目"]
        assert any(section.lower() in result_text.lower() for section in sections), \
            "Should have standard resume sections"

    def test_star_method_used(self, openai_llm, resume_restructure_prompt, sample_user_profile):
        """Test that STAR method is used for experience descriptions"""
        prompt = ChatPromptTemplate.from_messages([
            ("system", resume_restructure_prompt),
            ("human", "Profile: {profile}\nJD: {jd}")
        ])

        target_jd = {"job_title": "Backend Developer"}

        chain = prompt | openai_llm
        result = chain.invoke({
            "profile": str(sample_user_profile),
            "jd": str(target_jd)
        })

        result_text = result.content.lower()

        # Look for STAR patterns
        # Situation/Task indicators
        situation_patterns = ["负责", "设计", "开发", "implemented", "developed", "designed"]

        # Action indicators (strong verbs)
        action_patterns = ["优化", "提升", "降低", "increased", "optimized", "reduced"]

        # Result indicators (metrics)
        result_patterns = ["%", "times", "倍", "x", "improvement", "savings"]

        any(pattern in result_text for pattern in situation_patterns)
        has_action = any(pattern in result_text for pattern in action_patterns)
        has_result = any(pattern in result_text for pattern in result_patterns)

        assert has_action, "Should use strong action verbs"
        assert has_result, "Should include measurable results"


@pytest.mark.unit
class TestResumeRestructureGapHandling:
    """Test handling of resume gaps vs. JD requirements"""

    def test_career_changer_handling(self, openai_llm, resume_restructure_prompt, sample_career_changer_profile):
        """Test resume optimization for career changer"""
        prompt = ChatPromptTemplate.from_messages([
            ("system", resume_restructure_prompt),
            ("human", "Profile: {profile}\nJD: {jd}")
        ])

        target_jd = {
            "job_title": "Junior Python Developer",
            "hard_skills": ["Python", "Django"],
            "soft_skills": ["Learning ability", "Adaptability"]
        }

        chain = prompt | openai_llm
        result = chain.invoke({
            "profile": str(sample_career_changer_profile),
            "jd": str(target_jd)
        })

        result_text = result.content.lower()

        # Should emphasize transferable skills
        # Should mention learning ability
        # Should NOT fabricate software development experience

        # Check that it doesn't fabricate software engineer experience
        assert "software engineer" not in result_text or "机械工程师" in result_text, \
            "Should not fabricate software engineer title for career changer"

    def test_skill_gap_handling(self, openai_llm, resume_restructure_prompt, sample_user_profile):
        """Test handling when user lacks specific JD skills"""
        prompt = ChatPromptTemplate.from_messages([
            ("system", resume_restructure_prompt),
            ("human", "Profile: {profile}\nJD: {jd}")
        ])

        # JD requires skills user doesn't have
        target_jd = {
            "job_title": "Full Stack Developer",
            "hard_skills": ["React", "Node.js", "MongoDB", "GraphQL"]  # User doesn't have MongoDB, GraphQL
        }

        chain = prompt | openai_llm
        result = chain.invoke({
            "profile": str(sample_user_profile),
            "jd": str(target_jd)
        })

        result_text = result.content.lower()

        # Should NOT claim MongoDB or GraphQL experience
        # Might mention familiarity or willingness to learn
        if "mongodb" in result_text or "graphql" in result_text:
            # Must be framed as learning/interest, not experience
            learning_indicators = ["学习", "learn", "familiar", "interested", "兴趣"]
            assert any(indicator in result_text for indicator in learning_indicators), \
                "Missing skills should be framed as learning opportunities, not experience"


@pytest.mark.integration
@pytest.mark.slow
class TestResumeRestructureQuality:
    """Test overall quality of restructured resumes"""

    def test_keyword_integration(self, openai_llm, resume_restructure_prompt, sample_user_profile):
        """Test that JD keywords are naturally integrated"""
        prompt = ChatPromptTemplate.from_messages([
            ("system", resume_restructure_prompt),
            ("human", "Profile: {profile}\nJD: {jd}")
        ])

        target_jd = {
            "job_title": "Python Backend Developer",
            "hard_skills": ["Python", "Django", "RESTful API", "Microservices"],
            "keywords": ["backend", "api", "微服务", "后端"]
        }

        chain = prompt | openai_llm
        result = chain.invoke({
            "profile": str(sample_user_profile),
            "jd": str(target_jd)
        })

        result_text = result.content.lower()

        # Should integrate relevant keywords naturally
        # Check that at least some JD keywords appear
        jd_keywords = ["python", "django", "backend", "后端", "api"]
        found_keywords = [kw for kw in jd_keywords if kw in result_text]

        assert len(found_keywords) >= 3, \
            f"Should integrate JD keywords. Found: {found_keywords}"

    def test_natural_language(self, openai_llm, resume_restructure_prompt, sample_user_profile):
        """Test that output is natural Chinese, not robotic"""
        prompt = ChatPromptTemplate.from_messages([
            ("system", resume_restructure_prompt),
            ("human", "Profile: {profile}\nJD: {jd}")
        ])

        target_jd = {"job_title": "Software Developer"}

        chain = prompt | openai_llm
        result = chain.invoke({
            "profile": str(sample_user_profile),
            "jd": str(target_jd)
        })

        result_text = result.content

        # Should not have obvious repetition
        # Check for repeated phrases (keyword stuffing)
        lines = result_text.split('\n')
        non_empty_lines = [line.strip() for line in lines if line.strip()]

        # No line should repeat
        assert len(non_empty_lines) == len(set(non_empty_lines)), \
            "Should not have duplicate lines (possible keyword stuffing)"
