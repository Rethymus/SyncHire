# SyncHire Deployment Guide

## Local Development Setup

### Prerequisites

- Docker & Docker Compose
- Node.js 20+
- Python 3.11+
- npm or yarn

### Quick Start

**One command startup:**
```bash
make dev
```

Or manually:

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd SyncHire
   ```

2. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

3. **Start all services**
   ```bash
   make dev
   # or
   ./scripts/dev.sh
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

### Manual Setup

If you prefer to set up services manually:

#### 1. Start Infrastructure

```bash
docker-compose up -d postgres redis minio
```

#### 2. Setup Backend API

```bash
cd api
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn main:app --reload
```

#### 3. Setup Frontend

```bash
cd frontend
npm install
npm run dev
```

### Using Make Commands

```bash
make dev       # Start development environment
make build     # Build all services
make test      # Run all tests
make clean     # Clean build artifacts
make install   # Install all dependencies
make migrate   # Run database migrations
make reset     # Reset database (WARNING: deletes data)
make logs      # Show Docker logs
make stop      # Stop all services
```

### Service Endpoints

- **Frontend**: http://localhost:3000
- **API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Minio Console**: http://localhost:9001

### Database Management

#### Run migrations
```bash
cd api
alembic upgrade head
```

#### Create new migration
```bash
cd api
alembic revision --autogenerate -m "Description"
```

#### Rollback migration
```bash
cd api
alembic downgrade -1
```

### Development Tools

#### View Docker logs
```bash
docker-compose logs -f [service_name]
```

#### Restart specific service
```bash
docker-compose restart [service_name]
```

#### Stop all services
```bash
./scripts/stop.sh
# or
docker-compose down
```

## Production Deployment

### Environment Variables

For production, ensure these variables are properly set:

```bash
# Security
JWT_SECRET=<strong-random-secret>
POSTGRES_PASSWORD=<strong-password>

# AI APIs
OPENAI_API_KEY=<your-key>
ANTHROPIC_API_KEY=<your-key>

# CORS
CORS_ORIGINS=https://your-domain.com

# Logging
LOG_LEVEL=info
NODE_ENV=production
```

### Deployment Options

#### Option 1: Docker Compose (Single Server)

1. Build production images
2. Use production compose file
3. Set up reverse proxy (nginx)
4. Configure SSL certificates

#### Option 2: Cloud Platform

**Frontend (Vercel)**
- Connect GitHub repository
- Configure environment variables
- Deploy on push to main branch

**Backend (Railway/Render/AWS)**
- Deploy API as container
- Set up managed PostgreSQL
- Configure Redis
- Set up object storage

**Database (Managed)**
- Use cloud PostgreSQL (AWS RDS, Railway, etc.)
- Enable backups
- Configure connection pooling

### Monitoring & Observability

- Application logs
- Database query performance
- API response times
- Error tracking (Sentry)
- Uptime monitoring

### Backup Strategy

- Daily database backups
- Resume/JD file backups
- Configuration version control
- Disaster recovery plan

## Troubleshooting

### Common Issues

**Port already in use**
```bash
# Check what's using the port
lsof -i :3000  # Frontend
lsof -i :8000  # API
lsof -i :5432  # PostgreSQL

# Stop conflicting service or change port in .env
```

**Database connection failed**
```bash
# Check PostgreSQL is running
docker-compose ps
docker-compose logs postgres

# Restart PostgreSQL
docker-compose restart postgres
```

**Migration errors**
```bash
# Reset database (CAUTION: deletes data)
make reset
# or
docker-compose down -v
docker-compose up -d postgres
alembic upgrade head
```

**Frontend build fails**
```bash
# Clear cache and reinstall
cd frontend
rm -rf node_modules .next
npm install
npm run build
```

**API not responding**
```bash
# Check API logs
docker-compose logs api
# or if running locally
cd api
source venv/bin/activate
uvicorn main:app --reload --log-level debug
```

**Redis connection issues**
```bash
# Check Redis status
docker-compose redis redis-cli ping
# Restart Redis
docker-compose restart redis
```

**Minio access denied**
```bash
# Check Minio credentials in .env match
# Default: minioadmin/minioadmin
# Access console at http://localhost:9001
```

### Docker Issues

**Containers not starting**
```bash
# Check container status
docker-compose ps

# View logs for specific service
docker-compose logs [service_name]

# Rebuild containers
docker-compose down
docker-compose build
docker-compose up -d
```

**Volume issues**
```bash
# Remove all volumes (WARNING: deletes data)
docker-compose down -v

# Remove specific volume
docker volume rm synchire_postgres_data
```

### Performance Issues

**Slow API responses**
- Check database connection pooling
- Enable Redis caching
- Review query performance with `EXPLAIN ANALYZE`
- Check API logs for slow queries

**Frontend slow**
- Run `npm run build` to check for build warnings
- Check bundle size with `npm run analyze`
- Enable production mode optimizations
- Review network tab in browser DevTools

## Security Checklist

- [ ] Change all default passwords
- [ ] Set strong JWT_SECRET
- [ ] Enable HTTPS in production
- [ ] Configure proper CORS origins
- [ ] Set up rate limiting
- [ ] Enable authentication for Minio
- [ ] Regular security updates
- [ ] API key rotation
- [ ] Database backups encrypted
- [ ] Log aggregation setup
