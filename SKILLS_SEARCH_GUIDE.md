# Skills Search Guide
**Quick lookup for skills by tag, category, or use case**

---

## 🔍 Search by Tag

### #security
Skills for security reviews and vulnerability detection:
- **code-review-expert**: Full security + SOLID review
- **skill-vetter**: Security vetting protocol

**Usage**: `/code-review-expert` or `/skill-vetter vet <skill>`

---

### #database
Skills for database optimization:
- **supabase-postgres-best-practices**: PostgreSQL optimization

**Usage**: `/supabase-postgres-best-practices`

---

### #performance
Skills for performance optimization:
- **web-perf**: Web performance auditing
- **vercel-react-best-practices**: React/Next.js optimization
- **supabase-postgres-best-practices**: Database query performance

**Usage**: `/web-perf <url>` or `/vercel-react-best-practices`

---

### #accessibility
Skills for WCAG 2.1 AA compliance:
- **fixing-accessibility**: Accessibility fixes

**Usage**: `/fixing-accessibility <file>`

---

### #testing
Skills for quality assurance:
- **dogfood**: Exploratory testing

**Usage**: `/dogfood <url>`

---

### #seo
Skills for search engine optimization:
- **seo-audit**: SEO health checks

**Usage**: `/seo-audit`

---

### #frontend
Skills for frontend development:
- **vercel-react-best-practices**: React/Next.js optimization
- **fixing-accessibility**: UI accessibility

**Usage**: `/vercel-react-best-practices` or `/fixing-accessibility <file>`

---

### #backend
Skills for backend development:
- **supabase-postgres-best-practices**: Database optimization
- **code-review-expert**: Backend security review

**Usage**: `/supabase-postgres-best-practices` or `/code-review-expert`

---

## 🎯 Search by Use Case

### "I need to review my code before committing"
→ `/code-review-expert`

### "I want to optimize my React components"
→ `/vercel-react-best-practices`

### "My site is slow, how do I fix it?"
→ `/web-perf <your-url>`

### "I need to make my site accessible"
→ `/fixing-accessibility <component-file>`

### "I want to test my site like a real user"
→ `/dogfood <your-url>`

### "My site isn't ranking in Google"
→ `/seo-audit`

### "I need to optimize my database queries"
→ `/supabase-postgres-best-practices`

### "I want to install a new skill, is it safe?"
→ `/skill-vetter vet <skill-path-or-url>`

---

## 📋 Alphabetical Skill Index

### A-C
- **code-review-expert**: Security & SOLID review
- **dogfood**: Exploratory testing

### F-S
- **fixing-accessibility**: WCAG 2.1 AA compliance
- **seo-audit**: SEO health checks
- **skill-vetter**: Security vetting protocol
- **supabase-postgres-best-practices**: PostgreSQL optimization

### V-W
- **vercel-react-best-practices**: React/Next.js optimization
- **web-perf**: Performance auditing

---

## 🚀 Quick Command Reference

```bash
# Security First
/code-review-expert                          # Review code for security issues
/skill-vetter vet <skill>                    # Vet new skill before installing

# Performance Optimization
/vercel-react-best-practices                 # Optimize React/Next.js code
/web-perf <url>                              # Audit website performance
/supabase-postgres-best-practices            # Optimize database queries

# Quality Assurance
/fixing-accessibility <file>                 # Check WCAG compliance
/dogfood <url>                               # Exploratory testing

# SEO & Analytics
/seo-audit                                   # SEO health check
```

---

## 🏷️ Category Cloud

```
security          database         performance
code-review       postgres         web-perf
skill-vetter                       react-best-practices

accessibility      testing         seo
fixing-a11y       dogfood          seo-audit
```

---

## 📊 Skills by Risk Level

### 🟢 LOW Risk (Safe for Daily Use)
- code-review-expert
- skill-vetter
- supabase-postgres-best-practices
- vercel-react-best-practices
- fixing-accessibility
- seo-audit

### 🟡 MEDIUM Risk (Requires Setup)
- web-perf (needs chrome-devtools MCP)
- dogfood (needs agent-browser)

---

## 🔧 Setup Requirements

### No Setup Required
- code-review-expert ✅
- skill-vetter ✅
- supabase-postgres-best-practices ✅
- vercel-react-best-practices ✅
- fixing-accessibility ✅
- seo-audit ✅

### Requires MCP Server
- web-perf → Install chrome-devtools MCP
- dogfood → Install agent-browser

---

## 📚 Documentation Links

| Skill | Full Guide | Quick Reference |
|-------|------------|-----------------|
| code-review-expert | [docs/security-review.md](docs/security-review.md) | [SKILLS_QUICK_REFERENCE.md](SKILLS_QUICK_REFERENCE.md) |
| skill-vetter | [docs/security-review.md](docs/security-review.md) | [SKILLS_QUICK_REFERENCE.md](SKILLS_QUICK_REFERENCE.md) |
| supabase-postgres-best-practices | [docs/database-optimization.md](docs/database-optimization.md) | [SKILLS_QUICK_REFERENCE.md](SKILLS_QUICK_REFERENCE.md) |
| web-perf | [docs/database-optimization.md](docs/database-optimization.md) | [SKILLS_QUICK_REFERENCE.md](SKILLS_QUICK_REFERENCE.md) |
| vercel-react-best-practices | [docs/frontend-performance.md](docs/frontend-performance.md) | [SKILLS_QUICK_REFERENCE.md](SKILLS_QUICK_REFERENCE.md) |
| fixing-accessibility | [docs/frontend-performance.md](docs/frontend-performance.md) | [SKILLS_QUICK_REFERENCE.md](SKILLS_QUICK_REFERENCE.md) |
| dogfood | [docs/testing-qa.md](docs/testing-qa.md) | [SKILLS_QUICK_REFERENCE.md](SKILLS_QUICK_REFERENCE.md) |
| seo-audit | [docs/seo-analytics.md](docs/seo-analytics.md) | [SKILLS_QUICK_REFERENCE.md](SKILLS_QUICK_REFERENCE.md) |

---

## 💡 Pro Tips

1. **Use tags for quick filtering**: Search this page for `#security`, `#performance`, etc.
2. **Start with risk level**: Prefer LOW risk skills for daily development
3. **Check setup requirements**: Some skills need MCP servers
4. **Read full guides**: For complex issues, check the full documentation
5. **Keep updated**: Skills are updated monthly, check VERSION_TRACKING.md

---

**Last Updated**: 2026-05-26
**Next Update**: 2026-06-26
