#!/bin/bash
# Test runner script for SyncHire AI Prompt Testing

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
MODEL="${MODEL:-gpt-4o}"
TEST_TYPE="${TEST_TYPE:-all}"
COVERAGE="${COVERAGE:-true}"
VERBOSE="${VERBOSE:-false}"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -m|--model)
            MODEL="$2"
            shift 2
            ;;
        -t|--type)
            TEST_TYPE="$2"
            shift 2
            ;;
        --no-coverage)
            COVERAGE="false"
            shift
            ;;
        -v|--verbose)
            VERBOSE="true"
            shift
            ;;
        -h|--help)
            echo "Usage: run_tests.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  -m, --model MODEL       LLM model to use (gpt-4o, claude-3-5-sonnet-20241022)"
            echo "  -t, --type TYPE         Test type: all, unit, integration, critical, bilingual, e2e"
            echo "  --no-coverage           Skip coverage report"
            echo "  -v, --verbose           Verbose output"
            echo "  -h, --help              Show this help message"
            echo ""
            echo "Environment variables:"
            echo "  OPENAI_API_KEY          OpenAI API key"
            echo "  ANTHROPIC_API_KEY       Anthropic API key"
            echo "  LANGCHAIN_API_KEY       LangSmith API key (for tracing)"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Change to prompts directory
cd "$(dirname "$0")"

# Check if required packages are installed
echo -e "${YELLOW}Checking dependencies...${NC}"

if ! python -c "import langchain" 2>/dev/null; then
    echo -e "${RED}LangChain not found. Installing dependencies...${NC}"
    pip install -r requirements.txt
fi

if ! python -c "import pytest" 2>/dev/null; then
    echo -e "${RED}pytest not found. Installing...${NC}"
    pip install pytest pytest-cov pytest-asyncio
fi

# Check API keys
if [ -z "$OPENAI_API_KEY" ] && [ -z "$ANTHROPIC_API_KEY" ]; then
    echo -e "${RED}Error: OPENAI_API_KEY or ANTHROPIC_API_KEY must be set${NC}"
    exit 1
fi

# Set up LangSmith if available
if [ -n "$LANGCHAIN_API_KEY" ]; then
    export LANGCHAIN_TRACING_V2=true
    export LANGCHAIN_PROJECT="synchire-prompt-testing"
    echo -e "${GREEN}LangSmith tracing enabled${NC}"
fi

# Build pytest command
PYTEST_CMD="pytest tests/"

# Add test type filter
case $TEST_TYPE in
    unit)
        PYTEST_CMD="$PYTEST_CMD -m unit"
        ;;
    integration)
        PYTEST_CMD="$PYTEST_CMD -m integration"
        ;;
    critical)
        PYTEST_CMD="$PYTEST_CMD -m critical"
        ;;
    bilingual)
        PYTEST_CMD="$PYTEST_CMD tests/test_jd_analysis.py::TestJDAnalysisParsing"
        ;;
    e2e)
        PYTEST_CMD="$PYTEST_CMD tests/test_e2e_workflow.py -v"
        ;;
    all)
        # Run all tests except slow ones
        PYTEST_CMD="$PYTEST_CMD -m 'not slow'"
        ;;
esac

# Add coverage if enabled
if [ "$COVERAGE" = "true" ]; then
    PYTEST_CMD="$PYTEST_CMD --cov=. --cov-report=term-missing --cov-report=html"
fi

# Add verbose flag
if [ "$VERBOSE" = "true" ]; then
    PYTEST_CMD="$PYTEST_CMD -v"
else
    PYTEST_CMD="$PYTEST_CMD -q"
fi

# Print test configuration
echo ""
echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}SyncHire AI Prompt Testing${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"
echo -e "Model:          $MODEL"
echo -e "Test Type:      $TEST_TYPE"
echo -e "Coverage:       $COVERAGE"
echo -e "Verbose:        $VERBOSE"
echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"
echo ""

# Run tests
if eval $PYTEST_CMD; then
    echo ""
    echo -e "${GREEN}✅ All tests passed!${NC}"

    if [ "$COVERAGE" = "true" ]; then
        echo ""
        echo -e "${GREEN}Coverage report generated: htmlcov/index.html${NC}"
    fi

    exit 0
else
    echo ""
    echo -e "${RED}❌ Some tests failed${NC}"
    echo ""
    echo -e "${YELLOW}To view detailed logs, run with -v flag${NC}"
    echo -e "${YELLOW}To debug specific tests, run: pytest tests/ -k <test_name> -v${NC}"
    exit 1
fi
