# MCP Servers Deployment Guide

Complete guide for deploying SyncHire MCP servers in various environments.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Deployment Options](#deployment-options)
- [Docker Deployment](#docker-deployment)
- [Docker Compose](#docker-compose)
- [Environment Configuration](#environment-configuration)
- [Health Monitoring](#health-monitoring)
- [Performance Optimization](#performance-optimization)
- [Troubleshooting](#troubleshooting)

## Overview

SyncHire MCP servers can be deployed in several ways:

1. **Standalone Node.js** - Direct execution with Node.js
2. **Docker Containers** - Containerized deployment
3. **Docker Compose** - Multi-server orchestration
4. **Kubernetes** - Enterprise-scale deployment (future)

## Prerequisites

### System Requirements

- **Node.js**: v18.0.0 or higher
- **Docker**: v20.0.0 or higher (for container deployment)
- **Memory**: 512MB per server minimum
- **CPU**: 1 core per server minimum

### Network Requirements

- **Transport**: stdio (local) or SSE/WebSocket (remote)
- **Ports**: None required for stdio transport
- **Firewall**: Allow outbound connections for PDF parsing (resume-analyzer)

## Deployment Options

### Option 1: Standalone Node.js Deployment

Deploy each server independently:

```bash
# Build the server
cd /home/re/code/SyncHire/mcp-servers/jd-parser
npm install
npm run build

# Run the server
npm start
```

**Pros**: Simple, fast startup, easy debugging
**Cons**: Manual process management, no isolation

### Option 2: Docker Deployment

Deploy each server in a Docker container:

```bash
# Build image
cd /home/re/code/SyncHire/mcp-servers/jd-parser
docker build -t synchire/jd-parser:latest .

# Run container
docker run -d --name jd-parser synchire/jd-parser:latest
```

**Pros**: Isolation, easy scaling, consistent environment
**Cons**: Slightly slower startup, requires Docker

### Option 3: Docker Compose (Recommended)

Deploy all servers together:

```bash
cd /home/re/code/SyncHire/mcp-servers
docker-compose up -d
```

**Pros**: Multi-server orchestration, easy management
**Cons**: Requires Docker Compose

## Docker Deployment

### Individual Server Dockerfiles

Each MCP server has its own Dockerfile:

#### JD Parser

**File**: `jd-parser/Dockerfile`

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./
RUN npm ci

COPY src ./src
RUN npm run build

FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/build ./build
COPY package*.json ./

RUN npm ci --omit=dev

EXPOSE 3000

CMD ["node", "build/index.js"]
```

#### Resume Analyzer

**File**: `resume-analyzer/Dockerfile`

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./
RUN npm ci

COPY src ./src
RUN npm run build

FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/build ./build
COPY package*.json ./

RUN npm ci --omit=dev

# Install system dependencies for PDF parsing
RUN apk add --no-cache pdfgrep

CMD ["node", "build/index.js"]
```

#### Job Matcher

**File**: `job-matcher/Dockerfile`

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./
RUN npm ci

COPY src ./src
RUN npm run build

FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/build ./build
COPY package*.json ./

RUN npm ci --omit=dev

CMD ["node", "build/index.js"]
```

#### Interview Prep

**File**: `interview-prep/Dockerfile`

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./
RUN npm ci

COPY src ./src
RUN npm run build

FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/build ./build
COPY package*.json ./

RUN npm ci --omit=dev

CMD ["node", "build/index.js"]
```

## Docker Compose

**File**: `docker-compose.yml`

```yaml
version: '3.8'

services:
  jd-parser:
    build:
      context: ./jd-parser
      dockerfile: Dockerfile
    container_name: synchire-jd-parser
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - LOG_LEVEL=info
    healthcheck:
      test: ["CMD", "node", "-e", "console.log('healthy')"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - synchire-network

  resume-analyzer:
    build:
      context: ./resume-analyzer
      dockerfile: Dockerfile
    container_name: synchire-resume-analyzer
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - LOG_LEVEL=info
    healthcheck:
      test: ["CMD", "node", "-e", "console.log('healthy')"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - synchire-network

  job-matcher:
    build:
      context: ./job-matcher
      dockerfile: Dockerfile
    container_name: synchire-job-matcher
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - LOG_LEVEL=info
    healthcheck:
      test: ["CMD", "node", "-e", "console.log('healthy')"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - synchire-network

  interview-prep:
    build:
      context: ./interview-prep
      dockerfile: Dockerfile
    container_name: synchire-interview-prep
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - LOG_LEVEL=info
    healthcheck:
      test: ["CMD", "node", "-e", "console.log('healthy')"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - synchire-network

networks:
  synchire-network:
    driver: bridge
```

### Docker Compose Commands

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f

# View service status
docker-compose ps

# Restart a service
docker-compose restart jd-parser

# Scale a service (horizontal scaling)
docker-compose up -d --scale jd-parser=3
```

## Environment Configuration

### Environment Variables

Each server supports the following environment variables:

```bash
# Node environment
NODE_ENV=production  # or development

# Logging
LOG_LEVEL=info       # debug, info, warn, error

# Server configuration (future SSE/WebSocket support)
PORT=3000
HOST=0.0.0.0

# Performance
NODE_OPTIONS=--max-old-space-size=512
```

### Configuration Files

Create `.env` files for each server:

**Example**: `jd-parser/.env`

```env
NODE_ENV=production
LOG_LEVEL=info
```

## Health Monitoring

### Health Check Endpoints

Each server implements health checks via Docker healthcheck:

```bash
# Check container health
docker ps --format "table {{.Names}}\t{{.Status}}"

# Inspect health status
docker inspect --format='{{.State.Health.Status}}' jd-parser
```

### Logging

View logs from each server:

```bash
# Docker logs
docker logs jd-parser -f

# Docker Compose logs
docker-compose logs -f jd-parser
```

### Monitoring Metrics

Key metrics to monitor:

- **Memory Usage**: `docker stats jd-parser`
- **CPU Usage**: `docker stats jd-parser`
- **Response Time**: See benchmark.md
- **Error Rate**: Check logs for errors

## Performance Optimization

### Resource Limits

Configure resource limits in `docker-compose.yml`:

```yaml
services:
  jd-parser:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

### Scaling Strategies

#### Horizontal Scaling

Scale individual servers:

```bash
docker-compose up -d --scale jd-parser=3
```

#### Vertical Scaling

Increase container resources:

```yaml
services:
  jd-parser:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 1G
```

### Caching

Cache parsed results to improve performance:

```typescript
// Example caching layer
const cache = new Map();

async function getCachedOrParse(key, parser) {
  if (cache.has(key)) {
    return cache.get(key);
  }
  const result = await parser(key);
  cache.set(key, result);
  return result;
}
```

## Troubleshooting

### Common Issues

#### Issue: Container Won't Start

**Symptoms**: `docker ps` shows empty list

**Solution**:
```bash
# Check logs
docker logs jd-parser

# Rebuild image
docker-compose build jd-parser

# Start with debug mode
docker-compose up jd-parser
```

#### Issue: High Memory Usage

**Symptoms**: Container OOM killed

**Solution**:
```yaml
# Increase memory limit
deploy:
  resources:
    limits:
      memory: 1G
```

#### Issue: Slow Response Times

**Symptoms**: Tools taking >1 second

**Solution**:
- Check resource constraints
- Implement caching
- Scale horizontally
- Profile with benchmark.md

### Debug Mode

Run servers in debug mode:

```bash
# Set environment
export LOG_LEVEL=debug

# Run with debug output
docker-compose --env-file .env.debug up jd-parser
```

### Health Check Failures

If health checks fail:

```bash
# Check health status
docker inspect --format='{{json .State.Health}}' jd-parser

# Manual health check
docker exec jd-parser node -e "console.log('healthy')"

# Restart service
docker-compose restart jd-parser
```

## Production Checklist

Before deploying to production:

- [ ] All servers built successfully
- [ ] Docker images tested locally
- [ ] Environment variables configured
- [ ] Health checks passing
- [ ] Resource limits set
- [ ] Logging configured
- [ ] Monitoring enabled
- [ ] Backup strategy in place
- [ ] Rollback plan documented

## Security Considerations

### Best Practices

1. **Run as non-root user**:
```dockerfile
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs
```

2. **Scan images for vulnerabilities**:
```bash
docker scan synchire/jd-parser:latest
```

3. **Use specific image versions**:
```dockerfile
FROM node:20.11.0-alpine
```

4. **Limit container capabilities**:
```yaml
cap_drop:
  - ALL
cap_add:
  - NET_BIND_SERVICE
```

## Support

For deployment issues:
- Check logs: `docker-compose logs -f`
- Review health checks: `docker ps`
- Run integration tests: `./test.sh`
- See [USAGE.md](./USAGE.md) for API usage

## Next Steps

After deployment:
1. Configure MCP client to connect to servers
2. Run integration tests to verify connectivity
3. Set up monitoring and alerting
4. Document your deployment configuration
