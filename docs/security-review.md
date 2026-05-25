# Security & Code Review Skills
**SyncHire Project - Last Updated: 2026-05-26**

---

## Overview

Security-focused skills for automated code review, vulnerability detection, and security vetting of AI agent skills.

---

## 🔒 code-review-expert

### Purpose
Expert code review with focus on SOLID principles, security vulnerabilities, and architecture analysis.

### Security Profile
- **Risk Level**: 🟢 LOW
- **Source**: Built-in (Anthropic)
- **Network Access**: None
- **File Access**: Read-only (git operations)
- **Credential Access**: None
- **Last Vetted**: 2026-05-26 ✅

### When to Use
- Before merging PRs
- During code reviews
- Security audits
- Architecture reviews

### Key Features
- **P0-P3 Severity Classification**: Critical to low priority issues
- **Security Checklist**: XSS, injection, SSRF, race conditions, auth gaps
- **SOLID Analysis**: Single responsibility, open/closed, Liskov, interface segregation, dependency inversion
- **Removal Detection**: Identifies unused/dead code
- **Code Quality**: Error handling, performance, boundary conditions

### Usage
```bash
/code-review-expert
```

### Workflow
1. **Preflight**: Analyzes git changes with `git status`, `git diff`, `git diff --stat`
2. **SOLID Review**: Checks for architectural violations
3. **Security Scan**: Evaluates security vulnerabilities
4. **Code Quality**: Assesses error handling and performance
5. **Report**: Provides structured findings with severity levels

### Output Format
```
## Code Review Summary
**Files reviewed**: X files, Y lines changed
**Overall assessment**: [APPROVE / REQUEST_CHANGES / COMMENT]

### P0 - Critical
[Security vulnerabilities, data loss risks]

### P1 - High
[Logic errors, SOLID violations, performance issues]

### P2 - Medium
[Code smells, maintainability concerns]

### P3 - Low
[Style, naming, minor suggestions]
```

### Integration with CI/CD
Add to pre-commit hooks:
```bash
#!/bin/bash
# Run code review before commit
/code-review-expert
# Check exit code before proceeding
if [ $? -ne 0 ]; then
    echo "❌ Code review found issues. Please review and fix."
    exit 1
fi
```

### Recent Findings
- **2026-05-26**: Reviewed skills documentation changes
  - Result: ✅ APPROVE
  - Issues: 0 critical, 0 high, 2 medium, 2 low

---

## 🛡️ skill-vetter

### Purpose
Security-first vetting protocol for AI agent skills. Never install a skill without vetting it first.

### Security Profile
- **Risk Level**: 🟢 LOW
- **Source**: Built-in (spclaudehome)
- **Network Access**: curl/wget for vetting only (user-specified URLs)
- **File Access**: Read-only (skill file review)
- **Credential Access**: None
- **Last Vetted**: 2026-05-26 ✅

### When to Use
- Before installing any skill from ClawdHub
- Before running skills from GitHub repos
- When evaluating skills shared by other agents
- Anytime you're asked to install unknown code

### Key Features
- **Red Flag Detection**:
  - curl/wget to unknown URLs
  - Sends data to external servers
  - Requests credentials/tokens/API keys
  - Reads ~/.ssh, ~/.aws, ~/.config without clear reason
  - Uses base64 decode, eval(), exec() with external input
  - Modifies system files outside workspace

- **Risk Classification**:
  - 🟢 LOW: Notes, weather, formatting
  - 🟡 MEDIUM: File ops, browser, APIs
  - 🔴 HIGH: Credentials, trading, system
  - ⛔ EXTREME: Security configs, root access

- **Trust Hierarchy**:
  1. Official skills from reputable sources
  2. High-star repos (1000+)
  3. Known authors
  4. New/unknown sources
  5. Skills requesting credentials

### Usage
```bash
# Vet a skill before installation
/skill-vetter vet <skill-path-or-url>

# Example: Vet a skill from GitHub
/skill-vetter vet https://github.com/username/skill-name

# Example: Vet a local skill
/skill-vetter vet ~/.agents/skills/custom-skill
```

### Vetting Report Format
```
SKILL VETTING REPORT
═══════════════════════════════════════
Skill: [name]
Source: [ClawdHub / GitHub / other]
Author: [username]
Version: [version]
───────────────────────────────────────
METRICS:
• Downloads/Stars: [count]
• Last Updated: [date]
• Files Reviewed: [count]
───────────────────────────────────────
RED FLAGS: [None / List them]
PERMISSIONS NEEDED:
• Files: [list or "None"]
• Network: [list or "None"]
• Commands: [list or "None"]
───────────────────────────────────────
RISK LEVEL: [🟢 LOW / 🟡 MEDIUM / 🔴 HIGH / ⛔ EXTREME]
VERDICT: [✅ SAFE TO INSTALL / ⚠️ INSTALL WITH CAUTION / ❌ DO NOT INSTALL]
NOTES: [Any observations]
═══════════════════════════════════════
```

### Integration with Development Workflow
Add to skill installation process:
```bash
# Before installing any new skill
echo "🔍 Vetting skill: $SKILL_NAME"
/skill-vetter vet $SKILL_PATH
if [ $? -eq 0 ]; then
    echo "✅ Skill vetted successfully"
    # Proceed with installation
else
    echo "❌ Skill vetting failed. Do not install."
    exit 1
fi
```

### Recent Vettings
- **2026-05-26**: All 8 project skills vetted
  - Result: ✅ ALL SAFE
  - Red flags: 0
  - Risk level: 6 LOW, 2 MEDIUM

---

## 🔐 Security Checklist

When using these skills, they check for:

### Input/Output Safety
- ✅ XSS vulnerabilities
- ✅ Injection attacks (SQL/NoSQL/command)
- ✅ SSRF (Server-Side Request Forgery)
- ✅ Path traversal attacks
- ✅ Prototype pollution

### AuthN/AuthZ
- ✅ Missing tenant/ownership checks
- ✅ New endpoints without auth guards
- ✅ Trusting client-provided data
- ✅ Broken access control (IDOR)

### Secrets & PII
- ✅ API keys in code/logs
- ✅ Secrets in git history
- ✅ Excessive PII logging
- ✅ Missing data masking

### Race Conditions
- ✅ Shared state access issues
- ✅ Check-then-act patterns
- ✅ Database concurrency
- ✅ Distributed system races

---

## Best Practices

### 1. Always Vet First
```bash
# NEVER install without vetting
/skill-vetter vet <skill>
# Review report
# Only install if SAFE
```

### 2. Review Findings
- Read the full vetting report
- Check red flags carefully
- Verify risk level
- Understand permissions needed

### 3. Document Usage
- Track which skills were used
- Document findings in commits
- Note any security concerns
- Report issues immediately

### 4. Keep Updated
- Check for skill updates monthly
- Re-vet skills periodically
- Update security knowledge
- Share findings with team

---

## Troubleshooting

### Skill Not Found
```bash
# Verify skill is installed
ls -la ~/.claude/skills/<skill-name>
```

### Unexpected Behavior
1. Stop using the skill immediately
2. Re-run `/skill-vetter vet <skill>`
3. Check for recent updates
4. Report security concerns

### Permission Issues
```bash
# Check skill permissions
cat ~/.claude/skills/<skill-name>/SKILL.md
# Look for "allowed-tools" section
```

---

## Related Skills

- **supabase-postgres-best-practices**: Database security
- **fixing-accessibility**: Accessibility compliance
- **web-perf**: Performance optimization

---

## Resources

- **Skill Documentation**: `~/.agents/skills/*/SKILL.md`
- **Security Protocol**: `~/.agents/skills/skill-vetter/SKILL.md`
- **Vetting Reports**: `SKILLS_SECURITY_VETTING_REPORT.md`

---

**Last Updated**: 2026-05-26
**Next Review**: 2026-06-26
**Maintained By**: Claude Code + Human Oversight
