.PHONY: dev build test clean install migrate reset help

# Default target
help:
	@echo "SyncHire Development Commands"
	@echo ""
	@echo "  make dev         - Start development environment"
	@echo "  make build       - Build all services"
	@echo "  make test        - Run all tests"
	@echo "  make clean       - Clean build artifacts and containers"
	@echo "  make install     - Install all dependencies"
	@echo "  make migrate     - Run database migrations"
	@echo "  make reset       - Reset database (WARNING: deletes data)"
	@echo "  make logs        - Show Docker logs"
	@echo "  make stop        - Stop all services"

# Start development environment
dev:
	@echo "🚀 Starting SyncHire development environment..."
	@./scripts/dev.sh

# Build all services
build:
	@echo "🔨 Building all services..."
	@docker-compose build
	@cd frontend && npm run build
	@cd api && pip install -r requirements.txt

# Run all tests
test:
	@echo "🧪 Running tests..."
	@cd frontend && npm test
	@cd api && pytest

# Clean build artifacts and containers
clean:
	@echo "🧹 Cleaning up..."
	@docker-compose down -v
	@cd frontend && rm -rf node_modules .next
	@cd api && rm -rf venv __pycache__ .pytest_cache

# Install all dependencies
install:
	@echo "📦 Installing dependencies..."
	@cd frontend && npm install
	@cd api && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt

# Run database migrations
migrate:
	@echo "🔄 Running database migrations..."
	@./scripts/migrate.sh

# Reset database
reset:
	@echo "⚠️  Resetting database..."
	@./scripts/reset-db.sh

# Show Docker logs
logs:
	@docker-compose logs -f

# Stop all services
stop:
	@echo "🛑 Stopping all services..."
	@docker-compose down
