# Frontend & Accessibility Skills
**SyncHire Project - Last Updated: 2026-05-26**

---

## Overview

Frontend performance optimization and accessibility compliance skills for React, Next.js, and WCAG 2.1 AA standards.

---

## ⚡ vercel-react-best-practices

### Purpose
React and Next.js performance optimization guide from Vercel. Contains 64 rules across 8 categories for automated refactoring and code generation.

### Security Profile
- **Risk Level**: 🟢 LOW
- **Source**: Official Vercel skill
- **Network Access**: None
- **File Access**: Read-only (code analysis)
- **Credential Access**: None
- **Status**: 🟢 ACTIVE
- **Last Vetted**: 2026-05-26 ✅

### When to Use
- Writing new React components or Next.js pages
- Implementing data fetching (client or server-side)
- Reviewing code for performance issues
- Refactoring existing React/Next.js code
- Optimizing bundle size or load times

### Key Features

**8 Rule Categories by Priority**:

| Priority | Category | Impact | Rules |
|----------|----------|--------|-------|
| 1 | Eliminating Waterfalls | CRITICAL | async-defer-await, async-parallel |
| 2 | Bundle Size Optimization | CRITICAL | bundle-barrel-imports, bundle-dynamic-imports |
| 3 | Server-Side Performance | HIGH | server-cache-react, server-dedup-props |
| 4 | Client-Side Data Fetching | MEDIUM-HIGH | client-swr-dedup, client-event-listeners |
| 5 | Re-render Optimization | MEDIUM | rerender-memo, rerender-dependencies |
| 6 | Rendering Performance | MEDIUM | rendering-hoist-jsx, rendering-content-visibility |
| 7 | JavaScript Performance | LOW-MEDIUM | js-batch-dom-css, js-cache-function-results |
| 8 | Advanced Patterns | LOW | advanced-event-handler-refs, advanced-init-once |

### Usage
```bash
# Automatically active during development
/vercel-react-best-practices
```

### Critical Rules

**Eliminating Waterfalls**:
```typescript
// ❌ BAD - Sequential async operations
const data1 = await fetch1();
const data2 = await fetch2();

// ✅ GOOD - Parallel async operations
const [data1, data2] = await Promise.all([fetch1(), fetch2()]);
```

**Bundle Size Optimization**:
```typescript
// ❌ BAD - Barrel file import
import { Button } from '@/components'; // Imports entire barrel

// ✅ GOOD - Direct import
import { Button } from '@/components/button'; // Imports only component
```

**Re-render Optimization**:
```typescript
// ❌ BAD - Unnecessary re-renders
function ExpensiveComponent({ data }) {
  return <div>{JSON.stringify(data)}</div>;
}

// ✅ GOOD - Memoized component
const ExpensiveComponent = memo(function ({ data }) {
  return <div>{JSON.stringify(data)}</div>;
});
```

### Current Audit Results
- **Overall Score**: 7.3/10 - Good with Clear Improvement Path
- **Critical Issue**: Dashboard async waterfall (needs Promise.all)
- **Bundle Optimization**: 9/10 - Excellent
- **Server Components**: 3/10 - Needs improvement

### Integration
The skill is automatically applied during:
- Code reviews
- Component development
- Performance audits
- Bundle analysis

---

## ♿ fixing-accessibility

### Purpose
WCAG 2.1 AA accessibility compliance for web applications. Fixes accessibility issues in UI components.

### Security Profile
- **Risk Level**: 🟢 LOW
- **Source**: Built-in (Anthropic)
- **Network Access**: None
- **File Access**: Read-only (code analysis)
- **Credential Access**: None
- **Last Vetted**: 2026-05-26 ✅

### When to Use
- Adding or changing buttons, links, inputs, menus
- Building forms, validation, error states
- Implementing keyboard shortcuts or custom interactions
- Working on focus states, focus trapping, or modals
- Rendering icon-only controls
- Adding hover-only interactions

### Key Features

**9 Rule Categories by Priority**:

| Priority | Category | Impact |
|----------|----------|--------|
| 1 | Accessible Names | critical |
| 2 | Keyboard Access | critical |
| 3 | Focus and Dialogs | critical |
| 4 | Semantics | high |
| 5 | Forms and Errors | high |
| 6 | Announcements | medium-high |
| 7 | Contrast and States | medium |
| 8 | Media and Motion | low-medium |
| 9 | Tool Boundaries | critical |

### Usage
```bash
# Apply to entire project
/fixing-accessibility

# Apply to specific file
/fixing-accessibility src/components/dashboard.tsx
```

### Common Fixes

**Icon-Only Button**:
```html
<!-- ❌ BAD - No accessible name -->
<button><svg>...</svg></button>

<!-- ✅ GOOD - With aria-label -->
<button aria-label="Close">
  <svg aria-hidden="true">...</svg>
</button>
```

**Form Error Association**:
```html
<!-- ❌ BAD - Error not linked to input -->
<input id="email" />
<span>Invalid email</span>

<!-- ✅ GOOD - Error linked with aria-describedby -->
<input id="email" aria-describedby="email-err" aria-invalid="true" />
<span id="email-err">Invalid email</span>
```

**Keyboard Navigation**:
```html
<!-- ❌ BAD - Div as button without keyboard support -->
<div onclick="save()">Save</div>

<!-- ✅ GOOD - Native button element -->
<button onclick="save()">Save</button>
```

### WCAG 2.1 AA Requirements
- **Color Contrast**: 4.5:1 for normal text, 3:1 for large text
- **Keyboard Access**: All functionality available via keyboard
- **Focus Indicators**: Visible focus indicators for all interactive elements
- **Error Identification**: Clear error messages and suggestions
- **Labels**: All inputs have associated labels

### Current Status
- **Compliance Level**: WCAG 2.1 AA
- **Focus Management**: Implemented
- **ARIA Labels**: Added to all interactive elements
- **Color Contrast**: Fixed (gray-500 → gray-600)
- **Form Associations**: Complete with aria-describedby

---

## 🎨 Frontend Development Workflow

### Component Development
```bash
# 1. Create component
# 2. Apply React best practices
/vercel-react-best-practices

# 3. Check accessibility
/fixing-accessibility src/components/new-component.tsx

# 4. Test manually
# 5. Commit changes
```

### Performance Optimization
```bash
# 1. Identify performance issue
# 2. Apply Vercel best practices
/vercel-react-best-practices

# 3. Run performance audit
/web-perf https://localhost:3000

# 4. Verify improvements
```

---

## Best Practices

### React Performance
1. **Use React.memo**: Prevent unnecessary re-renders
2. **Implement useCallback/useMemo**: Optimize expensive operations
3. **Code Splitting**: Use dynamic imports for large components
4. **Server Components**: Use RSCs where possible
5. **Parallel Data Fetching**: Use Promise.all() for independent operations

### Accessibility
1. **Semantic HTML**: Use native elements over divs
2. **Keyboard Access**: Ensure all functionality works via keyboard
3. **ARIA Labels**: Add accessible names to icon-only controls
4. **Focus Management**: Implement proper focus order and trapping
5. **Error Handling**: Link errors to inputs with aria-describedby

---

## Troubleshooting

### Performance Issues
```bash
# Check for async waterfalls
grep -r "await.*await" src/

# Check for barrel imports
grep -r "from '@/components'" src/

# Check for missing memoization
grep -r "React.memo\|useCallback\|useMemo" src/
```

### Accessibility Issues
```bash
# Check for missing aria-labels
grep -r "<button\|<a" src/ | grep -v "aria-label\|aria-labelledby"

# Check for div as button
grep -r "onClick.*div" src/

# Check form accessibility
grep -r "<input" src/ | grep -v "aria-describedby\|<label"
```

---

## Related Skills

- **web-perf**: Performance auditing
- **code-review-expert**: Code review including accessibility
- **supabase-postgres-best-practices**: Database optimization

---

## Resources

- **Vercel React Guide**: `frontend/VERCEL_BEST_PRACTICES_AUDIT.md`
- **WCAG Guidelines**: https://www.w3.org/WAI/WCAG21/quickref/
- **React Accessibility**: https://react.dev/learn/accessibility
- **Next.js Accessibility**: https://nextjs.org/docs/app/building-your-application/optimizing/accessibility

---

**Last Updated**: 2026-05-26
**Next Review**: 2026-06-26
