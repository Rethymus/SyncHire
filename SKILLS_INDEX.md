# Skills Index - Central Hub
**SyncHire Project - 2026-05-26**

---

## 🚀 Quick Navigation

### By Category
- [🔒 Security & Code Review](#security--code-review)
- [🗄️ Database & Performance](#database--performance)
- [🎨 Frontend & Accessibility](#frontend--accessibility)
- [🔍 Testing & Quality Assurance](#testing--quality-assurance)
- [📈 SEO & Analytics](#seo--analytics)

### By Risk Level
- [🟢 LOW Risk](#low-risk-skills)
- [🟡 MEDIUM Risk](#medium-risk-skills)
- [🔴 HIGH Risk](#high-risk-skills) - None currently

### By Usage Frequency
- [Daily Development](#daily-development)
- [Pre-Commit](#pre-commit)
- [Pre-Deployment](#pre-deployment)
- [On-Demand](#on-demand)

---

## 🔒 Security & Code Review

### code-review-expert ✅
- **Purpose**: Security & SOLID principles review
- **Risk**: 🟢 LOW
- **Usage**: Pre-commit, PR review
- **Documentation**: [Full Guide](docs/code-review-expert.md)
- **Command**: `/code-review-expert`
- **Version**: 1.0 (2026-03-23)

### skill-vetter ✅
- **Purpose**: Security vetting protocol
- **Risk**: 🟢 LOW
- **Usage**: New skill installation
- **Documentation**: [Full Guide](docs/skill-vetter.md)
- **Command**: `/skill-vetter vet <skill>`
- **Version**: 1.0 (2026-03-23)

---

## 🗄️ Database & Performance

### supabase-postgres-best-practices ✅
- **Purpose**: PostgreSQL optimization
- **Risk**: 🟢 LOW
- **Usage**: Backend development, query optimization
- **Documentation**: [Full Guide](docs/postgres-best-practices.md)
- **Command**: `/supabase-postgres-best-practices`
- **Version**: 1.1.0 (2026-01)

### web-perf ✅
- **Purpose**: Performance auditing
- **Risk**: 🟡 MEDIUM (requires chrome-devtools MCP)
- **Usage**: Pre-deployment, performance optimization
- **Documentation**: [Full Guide](docs/web-performance.md)
- **Command**: `/web-perf <url>`
- **Version**: 1.0 (2026-03-23)

---

## 🎨 Frontend & Accessibility

### vercel-react-best-practices ✅
- **Purpose**: React/Next.js optimization
- **Risk**: 🟢 LOW
- **Usage**: Active during development
- **Documentation**: [Full Guide](docs/vercel-best-practices.md)
- **Status**: 🟢 ACTIVE
- **Version**: Latest (2026-03-23)

### fixing-accessibility ✅
- **Purpose**: WCAG 2.1 AA compliance
- **Risk**: 🟢 LOW
- **Usage**: UI development, accessibility audits
- **Documentation**: [Full Guide](docs/accessibility.md)
- **Command**: `/fixing-accessibility <file>`
- **Version**: 1.0 (2026-03-23)

---

## 🔍 Testing & Quality Assurance

### dogfood ✅
- **Purpose**: Exploratory testing
- **Risk**: 🟡 MEDIUM (requires agent-browser)
- **Usage**: Pre-release testing
- **Documentation**: [Full Guide](docs/exploratory-testing.md)
- **Command**: `/dogfood <url>`
- **Version**: 1.0 (2026-03-23)

---

## 📈 SEO & Analytics

### seo-audit ✅
- **Purpose**: SEO health checks
- **Risk**: 🟢 LOW
- **Usage**: Public pages, SEO optimization
- **Documentation**: [Full Guide](docs/seo-audit.md)
- **Command**: `/seo-audit`
- **Version**: 1.1.0 (2026-03-23)

---

## Risk Level Classification

### 🟢 LOW Risk Skills
1. code-review-expert
2. skill-vetter
3. supabase-postgres-best-practices
4. vercel-react-best-practices
5. fixing-accessibility
6. seo-audit

### 🟡 MEDIUM Risk Skills
1. web-perf (requires MCP server)
2. dogfood (requires MCP server)

### 🔴 HIGH Risk Skills
- None currently installed

---

## Usage Frequency Guide

### Daily Development
- `/code-review-expert` - Before committing
- `/vercel-react-best-practices` - During React development
- `/fixing-accessibility` - For UI changes

### Pre-Commit
- `/code-review-expert` - Security review
- `/fixing-accessibility <file>` - Accessibility check
- `/supabase-postgres-best-practices` - Database optimization

### Pre-Deployment
- `/web-perf <url>` - Performance audit
- `/seo-audit` - SEO health check
- `/dogfood <url>` - Final testing

### On-Demand
- `/skill-vetter vet <skill>` - New skill installation
- `/supabase-postgres-best-practices` - Complex queries
- `/seo-audit` - SEO issues

---

## Search by Tag

#security
- code-review-expert
- skill-vetter

#database
- supabase-postgres-best-practices

#performance
- web-perf
- vercel-react-best-practices
- supabase-postgres-best-practices

#accessibility
- fixing-accessibility

#testing
- dogfood

#seo
- seo-audit

#frontend
- vercel-react-best-practices
- fixing-accessibility

#backend
- supabase-postgres-best-practices

---

## Quick Reference Commands

### Security First
```bash
# Before installing any skill
/skill-vetter vet <skill-path-or-url>

# Before committing code
/code-review-expert
```

### Performance Optimization
```bash
# React/Next.js development
/vercel-react-best-practices

# Database queries
/supabase-postgres-best-practices

# Performance audit
/web-perf <url>
```

### Quality Assurance
```bash
# Accessibility check
/fixing-accessibility <file>

# Exploratory testing
/dogfood <url>

# SEO audit
/seo-audit
```

---

## Documentation Files

| File | Purpose | Lines | Last Updated |
|------|---------|-------|--------------|
| SKILLS_INDEX.md | This file - Central navigation | ~200 | 2026-05-26 |
| docs/security-review.md | Security skills deep dive | ~300 | 2026-05-26 |
| docs/database-optimization.md | Database skills guide | ~250 | 2026-05-26 |
| docs/frontend-performance.md | Frontend skills guide | ~300 | 2026-05-26 |
| docs/testing-qa.md | Testing skills guide | ~200 | 2026-05-26 |
| docs/seo-analytics.md | SEO skills guide | ~200 | 2026-05-26 |
| SKILLS_QUICK_REFERENCE.md | Daily command reference | ~150 | 2026-05-26 |
| SKILLS_SECURITY_VETTING_REPORT.md | Security audit results | ~400 | 2026-05-26 |

---

## Skill Status Dashboard

| Skill | Status | Version | Last Vetted | Usage |
|-------|--------|---------|-------------|-------|
| code-review-expert | ✅ Active | 1.0 | 2026-05-26 | High |
| skill-vetter | ✅ Active | 1.0 | 2026-05-26 | Medium |
| supabase-postgres-best-practices | ✅ Active | 1.1.0 | 2026-05-26 | Medium |
| web-perf | ✅ Available | 1.0 | 2026-05-26 | Low |
| vercel-react-best-practices | ✅ Active | Latest | 2026-05-26 | High |
| fixing-accessibility | ✅ Active | 1.0 | 2026-05-26 | Medium |
| dogfood | ✅ Available | 1.0 | 2026-05-26 | Low |
| seo-audit | ✅ Active | 1.1.0 | 2026-05-26 | Low |

---

## Getting Started

1. **New to the project?** Start with [Quick Reference](SKILLS_QUICK_REFERENCE.md)
2. **Security conscious?** Read [Security Vetting Report](SKILLS_SECURITY_VETTING_REPORT.md)
3. **Need specific help?** Use the tags above to find relevant skills
4. **Installing new skills?** Always run `/skill-vetter vet <skill>` first

---

## Maintenance Notes

- **Monthly**: Check for skill updates
- **Quarterly**: Re-vet all skills
- **As needed**: Update this index when skills change

**Last Updated**: 2026-05-26
**Next Review**: 2026-06-26
