# SyncHire (知遇)

AI-powered job application platform that helps you create optimized resumes, analyze job descriptions, and match your experience with requirements.

## Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd SyncHire

# Start all services (infrastructure + migrations)
./scripts/dev.sh

# Start development servers
npm run dev
```

Visit http://localhost:3000 to see the application.

## Architecture

- **Frontend**: Next.js 14, TypeScript, TailwindCSS, shadcn/ui
- **Backend**: FastAPI, PostgreSQL + PGVector, Redis
- **Storage**: Minio (S3-compatible)
- **AI**: OpenAI GPT-4, Anthropic Claude

## Development

### Prerequisites

- Docker & Docker Compose
- Node.js 20+
- Python 3.11+

### Setup

1. Configure environment variables
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

2. Start infrastructure
   ```bash
   docker-compose up -d
   ```

3. Run migrations
   ```bash
   ./scripts/migrate.sh
   ```

4. Install dependencies
   ```bash
   npm install
   cd api && pip install -r requirements.txt
   ```

### Available Scripts

- `./scripts/dev.sh` - Start all services
- `./scripts/stop.sh` - Stop all services
- `./scripts/migrate.sh` - Run database migrations
- `./scripts/reset-db.sh` - Reset database (deletes data)
- `npm run dev` - Start frontend and backend dev servers

## Documentation

- [Deployment Guide](./docs/deployment.md)
- [CLAUDE.md](./CLAUDE.md) - Project context and guidelines

## License

MIT
