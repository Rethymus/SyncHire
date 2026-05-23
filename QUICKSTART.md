# Quick Start Guide

## Prerequisites Check

```bash
# Check Docker
docker --version
docker-compose --version

# Check Node.js
node --version  # Should be 20+

# Check Python
python3 --version  # Should be 3.11+
```

## One-Command Setup

```bash
# Clone and setup
git clone <repository-url>
cd SyncHire
make dev
```

This will:
- ✅ Start PostgreSQL, Redis, and Minio
- ✅ Run database migrations
- ✅ Install dependencies
- ✅ Start development servers

## Access Points

After `make dev` completes:

- **Frontend**: http://localhost:3000
- **API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Minio Console**: http://localhost:9001

## Development Workflow

```bash
# Start everything
make dev

# Run tests
make test

# View logs
make logs

# Stop everything
make stop

# Clean restart
make clean && make dev
```

## MCP Servers (Optional)

If you need to run MCP servers separately:

```bash
# Start all MCP servers
npm run dev:mcp

# Stop MCP servers
npm run stop:mcp
```

## First Time Setup

1. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env and add your API keys
   ```

2. **Required API keys**
   - OpenAI API Key
   - Anthropic API Key

3. **Start development**
   ```bash
   make dev
   ```

## Troubleshooting

**Port already in use?**
```bash
# Check what's using the port
lsof -i :3000
# Change port in .env
```

**Database connection failed?**
```bash
# Restart PostgreSQL
docker-compose restart postgres
```

**Need to reset everything?**
```bash
make clean
make dev
```

## Next Steps

- Read [CLAUDE.md](./CLAUDE.md) for project architecture
- Read [docs/deployment.md](./docs/deployment.md) for deployment guide
- Check [frontend/](./frontend/) for frontend development
- Check [api/](./api/) for backend development
