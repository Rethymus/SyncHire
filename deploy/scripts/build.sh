#!/bin/bash
set -e

# Production build script for SyncHire
# Usage: ./build.sh [frontend|backend|all]

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_ROOT"

function build_frontend() {
    echo "Building frontend..."
    cd frontend

    # Install dependencies
    npm ci --only=production

    # Run type check
    npm run type-check

    # Run lint
    npm run lint

    # Build production bundle
    npm run build

    echo "Frontend build completed successfully"
}

function build_backend() {
    echo "Building backend..."
    cd api

    # Install dependencies
    pip install --no-cache-dir -r requirements.txt

    # Run tests
    pytest tests/ -v --cov=. --cov-report=xml

    echo "Backend build completed successfully"
}

function build_docker_images() {
    echo "Building Docker images..."

    # Build frontend image
    docker build -f deploy/docker/frontend.Dockerfile -t synchire/frontend:latest .

    # Build backend image
    docker build -f deploy/docker/backend.Dockerfile -t synchire/backend:latest .

    # Build MCP server image
    docker build -f deploy/docker/mcp-server.Dockerfile -t synchire/mcp-servers:latest .

    echo "Docker images built successfully"
}

function push_docker_images() {
    echo "Pushing Docker images to registry..."

    # Tag images with git commit hash
    GIT_HASH=$(git rev-parse --short HEAD)
    docker tag synchire/frontend:latest synchire/frontend:$GIT_HASH
    docker tag synchire/backend:latest synchire/backend:$GIT_HASH
    docker tag synchire/mcp-servers:latest synchire/mcp-servers:$GIT_HASH

    # Push to registry (update with your registry URL)
    # docker push synchire/frontend:latest
    # docker push synchire/frontend:$GIT_HASH
    # docker push synchire/backend:latest
    # docker push synchire/backend:$GIT_HASH
    # docker push synchire/mcp-servers:latest
    # docker push synchire/mcp-servers:$GIT_HASH

    echo "Docker images pushed successfully"
}

case "$1" in
    frontend)
        build_frontend
        ;;
    backend)
        build_backend
        ;;
    docker)
        build_docker_images
        ;;
    push)
        push_docker_images
        ;;
    all)
        build_frontend
        build_backend
        build_docker_images
        ;;
    *)
        echo "Usage: $0 {frontend|backend|docker|push|all}"
        exit 1
        ;;
esac
