#!/usr/bin/env python3
"""
BigModel AI API Integration Testing Script for SyncHire

Tests real AI API integration with BigModel (智谱AI) using the provided API key.
Tests all 5 core AI features with actual API calls.
"""

import asyncio
import time
import json
from typing import Dict, Any, List
from dataclasses import dataclass
from datetime import datetime
from openai import AsyncOpenAI


@dataclass
class TestResult:
    """Individual test result"""
    feature_name: str
    test_input: str
    api_response: Any
    response_time: float
    token_cost: Dict[str, int]
    quality_score: float
    issues: List[str]
    passed: bool


class BigModelAITester:
    """Test BigModel AI API integration"""

    def __init__(self):
        self.api_key = "8ff2347c9e104ab5a627dc665b89dca4.EBrJxMRhCkfmQJ2J"
        self.base_url = "https://open.bigmodel.cn/api/paas/v4/"
        self.model = "glm-4"
        self.client = AsyncOpenAI(
            api_key=self.api_key,
            base_url=self.base_url
        )
        self.test_results: List[TestResult] = []

    def print_header(self, title: str):
        """Print formatted header"""
        print("\n" + "="*60)
        print(f"  {title}")
        print("="*60 + "\n")

    def print_test_result(self, result: TestResult):
        """Print individual test result"""
        status = "✅ PASS" if result.passed else "❌ FAIL"
        print(f"{status} {result.feature_name}")
        print(f"  Response Time: {result.response_time:.2f}s")
        print(f"  Token Usage: {result.token_cost}")
        print(f"  Quality Score: {result.quality_score:.1f}/10")

        if result.issues:
            print("  Issues Found:")
            for issue in result.issues:
                print(f"    • {issue}")

        if not result.passed:
            print(f"  Test Input: {result.test_input[:100]}...")
            if hasattr(result.api_response, 'error'):
                print(f"  API Error: {result.api_response.error}")

    async def test_jd_analysis(self) -> TestResult:
        """Test 1: JD Analysis - Job Description Parsing"""
        print("🔍 Testing JD Analysis...")

        test_jd = """
        Senior Python Developer - FinTech Startup

        Requirements:
        - 5+ years of Python development experience
        - Strong knowledge of FastAPI, Django, or Flask
        - Experience with PostgreSQL and database design
        - Familiarity with cloud platforms (AWS/GCP)
        - Understanding of financial systems is a plus
        - Bachelor's degree in Computer Science or related field

        Responsibilities:
        - Design and implement RESTful APIs
        - Optimize database queries and performance
        - Collaborate with frontend team
        - Write clean, maintainable code
        - Participate in code reviews

        Benefits:
        - Competitive salary ($120k-$160k)
        - Remote work options
        - Health insurance
        - Professional development budget
        """

        prompt = f"""Extract structured information from this job description:

{test_jd}

Return a JSON object with:
- skills: array of required/mentioned skills
- experience_level: junior/mid/senior/lead
- requirements: array of key requirements
- responsibilities: array of key responsibilities
- nice_to_have: array of bonus qualifications
- salary_range: salary range if mentioned
"""

        start_time = time.time()
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are an expert at analyzing job descriptions and extracting key information."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                response_format={"type": "json_object"}
            )
            response_time = time.time() - start_time

            content = response.choices[0].message.content
            parsed_data = json.loads(content)

            # Evaluate quality
            token_usage = {
                "prompt_tokens": response.usage.prompt_tokens,
                "completion_tokens": response.usage.completion_tokens,
                "total_tokens": response.usage.total_tokens
            }

            # Quality assessment
            issues = []
            quality_score = 10.0

            if not parsed_data.get("skills"):
                issues.append("Missing skills array")
                quality_score -= 2
            if not parsed_data.get("experience_level"):
                issues.append("Missing experience level")
                quality_score -= 1
            if len(parsed_data.get("skills", [])) < 3:
                issues.append("Insufficient skill extraction")
                quality_score -= 2

            # Check for expected skills
            expected_skills = ["Python", "FastAPI", "PostgreSQL"]
            found_skills = [s for s in expected_skills if any(s.lower() in str(skill).lower() for skill in parsed_data.get("skills", []))]
            if len(found_skills) < 2:
                issues.append(f"Only found {len(found_skills)}/{len(expected_skills)} expected skills")
                quality_score -= 2

            passed = quality_score >= 7.0 and response_time < 10.0

            result = TestResult(
                feature_name="JD Analysis",
                test_input=test_jd,
                api_response=parsed_data,
                response_time=response_time,
                token_cost=token_usage,
                quality_score=quality_score,
                issues=issues,
                passed=passed
            )

            self.test_results.append(result)
            return result

        except Exception as e:
            response_time = time.time() - start_time
            result = TestResult(
                feature_name="JD Analysis",
                test_input=test_jd,
                api_response=type('obj', (object,), {'error': str(e)})(),
                response_time=response_time,
                token_cost={},
                quality_score=0,
                issues=[f"API Error: {str(e)}"],
                passed=False
            )
            self.test_results.append(result)
            return result

    async def test_resume_analysis(self) -> TestResult:
        """Test 2: Resume Analysis - Resume Content Analysis"""
        print("🔍 Testing Resume Analysis...")

        test_resume = """
        John Doe
        john.doe@email.com | (555) 123-4567 | San Francisco, CA

        SUMMARY
        Experienced software developer with 4 years of building web applications.
        Proficient in Python, JavaScript, and database management.

        EXPERIENCE
        Software Developer | TechCorp Inc. | 2021 - Present
        - Developed RESTful APIs using FastAPI
        - Optimized PostgreSQL queries, improving performance by 30%
        - Collaborated with frontend team using React
        - Implemented automated testing with pytest

        Junior Developer | StartupXYZ | 2020 - 2021
        - Built Django web applications
        - Worked with MySQL databases
        - Participated in agile development processes

        EDUCATION
        Bachelor of Science in Computer Science
        State University | 2020
        - GPA: 3.7/4.0
        - Relevant coursework: Data Structures, Algorithms, Database Systems

        SKILLS
        - Languages: Python, JavaScript, SQL, HTML/CSS
        - Frameworks: FastAPI, Django, Flask, React
        - Databases: PostgreSQL, MySQL, MongoDB
        - Tools: Git, Docker, AWS (EC2, S3)
        - Testing: pytest, unittest, Jest

        CERTIFICATIONS
        - AWS Certified Developer - Associate (2023)
        """

        prompt = f"""Analyze this resume and provide a comprehensive assessment:

{test_resume}

Return a JSON object with:
- overall_score: score from 0-100
- strengths: array of key strengths
- weaknesses: array of areas for improvement
- skill_categories: object with technical and soft skills
- experience_assessment: assessment of experience level
- ats_keywords: array of ATS-friendly keywords found
- recommendations: array of specific improvement suggestions
"""

        start_time = time.time()
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are an expert resume analyst and career coach."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                response_format={"type": "json_object"}
            )
            response_time = time.time() - start_time

            content = response.choices[0].message.content
            analysis_data = json.loads(content)

            token_usage = {
                "prompt_tokens": response.usage.prompt_tokens,
                "completion_tokens": response.usage.completion_tokens,
                "total_tokens": response.usage.total_tokens
            }

            issues = []
            quality_score = 10.0

            if not analysis_data.get("overall_score"):
                issues.append("Missing overall score")
                quality_score -= 2
            if not analysis_data.get("strengths"):
                issues.append("Missing strengths assessment")
                quality_score -= 1
            if not analysis_data.get("skill_categories"):
                issues.append("Missing skill categories")
                quality_score -= 1
            if len(analysis_data.get("recommendations", [])) < 3:
                issues.append("Insufficient recommendations")
                quality_score -= 2

            passed = quality_score >= 7.0 and response_time < 15.0

            result = TestResult(
                feature_name="Resume Analysis",
                test_input=test_resume,
                api_response=analysis_data,
                response_time=response_time,
                token_cost=token_usage,
                quality_score=quality_score,
                issues=issues,
                passed=passed
            )

            self.test_results.append(result)
            return result

        except Exception as e:
            response_time = time.time() - start_time
            result = TestResult(
                feature_name="Resume Analysis",
                test_input=test_resume,
                api_response=type('obj', (object,), {'error': str(e)})(),
                response_time=response_time,
                token_cost={},
                quality_score=0,
                issues=[f"API Error: {str(e)}"],
                passed=False
            )
            self.test_results.append(result)
            return result

    async def test_smart_matching(self) -> TestResult:
        """Test 3: Smart Matching - Job-Resume Matching Algorithm"""
        print("🔍 Testing Smart Matching...")

        test_resume = """
        Jane Smith - Full Stack Developer
        Skills: Python (3 years), FastAPI (2 years), PostgreSQL (3 years)
        Experience: Built RESTful APIs, database optimization, cloud deployment
        Education: BS Computer Science, 2021
        """

        test_jd = """
        Senior Python Developer Position
        Requirements: 5+ years Python, FastAPI experience, PostgreSQL, AWS
        Responsibilities: API development, database optimization, cloud infrastructure
        """

        prompt = f"""Compare this resume against the job description and provide a detailed match analysis.

Resume:
{test_resume}

Job Description:
{test_jd}

Return a JSON object with:
- match_score: float (0-100)
- matched_skills: array of matching skills
- missing_skills: array of missing skills
- strengths: array of candidate strengths
- gaps: array of experience gaps
- recommendations: array of specific suggestions
- fit_level: exact_match / close_match / partial_match / poor_match
"""

        start_time = time.time()
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are an expert recruiter analyzing candidate fit for job positions."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.2,
                response_format={"type": "json_object"}
            )
            response_time = time.time() - start_time

            content = response.choices[0].message.content
            match_data = json.loads(content)

            token_usage = {
                "prompt_tokens": response.usage.prompt_tokens,
                "completion_tokens": response.usage.completion_tokens,
                "total_tokens": response.usage.total_tokens
            }

            issues = []
            quality_score = 10.0

            if not match_data.get("match_score"):
                issues.append("Missing match score")
                quality_score -= 3
            if not isinstance(match_data.get("match_score"), (int, float)):
                issues.append("Match score is not numeric")
                quality_score -= 2
            if not match_data.get("matched_skills"):
                issues.append("Missing matched skills")
                quality_score -= 1
            if not match_data.get("missing_skills"):
                issues.append("Missing missing skills")
                quality_score -= 1

            passed = quality_score >= 7.0 and response_time < 10.0

            result = TestResult(
                feature_name="Smart Matching",
                test_input=f"Resume: {test_resume[:50]}... | JD: {test_jd[:50]}...",
                api_response=match_data,
                response_time=response_time,
                token_cost=token_usage,
                quality_score=quality_score,
                issues=issues,
                passed=passed
            )

            self.test_results.append(result)
            return result

        except Exception as e:
            response_time = time.time() - start_time
            result = TestResult(
                feature_name="Smart Matching",
                test_input=f"Resume: {test_resume[:50]}... | JD: {test_jd[:50]}...",
                api_response=type('obj', (object,), {'error': str(e)})(),
                response_time=response_time,
                token_cost={},
                quality_score=0,
                issues=[f"API Error: {str(e)}"],
                passed=False
            )
            self.test_results.append(result)
            return result

    async def test_ai_optimization(self) -> TestResult:
        """Test 4: AI Optimization - Resume Content Optimization"""
        print("🔍 Testing AI Optimization...")

        original_resume = """
        Mike Johnson - Software Engineer
        Worked at various companies doing software development.
        Know Python, databases, and web stuff.
        Looking for a new job.
        """

        target_jd = """
        Senior Python Developer - FinTech Company
        Requirements: 5+ years Python, FastAPI/Django, PostgreSQL, AWS
        Responsibilities: API design, database optimization, cloud architecture
        """

        prompt = f"""Optimize this resume for the specific job description while maintaining truthfulness.

Original Resume:
{original_resume}

Target Job Description:
{target_jd}

Return a JSON object with:
- optimized_content: the full rewritten resume content
- changes_made: array of specific improvements
- keywords_added: array of new keywords included
- sections_improved: array of enhanced sections
- ats_score_improvement: estimated improvement in ATS score
"""

        start_time = time.time()
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are an expert resume writer specializing in ATS optimization."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.4,
                response_format={"type": "json_object"}
            )
            response_time = time.time() - start_time

            content = response.choices[0].message.content
            optimization_data = json.loads(content)

            token_usage = {
                "prompt_tokens": response.usage.prompt_tokens,
                "completion_tokens": response.usage.completion_tokens,
                "total_tokens": response.usage.total_tokens
            }

            issues = []
            quality_score = 10.0

            if not optimization_data.get("optimized_content"):
                issues.append("Missing optimized content")
                quality_score -= 3
            if len(optimization_data.get("optimized_content", "")) < len(original_resume):
                issues.append("Optimized content is shorter than original")
                quality_score -= 2
            if not optimization_data.get("changes_made"):
                issues.append("Missing changes documentation")
                quality_score -= 1
            if not optimization_data.get("keywords_added"):
                issues.append("Missing added keywords")
                quality_score -= 1

            passed = quality_score >= 7.0 and response_time < 15.0

            result = TestResult(
                feature_name="AI Optimization",
                test_input=f"Original: {original_resume[:50]}...",
                api_response=optimization_data,
                response_time=response_time,
                token_cost=token_usage,
                quality_score=quality_score,
                issues=issues,
                passed=passed
            )

            self.test_results.append(result)
            return result

        except Exception as e:
            response_time = time.time() - start_time
            result = TestResult(
                feature_name="AI Optimization",
                test_input=f"Original: {original_resume[:50]}...",
                api_response=type('obj', (object,), {'error': str(e)})(),
                response_time=response_time,
                token_cost={},
                quality_score=0,
                issues=[f"API Error: {str(e)}"],
                passed=False
            )
            self.test_results.append(result)
            return result

    async def test_interview_prep(self) -> TestResult:
        """Test 5: Interview Prep - Question Generation"""
        print("🔍 Testing Interview Prep...")

        candidate_resume = """
        Sarah Chen - Full Stack Developer
        Skills: React, Node.js, Python, PostgreSQL
        Experience: 3 years at TechStartup building web applications
        Education: BS Computer Science, Stanford University
        """

        job_description = """
        Full Stack Developer Role
        Company: Innovative Tech Company
        Stack: React, Node.js, PostgreSQL, AWS
        Focus: Building scalable web applications
        """

        prompt = f"""Generate comprehensive interview preparation materials based on this resume and job description.

Candidate Resume:
{candidate_resume}

Job Description:
{job_description}

Return a JSON object with:
- likely_questions: array of 5-8 expected interview questions with suggested answers
- technical_topics: array of technical topics to review
- company_research: array of key points to research about the company
- questions_to_ask: array of 3-5 insightful questions for the interviewer
- key_talking_points: array of candidate's strengths to emphasize
- confidence_tips: array of tips for interview confidence
"""

        start_time = time.time()
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are an expert career coach and interview preparation specialist."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.5,
                response_format={"type": "json_object"}
            )
            response_time = time.time() - start_time

            content = response.choices[0].message.content
            prep_data = json.loads(content)

            token_usage = {
                "prompt_tokens": response.usage.prompt_tokens,
                "completion_tokens": response.usage.completion_tokens,
                "total_tokens": response.usage.total_tokens
            }

            issues = []
            quality_score = 10.0

            if not prep_data.get("likely_questions"):
                issues.append("Missing interview questions")
                quality_score -= 3
            if len(prep_data.get("likely_questions", [])) < 5:
                issues.append(f"Only {len(prep_data.get('likely_questions', []))} questions generated (expected 5-8)")
                quality_score -= 2
            if not prep_data.get("technical_topics"):
                issues.append("Missing technical topics")
                quality_score -= 1
            if not prep_data.get("questions_to_ask"):
                issues.append("Missing questions for interviewer")
                quality_score -= 1

            passed = quality_score >= 7.0 and response_time < 20.0

            result = TestResult(
                feature_name="Interview Prep",
                test_input=f"Candidate: {candidate_resume[:50]}...",
                api_response=prep_data,
                response_time=response_time,
                token_cost=token_usage,
                quality_score=quality_score,
                issues=issues,
                passed=passed
            )

            self.test_results.append(result)
            return result

        except Exception as e:
            response_time = time.time() - start_time
            result = TestResult(
                feature_name="Interview Prep",
                test_input=f"Candidate: {candidate_resume[:50]}...",
                api_response=type('obj', (object,), {'error': str(e)})(),
                response_time=response_time,
                token_cost={},
                quality_score=0,
                issues=[f"API Error: {str(e)}"],
                passed=False
            )
            self.test_results.append(result)
            return result

    def generate_report(self) -> Dict[str, Any]:
        """Generate comprehensive test report"""
        total_tests = len(self.test_results)
        passed_tests = sum(1 for r in self.test_results if r.passed)
        failed_tests = total_tests - passed_tests

        total_tokens = sum(r.token_cost.get("total_tokens", 0) for r in self.test_results)
        total_prompt_tokens = sum(r.token_cost.get("prompt_tokens", 0) for r in self.test_results)
        total_completion_tokens = sum(r.token_cost.get("completion_tokens", 0) for r in self.test_results)

        avg_response_time = sum(r.response_time for r in self.test_results) / total_tests if total_tests > 0 else 0
        avg_quality_score = sum(r.quality_score for r in self.test_results) / total_tests if total_tests > 0 else 0

        all_issues = []
        for result in self.test_results:
            all_issues.extend(result.issues)

        return {
            "summary": {
                "total_tests": total_tests,
                "passed": passed_tests,
                "failed": failed_tests,
                "success_rate": f"{(passed_tests/total_tests*100):.1f}%" if total_tests > 0 else "0%"
            },
            "performance": {
                "average_response_time": f"{avg_response_time:.2f}s",
                "total_test_duration": f"{sum(r.response_time for r in self.test_results):.2f}s"
            },
            "token_usage": {
                "total_tokens": total_tokens,
                "prompt_tokens": total_prompt_tokens,
                "completion_tokens": total_completion_tokens
            },
            "quality": {
                "average_quality_score": f"{avg_quality_score:.1f}/10",
                "total_issues": len(all_issues),
                "critical_issues": [i for i in all_issues if "Error" in i or "Missing" in i]
            },
            "detailed_results": [
                {
                    "feature": r.feature_name,
                    "passed": r.passed,
                    "response_time": f"{r.response_time:.2f}s",
                    "quality_score": f"{r.quality_score:.1f}/10",
                    "token_usage": r.token_cost,
                    "issues": r.issues
                }
                for r in self.test_results
            ],
            "recommendations": self.generate_recommendations()
        }

    def generate_recommendations(self) -> List[str]:
        """Generate actionable recommendations based on test results"""
        recommendations = []

        # Check response times
        slow_features = [r.feature_name for r in self.test_results if r.response_time > 10.0]
        if slow_features:
            recommendations.append(f"Consider optimizing response times for: {', '.join(slow_features)}")

        # Check quality scores
        low_quality = [r.feature_name for r in self.test_results if r.quality_score < 7.0]
        if low_quality:
            recommendations.append(f"Improve output quality for: {', '.join(low_quality)}")

        # Check token usage
        high_token_usage = [r.feature_name for r in self.test_results if r.token_cost.get("total_tokens", 0) > 2000]
        if high_token_usage:
            recommendations.append(f"Optimize prompts to reduce token usage for: {', '.join(high_token_usage)}")

        # Check error rates
        failed_features = [r.feature_name for r in self.test_results if not r.passed]
        if failed_features:
            recommendations.append(f"Critical: Fix failing features: {', '.join(failed_features)}")

        if not recommendations:
            recommendations.append("All tests passed successfully! Consider adding more test cases.")

        return recommendations

    async def run_all_tests(self):
        """Run all AI feature tests"""
        self.print_header("BigModel AI API Integration Testing")
        print("API Provider: BigModel (智谱AI)")
        print(f"Model: {self.model}")
        print(f"Base URL: {self.base_url}")
        print(f"Test Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

        # Run all tests
        print("\n" + "▶" * 30)
        print("Running Tests...")
        print("▶" * 30 + "\n")

        results = await asyncio.gather(
            self.test_jd_analysis(),
            self.test_resume_analysis(),
            self.test_smart_matching(),
            self.test_ai_optimization(),
            self.test_interview_prep()
        )

        # Print individual results
        self.print_header("Individual Test Results")
        for result in results:
            self.print_test_result(result)
            print()

        # Generate and print report
        report = self.generate_report()

        self.print_header("Test Report Summary")

        print("📊 SUMMARY")
        print(f"  Total Tests: {report['summary']['total_tests']}")
        print(f"  Passed: {report['summary']['passed']} ✅")
        print(f"  Failed: {report['summary']['failed']} ❌")
        print(f"  Success Rate: {report['summary']['success_rate']}")

        print("\n⏱️  PERFORMANCE")
        print(f"  Average Response Time: {report['performance']['average_response_time']}")
        print(f"  Total Test Duration: {report['performance']['total_test_duration']}")

        print("\n💰 TOKEN USAGE")
        print(f"  Total Tokens: {report['token_usage']['total_tokens']:,}")
        print(f"  Prompt Tokens: {report['token_usage']['prompt_tokens']:,}")
        print(f"  Completion Tokens: {report['token_usage']['completion_tokens']:,}")

        print("\n🎯 QUALITY")
        print(f"  Average Quality Score: {report['quality']['average_quality_score']}")
        print(f"  Total Issues: {report['quality']['total_issues']}")
        if report['quality']['critical_issues']:
            print(f"  Critical Issues: {len(report['quality']['critical_issues'])}")

        print("\n💡 RECOMMENDATIONS")
        for i, rec in enumerate(report['recommendations'], 1):
            print(f"  {i}. {rec}")

        # Save report to file
        report_file = f"/tmp/bigmodel_ai_test_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(report_file, 'w') as f:
            json.dump(report, f, indent=2)
        print(f"\n📄 Detailed report saved to: {report_file}")

        return report


async def main():
    """Main test execution"""
    tester = BigModelAITester()
    report = await tester.run_all_tests()

    # Exit with appropriate code
    return 0 if report['summary']['failed'] == 0 else 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    exit(exit_code)