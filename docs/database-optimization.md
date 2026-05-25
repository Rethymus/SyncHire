# Database & Performance Skills
**SyncHire Project - Last Updated: 2026-05-26**

---

## Overview

Database optimization and performance tuning skills for PostgreSQL, Redis, and application-level performance improvements.

---

## 🐘 supabase-postgres-best-practices

### Purpose
PostgreSQL performance optimization and best practices from Supabase. Use when writing, reviewing, or optimizing Postgres queries, schema designs, or database configurations.

### Security Profile
- **Risk Level**: 🟢 LOW
- **Source**: Official Supabase skill
- **Author**: Supabase (verified organization)
- **Network Access**: None
- **File Access**: Read-only (documentation)
- **Credential Access**: None
- **Last Vetted**: 2026-05-26 ✅

### When to Use
- Writing SQL queries or designing schemas
- Implementing indexes or query optimization
- Reviewing database performance issues
- Configuring connection pooling or scaling
- Optimizing for Postgres-specific features
- Working with Row-Level Security (RLS)

### Key Features
- **8 Rule Categories by Priority**:
  1. Query Performance (CRITICAL)
  2. Connection Management (CRITICAL)
  3. Security & RLS (CRITICAL)
  4. Schema Design (HIGH)
  5. Concurrency & Locking (MEDIUM-HIGH)
  6. Data Access Patterns (MEDIUM)
  7. Monitoring & Diagnostics (LOW-MEDIUM)
  8. Advanced Features (LOW)

### Usage
```bash
/supabase-postgres-best-practices
```

### Query Performance Rules
- **query-missing-indexes**: Add indexes for columns in WHERE, JOIN, ORDER BY
- **query-partial-indexs**: Use partial indexes for filtered queries
- **query-collation**: Use appropriate collations for text comparisons
- **query-like-ilike**: Prefer specific text search over LIKE/ILIKE
- **query-array-contains**: Use array operators efficiently

### Connection Management Rules
- **conn-pool-size**: Configure appropriate pool sizes
- **conn-timeout**: Set reasonable connection timeouts
- **conn-statement-timeout**: Prevent long-running queries
- **conn-transaction-idle**: Set transaction idle timeouts

### Security Rules
- **security-rls**: Implement Row-Level Security
- **security-authenticate**: Proper authentication functions
- **security-authorize**: Authorization checks in queries
- **security-encrypt**: Encrypt sensitive data

### Schema Design Rules
- **schema-foreign-key-indexes**: Index foreign keys
- **schema-constraints**: Use appropriate constraints
- **schema-normalization**: Balance normalization and performance
- **schema-partitioning**: Partition large tables appropriately

### Example Optimization
```sql
-- Before (slow)
SELECT * FROM users WHERE email = 'user@example.com';

-- After (fast - with index)
CREATE INDEX idx_users_email ON users(email);
SELECT * FROM users WHERE email = 'user@example.com';
```

### Integration with Development
Add to code review process:
```bash
# After writing database queries
/supabase-postgres-best-practices
# Apply suggested optimizations
# Test query performance
```

---

## ⚡ web-perf

### Purpose
Web performance analysis using Chrome DevTools MCP. Measures Core Web Vitals, identifies render-blocking resources, network dependency chains, layout shifts, caching issues, and accessibility gaps.

### Security Profile
- **Risk Level**: 🟡 MEDIUM (requires chrome-devtools MCP)
- **Source**: Built-in (Anthropic)
- **Network Access**: chrome-devtools MCP (localhost only)
- **File Access**: Read-only (codebase analysis)
- **Credential Access**: None
- **Prerequisites**: chrome-devtools MCP server
- **Last Vetted**: 2026-05-26 ✅

### When to Use
- Performance audits
- Lighthouse score optimization
- Site speed issues
- Core Web Vitals problems
- Bundle size optimization

### Key Features
- **Core Web Vitals Analysis**:
  - FCP (First Contentful Paint): < 1.8s
  - LCP (Largest Contentful Paint): < 2.5s
  - TBT (Total Blocking Time): < 200ms
  - CLS (Cumulative Layout Shift): < 0.1
  - INP (Interaction to Next Paint): < 200ms

- **Network Analysis**:
  - Render-blocking resources
  - Network dependency chains
  - Missing preloads
  - Caching issues
  - Large payloads

- **Codebase Analysis**:
  - Framework/bundler detection
  - Tree-shaking opportunities
  - Unused JS/CSS
  - Compression & minification

### Usage
```bash
# Prerequisites: Configure chrome-devtools MCP
# Add to ~/.claude/mcp-servers.json:
{
  "chrome-devtools": {
    "type": "local",
    "command": ["npx", "-y", "chrome-devtools-mcp@latest"]
  }
}

# Run performance audit
/web-perf https://localhost:3000

# Or for production
/web-perf https://your-domain.com
```

### Workflow
1. **Phase 1**: Performance trace (navigate + record)
2. **Phase 2**: Core Web Vitals analysis
3. **Phase 3**: Network analysis
4. **Phase 4**: Accessibility snapshot
5. **Phase 5**: Codebase analysis

### Output Format
```
## Performance Audit Report

### Core Web Vitals Summary
| Metric | Value | Rating |
|--------|-------|--------|
| LCP | 2.1s | 🟢 Good |
| CLS | 0.05 | 🟢 Good |
| FCP | 1.5s | 🟢 Good |

### Top Issues
1. Render-blocking CSS (Impact: HIGH)
   - Fix: Add async/defer attributes

### Recommendations
- Compress hero.png (450KB) to WebP
- Add preload for critical fonts
- Enable Brotli compression
```

### MCP Server Setup
```json
// ~/.claude/mcp-servers.json
{
  "chrome-devtools": {
    "type": "local",
    "command": ["npx", "-y", "chrome-devtools-mcp@latest"]
  }
}
```

### Integration with CI/CD
Add to pre-deployment checks:
```bash
#!/bin/bash
# Before deploying to production
echo "🔍 Running performance audit..."
/web-perf https://staging.example.com
# Check if LCP, CLS meet thresholds
# Block deployment if not
```

---

## 🎯 Performance Optimization Workflow

### Database Performance
```bash
# 1. Write query
# 2. Review with best practices
/supabase-postgres-best-practices

# 3. Apply optimizations
# 4. Test with EXPLAIN ANALYZE
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'user@example.com';

# 5. Verify improvement
```

### Web Performance
```bash
# 1. Make UI changes
# 2. Run performance audit
/web-perf https://localhost:3000

# 3. Review Core Web Vitals
# 4. Apply optimizations
# 5. Re-audit to verify improvement
```

---

## Best Practices

### Database Optimization
1. **Use Indexes**: Add indexes for frequently queried columns
2. **Avoid N+1**: Use joins or subqueries instead of multiple queries
3. **Connection Pooling**: Configure appropriate pool sizes
4. **Query Limits**: Use LIMIT to prevent large result sets
5. **Analyze Queries**: Use EXPLAIN ANALYZE regularly

### Web Performance
1. **Optimize Images**: Use WebP format, lazy loading
2. **Minimize JavaScript**: Code splitting, tree shaking
3. **Enable Compression**: Brotli or gzip
4. **Use CDN**: Serve static assets from CDN
5. **Monitor Metrics**: Track Core Web Vitals

---

## Troubleshooting

### Database Issues
```bash
# Check slow queries
SELECT * FROM pg_stat_statements ORDER BY mean_exec_time DESC;

# Check missing indexes
SELECT * FROM pg_stat_user_indexes WHERE idx_scan = 0;

# Analyze query performance
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM table WHERE condition;
```

### Performance Issues
```bash
# Check Core Web Vitals
/web-perf <url>

# Analyze bundle size
npm run build -- --analyze

# Check network requests
# Use Chrome DevTools Network tab
```

---

## Related Skills

- **vercel-react-best-practices**: Frontend performance
- **code-review-expert**: Performance code review
- **seo-audit**: Performance impacts SEO

---

## Resources

- **PostgreSQL Docs**: https://www.postgresql.org/docs/current/
- **Supabase Docs**: https://supabase.com/docs
- **Web.dev**: https://web.dev/articles/vitals
- **Chrome DevTools**: https://developer.chrome.com/docs/devtools/performance

---

**Last Updated**: 2026-05-26
**Next Review**: 2026-06-26
