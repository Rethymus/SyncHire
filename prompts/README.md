# SyncHire AI Prompt Templates

This directory contains the prompt templates that power SyncHire's intelligent job matching and interview preparation features.

## Overview

All prompts are designed to:
- Minimize hallucinations (especially critical for resumes)
- Produce consistent, parseable output
- Handle Chinese and English inputs
- Be culturally sensitive to the Chinese job market

## Prompt Templates

### 1. JD Analysis (`jd_analysis.md`)
**Purpose**: Extract structured requirements from job descriptions

**Input**: Raw JD text (Chinese or English)

**Output**: JSON with:
- Basic info (title, location, salary)
- Hard & soft skills
- Experience requirements
- Education requirements
- Keywords
- Responsibilities summary
- Company insights

**Model**: GPT-4o or Claude 3.5 Sonnet (temp: 0.1)

**Key Features**:
- Bilingual support (CN/EN)
- Skill categorization (hard vs. soft)
- Experience level inference
- Industry/domain extraction

### 2. Resume Restructuring (`resume_restructure.md`)
**Purpose**: Optimize resume for specific JD alignment

**Input**: User profile + Target JD + Match analysis

**Output**: Structured Markdown resume

**Model**: Claude 3.5 Sonnet or GPT-4o (temp: 0.3)

**Key Features**:
- STAR method for experience descriptions
- Natural keyword integration
- ZERO fabrication policy
- Quantifiable achievements
- Gap handling strategies

**Critical Rule**: Never fabricate experiences or skills

### 3. Experience Retrieval (`experience_rag.md`)
**Purpose**: RAG-based experience ranking for JD matching

**Input**: User profile + Target JD + Retrieval context

**Output**: JSON with ranked experiences

**Model**: GPT-4o or Claude 3.5 Sonnet (temp: 0.1)

**Key Features**:
- Multi-factor relevance scoring
- Direct skill, industry, role, achievement matching
- Gap analysis with bridging strategies
- Recommendation levels (highlight_first, include_prominently, etc.)

**Scoring**: 0-100 based on 4 weighted factors

### 4. Interview Question Generator (`interview_questions.md`)
**Purpose**: Generate tailored interview prep questions

**Input**: Target JD + User resume + Match analysis

**Output**: JSON with 3 question categories

**Model**: Claude 3.5 Sonnet or GPT-4o (temp: 0.2)

**Question Categories**:
1. **HR & Behavioral**: Career, motivation, culture fit
2. **Technical**: Deep dives into matched projects/skills
3. **Reverse**: Strategic questions for candidate to ask

**Key Features**:
- Based on actual resume (no made-up questions)
- Covers JD requirements
- Chinese job market context
- Gap preparation strategies

### 5. Self-Introduction Generator (`self_intro.md`)
**Purpose**: Create effective interview self-intros

**Input**: User profile + Target JD + Match analysis

**Output**: 1-minute and 3-minute versions

**Model**: Claude 3.5 Sonnet or GPT-4o (temp: 0.4)

**Key Features**:
- Natural spoken Chinese
- Tailored to specific JD
- Two versions (1min & 3min)
- Delivery guidelines
- Special scenario handling (career change, fresh grad, etc.)

## Usage with LangChain

```python
from langchain.prompts import ChatPromptTemplate
from langchain.output_parsers import PydanticOutputParser
from pydantic import BaseModel

# Example: JD Analysis
class JDAnalysis(BaseModel):
    job_title: str
    hard_skills: list[str]
    soft_skills: list[str]
    # ... other fields

parser = PydanticOutputParser(pydantic_object=JDAnalysis)
prompt = ChatPromptTemplate.from_file("prompts/jd_analysis.md")

chain = prompt | llm | parser
result = chain.invoke({"jd_text": raw_jd})
```

## LangSmith Integration

All prompts are set up for LangSmith tracing:

```python
from langsmith import traceable

@traceable(name="jd_analysis")
def analyze_jd(jd_text: str) -> JDAnalysis:
    # Your implementation
    pass
```

## Testing & Evaluation

### Running Tests Locally

```bash
# Install dependencies
pip install -r prompts/requirements.txt

# Set up environment variables
cp prompts/.env.example prompts/.env
# Edit prompts/.env with your API keys

# Run all tests (pytest)
cd prompts
./run_tests.sh

# Run specific test types
./run_tests.sh -t unit          # Unit tests only
./run_tests.sh -t critical      # Critical hallucination tests
./run_tests.sh -t bilingual     # Bilingual processing tests

# Run with pytest directly
pytest tests/ -v
pytest tests/test_jd_analysis.py -v

# Legacy test runner (still available)
python test_evals.py --model gpt-4o --save
```

### Test Coverage

The testing framework covers:
- ✅ JD parsing (Chinese, English, mixed-language)
- ✅ Resume hallucination detection
- ✅ Interview question generation
- ✅ Self-introduction length validation
- ✅ Edge case handling (empty inputs, malformed data)
- ✅ Output format consistency (JSON parsing)

### CI/CD Pipeline

Automated testing runs on:
- Every push to `main` or `develop` branches
- Pull requests affecting prompt files
- Daily schedule (2 AM UTC)
- Manual trigger via GitHub Actions

View workflow: `.github/workflows/prompt-testing.yml`

### LangSmith Dashboard

Monitor prompt performance at:
https://smith.langchain.com/

Track metrics:
- Response times
- Token usage
- Error rates
- Output quality scores

## Version Control

Each prompt has a `version` field in its frontmatter. When updating:
1. Increment version
2. Document changes in CHANGELOG.md
3. Run evaluation suite
4. Update dependent code if output format changes

## Quality Standards

### All Prompts Must:
- ✅ Handle empty/malformed inputs gracefully
- ✅ Return consistent output format
- ✅ Include examples in prompt
- ✅ Specify model recommendations
- ✅ Set appropriate temperature
- ✅ Handle bilingual input (CN/EN)

### Resume Prompts Must:
- ✅ NEVER fabricate experiences
- ✅ NEVER exaggerate beyond facts
- ✅ Only reorganize existing information
- ✅ Flag gaps honestly

## Contribution Guidelines

When adding new prompts:
1. Create `.md` file in this directory
2. Add frontmatter with metadata
3. Include clear input/output format
4. Provide examples
5. Add tests
6. Update this README

## Contact

For questions about prompt engineering, contact the AI/Prompt Engineering Lead.
