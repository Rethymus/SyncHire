# Skills Automation Guide
**SyncHire Project - 2026-05-26**

---

## 🚀 Automated Skills System

The SyncHire project now includes an automated skills system that invokes appropriate security and quality skills at key development points.

---

## 🤖 How It Works

### Automatic Detection
The system automatically detects:
- **Development Phase**: pre-commit, pre-PR, pre-deploy
- **File Changes**: Frontend (.tsx/.ts), backend (.py/.sql), docs (.md)
- **Skill Availability**: Which skills are installed and ready
- **MCP Servers**: chrome-devtools, agent-browser availability

### Smart Skill Invocation
Based on detected changes, the system invokes:

| Change Type | Skills Invoked |
|-------------|----------------|
| **Frontend files** | code-review-expert, fixing-accessibility, vercel-react-best-practices |
| **Backend files** | code-review-expert, supabase-postgres-best-practices |
| **Documentation** | Documentation review |
| **Pre-PR** | All relevant skills + performance audit |
| **Pre-Deploy** | Full performance + SEO audit |

---

## 📋 Installation

### Quick Setup
```bash
# Run the integration setup script
./.claude/scripts/skills-integration-setup.sh
```

This will:
- ✅ Install pre-commit Git hook
- ✅ Configure skill automation
- ✅ Test the system
- ✅ Enable automatic skill invocation

### Manual Setup
```bash
# Copy the pre-commit hook
cp .git/hooks/pre-commit.skills .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

---

## 🔧 Usage

### Automatic (Recommended)
Skills are automatically invoked:
- **Before every commit** via Git hook
- **Based on file changes** detected
- **With appropriate skills** for the changes

### Manual (Testing)
```bash
# Test pre-commit skills
./.claude/scripts/skills-automation.sh pre-commit

# Test with force flag (see what would execute)
./.claude/scripts/skills-automation.sh pre-commit --force

# Test idle state
./.claude/scripts/skills-automation.sh idle
```

---

## 📊 Automation Workflow

### Pre-Commit Workflow
```
Git Commit Triggered
        ↓
Detect File Changes
        ↓
┌───────────────┐
│ Frontend?     │ → Yes → code-review-expert + fixing-accessibility
└───────────────┘
        ↓ No
┌───────────────┐
│ Backend?      │ → Yes → code-review-expert + postgres-best-practices
└───────────────┘
        ↓ No
┌───────────────┐
│ Docs?         │ → Yes → Documentation review
└───────────────┘
        ↓
All Skills Pass → Allow Commit
Skills Fail → Block Commit
```

### Pre-PR Workflow
```
Creating Pull Request
        ↓
Invoke All Skills
        ↓
┌───────────────────┐
│ MCP Available?    │ → Yes → web-perf + dogfood
└───────────────────┘
        ↓ No
Continue with Available Skills
        ↓
Generate Review Report
        ↓
Allow PR if All Pass
```

---

## 🎯 Skill Automation Matrix

| Trigger | Skills | Condition |
|---------|--------|-----------|
| **Commit (frontend)** | code-review-expert, fixing-accessibility, vercel-react-best-practices | .tsx/.ts files changed |
| **Commit (backend)** | code-review-expert, supabase-postgres-best-practices | .py/.sql files changed |
| **Commit (docs)** | Documentation review | .md files changed |
| **PR Creation** | All relevant skills | Manual trigger |
| **Deployment** | web-perf, seo-audit, dogfood | MCP required |

---

## 🔍 MCP Server Integration

### Required for Advanced Skills

**chrome-devtools** (for web-perf):
```json
// ~/.claude/mcp-servers.json
{
  "chrome-devtools": {
    "type": "local",
    "command": ["npx", "-y", "chrome-devtools-mcp@latest"]
  }
}
```

**agent-browser** (for dogfood):
```json
{
  "agent-browser": {
    "type": "local",
    "command": ["agent-browser"]
  }
}
```

### Check MCP Availability
```bash
# Test if MCP servers are configured
cat ~/.claude/mcp-servers.json | jq .

# Verify chrome-devtools
npx -y chrome-devtools-mcp@latest

# Verify agent-browser
agent-browser --help
```

---

## 🛡️ Safety Features

### Blocking Issues
The automation will **block commits** if:
- Security vulnerabilities found (P0)
- Critical accessibility issues found (P0)
- Database performance issues found (P1)
- Breaking changes detected (P0)

### Non-Blocking Warnings
The automation will **warn but allow**:
- Style issues (P3)
- Minor accessibility improvements (P2)
- Performance suggestions (P2)
- Code quality recommendations (P2)

---

## 📈 Metrics & Tracking

### Skill Usage Tracking
The system tracks:
- How often each skill is invoked
- Issues found by each skill
- Time saved by automation
- Developer adoption rate

### Reports Available
```bash
# View skill usage statistics
./.claude/scripts/skills-automation.sh --stats

# View recent skill invocations
./.claude/scripts/skills-automation.sh --history
```

---

## 🎨 Customization

### Add Custom Skills
Edit `.claude/scripts/skills-automation.sh`:
```bash
# Add your custom skill
invoke_skill "my-custom-skill"
```

### Modify Triggers
Customize when skills are invoked:
```bash
# Change phase detection
PHASE=${1:-"custom-default"}

# Add custom conditions
if [ "$CUSTOM_CONDITION" = "true" ]; then
    invoke_skill "custom-skill"
fi
```

---

## 🔄 Updates & Maintenance

### Monthly
- Check for skill updates
- Review automation logs
- Optimize skill selection
- Update MCP servers

### Quarterly
- Full security re-vetting
- Performance optimization
- Documentation updates
- Team feedback collection

---

## 🐛 Troubleshooting

### Skills Not Invoking
```bash
# Check if hook is installed
ls -la .git/hooks/pre-commit

# Check if script is executable
ls -la .claude/scripts/skills-automation.sh

# Test manually
./.claude/scripts/skills-automation.sh pre-commit
```

### MCP Servers Not Working
```bash
# Check MCP configuration
cat ~/.claude/mcp-servers.json

# Test MCP server
npx -y chrome-devtools-mcp@latest

# Reinstall MCP server
npm uninstall -g chrome-devtools-mcp
npm install -g chrome-devtools-mcp@latest
```

### Skill Issues
```bash
# Check skill availability
ls -la ~/.claude/skills/

# Re-vet problematic skill
/skill-vetter vet <skill-name>

# Report issues
# Document in VERSION_TRACKING.md
```

---

## 📚 Related Documentation

- **Skills Index**: [SKILLS_INDEX.md](SKILLS_INDEX.md) - Central navigation
- **Quick Reference**: [SKILLS_QUICK_REFERENCE.md](SKILLS_QUICK_REFERENCE.md) - Daily commands
- **Version Tracking**: [docs/VERSION_TRACKING.md](docs/VERSION_TRACKING.md) - Skill versions

---

## 🎯 Best Practices

### 1. Trust the Automation
- Let skills run automatically
- Review findings, don't skip
- Fix issues promptly
- Track improvements over time

### 2. Use MCP Servers
- Install chrome-devtools for web-perf
- Install agent-browser for dogfood
- Enables advanced automation
- Better coverage

### 3. Provide Feedback
- Report false positives
- Suggest improvements
- Share success stories
- Help optimize the system

---

**Last Updated**: 2026-05-26
**Next Review**: 2026-06-26
**Status**: ✅ Operational

---

<div align="center">

**The skills are now active and will automatically help you write better code! 🚀**

</div>
