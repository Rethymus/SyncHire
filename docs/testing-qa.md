# Testing & Quality Assurance Skills
**SyncHire Project - Last Updated: 2026-05-26**

---

## Overview

Exploratory testing and quality assurance skills for comprehensive UI testing, user experience validation, and issue reproduction.

---

## 🐕 dogfood

### Purpose
Systematic exploratory testing with reproducible evidence. Finds issues through actual usage rather than test scripts.

### Security Profile
- **Risk Level**: 🟡 MEDIUM (requires agent-browser)
- **Source**: Built-in (Anthropic)
- **Network Access**: agent-browser (user-specified URLs only)
- **File Access**: Write (screenshots, videos, reports to output directory)
- **Credential Access**: None
- **Prerequisites**: agent-browser tool
- **Last Vetted**: 2026-05-26 ✅

### When to Use
- Pre-release testing
- UX exploration
- Finding edge cases
- Reproducing user-reported issues
- Validating fixes
- Testing complex workflows

### Key Features

**Issue Taxonomy**:
- **Functional**: Broken features, incorrect behavior
- **UX**: Confusing interfaces, poor workflows
- **Performance**: Slow loading, laggy interactions
- **Visual**: Misalignment, clipped text, broken layouts
- **Accessibility**: Missing ARIA, keyboard issues
- **Console**: JavaScript errors, failed requests

**Evidence Collection**:
- **Interactive Issues**: Full repro with video + step-by-step screenshots
- **Static Issues**: Single annotated screenshot
- **Console Errors**: Automatic error capture
- **Network Logs**: Failed requests analysis

### Usage
```bash
# Basic exploratory testing
/dogfood https://localhost:3000

# With specific focus
/dogfood https://localhost:3000 --focus "checkout flow"

# With session name
/dogfood https://staging.example.com --session "smoke-test"
```

### Workflow

**1. Initialize**:
```bash
# Set up session and output directories
mkdir -p dogfood-output/screenshots dogfood-output/videos

# Start named session
agent-browser --session synchire-test open https://localhost:3000
agent-browser --session synchire-test wait --load networkidle
```

**2. Explore**:
```bash
# Take initial snapshot
agent-browser --session synchire-test snapshot -i

# Navigate and test
agent-browser --session synchire-test click @e1
agent-browser --session synchire-test fill @e2 "test@example.com"
agent-browser --session synchire-test screenshot dogfood-output/screenshots/step1.png
```

**3. Document Issues**:
```bash
# For interactive issues:
agent-browser --session synchire-test record start dogfood-output/videos/issue-001.webm
# ... reproduce issue ...
agent-browser --session synchire-test screenshot dogfood-output/screenshots/issue-001-result.png
agent-browser --session synchire-test record stop

# For static issues:
agent-browser --session synchire-test screenshot --annotate dogfood-output/screenshots/issue-002.png
```

**4. Wrap Up**:
```bash
# Close session
agent-browser --session synchire-test close

# Generate report
# Report is generated locally in dogfood-output/report.md.
# dogfood-output/ is ignored and should not be committed.
```

### Output Format

```markdown
## Exploratory Testing Report

**Target**: https://localhost:3000
**Session**: synchire-test
**Duration**: 30 minutes

### Issues Found

#### ISSUE-001: [P2] Button not responsive on mobile
**Severity**: Medium
**Type**: Functional

**Reproduction**:
1. Navigate to /dashboard
2. Click "Create Application" button
3. Expected: Dialog opens
4. Actual: No response, console error shown

**Evidence**:
- Video: dogfood-output/videos/issue-001.webm
- Screenshots: issue-001-step-1.png, issue-001-step-2.png, issue-001-result.png

**Console Error**:
```
Uncaught TypeError: Cannot read property 'open' of undefined
  at DashboardPage.tsx:42
```

---

### Summary
- **Total Issues**: 5
- **P0 (Critical)**: 0
- **P1 (High)**: 1
- **P2 (Medium)**: 3
- **P3 (Low)**: 1
```

### Issue Severity Levels

| Level | Name | Description | Action |
|-------|------|-------------|--------|
| P0 | Critical | Security, data loss, crash | Block release |
| P1 | High | Broken feature, bad UX | Fix before release |
| P2 | Medium | Edge case, minor bug | Fix or defer |
| P3 | Low | Cosmetic, suggestion | Optional |

### Best Practices

**Reproducibility is Everything**:
- Verify issues can be reproduced at least twice
- Provide step-by-step screenshots
- Include console errors and network logs
- Match evidence to issue type (video for interactive, screenshot for static)

**Pace for Humans**:
- Add `sleep 1` between actions during recording
- Pause 2 seconds before final result screenshot
- Make videos watchable at 1x speed

**Document Incrementally**:
- Write each issue as you find it
- Don't batch issues for later
- Prevents data loss if session is interrupted

---

## 🧪 Testing Strategy

### Unit Testing (Vitest)
```bash
# Run unit tests
npm run test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

### Integration Testing
```bash
# Test API endpoints
npm run test:integration

# Test database operations
npm run test:db
```

### E2E Testing (Playwright)
```bash
# Run E2E tests
npm run test:e2e

# Specific test
npx playwright test dashboard.spec.ts
```

### Exploratory Testing (dogfood)
```bash
# Pre-release exploration
/dogfood https://staging.example.com

# Post-deployment verification
/dogfood https://production.example.com
```

---

## Quality Assurance Workflow

### Pre-Commit
```bash
# 1. Code review
/code-review-expert

# 2. Accessibility check
/fixing-accessibility

# 3. Unit tests
npm run test
```

### Pre-Merge
```bash
# 1. Full test suite
npm run test

# 2. Integration tests
npm run test:integration

# 3. E2E smoke tests
npm run test:e2e --smoke
```

### Pre-Release
```bash
# 1. Exploratory testing
/dogfood https://staging.example.com

# 2. Performance audit
/web-perf https://staging.example.com

# 3. Security review
/code-review-expert

# 4. Accessibility audit
/fixing-accessibility
```

---

## Best Practices

### Testing Strategy
1. **Test Pyramid**: Many unit tests, fewer integration tests, few E2E tests
2. **Test Critical Paths**: Focus on user workflows
3. **Test Edge Cases**: Boundary conditions, error states
4. **Test Accessibility**: Keyboard navigation, screen readers
5. **Test Performance**: Load times, rendering speed

### Issue Reporting
1. **Be Specific**: Exact steps to reproduce
2. **Provide Evidence**: Screenshots, videos, console logs
3. **Classify Severity**: Use P0-P3 system
4. **Suggest Fixes**: When appropriate
5. **Follow Up**: Verify fixes are effective

---

## Troubleshooting

### agent-browser Not Available
```bash
# Check if agent-browser is installed
which agent-browser

# Install if needed
npm install -g agent-browser
```

### Session Won't Start
```bash
# Check for existing sessions
agent-browser --list

# Kill existing session if needed
agent-browser --session synchire-test close
```

### Screenshots Not Saving
```bash
# Verify output directory exists
mkdir -p dogfood-output/screenshots

# Check permissions
ls -la dogfood-output/
```

---

## Related Skills

- **code-review-expert**: Code quality and security
- **web-perf**: Performance optimization
- **fixing-accessibility**: Accessibility compliance
- **seo-audit**: SEO and user experience

---

## Resources

- **Testing Documentation**: `frontend/README.md`
- **Test Files**: `frontend/src/**/*.test.ts`
- **E2E Tests**: `frontend/e2e/`
- **Playwright Docs**: https://playwright.dev/

---

**Last Updated**: 2026-05-26
**Next Review**: 2026-06-26
