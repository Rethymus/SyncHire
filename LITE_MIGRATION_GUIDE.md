# SyncHire Lite Migration Guide

## Overview

This guide helps you migrate from the cloud-based SyncHire to the lightweight local version (SyncHire Lite).

## Why Migrate?

| Concern | Cloud Version | Lite Version |
|---------|---------------|--------------|
| **Privacy** | Data stored on cloud servers | Data stored locally only |
| **Resources** | 2GB+ RAM, multiple services | 200-400MB RAM, single service |
| **Complexity** | Docker, PostgreSQL, Redis, Minio | Single executable, SQLite |
| **Network** | Required for all features | Only for AI API calls |
| **Setup** | Complex configuration | Simple, zero-config |
| **Cost** | Server hosting costs | Free |

## Pre-Migration Checklist

Before migrating, ensure you have:

- [ ] Exported all your data from the cloud version
- [ ] Backed up your resume files
- [ ] Noted down any important application tracking
- [ ] Saved your preferences and settings
- [ ] Documented any custom workflows

## Migration Steps

### Step 1: Export Data from Cloud Version

**Using the API**:
```bash
# Export all data as JSON
curl -X GET http://your-cloud-server/api/export/json \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o synchire-export.json

# Export applications as CSV
curl -X GET http://your-cloud-server/api/export/csv \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o applications.csv
```

**Using the web interface**:
1. Log in to your cloud SyncHire instance
2. Navigate to Settings → Data Management
3. Click "Export All Data"
4. Save the JSON file locally

### Step 2: Install SyncHire Lite

```bash
# Clone repository (if not already done)
git clone https://github.com/Rethymus/synchire.git
cd synchire

# Install backend dependencies
cd api
pip install -r requirements_lite.txt

# Install frontend dependencies
cd ../frontend
npm install
```

### Step 3: Configure Lite Version

```bash
# Create environment file
cd api
cp .env.example .env.lite

# Edit .env.lite with your configuration
nano .env.lite
```

**Required settings**:
```bash
# AI API Keys (preserve from cloud version)
OPENAI_API_KEY=your_existing_key
ANTHROPIC_API_KEY=your_existing_key

# Data directory (optional, defaults to ~/.synchire)
DATA_DIR=/path/to/your/data/directory
```

### Step 4: Import Data

**Using the API**:
```bash
# Start the lite backend
python main_lite.py

# In another terminal, import your data
curl -X POST http://localhost:8000/api/import \
  -H "Content-Type: application/json" \
  -d @synchire-export.json
```

**Using the import script**:
```bash
# Run the migration script
python scripts/migrate_to_lite.py \
  --input synchire-export.json \
  --validate
```

### Step 5: Verify Migration

1. **Check data integrity**:
   ```bash
   # Count records in database
   sqlite3 ~/.synchire/synchire.db "SELECT COUNT(*) FROM resumes;"
   sqlite3 ~/.synchire/synchire.db "SELECT COUNT(*) FROM job_descriptions;"
   sqlite3 ~/.synchire/synchire.db "SELECT COUNT(*) FROM applications;"
   ```

2. **Test the application**:
   - Open http://localhost:3000
   - Verify resumes are listed
   - Check job descriptions
   - Review application tracking

3. **Run validation script**:
   ```bash
   python scripts/validate_migration.py
   ```

## Data Mapping

### Cloud to Lite Schema Changes

| Cloud Table | Lite Table | Changes |
|-------------|------------|---------|
| `users` | `local_profile` | Simplified, no auth fields |
| `resumes` | `resumes` | Removed `user_id` |
| `job_descriptions` | `job_descriptions` | Removed `user_id` |
| `applications` | `applications` | Removed `user_id` |
| `notifications` | ~~removed~~ | No notifications in lite |
| `oauth_accounts` | ~~removed~~ | No OAuth in lite |
| `password_reset_tokens` | ~~removed~~ | No auth in lite |

### Field Changes

**Removed fields**:
- `user_id` - All tables (single user)
- `email_verified` - User model
- `is_active` - User model
- `hashed_password` - User model
- `oauth_provider` - OAuth accounts
- `notification preferences` - Various tables

**Added fields**:
- `file_path` - Resumes (local file reference)
- `preferences` - Local profile (JSON)

## Feature Comparison

### Available in Lite ✅

- [x] Resume management
- [x] Job description storage
- [x] Application tracking
- [x] AI-powered optimization
- [x] Job matching
- [x] Interview preparation
- [x] Full-text search
- [x] Data export/import
- [x] Local file storage

### Not Available in Lite ❌

- [ ] User authentication
- [ ] Social login (Google, GitHub)
- [ ] Email notifications
- [ ] Real-time updates
- [ ] Multi-user support
- [ ] Cloud backup (extension planned)
- [ ] Social features
- [ ] Rate limiting (not needed locally)

### Available as Extensions 🔌

- [ ] Cloud backup
- [ ] LinkedIn integration
- [ ] Indeed integration
- [ ] Advanced analytics
- [ ] Multi-device sync

## Troubleshooting Migration

### Issue: Import fails

**Solution**:
```bash
# Validate JSON file first
python scripts/validate_json.py synchire-export.json

# Check for missing fields
python scripts/check_migration.py --input synchire-export.json
```

### Issue: Missing files

**Solution**:
```bash
# Files stored in Minio need to be downloaded separately
# Use the export script to download all files
python scripts/export_files.py --output-dir ~/synchire-files

# Then update file paths in the database
python scripts/update_file_paths.py --files-dir ~/synchire-files
```

### Issue: Database errors

**Solution**:
```bash
# Recreate database from scratch
rm ~/.synchire/synchire.db
python main_lite.py  # Will create new database

# Re-run import
curl -X POST http://localhost:8000/api/import \
  -H "Content-Type: application/json" \
  -d @synchire-export.json
```

## Post-Migration Setup

### 1. Set Up Local Profile

```bash
# Configure your local profile
curl -X PUT http://localhost:8000/api/profile \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Your Name",
    "email": "your.email@example.com",
    "preferences": {
      "theme": "dark",
      "default_resume_id": null
    }
  }'
```

### 2. Configure AI APIs

Ensure your AI API keys are configured in `.env.lite`:
```bash
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

### 3. Set Up MCP Servers (Optional)

If using local MCP servers:
```bash
# Start MCP servers
cd mcp-servers/jd-parser && npm start
cd mcp-servers/resume-analyzer && npm start
cd mcp-servers/job-matcher && npm start
cd mcp-servers/interview-prep && npm start
```

### 4. Configure Backups

Set up automated backups:
```bash
# Add to crontab for daily backups
0 2 * * * /usr/bin/python3 /path/to/synchire/scripts/backup.py
```

## Rollback Plan

If you need to rollback to the cloud version:

1. **Keep cloud instance running** during migration
2. **Document all changes** made during migration
3. **Test thoroughly** before decommissioning cloud
4. **Maintain backups** of cloud data

### Rollback Steps

```bash
# 1. Stop lite version
pkill -f main_lite.py

# 2. Reconnect to cloud version
# Update frontend to point to cloud API
# Restore previous configuration

# 3. Verify data integrity
# Check that all data is still available
```

## Performance Comparison

### Expected Improvements

| Metric | Cloud | Lite | Improvement |
|--------|-------|------|-------------|
| **Startup time** | 30-60s | 5-10s | 5x faster |
| **Memory usage** | 2GB+ | 200-400MB | 5x less |
| **Disk usage** | 1.5GB+ | 300MB | 5x less |
| **Network (local ops)** | Required | None | 100% less |
| **Network (AI ops)** | Required | Required | Same |

### Potential Limitations

- **Concurrent access**: Single user only
- **Remote access**: Requires network setup
- **Scaling**: Limited to single machine
- **Collaboration**: No multi-user features

## Best Practices After Migration

1. **Regular backups**: Schedule automated backups
2. **Monitor disk space**: Watch database size
3. **Update regularly**: Keep dependencies updated
4. **Test AI features**: Verify AI API connectivity
5. **Monitor API usage**: Track AI API costs

## Support

For migration issues:
1. Check this guide first
2. Review GitHub issues
3. Create new issue with details
4. Include error messages and logs

## Conclusion

Migrating to SyncHire Lite provides:
- ✅ Improved privacy
- ✅ Reduced resource usage
- ✅ Simplified setup
- ✅ Faster performance
- ✅ Lower costs

Welcome to local-first job search assistance! 🎉
