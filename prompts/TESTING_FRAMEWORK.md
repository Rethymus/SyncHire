# SyncHire AI Prompt Testing Framework

## Overview

Complete testing framework for SyncHire's AI prompt templates with LangChain integration, LangSmith tracing, and GitHub Actions CI/CD.

## Components

### 1. Core Test Framework (`test_evals.py`)

**Test Classes:**
- `JDAnalysisTester` - Tests JD parsing for Chinese, English, mixed-language, and malformed inputs
- `ResumeRestructureTester` - **Critical**: Detects hallucinations in resume rewrites
- `InterviewQuestionsTester` - Validates all 3 question categories are generated
- `SelfIntroTester` - Validates 1-minute and 3-minute version lengths

**Features:**
- Multi-model support (GPT-4o, Claude 3.5 Sonnet, Claude Opus)
- LangSmith tracing for all test runs
- Pydantic output parsing validation
- Comprehensive error reporting

### 2. Test Data (`test_data.py`)

**Sample Data:**
- 3 Chinese JDs (backend, frontend, product manager)
- 3 English JDs (software engineer, data scientist, DevOps)
- 2 mixed-language JDs (full-stack, AI engineer)
- 3 resume profiles (software engineer, frontend, career changer)
- 8 edge cases (empty, minimal, malformed, gaps, etc.)

### 3. GitHub Actions CI/CD (`.github/workflows/prompt-testing.yml`)

**Jobs:**
1. **prompt-tests** - Matrix testing across models
2. **hallucination-check** - Validates resume prompts don't fabricate
3. **bilingual-test** - Chinese/English/mixed language processing
4. **security-scan** - Prompt injection and credential detection
5. **performance-test** - Response time benchmarks (<30s threshold)
6. **notify-failure** - Failure reports

**Triggers:**
- Push to main/develop
- Pull requests
- Daily schedule (2 AM UTC)
- Manual dispatch

## Quick Start

```bash
# Install dependencies
pip install -r prompts/requirements.txt

# Set up API keys
cp prompts/.env.example prompts/.env
# Edit .env with your keys

# Run tests
cd prompts
python test_evals.py --model gpt-4o --save

# View results
cat test_results.json
```

## Quality Metrics

### Hallucination Detection
- **Critical Test**: Ensures resume prompts NEVER fabricate experiences
- Input fact extraction from user profile
- Output validation against known facts
- Zero-tolerance policy for fabricated content

### Bilingual Support
- Chinese JD parsing ✅
- English JD parsing ✅
- Mixed-language handling ✅
- Character count validation for self-intros ✅

### Performance Standards
- Response time < 30 seconds
- JSON parse rate > 95%
- Pass rate target > 90%

## LangSmith Integration

All test runs are traced in LangSmith:
- Project: `synchire-prompt-testing`
- CI/CD Project: `synchire-ci-cd`
- Metrics tracked: duration, tokens, errors, scores

## Security Scanning

Automated checks for:
- Prompt injection patterns ("ignore instructions", "forget everything")
- Hardcoded API keys or secrets
- Dangerous disregard patterns

## Next Steps

1. Add API keys to GitHub Secrets:
   - `OPENAI_API_KEY`
   - `ANTHROPIC_API_KEY`
   - `LANGCHAIN_API_KEY`

2. Create LangSmith account for project

3. Run first test suite to establish baseline

4. Set up alerts for test failures

## Contact

For questions about the testing framework, contact the AI/Prompt Engineering Lead.
