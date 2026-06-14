# SyncHire Deployment

SyncHire is a lightweight tool, so deployment stays simple: **Docker only** —
no Kubernetes, no Helm, no orchestrator required.

## Directory Structure

```
deploy/
├── docker/              # Dockerfiles + compose stacks
│   ├── frontend.Dockerfile
│   ├── backend.Dockerfile
│   ├── mcp-server.Dockerfile
│   ├── docker-compose.prod.yml
│   ├── docker-compose.swarm.yml
│   └── nginx.conf
└── scripts/
    ├── build.sh         # Build all Docker images
    └── load-test.js     # k6 load test
```

## Quick Start (Docker Compose)

```bash
# Build and start all services
docker compose -f deploy/docker/docker-compose.prod.yml up -d

# Tail logs
docker compose -f deploy/docker/docker-compose.prod.yml logs -f

# Stop
docker compose -f deploy/docker/docker-compose.prod.yml down
```

## Docker Images

| Service | Base image | Notes |
|---------|-----------|-------|
| Frontend (Next.js) | `node:22-alpine` | Multi-stage, non-root user, health check |
| Backend (FastAPI) | `python:3.11-slim` | Gunicorn, health check |
| MCP servers | `python:3.11-slim` | Combined build |

## Build

```bash
# Build all images via the helper script
./deploy/scripts/build.sh
```

## Load Testing

```bash
# Run the k6 load test against a running stack
k6 run deploy/scripts/load-test.js
```

## Security

- Non-root users in all containers
- Read-only root filesystems where possible
- Secrets provided via environment variables (never baked into images)
- Rate limiting in Nginx

## Notes

This project intentionally keeps deployment lightweight. If you previously
referenced Kubernetes manifests or `deploy/scripts/{deploy,canary-deploy,
deploy-blue-green,monitor}.sh`, those have been removed — use the Docker
Compose stack above instead.
