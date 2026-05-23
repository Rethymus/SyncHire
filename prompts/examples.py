"""
Example usage of SyncHire AI prompts

This file demonstrates how to use the prompt templates with LangChain.
"""

from langchain.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from langchain.output_parsers import PydanticOutputParser
from pydantic import BaseModel, Field
from typing import List, Optional
import json

# Example: JD Analysis with Pydantic model
class JDAnalysis(BaseModel):
    """Structured output from JD analysis"""
    job_title: str = Field(description="Job title")
    department: Optional[str] = Field(default=None, description="Department name")
    employment_type: str = Field(description="Full-time, Part-time, Contract, Internship")
    location: Optional[str] = Field(default=None, description="Job location")
    salary_range: Optional[str] = Field(default=None, description="Salary information")
    hard_skills: List[str] = Field(description="Technical skills and tools")
    soft_skills: List[str] = Field(description="Interpersonal and behavioral skills")
    experience_level: str = Field(description="Entry, Mid, Senior, Lead, Executive")
    years_of_experience: Optional[dict] = Field(default=None, description="Min and preferred years")
    industry_experience: List[str] = Field(default_factory=list, description="Required industries")
    keywords: List[str] = Field(description="Important concepts and terminology")
    responsibilities: Optional[List[str]] = Field(default=None, description="Key responsibilities")

# Example: Experience Ranking
class RankedExperience(BaseModel):
    """A ranked experience from RAG retrieval"""
    id: str
    type: str  # work, project, education
    title: str
    company: Optional[str] = None
    dates: str
    relevance_score: int = Field(ge=0, le=100, description="Relevance score 0-100")
    match_reasons: List[str]
    jd_keywords_matched: List[str]
    recommendation: str  # highlight_first, include_prominently, mention_if_space, omit

class ExperienceRetrievalResult(BaseModel):
    """Complete RAG retrieval result"""
    matched_experiences: List[RankedExperience]
    skill_gaps: List[dict]
    summary: dict


def analyze_jd(jd_text: str) -> JDAnalysis:
    """
    Analyze a job description and extract structured information.

    Args:
        jd_text: Raw job description text (Chinese or English)

    Returns:
        JDAnalysis object with structured requirements
    """
    # Initialize parser
    parser = PydanticOutputParser(pydantic_object=JDAnalysis)

    # Load prompt template
    with open("prompts/jd_analysis.md", "r", encoding="utf-8") as f:
        prompt_template = f.read()

    # Create prompt
    prompt = ChatPromptTemplate.from_messages([
        ("system", prompt_template),
        ("human", "{jd_text}")
    ])

    # Initialize LLM (using GPT-4o)
    llm = ChatOpenAI(model="gpt-4o", temperature=0.1)

    # Create chain
    chain = prompt | llm | parser

    # Invoke
    try:
        result = chain.invoke({"jd_text": jd_text})
        return result
    except Exception as e:
        print(f"Error analyzing JD: {e}")
        raise


def retrieve_experiences(
    user_profile: dict,
    target_jd: JDAnalysis,
    context: str = "resume_optimization"
) -> ExperienceRetrievalResult:
    """
    Retrieve and rank user experiences based on JD match.

    Args:
        user_profile: User's complete profile data
        target_jd: Analyzed job description
        context: Purpose of retrieval (resume_optimization, interview_prep, etc.)

    Returns:
        Ranked experiences with relevance scores
    """
    parser = PydanticOutputParser(pydantic_object=ExperienceRetrievalResult)

    with open("prompts/experience_rag.md", "r", encoding="utf-8") as f:
        prompt_template = f.read()

    prompt = ChatPromptTemplate.from_messages([
        ("system", prompt_template),
        ("human", "User Profile: {profile}\nTarget JD: {jd}\nContext: {context}")
    ])

    llm = ChatOpenAI(model="gpt-4o", temperature=0.1)

    chain = prompt | llm | parser

    try:
        result = chain.invoke({
            "profile": json.dumps(user_profile, ensure_ascii=False),
            "jd": target_jd.model_dump_json(),
            "context": context
        })
        return result
    except Exception as e:
        print(f"Error retrieving experiences: {e}")
        raise


def generate_interview_questions(
    target_jd: JDAnalysis,
    user_resume: dict,
    match_analysis: ExperienceRetrievalResult
) -> dict:
    """
    Generate tailored interview questions based on JD and resume.

    Args:
        target_jd: Analyzed job description
        user_resume: User's resume data
        match_analysis: Experience ranking results

    Returns:
        Dictionary with hr_questions, technical_questions, reverse_questions
    """
    with open("prompts/interview_questions.md", "r", encoding="utf-8") as f:
        prompt_template = f.read()

    prompt = ChatPromptTemplate.from_messages([
        ("system", prompt_template),
        ("human", "JD: {jd}\nResume: {resume}\nMatch Analysis: {analysis}")
    ])

    llm = ChatOpenAI(model="claude-3-5-sonnet", temperature=0.2)

    chain = prompt | llm

    try:
        result = chain.invoke({
            "jd": target_jd.model_dump_json(),
            "resume": json.dumps(user_resume, ensure_ascii=False),
            "analysis": match_analysis.model_dump_json()
        })
        # Parse JSON response
        return json.loads(result.content)
    except Exception as e:
        print(f"Error generating questions: {e}")
        raise


def generate_self_introduction(
    user_profile: dict,
    target_jd: JDAnalysis,
    match_analysis: ExperienceRetrievalResult
) -> dict:
    """
    Generate 1-minute and 3-minute self-introductions.

    Args:
        user_profile: User's complete profile
        target_jd: Analyzed job description
        match_analysis: Experience ranking results

    Returns:
        Dictionary with one_minute and three_minute versions
    """
    with open("prompts/self_intro.md", "r", encoding="utf-8") as f:
        prompt_template = f.read()

    prompt = ChatPromptTemplate.from_messages([
        ("system", prompt_template),
        ("human", "Profile: {profile}\nJD: {jd}\nMatch: {analysis}")
    ])

    llm = ChatOpenAI(model="claude-3-5-sonnet", temperature=0.4)

    chain = prompt | llm

    try:
        result = chain.invoke({
            "profile": json.dumps(user_profile, ensure_ascii=False),
            "jd": target_jd.model_dump_json(),
            "analysis": match_analysis.model_dump_json()
        })
        return json.loads(result.content)
    except Exception as e:
        print(f"Error generating self-intro: {e}")
        raise


# Example usage
if __name__ == "__main__":
    # Sample JD (Chinese)
    sample_jd = """
    职位：高级后端开发工程师
    公司：某知名互联网公司

    职责：
    - 负责后端系统设计和开发
    - 优化系统性能，提升用户体验
    - 参与技术方案评审和架构设计

    要求：
    - 5年以上Java开发经验
    - 熟悉Spring Boot、MyBatis等框架
    - 熟悉MySQL、Redis等数据库
    - 有高并发系统经验者优先
    - 良好的沟通能力和团队协作精神
    """

    # Analyze JD
    print("Analyzing JD...")
    jd_analysis = analyze_jd(sample_jd)
    print(f"Job Title: {jd_analysis.job_title}")
    print(f"Hard Skills: {', '.join(jd_analysis.hard_skills[:5])}")
    print(f"Experience Level: {jd_analysis.experience_level}")

    # Sample user profile
    sample_profile = {
        "name": "张三",
        "experience": [
            {
                "id": "exp_001",
                "title": "后端开发工程师",
                "company": "XX科技公司",
                "dates": "2020-2024",
                "skills": ["Java", "Spring Boot", "MySQL"],
                "description": "负责电商平台后端开发，优化了系统性能"
            }
        ],
        "skills": ["Java", "Spring Boot", "MySQL", "Redis", "Docker"],
        "education": {
            "degree": "学士",
            "major": "计算机科学与技术",
            "school": "XX大学"
        }
    }

    # Retrieve experiences
    print("\nRetrieving relevant experiences...")
    experiences = retrieve_experiences(sample_profile, jd_analysis)
    print(f"Found {len(experiences.matched_experiences)} matched experiences")
    for exp in experiences.matched_experiences[:3]:
        print(f"- {exp.title}: Score {exp.relevance_score}")

    print("\nPrompt system ready!")
