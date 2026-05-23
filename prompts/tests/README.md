# SyncHire AI Prompt Testing Suite

Complete pytest-based testing framework for SyncHire's AI prompt templates.

## Overview

This testing suite ensures:
- ✅ **JSON format consistency** across all prompts
- ✅ **Zero hallucinations** in resume rewriting (CRITICAL)
- ✅ **Bilingual support** for Chinese/English/mixed inputs
- ✅ **Edge case handling** (empty, malformed, special characters)
- ✅ **Performance benchmarks** (response time < 30s)
- ✅ **Security scanning** (prompt injection, credentials)

## Quick Start

```bash
# Install dependencies
pip install -r prompts/requirements.txt

# Set up environment variables
cp prompts/.env.example prompts/.env
# Edit prompts/.env with your API keys

# Run all tests
cd prompts
./run_tests.sh

# Run specific test type
./run_tests.sh -t unit          # Unit tests only
./run_tests.sh -t critical      # Critical hallucination tests
./run_tests.sh -t bilingual     # Bilingual processing tests

# Run with specific model
./run_tests.sh -m claude-3-5-sonnet-20241022

# Run with pytest directly
pytest tests/ -v
pytest tests/test_jd_analysis.py -v
pytest tests/test_resume_restructure.py::TestResumeRestructureHallucination -v
```

## Test Structure

```
prompts/tests/
├── conftest.py              # Pytest configuration and fixtures
├── test_jd_analysis.py      # JD parsing tests
├── test_resume_restructure.py  # Resume rewriting + hallucination tests
├── test_experience_rag.py   # Experience retrieval tests (TODO)
├── test_interview_questions.py  # Interview question tests (TODO)
├── test_self_intro.py       # Self-introduction tests (TODO)
└── fixtures/
    ├── jds.json             # Sample JDs (Chinese, English, mixed)
    └── resumes.json         # Sample resumes (various profiles)
```

## Test Categories

### 1. Unit Tests (`@pytest.mark.unit`)
Fast, isolated tests for individual functions and components.

Run: `pytest tests/ -m unit`

### 2. Integration Tests (`@pytest.mark.integration`)
Tests that require external services (LLM APIs).

Run: `pytest tests/ -m integration`

### 3. Critical Tests (`@pytest.mark.critical`)
**Most important**: Hallucination detection and output validation.

Run: `pytest tests/ -m critical`

### 4. Slow Tests (`@pytest.mark.slow`)
Long-running tests (consistency checks, benchmarks).

Run: `pytest tests/ -m slow` or exclude with `-m "not slow"`

## Critical Test: Hallucination Detection

The `TestResumeRestructureHallucination` class is **CRITICAL** for maintaining data integrity:

```python
def test_no_fabricated_skills(self, openai_llm, resume_restructure_prompt, sample_user_profile):
    """CRITICAL: Ensure no new skills are fabricated"""
    # Extracts original skills from profile
    # Runs resume restructure prompt
    # Checks that NO new skills appear in output
    # Fails if ANY fabricated skill is detected
```

**What it checks:**
- ❌ Skills NOT in original profile
- ❌ Companies NOT in original experience
- ❌ Achievements NOT in original profile
- ❌ Education NOT in original profile
- ❌ Certifications NOT in original profile

**If this test fails:**
1. 🛑 **STOP** - Do NOT merge the changes
2. Review `prompts/resume_restructure.md`
3. Strengthen anti-hallucination instructions
4. Re-run tests until they pass

## Bilingual Testing

Tests cover Chinese, English, and mixed-language inputs:

```python
# Chinese JD
test_chinese_jd_parsing()
test_chinese_resume_restructure()

# English JD
test_english_jd_parsing()
test_english_resume_restructure()

# Mixed language
test_mixed_language_jd_parsing()
test_special_characters()
```

## Fixtures

### Sample JDs
- `sample_chinese_jd` - Backend engineer position (Shanghai)
- `sample_english_jd` - Senior software engineer (San Francisco)
- `sample_mixed_jd` - Full stack developer (bilingual)

### Sample Profiles
- `sample_user_profile` - Standard software engineer
- `sample_career_changer_profile` - Career transition edge case

### LLM Instances
- `openai_llm` - GPT-4o instance
- `anthropic_llm` - Claude 3.5 Sonnet instance

## CI/CD Pipeline

GitHub Actions workflow: `.github/workflows/ai-tests.yml`

**Jobs:**
1. **setup** - Install dependencies
2. **unit-tests** - Matrix testing across models
3. **critical-tests** - Hallucination detection (BLOCKS merge on failure)
4. **bilingual-tests** - Chinese/English/mixed processing
5. **json-format-tests** - Output format validation
6. **integration-tests** - End-to-end testing
7. **performance-tests** - Response time benchmarks
8. **security-scan** - Prompt injection and credential detection
9. **report** - Summary report

**Triggers:**
- Push to `main` or `develop`
- Pull requests affecting prompts
- Daily schedule (2 AM UTC)
- Manual dispatch

## LangSmith Integration

All test runs are traced in LangSmith for detailed analysis:

```bash
# Set up LangSmith
export LANGCHAIN_API_KEY=lsv2_...
export LANGCHAIN_TRACING_V2=true
export LANGCHAIN_PROJECT=synchire-prompt-testing

# Run tests
./run_tests.sh

# View traces at:
# https://smith.langchain.com/
```

**Metrics tracked:**
- Response times
- Token usage
- Error rates
- Output scores
- Trace visualization

## Coverage Reports

Generate coverage reports:

```bash
# Run with coverage
./run_tests.sh

# View HTML report
open htmlcov/index.html  # macOS
xdg-open htmlcov/index.html  # Linux
```

## Writing New Tests

```python
import pytest
from langchain.prompts import ChatPromptTemplate

@pytest.mark.unit
class TestMyNewFeature:
    """Test description"""

    def test_specific_behavior(self, openai_llm, my_prompt_fixture, sample_data):
        """Test specific behavior"""
        prompt = ChatPromptTemplate.from_messages([
            ("system", my_prompt_fixture),
            ("human", "{input}")
        ])

        chain = prompt | openai_llm
        result = chain.invoke({"input": sample_data})

        # Assertions
        assert result is not None
        assert "expected" in result.content.lower()
```

## Debugging Failed Tests

```bash
# Run with verbose output
pytest tests/test_failing.py -v -s

# Run specific test
pytest tests/test_failing.py::TestClass::test_method -v

# Drop into debugger on failure
pytest tests/test_failing.py -v --pdb

# Run with LangSmith tracing for detailed analysis
LANGCHAIN_API_KEY=xxx pytest tests/ -v
```

## Test Metrics

**Target metrics:**
- Pass rate: > 95%
- JSON parse rate: 100%
- Hallucination rate: 0% (critical)
- Response time: < 30s (90th percentile)
- Coverage: > 80%

**Current status:** View in GitHub Actions summary or LangSmith dashboard.

## Troubleshooting

### API Key Issues
```bash
# Check if keys are set
echo $OPENAI_API_KEY
echo $ANTHROPIC_API_KEY

# Set keys
export OPENAI_API_KEY=sk-...
export ANTHROPIC_API_KEY=sk-ant-...
```

### Import Errors
```bash
# Reinstall dependencies
pip install -r requirements.txt --force-reinstall
```

### Test Timeout
```bash
# Run without slow tests
pytest tests/ -m "not slow"
```

## Contributing

When adding new prompts:
1. Create corresponding test file
2. Add fixtures for sample data
3. Include hallucination checks (if applicable)
4. Add bilingual test cases
5. Update this README
6. Ensure CI passes

## Contact

For questions about the testing framework, contact the AI/Prompt Engineering Lead.
