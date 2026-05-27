# SyncHire Lite - Lightweight Local-First Architecture

## Overview

SyncHire Lite transforms the original cloud-based platform into a lightweight local tool that prioritizes privacy, simplicity, and efficiency while preserving powerful AI capabilities.

## Philosophy

**"Local-First, AI-Enabled, Extension-Ready"**

- **Local-First**: All data stored locally on user's machine
- **AI-Enabled**: Keep network-based AI functionality (OpenAI, Claude)
- **Extension-Ready**: Clean API boundaries for future integrations

## Architecture Transformation

### What Was Removed

| Component | Original | Lite Version | Reason |
|-----------|----------|--------------|--------|
| **Database** | PostgreSQL 16 | SQLite | Zero config, single file |
| **Caching** | Redis 7 | In-memory | No separate service needed |
| **Storage** | Minio (S3) | Local filesystem | Direct file access |
| **Auth** | JWT + OAuth + 2FA | None | Local tool, single user |
| **Email** | SMTP service | None | No notifications needed |
| **Rate Limiting** | Redis-based | None | Local use only |

### What Was Preserved

✅ **Core Features**:
- Resume management and analysis
- Job description parsing and storage
- Application tracking
- AI-powered optimization
- Job matching and scoring
- Interview preparation

✅ **AI Integration**:
- OpenAI GPT-4 access
- Anthropic Claude access
- MCP server architecture
- Semantic search (local FTS5)
- Vector embeddings (stored in SQLite)

✅ **Extension Interfaces**:
- Cloud backup API (future)
- Third-party integration API (future)
- Data export/import (JSON, CSV)
- Analytics extension points

## Resource Comparison

### Before (Cloud Platform)
```
Memory:      ~2GB (PostgreSQL + Redis + Minio + API + Frontend)
Disk:        ~1.5GB (Docker + node_modules + database)
Processes:   5+ separate services
Startup:     30-60 seconds
Config:      Complex (Docker, databases, secrets)
Network:     Required for all features
```

### After (Local Tool)
```
Memory:      ~200-400MB (API + Frontend only)
Disk:        ~300MB (Application + local data)
Processes:   2 services (API + Frontend)
Startup:     5-10 seconds
Config:      Simple (single executable)
Network:     Only for AI API calls
```

## Installation

### Prerequisites
- Python 3.11+
- Node.js 22+
- No database installation required
- No Redis installation required
- No Docker required

### Setup

1. **Clone repository**
   ```bash
   git clone https://github.com/Rethymus/synchire.git
   cd synchire
   ```

2. **Install backend dependencies**
   ```bash
   cd api
   pip install -r requirements_lite.txt
   ```

3. **Install frontend dependencies**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Configure environment**
   ```bash
   # Create .env.lite file
   cp .env.example .env.lite
   # Edit .env.lite with your AI API keys
   ```

5. **Run the application**
   ```bash
   # Terminal 1: Backend
   cd api
   python main_lite.py

   # Terminal 2: Frontend
   cd frontend
   npm run dev
   ```

## Configuration

### Environment Variables (.env.lite)

```bash
# Application
DEBUG=false
VERSION=1.0.0

# AI APIs (Required for AI features)
OPENAI_API_KEY=your_openai_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here

# MCP Servers (Optional - local servers)
MCP_JD_PARSER_URL=http://localhost:3001
MCP_RESUME_ANALYZER_URL=http://localhost:3002
MCP_JOB_MATCHER_URL=http://localhost:3003
MCP_INTERVIEW_PREP_URL=http://localhost:3004

# Data Storage (Defaults to ~/.synchire)
# DATA_DIR=/path/to/data
# DATABASE_PATH=/path/to/database.db
# FILES_DIR=/path/to/files
```

## Data Storage

### Directory Structure
```
~/.synchire/
├── synchire.db          # SQLite database
├── files/               # Uploaded files (resumes, JDs)
├── backups/             # Data backups
├── exports/             # Exported data
└── extensions/          # Extension configurations
```

### Database Schema

**Simplified tables (no user dependencies)**:
- `resumes` - Resume storage and metadata
- `job_descriptions` - JD storage and metadata
- `applications` - Application tracking
- `local_profile` - User preferences
- `extensions` - Extension registration
- `integration_logs` - Integration audit log

## Migration from Cloud Version

### Data Export
If you have data in the cloud version:

1. **Export your data** using the cloud version's export API
2. **Import to Lite** using the import endpoint
3. **Verify migration** using the validation tools

### Manual Migration Script
```python
# scripts/migrate_to_lite.py
# Exports PostgreSQL data and imports to SQLite
```

## API Endpoints

### Core Endpoints (No Authentication)

**Resumes**:
- `POST /api/resumes` - Create resume
- `GET /api/resumes` - List all resumes
- `GET /api/resumes/{id}` - Get resume details
- `PUT /api/resumes/{id}` - Update resume
- `DELETE /api/resumes/{id}` - Delete resume
- `POST /api/resumes/{id}/optimize` - AI optimization

**Job Descriptions**:
- `POST /api/jds` - Create JD
- `GET /api/jds` - List all JDs
- `GET /api/jds/{id}` - Get JD details
- `PUT /api/jds/{id}` - Update JD
- `DELETE /api/jds/{id}` - Delete JD
- `POST /api/jds/parse` - Parse JD from text/URL

**Applications**:
- `POST /api/applications` - Create application
- `GET /api/applications` - List all applications
- `GET /api/applications/{id}` - Get application details
- `PUT /api/applications/{id}` - Update application
- `DELETE /api/applications/{id}` - Delete application

**Search**:
- `POST /api/search` - Full-text search
- `POST /api/search/match` - Job-resume matching

**Data Portability**:
- `GET /api/export/json` - Export all data as JSON
- `GET /api/export/csv` - Export applications as CSV
- `POST /api/import` - Import data from JSON

**Extensions** (Future):
- `GET /api/extensions` - List extensions
- `POST /api/extensions/{id}/enable` - Enable extension
- `POST /api/extensions/{id}/sync` - Sync with extension

## Extension System

### Available Extensions (Future)

1. **Cloud Backup**
   - Backup data to cloud storage
   - Automatic sync
   - Multi-device support

2. **LinkedIn Integration**
   - Import jobs from LinkedIn
   - Export applications to LinkedIn
   - Status sync

3. **Indeed Integration**
   - Job search integration
   - Application tracking sync

4. **Analytics**
   - Advanced analytics dashboard
   - Success rate tracking
   - Performance metrics

### Extension Development

Extensions are optional plugins that can:

1. **Backup/Restore**: Cloud backup services
2. **Import/Export**: Third-party platform sync
3. **Analytics**: Advanced reporting
4. **Automation**: Workflow automation

## Security Considerations

### Local Tool Security

**Advantages**:
- No data transmitted to cloud (except AI APIs)
- No authentication required
- No risk of data breaches from cloud storage
- Full control over data

**Considerations**:
- AI API calls still transmit content to OpenAI/Anthropic
- Local file access permissions matter
- Backup your data regularly

### AI API Privacy

When using AI features:
- Resume content sent to OpenAI/Anthropic for processing
- JD content sent for parsing and analysis
- Review AI provider privacy policies
- Consider using local AI models in the future

## Performance Optimization

### SQLite Optimizations

The lite version includes several SQLite optimizations:

```python
PRAGMA journal_mode=WAL      # Better concurrent access
PRAGMA synchronous=NORMAL    # Balanced safety/performance
PRAGMA cache_size=-64000     # 64MB cache
PRAGMA temp_store=MEMORY     # In-memory temp tables
```

### Caching Strategy

- In-memory caching for frequently accessed data
- No Redis dependency
- LRU cache for AI responses
- File-based caching for large objects

## Troubleshooting

### Database Issues

**Database locked error**:
- Ensure only one instance is running
- Check for other processes using the file
- Use WAL mode (enabled by default)

**Slow queries**:
- Check database size with `get_db_size()`
- Consider adding indexes
- Use `EXPLAIN QUERY PLAN` for analysis

### File Storage Issues

**Permission denied**:
- Check directory permissions
- Ensure DATA_DIR is writable
- Check disk space

### AI API Issues

**Rate limiting**:
- Implement request queuing
- Add retry logic with exponential backoff
- Consider caching AI responses

**API key errors**:
- Verify keys in .env.lite
- Check API key validity
- Ensure sufficient credits

## Development

### Running Tests

```bash
# Backend tests
cd api
pytest tests/

# Frontend tests
cd frontend
npm test
```

### Building for Production

```bash
# Frontend production build
cd frontend
npm run build

# Backend (no build needed)
cd api
python main_lite.py
```

## Roadmap

### Phase 1: Core Functionality ✅
- Local SQLite database
- Simplified data models
- Core CRUD operations
- Basic AI integration

### Phase 2: Enhanced Features
- Advanced search with FTS5
- AI-powered optimization
- Job matching algorithms
- Export/import functionality

### Phase 3: Extension System
- Extension API design
- Cloud backup extension
- Third-party integrations
- Analytics extension

### Phase 4: Polish
- Performance optimization
- UI/UX improvements
- Documentation
- Testing and validation

## Contributing

When contributing to SyncHire Lite:

1. **Keep it local** - Don't add cloud dependencies
2. **Preserve privacy** - No data collection
3. **Maintain simplicity** - Easy to install and use
4. **Document changes** - Update README and docs
5. **Test thoroughly** - Ensure local functionality

## License

Same as original SyncHire project.

## Support

For issues and questions:
- GitHub Issues: https://github.com/Rethymus/synchire/issues
- Documentation: /docs folder
- Examples: /examples folder

---

**SyncHire Lite: Your AI-Powered Job Search Assistant, Running Locally** 🚀
