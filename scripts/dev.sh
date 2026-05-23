#!/bin/bash
set -e

# SyncHire Development Environment Startup Script
# This script starts all services for local development

echo "🚀 Starting SyncHire development environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env exists, if not copy from .env.example
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found, copying from .env.example...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✅ Created .env file. Please update it with your API keys.${NC}"
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed. Please install Docker Compose first.${NC}"
    exit 1
fi

# Check if required environment variables are set
source .env

if [ -z "$OPENAI_API_KEY" ] || [ "$OPENAI_API_KEY" = "sk-your-openai-key-here" ]; then
    echo -e "${YELLOW}⚠️  Warning: OPENAI_API_KEY is not set. AI features will not work.${NC}"
fi

if [ -z "$ANTHROPIC_API_KEY" ] || [ "$ANTHROPIC_API_KEY" = "sk-ant-your-anthropic-key-here" ]; then
    echo -e "${YELLOW}⚠️  Warning: ANTHROPIC_API_KEY is not set. AI features will not work.${NC}"
fi

# Start infrastructure services
echo -e "${GREEN}🐳 Starting Docker services...${NC}"
docker-compose up -d postgres redis minio

# Wait for PostgreSQL to be ready
echo -e "${YELLOW}⏳ Waiting for PostgreSQL to be ready...${NC}"
until docker exec synchire-postgres pg_isready -U synchire > /dev/null 2>&1; do
    sleep 2
done
echo -e "${GREEN}✅ PostgreSQL is ready${NC}"

# Wait for Redis to be ready
echo -e "${YELLOW}⏳ Waiting for Redis to be ready...${NC}"
until docker exec synchire-redis redis-cli ping > /dev/null 2>&1; do
    sleep 2
done
echo -e "${GREEN}✅ Redis is ready${NC}"

# Install API dependencies if needed
if [ ! -d "api/venv" ] && [ ! -f "api/.python-version" ]; then
    echo -e "${YELLOW}📦 Installing API dependencies...${NC}"
    cd api
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    cd ..
    echo -e "${GREEN}✅ API dependencies installed${NC}"
fi

# Run database migrations
echo -e "${YELLOW}🔄 Running database migrations...${NC}"
cd api
if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
fi
alembic upgrade head
cd ..
echo -e "${GREEN}✅ Database migrations completed${NC}"

# Install frontend dependencies if needed
if [ ! -d "frontend/node_modules" ]; then
    echo -e "${YELLOW}📦 Installing frontend dependencies...${NC}"
    cd frontend
    npm install
    cd ..
    echo -e "${GREEN}✅ Frontend dependencies installed${NC}"
fi

echo -e "${GREEN}✨ All services are ready!${NC}"
echo ""
echo -e "${GREEN}🌐 Frontend:${NC}     http://localhost:3000"
echo -e "${GREEN}🔌 API:${NC}          http://localhost:8000"
echo -e "${GREEN}📊 API Docs:${NC}     http://localhost:8000/docs"
echo -e "${GREEN}💾 PostgreSQL:${NC}   localhost:5432"
echo -e "${GREEN}🔴 Redis:${NC}        localhost:6379"
echo -e "${GREEN}📁 Minio:${NC}        http://localhost:9001"
echo ""
echo -e "${YELLOW}To start the development servers, run:${NC}"
echo -e "  ${GREEN}npm run dev${NC} (from project root)"
echo ""
echo -e "${YELLOW}To stop all services, run:${NC}"
echo -e "  ${GREEN}docker-compose down${NC}"
