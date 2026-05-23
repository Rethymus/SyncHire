.PHONY: help test test-unit test-critical test-bilingual test-integration coverage clean install deps lint

# Default target
.DEFAULT_GOAL := help

# Colors for help output
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[1;33m
NC := \033[0m

help: ## Show this help message
	@echo '$(BLUE)SyncHire AI Prompt Testing$(NC)'
	@echo ''
	@echo '$(GREEN)Usage:$(NC) make [target]'
	@echo ''
	@echo '$(YELLOW)Targets:$(NC)'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

deps: ## Install test dependencies
	@echo "$(BLUE)Installing dependencies...$(NC)"
	pip install -r requirements.txt

install: deps ## Install all dependencies including dev tools
	@echo "$(BLUE)Installing development dependencies...$(NC)"
	pip install -r requirements.txt
	pip install pytest-xdist pytest-timeit black isort mypy

test: ## Run all tests
	@echo "$(BLUE)Running all tests...$(NC)"
	./run_tests.sh

test-unit: ## Run unit tests only
	@echo "$(BLUE)Running unit tests...$(NC)"
	./run_tests.sh -t unit

test-critical: ## Run critical tests (hallucination detection)
	@echo "$(BLUE)Running critical tests...$(NC)"
	./run_tests.sh -t critical

test-bilingual: ## Run bilingual processing tests
	@echo "$(BLUE)Running bilingual tests...$(NC)"
	./run_tests.sh -t bilingual

test-integration: ## Run integration tests
	@echo "$(BLUE)Running integration tests...$(NC)"
	./run_tests.sh -t integration

test-e2e: ## Run end-to-end workflow tests
	@echo "$(BLUE)Running E2E workflow tests...$(NC)"
	./run_tests.sh -t e2e

test-verbose: ## Run tests with verbose output
	@echo "$(BLUE)Running tests (verbose)...$(NC)"
	./run_tests.sh -v

test-fast: ## Run fast tests only (skip slow tests)
	@echo "$(BLUE)Running fast tests...$(NC)"
	pytest tests/ -m "not slow" -v

coverage: ## Generate coverage report
	@echo "$(BLUE)Generating coverage report...$(NC)"
	./run_tests.sh --coverage
	@echo "$(GREEN)Coverage report: htmlcov/index.html$(NC)"

coverage-html: coverage ## Open coverage report in browser
	@echo "$(BLUE)Opening coverage report...$(NC)"
	@if command -v xdg-open >/dev/null 2>&1; then \
		xdg-open htmlcov/index.html; \
	elif command -v open >/dev/null 2>&1; then \
		open htmlcov/index.html; \
	else \
		echo "Please open htmlcov/index.html in your browser"; \
	fi

lint: ## Run linting on test files
	@echo "$(BLUE)Linting test files...$(NC)"
	@echo "$(YELLOW)Running black...$(NC)"
	black tests/ --check
	@echo "$(YELLOW)Running isort...$(NC)"
	isort tests/ --check
	@echo "$(GREEN)Linting complete$(NC)"

format: ## Format test files
	@echo "$(BLUE)Formatting test files...$(NC)"
	black tests/
	isort tests/
	@echo "$(GREEN)Formatting complete$(NC)"

clean: ## Clean up test artifacts
	@echo "$(BLUE)Cleaning up...$(NC)"
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name "htmlcov" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name ".coverage" -exec rm -f {} + 2>/dev/null || true
	find . -type f -name "test_results.json" -exec rm -f {} + 2>/dev/null || true
	@echo "$(GREEN)Clean complete$(NC)"

ci: ## Run CI pipeline locally
	@echo "$(BLUE)Running CI pipeline...$(NC)"
	@$(MAKE) lint
	@$(MAKE) test
	@$(MAKE) coverage
	@echo "$(GREEN)CI pipeline complete$(NC)"

benchmark: ## Run performance benchmarks
	@echo "$(BLUE)Running benchmarks...$(NC)"
	python test_evals.py --model gpt-4o --save
	@echo "$(GREEN)Benchmark complete. See test_results.json$(NC)"

check-keys: ## Check if API keys are set
	@echo "$(BLUE)Checking API keys...$(NC)"
	@echo "OPENAI_API_KEY: $$OPENAI_API_KEY"
	@echo "ANTHROPIC_API_KEY: $$ANTHROPIC_API_KEY"
	@echo "LANGCHAIN_API_KEY: $$LANGCHAIN_API_KEY"

setup: ## Initial setup for testing
	@echo "$(BLUE)Setting up test environment...$(NC)"
	@if [ ! -f .env ]; then \
		echo "$(YELLOW)Creating .env from .env.example...$(NC)"; \
		cp .env.example .env; \
		echo "$(YELLOW)Please edit .env with your API keys$(NC)"; \
	else \
		echo "$(GREEN).env already exists$(NC)"; \
	fi
	@$(MAKE) deps
	@echo "$(GREEN)Setup complete!$(NC)"
	@echo "$(YELLOW)Next steps:$(NC)"
	@echo "  1. Edit .env with your API keys"
	@echo "  2. Run 'make test' to verify setup"
