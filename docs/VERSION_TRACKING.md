# Skills Version Tracking
**SyncHire Project - Tracking System**

---

## Overview

This document tracks all installed skills, their versions, last vetting dates, and update history.

---

## 📋 Skills Inventory

| Skill | Version | Install Date | Last Vetted | Last Updated | Status | Risk Level |
|-------|---------|--------------|-------------|--------------|--------|------------|
| code-review-expert | 1.0 | 2026-03-23 | 2026-05-26 | 2026-03-23 | ✅ Active | 🟢 LOW |
| skill-vetter | 1.0 | 2026-03-23 | 2026-05-26 | 2026-03-23 | ✅ Active | 🟢 LOW |
| supabase-postgres-best-practices | 1.1.0 | 2026-03-23 | 2026-05-26 | 2026-01 | ✅ Active | 🟢 LOW |
| web-perf | 1.0 | 2026-03-23 | 2026-05-26 | 2026-03-23 | ✅ Available | 🟡 MEDIUM |
| vercel-react-best-practices | Latest | 2026-03-23 | 2026-05-26 | 2026-03-23 | ✅ Active | 🟢 LOW |
| fixing-accessibility | 1.0 | 2026-03-23 | 2026-05-26 | 2026-03-23 | ✅ Active | 🟢 LOW |
| dogfood | 1.0 | 2026-03-23 | 2026-05-26 | 2026-03-23 | ✅ Available | 🟡 MEDIUM |
| seo-audit | 1.1.0 | 2026-03-23 | 2026-05-26 | 2026-03-23 | ✅ Active | 🟢 LOW |

---

## 🔄 Update History

### 2026-05-26
- **Initial Skills Audit**: All 8 skills vetted and approved
- **Documentation Created**: Modular documentation structure implemented
- **Version Tracking**: This tracking system established
- **Status**: All skills current, no updates needed

### Upcoming Reviews
- **2026-06-26**: Next scheduled skills review
- **2026-09-26**: Quarterly security audit

---

## 📊 Version Schema

Skills follow semantic versioning where applicable:

**Format**: `MAJOR.MINOR.PATCH`

- **MAJOR**: Breaking changes, significant updates
- **MINOR**: New features, backward-compatible
- **PATCH**: Bug fixes, minor improvements

**Special Versions**:
- `Latest`: Always uses newest version (vercel-react-best-practices)
- `Built-in`: Version managed by Claude Code

---

## 🔍 Update Detection

### Automatic Checks
```bash
# Check for skill updates (monthly)
ls -la ~/.agents/skills/*/SKILL.md

# Compare modification dates
stat ~/.agents/skills/code-review-expert/SKILL.md
```

### Manual Verification
```bash
# Check skill documentation
cat ~/.agents/skills/<skill-name>/SKILL.md | grep "version:"

# Verify against built-in skills
ls -la ~/.claude/skills/<skill-name>
```

---

## 🛡️ Re-Vetting Protocol

When a skill is updated, re-vet using `/skill-vetter`:

```bash
# 1. Detect update
# 2. Re-vet skill
/skill-vetter vet <skill-name>

# 3. Review changes
# 4. Update version tracking
# 5. Document findings
```

---

## 📋 Version Tracking Template

For new skills, add to inventory:

```markdown
| skill-name | X.X.X | YYYY-MM-DD | YYYY-MM-DD | YYYY-MM-DD | ✅ Active | 🟢 LOW |
```

**Fields**:
- **skill-name**: Name of the skill
- **X.X.X**: Version number
- **Install Date**: When skill was added to project
- **Last Vetted**: Last security vetting date
- **Last Updated**: Last skill update date
- **Status**: Active, Available, Deprecated
- **Risk Level**: LOW, MEDIUM, HIGH, EXTREME

---

## 🔄 Update Workflow

### Monthly Review (1st of each month)
1. Check for skill updates
2. Review change logs
3. Re-vet updated skills
4. Update this document
5. Notify team of changes

### Quarterly Audit (every 3 months)
1. Full security re-vetting
2. Risk level reassessment
3. Usage analysis
4. Optimization opportunities
5. Documentation updates

---

## 📈 Usage Metrics

Track which skills provide most value:

| Skill | Usage Count | Last Used | User Satisfaction |
|-------|-------------|-----------|-------------------|
| code-review-expert | High | 2026-05-26 | ⭐⭐⭐⭐⭐ |
| vercel-react-best-practices | High | Active | ⭐⭐⭐⭐⭐ |
| fixing-accessibility | Medium | 2026-05-26 | ⭐⭐⭐⭐ |
| supabase-postgres-best-practices | Medium | 2026-05-26 | ⭐⭐⭐⭐ |
| skill-vetter | Low | 2026-05-26 | ⭐⭐⭐⭐⭐ |
| web-perf | Low | N/A | ⭐⭐⭐ |
| seo-audit | Low | N/A | ⭐⭐⭐ |
| dogfood | Low | N/A | ⭐⭐⭐ |

---

## 🎯 Optimization Opportunities

Based on usage and version tracking:

### High Usage Skills
- **code-review-expert**: Consider automating in CI/CD
- **vercel-react-best-practices**: Already active, optimize rules

### Low Usage Skills
- **web-perf**: Requires MCP setup, document setup process
- **seo-audit**: Create scheduled audits for public pages
- **dogfood**: Promote for pre-release testing

### Version Updates Needed
- None currently - all skills up to date

---

## 📞 Reporting

### Monthly Report Template
```markdown
## Skills Monthly Report - YYYY-MM

### Updates This Month
- [Skill name]: Updated to vX.X.X
- [Skill name]: Re-vetted, status maintained

### New Skills
- [Skill name]: Added, vetted, approved

### Removed Skills
- [Skill name]: Deprecated, removed

### Action Items
- [ ] Item 1
- [ ] Item 2
```

---

## 🔗 Related Documentation

- [Skills Index](../SKILLS_INDEX.md) - Central navigation
- [Security Vetting Report](../SKILLS_SECURITY_VETTING_REPORT.md) - Security analysis
- [Quick Reference](../SKILLS_QUICK_REFERENCE.md) - Daily commands

---

**Last Updated**: 2026-05-26
**Next Review**: 2026-06-26
**Maintained By**: Development Team
