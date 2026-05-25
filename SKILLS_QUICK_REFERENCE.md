# Skills Quick Reference Guide
**SyncHire Project - 2026-05-26**

---

## 🚀 Quick Start

### Most Used Skills (Daily Development)
```bash
/code-review-expert          # Code review & security check
/vercel-react-best-practices # React/Next.js optimization
/fixing-accessibility        # WCAG 2.1 AA compliance
```

### Pre-Deployment Skills
```bash
/web-perf                    # Performance audit
/supabase-postgres-best-practices  # Database optimization
/seo-audit                   # SEO health check
```

### Testing & Vetting
```bash
/dogfood                     # Exploratory testing
/skill-vetter vet <skill>    # Security vetting
```

---

## 📋 Skills by Use Case

### Before Committing Code
1. `/code-review-expert` - Check for security issues and SOLID violations
2. `/fixing-accessibility <file>` - Verify WCAG compliance for UI changes

### Before Merging PRs
1. `/code-review-expert` - Full security and architecture review
2. `/web-perf <url>` - Performance audit if UI changed
3. `/supabase-postgres-best-practices` - Database query review

### Before Deploying
1. `/web-perf <url>` - Core Web Vitals check
2. `/seo-audit` - SEO health check
3. `/dogfood <url>` - Final exploratory testing

### Installing New Skills
1. `/skill-vetter vet <skill-path-or-url>` - ALWAYS vet first!
2. Review vetting report
3. Install only if SAFE

---

## ⚡ Common Commands

### Frontend Development
```bash
# Review React component
/code-review-expert
/fixing-accessibility src/components/new-component.tsx

# Optimize performance
/vercel-react-best-practices
/web-perf https://localhost:3000
```

### Backend Development
```bash
# Review API code
/code-review-expert

# Optimize database queries
/supabase-postgres-best-practices
```

### Full Stack Review
```bash
# Complete pre-commit review
/code-review-expert
/supabase-postgres-best-practices
/fixing-accessibility
```

---

## 🔒 Security Reminders

### ✅ DO
- Always vet new skills with `/skill-vetter`
- Review skill permissions before use
- Use official skills from reputable sources
- Document skill usage in commits

### ❌ DON'T
- Never install skills without vetting
- Never use skills requesting credentials
- Never trust unknown skill sources
- Never skip security checks

---

## 🎯 Skills Status

| Skill | Status | Priority | Risk Level |
|-------|--------|----------|------------|
| code-review-expert | ✅ Active | Critical | 🟢 LOW |
| vercel-react-best-practices | ✅ Active | Critical | 🟢 LOW |
| fixing-accessibility | ✅ Active | High | 🟢 LOW |
| supabase-postgres-best-practices | ✅ Available | High | 🟢 LOW |
| web-perf | ✅ Available | High | 🟡 MEDIUM |
| seo-audit | ✅ Available | Medium | 🟢 LOW |
| dogfood | ✅ Available | Medium | 🟡 MEDIUM |
| skill-vetter | ✅ Available | Critical | 🟢 LOW |

---

## 📚 Documentation Links

- **Full Configuration**: `SYNCHIRE_SKILLS_CONFIG.md`
- **Security Vetting**: `SKILLS_SECURITY_VETTING_REPORT.md`
- **Vercel Audit**: `frontend/VERCEL_BEST_PRACTICES_AUDIT.md`
- **CI/CD Workflow**: `.claude/scripts/ci-validation-gatekeeper.sh`

---

## 🆘 Troubleshooting

### Skill Not Found
```bash
# Check if skill is symlinked
ls -la ~/.claude/skills/<skill-name>
```

### MCP Server Not Connected
```bash
# Check MCP configuration
cat ~/.claude/mcp-servers.json
```

### Unexpected Behavior
1. Revert changes immediately
2. Re-run skill with verbose output
3. Check documentation
4. Report security concerns

---

## 💡 Pro Tips

1. **Skill Combinations**: Use `/code-review-expert` + `/fixing-accessibility` for comprehensive UI reviews

2. **Performance Workflow**: Run `/web-perf` → Fix issues → Run `/vercel-react-best-practices`

3. **Database Optimization**: Use `/supabase-postgres-best-practices` when writing complex queries

4. **SEO Best Practices**: Run `/seo-audit` before launching public pages

5. **Testing Workflow**: Use `/dogfood` for pre-release exploratory testing

---

**Last Updated**: 2026-05-26
**Next Review**: 2026-06-26
