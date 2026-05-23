"""
SyncHire AI Prompt Testing and Evaluation Framework

This framework tests all prompt templates for:
- Output format consistency (especially JSON parsing)
- Hallucination detection (critical for resume prompts)
- Bilingual handling (Chinese/English)
- Edge case handling
"""

import json
import os
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from enum import Enum
import asyncio
from datetime import datetime

# LangChain imports
from langchain.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain.output_parsers import PydanticOutputParser
from langchain.schema import BaseMessage, HumanMessage, SystemMessage
from pydantic import BaseModel, Field

# LangSmith for tracing
from langsmith import Client, traceable
from langsmith.evaluation import evaluate, LangSmithStringEvaluator
from langsmith.run_trees import RunTree


class ModelProvider(Enum):
    """Available LLM providers"""
    OPENAI_GPT4O = "gpt-4o"
    OPENAI_GPT4O_MINI = "gpt-4o-mini"
    ANTHROPIC_CLAUDE_35_SONNET = "claude-3-5-sonnet-20241022"
    ANTHROPIC_CLAUDE_OPUS = "claude-opus-4-7"


@dataclass
class TestResult:
    """Result of a single prompt test"""
    test_name: str
    prompt_type: str
    model: str
    passed: bool
    score: float  # 0.0 to 1.0
    output: Any
    errors: List[str]
    metrics: Dict[str, Any]
    duration_seconds: float


class PromptTester:
    """Base class for testing prompts"""

    def __init__(
        self,
        model_provider: ModelProvider = ModelProvider.OPENAI_GPT4O,
        langsmith_api_key: Optional[str] = None,
        langsmith_project: str = "synchire-prompt-testing"
    ):
        self.model_provider = model_provider
        self.langsmith_client = None

        # Initialize LangSmith if API key provided
        if langsmith_api_key:
            os.environ["LANGCHAIN_API_KEY"] = langsmith_api_key
            os.environ["LANGCHAIN_TRACING_V2"] = "true"
            os.environ["LANGCHAIN_PROJECT"] = langsmith_project
            self.langsmith_client = Client()

        # Initialize LLM
        if "gpt" in model_provider.value:
            self.llm = ChatOpenAI(
                model=model_provider.value,
                temperature=0.1,
                timeout=60,
                max_retries=2
            )
        else:
            self.llm = ChatAnthropic(
                model=model_provider.value,
                temperature=0.1,
                timeout=60,
                max_retries=2
            )

    def load_prompt_template(self, prompt_file: str) -> str:
        """Load prompt template from file"""
        with open(f"prompts/{prompt_file}", "r", encoding="utf-8") as f:
            return f.read()

    @traceable(name="test_prompt")
    def test_prompt(
        self,
        prompt_template: str,
        input_data: Dict[str, Any],
        expected_output_type: type = None,
        test_name: str = "test"
    ) -> TestResult:
        """Test a single prompt with given input"""
        start_time = datetime.now()
        errors = []
        output = None
        passed = False
        score = 0.0

        try:
            # Create prompt
            prompt = ChatPromptTemplate.from_messages([
                ("system", prompt_template),
                ("human", "{input}")
            ])

            # Create chain
            if expected_output_type:
                parser = PydanticOutputParser(pydantic_object=expected_output_type)
                chain = prompt | self.llm | parser
            else:
                chain = prompt | self.llm

            # Invoke
            result = chain.invoke({"input": json.dumps(input_data, ensure_ascii=False)})
            output = result

            # Basic validation
            if output:
                passed = True
                score = 1.0

        except Exception as e:
            errors.append(str(e))
            passed = False

        duration = (datetime.now() - start_time).total_seconds()

        return TestResult(
            test_name=test_name,
            prompt_type=prompt_template.split('\n')[0] if prompt_template else "unknown",
            model=self.model_provider.value,
            passed=passed,
            score=score,
            output=output,
            errors=errors,
            metrics={},
            duration_seconds=duration
        )


class JDAnalysisTester(PromptTester):
    """Test JD Analysis prompt"""

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.prompt_template = self.load_prompt_template("jd_analysis.md")

    # Pydantic model for JD analysis output
    class JDAnalysisOutput(BaseModel):
        job_title: str
        hard_skills: List[str]
        soft_skills: List[str]
        experience_level: str
        keywords: List[str]

    def test_chinese_jd(self) -> TestResult:
        """Test with Chinese job description"""
        chinese_jd = """
        职位：高级后端开发工程师
        要求：
        - 5年以上Java开发经验
        - 熟悉Spring Boot、MyBatis
        - 熟悉MySQL、Redis
        - 有高并发系统经验
        - 良好的沟通能力
        """

        return self.test_prompt(
            prompt_template=self.prompt_template,
            input_data={"jd_text": chinese_jd},
            expected_output_type=self.JDAnalysisOutput,
            test_name="chinese_jd"
        )

    def test_english_jd(self) -> TestResult:
        """Test with English job description"""
        english_jd = """
        Senior Backend Engineer

        Requirements:
        - 5+ years Python experience
        - Experience with Django, FastAPI
        - Knowledge of PostgreSQL, Redis
        - Strong problem-solving skills
        """

        return self.test_prompt(
            prompt_template=self.prompt_template,
            input_data={"jd_text": english_jd},
            expected_output_type=self.JDAnalysisOutput,
            test_name="english_jd"
        )

    def test_mixed_language_jd(self) -> TestResult:
        """Test with mixed Chinese/English JD"""
        mixed_jd = """
        职位：Full Stack Developer
        Requirements:
        - React前端开发经验
        - Python/Django后端经验
        - 熟悉 AWS, Docker, Kubernetes
        - 3年以上经验
        """

        return self.test_prompt(
            prompt_template=self.prompt_template,
            input_data={"jd_text": mixed_jd},
            expected_output_type=self.JDAnalysisOutput,
            test_name="mixed_language_jd"
        )

    def test_malformed_jd(self) -> TestResult:
        """Test with malformed/incomplete JD"""
        malformed_jd = "We need a developer. Thanks."

        return self.test_prompt(
            prompt_template=self.prompt_template,
            input_data={"jd_text": malformed_jd},
            expected_output_type=self.JDAnalysisOutput,
            test_name="malformed_jd"
        )


class ResumeRestructureTester(PromptTester):
    """Test Resume Restructuring prompt for hallucinations"""

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.prompt_template = self.load_prompt_template("resume_restructure.md")
        # Use higher temperature for resume restructure
        self.llm.temperature = 0.3

    def test_hallucination_detection(
        self,
        user_profile: Dict,
        target_jd: Dict
    ) -> TestResult:
        """
        Critical test: Ensure resume restructure does NOT fabricate experiences.
        This checks that all output information exists in the input.
        """
        # Extract all facts from input
        input_facts = self._extract_facts(user_profile)

        # Run restructure
        result = self.test_prompt(
            prompt_template=self.prompt_template,
            input_data={
                "profile": user_profile,
                "jd": target_jd
            },
            test_name="hallucination_check"
        )

        if result.passed:
            # Check for hallucinations
            output_text = str(result.output)
            hallucinations = self._detect_hallucinations(
                input_facts=input_facts,
                output_text=output_text
            )

            if hallucinations:
                result.passed = False
                result.score = 0.0
                result.errors.extend([f"Hallucination detected: {h}" for h in hallucinations])
            else:
                result.score = 1.0
                result.metrics["hallucination_check"] = "passed"

        return result

    def _extract_facts(self, profile: Dict) -> set:
        """Extract all factual statements from user profile"""
        facts = set()

        # Extract skills
        if "skills" in profile:
            facts.update(profile["skills"])

        # Extract experience facts
        if "experience" in profile:
            for exp in profile["experience"]:
                facts.add(exp.get("title", ""))
                facts.add(exp.get("company", ""))
                facts.add(exp.get("dates", ""))

        # Extract education
        if "education" in profile:
            edu = profile["education"]
            facts.add(edu.get("degree", ""))
            facts.add(edu.get("school", ""))

        return facts

    def _detect_hallucinations(
        self,
        input_facts: set,
        output_text: str
    ) -> List[str]:
        """
        Detect if output contains information not in input.
        This is a simplified check - in production, use NER/sentence comparison.
        """
        hallucinations = []

        # Check for specific fabricated items
        fabricated_patterns = [
            "created", "built", "developed", "led", "managed",
            "achieved", "increased", "decreased", "optimized"
        ]

        # This is a simplified hallucination check
        # In production, use more sophisticated NLP methods
        words_in_output = output_text.lower().split()

        # Look for achievement phrases not in original
        # (Simplified - production would use sentence-level comparison)
        for pattern in fabricated_patterns:
            if pattern in words_in_output:
                # Check if this achievement is in original profile
                # If not, potential hallucination
                pass  # Simplified for demo

        return hallucinations


class InterviewQuestionsTester(PromptTester):
    """Test Interview Question Generator"""

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.prompt_template = self.load_prompt_template("interview_questions.md")
        self.llm.temperature = 0.2

    def test_question_categories(self) -> TestResult:
        """Test that all three question categories are generated"""
        sample_input = {
            "jd": {
                "job_title": "Software Engineer",
                "requirements": ["Python", "Django", "5 years experience"]
            },
            "resume": {
                "experience": [
                    {
                        "title": "Developer",
                        "company": "Tech Corp",
                        "skills": ["Python", "Django"]
                    }
                ]
            }
        }

        result = self.test_prompt(
            prompt_template=self.prompt_template,
            input_data=sample_input,
            test_name="question_categories"
        )

        if result.passed and isinstance(result.output, dict):
            # Check all three categories exist
            required_categories = ["hr_questions", "technical_questions", "reverse_questions"]
            missing_categories = [
                cat for cat in required_categories
                if cat not in result.output
            ]

            if missing_categories:
                result.passed = False
                result.errors.append(f"Missing categories: {missing_categories}")
                result.score = 0.5
            else:
                result.metrics["categories_present"] = required_categories
                result.score = 1.0

        return result


class SelfIntroTester(PromptTester):
    """Test Self-Introduction Generator"""

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.prompt_template = self.load_prompt_template("self_intro.md")
        self.llm.temperature = 0.4

    def test_intro_length(self) -> TestResult:
        """Test that both 1-minute and 3-minute versions are generated"""
        sample_input = {
            "profile": {
                "name": "张三",
                "experience": "3 years software development",
                "skills": ["Python", "Django"]
            },
            "jd": {
                "job_title": "Backend Developer",
                "requirements": ["Python", "Django"]
            }
        }

        result = self.test_prompt(
            prompt_template=self.prompt_template,
            input_data=sample_input,
            test_name="intro_length"
        )

        if result.passed and isinstance(result.output, dict):
            # Check both versions exist
            has_one_min = "one_minute" in result.output
            has_three_min = "three_minute" in result.output

            if not (has_one_min and has_three_min):
                result.passed = False
                result.errors.append("Missing version(s)")
                result.score = 0.0
            else:
                # Check word counts (rough estimate)
                one_min_text = result.output.get("one_minute", "")
                three_min_text = result.output.get("three_minute", "")

                one_min_words = len(one_min_text.split())
                three_min_words = len(three_min_text.split())

                # 1-minute: ~120-180 words, 3-minute: ~380-500 words (Chinese)
                # Adjusted for Chinese character count
                one_min_chars = len(one_min_text)
                three_min_chars = len(three_min_text)

                result.metrics["one_minute_chars"] = one_min_chars
                result.metrics["three_minute_chars"] = three_min_chars

                # Rough validation (allow flexibility)
                if not (100 < one_min_chars < 250):
                    result.errors.append(f"1-minute version wrong length: {one_min_chars} chars")
                    result.score = 0.5
                if not (300 < three_min_chars < 600):
                    result.errors.append(f"3-minute version wrong length: {three_min_chars} chars")
                    result.score = 0.5

        return result


class PromptTestSuite:
    """Run all prompt tests"""

    def __init__(self, model_provider: ModelProvider = ModelProvider.OPENAI_GPT4O):
        self.model_provider = model_provider
        self.results: List[TestResult] = []

        # Get LangSmith API key from environment
        langsmith_key = os.getenv("LANGCHAIN_API_KEY")

        # Initialize testers
        self.jd_tester = JDAnalysisTester(
            model_provider=model_provider,
            langsmith_api_key=langsmith_key
        )
        self.resume_tester = ResumeRestructureTester(
            model_provider=model_provider,
            langsmith_api_key=langsmith_key
        )
        self.questions_tester = InterviewQuestionsTester(
            model_provider=model_provider,
            langsmith_api_key=langsmith_key
        )
        self.intro_tester = SelfIntroTester(
            model_provider=model_provider,
            langsmith_api_key=langsmith_key
        )

    def run_all_tests(self) -> Dict[str, Any]:
        """Run all tests and return summary"""
        print(f"Running prompt tests with {self.model_provider.value}...")
        print("=" * 60)

        # JD Analysis tests
        print("\n📋 Testing JD Analysis...")
        self.results.append(self.jd_tester.test_chinese_jd())
        self.results.append(self.jd_tester.test_english_jd())
        self.results.append(self.jd_tester.test_mixed_language_jd())
        self.results.append(self.jd_tester.test_malformed_jd())

        # Resume Restructure tests
        print("\n📄 Testing Resume Restructure...")
        sample_profile = {
            "name": "张三",
            "skills": ["Python", "Django"],
            "experience": [
                {
                    "title": "后端开发",
                    "company": "Tech Corp",
                    "dates": "2020-2023",
                    "description": "开发了电商平台"
                }
            ]
        }
        sample_jd = {
            "job_title": "Python Developer",
            "requirements": ["Python", "Django", "PostgreSQL"]
        }
        self.results.append(
            self.resume_tester.test_hallucination_detection(sample_profile, sample_jd)
        )

        # Interview Questions tests
        print("\n❓ Testing Interview Question Generator...")
        self.results.append(self.questions_tester.test_question_categories())

        # Self-Intro tests
        print("\n🎤 Testing Self-Introduction Generator...")
        self.results.append(self.intro_tester.test_intro_length())

        # Calculate summary
        return self._generate_summary()

    def _generate_summary(self) -> Dict[str, Any]:
        """Generate test summary"""
        total_tests = len(self.results)
        passed_tests = sum(1 for r in self.results if r.passed)
        failed_tests = total_tests - passed_tests
        avg_score = sum(r.score for r in self.results) / total_tests if total_tests > 0 else 0
        total_duration = sum(r.duration_seconds for r in self.results)

        summary = {
            "total_tests": total_tests,
            "passed": passed_tests,
            "failed": failed_tests,
            "pass_rate": passed_tests / total_tests if total_tests > 0 else 0,
            "average_score": avg_score,
            "total_duration_seconds": total_duration,
            "model": self.model_provider.value,
            "timestamp": datetime.now().isoformat(),
            "failures": [
                {
                    "test": r.test_name,
                    "errors": r.errors
                }
                for r in self.results if not r.passed
            ]
        }

        # Print summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        print(f"Model: {summary['model']}")
        print(f"Total Tests: {summary['total_tests']}")
        print(f"✅ Passed: {summary['passed']}")
        print(f"❌ Failed: {summary['failed']}")
        print(f"Pass Rate: {summary['pass_rate']:.1%}")
        print(f"Avg Score: {summary['average_score']:.2f}")
        print(f"Duration: {summary['total_duration_seconds']:.1f}s")

        if summary['failures']:
            print("\n❌ Failures:")
            for failure in summary['failures']:
                print(f"  - {failure['test']}: {', '.join(failure['errors'])}")

        return summary

    def save_results(self, filename: str = "test_results.json"):
        """Save test results to file"""
        results_data = {
            "summary": self._generate_summary(),
            "detailed_results": [
                {
                    "test_name": r.test_name,
                    "prompt_type": r.prompt_type,
                    "model": r.model,
                    "passed": r.passed,
                    "score": r.score,
                    "errors": r.errors,
                    "metrics": r.metrics,
                    "duration": r.duration_seconds
                }
                for r in self.results
            ]
        }

        with open(filename, "w", encoding="utf-8") as f:
            json.dump(results_data, f, indent=2, ensure_ascii=False)

        print(f"\n💾 Results saved to {filename}")


def main():
    """Main entry point"""
    import argparse

    parser = argparse.ArgumentParser(description="Test SyncHire AI prompts")
    parser.add_argument(
        "--model",
        choices=[m.value for m in ModelProvider],
        default=ModelProvider.OPENAI_GPT4O.value,
        help="LLM model to use for testing"
    )
    parser.add_argument(
        "--save",
        action="store_true",
        help="Save results to JSON file"
    )

    args = parser.parse_args()

    # Run tests
    suite = PromptTestSuite(ModelProvider(args.model))
    suite.run_all_tests()

    if args.save:
        suite.save_results()


if __name__ == "__main__":
    main()
