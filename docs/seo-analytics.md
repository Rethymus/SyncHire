# SEO & Analytics Skills
**SyncHire Project - Last Updated: 2026-05-26**

---

## Overview

Search engine optimization and analytics skills for improving organic search performance, Core Web Vitals, and user experience.

---

## 🔍 seo-audit

### Purpose
Comprehensive SEO audit and optimization. Identifies SEO issues and provides actionable recommendations to improve organic search performance.

### Security Profile
- **Risk Level**: 🟢 LOW
- **Source**: Built-in (Anthropic)
- **Network Access**: None (relies on external tools like Google Search Console)
- **File Access**: Read-only (codebase analysis, optional context files)
- **Credential Access**: None
- **Last Vetted**: 2026-05-26 ✅

### When to Use
- SEO health checks
- Ranking issues
- Site speed optimization
- Core Web Vitals problems
- On-page SEO optimization
- Technical SEO issues
- "Why am I not ranking?"
- "My traffic dropped"

### Key Features

**Audit Framework**:
1. **Crawlability & Indexation** (Priority 1)
2. **Technical Foundations** (Priority 2)
3. **On-Page Optimization** (Priority 3)
4. **Content Quality** (Priority 4)
5. **Authority & Links** (Priority 5)

**Technical SEO**:
- Robots.txt analysis
- XML sitemap validation
- Site architecture review
- Canonicalization check
- Index status verification
- Core Web Vitals analysis
- Mobile-friendliness
- HTTPS/security
- URL structure

**On-Page SEO**:
- Title tag optimization
- Meta description review
- Heading structure
- Content optimization
- Image optimization
- Internal linking
- Keyword targeting

**Content Quality**:
- E-E-A-T signals (Experience, Expertise, Authoritativeness, Trustworthiness)
- Content depth assessment
- User engagement signals

### Usage
```bash
# Full SEO audit
/seo-audit

# Audit specific page
/seo-audit https://example.com/page

# Audit entire site
/seo-audit --full-site
```

### Core Web Vitals Thresholds

| Metric | Good | Needs Improvement | Poor |
|--------|------|-------------------|------|
| LCP | < 2.5s | < 4s | > 4s |
| INP | < 200ms | < 500ms | > 500ms |
| CLS | < 0.1 | < 0.25 | > 0.25 |
| FCP | < 1.8s | < 3s | > 3s |
| TTFB | < 800ms | < 1.8s | > 1.8s |

### Audit Checklist

**Crawlability**:
- [ ] Robots.txt doesn't block important pages
- [ ] XML sitemap exists and is accessible
- [ ] Sitemap submitted to Search Console
- [ ] Important pages within 3 clicks of homepage
- [ ] No orphan pages

**Indexation**:
- [ ] site:domain.com check shows expected pages
- [ ] No accidental noindex tags
- [ ] Canonicals point correctly
- [ ] No redirect chains/loops
- [ ] No duplicate content without canonicals

**Site Speed**:
- [ ] LCP < 2.5s
- [ ] INP < 200ms
- [ ] CLS < 0.1
- [ ] Images optimized
- [ ] JavaScript minimized
- [ ] Caching headers configured

**Mobile-Friendliness**:
- [ ] Responsive design
- [ ] Tap targets ≥ 44×44px
- [ ] Viewport configured
- [ ] No horizontal scroll
- [ ] Same content as desktop

**Security**:
- [ ] HTTPS across entire site
- [ ] Valid SSL certificate
- [ ] No mixed content
- [ ] HTTP → HTTPS redirects

### Output Format

```markdown
## SEO Audit Report

**Target**: https://example.com
**Date**: 2026-05-26

### Executive Summary
**Overall Health**: 7.2/10
**Top 3 Issues**:
1. Missing canonical tags (HIGH)
2. Large CLS on homepage (MEDIUM)
3. Thin category pages (LOW)

### Technical SEO Findings

#### Canonicalization (HIGH)
**Issue**: Missing canonical tags on blog posts
**Impact**: Duplicate content, ranking confusion
**Fix**: Add self-referencing canonical tags
**Priority**: 1

#### Core Web Vitals (MEDIUM)
**Issue**: CLS of 0.15 on homepage
**Impact**: Poor user experience, ranking penalty
**Fix**: Reserve space for dynamic content, set image dimensions
**Priority**: 2

### On-Page SEO Findings

#### Title Tags (MEDIUM)
**Issue**: Duplicate titles on category pages
**Impact**: Lower CTR, ranking confusion
**Fix**: Create unique titles for each category
**Priority**: 3

### Action Plan

1. **Critical Fixes** (blocking indexation/ranking)
   - Add canonical tags to all pages
   - Fix robots.txt blocking issues

2. **High-Impact Improvements**
   - Reduce CLS on homepage
   - Optimize images for Core Web Vitals

3. **Quick Wins** (easy, immediate benefit)
   - Update duplicate title tags
   - Add missing meta descriptions

4. **Long-term Recommendations**
   - Build out thin category pages
   - Improve internal linking structure
```

---

## 📊 Analytics & Performance Tracking

### Key Metrics to Monitor

**Search Performance**:
- Organic traffic trends
- Keyword rankings
- Click-through rates (CTR)
- Impression share
- Position changes

**User Engagement**:
- Bounce rate
- Time on page
- Pages per session
- Return visitor rate
- Conversion rate

**Technical Metrics**:
- Core Web Vitals
- Page load times
- Crawl errors
- Index coverage
- Mobile usability

### Setting Up Tracking

**Google Search Console**:
```bash
# 1. Verify site ownership
# 2. Submit XML sitemap
# 3. Monitor coverage reports
# 4. Track Core Web Vitals
# 5. Review manual actions
```

**Google Analytics**:
```bash
# 1. Create GA4 property
# 2. Add tracking code to site
# 3. Set up goals/events
# 4. Configure custom dimensions
# 5. Link to Search Console
```

---

## 🔧 SEO Best Practices

### Technical SEO
1. **HTTPS**: Use HTTPS across entire site
2. **Mobile-First**: Design for mobile first
3. **Speed**: Optimize for Core Web Vitals
4. **Structure**: Logical URL structure
5. **Sitemap**: Keep XML sitemap updated

### On-Page SEO
1. **Titles**: Unique, descriptive, 50-60 characters
2. **Descriptions**: Unique, compelling, 150-160 characters
3. **Headings**: One H1, logical hierarchy
4. **Content**: Sufficient depth, answers search intent
5. **Images**: Descriptive file names, alt text, optimized

### Content Strategy
1. **Quality**: Better than competitors
2. **Depth**: Comprehensive coverage
3. **Freshness**: Update old content
4. **Structure**: Use headings, bullets, lists
5. **Keywords**: Natural usage, avoid stuffing

---

## 🚨 Common SEO Issues

### Technical Issues
- **Blocked Resources**: Robots.txt blocking CSS/JS
- **Crawl Errors**: 4xx/5xx errors
- **Redirect Chains**: Multiple redirects
- **Duplicate Content**: Same content on multiple URLs
- **Slow Loading**: Poor Core Web Vitals

### On-Page Issues
- **Missing Titles**: No title tag
- **Duplicate Titles**: Same title on multiple pages
- **Missing Descriptions**: No meta description
- **Thin Content**: Insufficient content depth
- **Keyword Cannibalization**: Multiple pages competing for same keyword

### Content Issues
- **Low Quality**: Poorly written, unhelpful
- **Outdated**: Old information, not maintained
- **Unoptimized**: Not targeting search intent
- **Poor Structure**: Hard to read, not scannable

---

## 🔍 Tools & Resources

**Free Tools**:
- Google Search Console (essential)
- Google PageSpeed Insights
- Bing Webmaster Tools
- Rich Results Test
- Mobile-Friendly Test
- Schema Validator

**Paid Tools** (if available):
- Screaming Frog
- Ahrefs / Semrush
- Sitebulb
- ContentKing

**Documentation**:
- [AI Writing Detection](references/ai-writing-detection.md)
- [ai-seo](../ai-seo) - AI search optimization
- [programmatic-seo](../programmatic-seo) - SEO at scale
- [schema-markup](../schema-markup) - Structured data

---

## 📋 Pre-Deployment SEO Checklist

- [ ] Run `/seo-audit` on staging site
- [ ] Check Core Web Vitals are green
- [ ] Verify all pages have canonical tags
- [ ] Confirm robots.txt is correct
- [ ] Test mobile-friendliness
- [ ] Validate XML sitemap
- [ ] Check for duplicate content
- [ ] Verify meta descriptions are unique
- [ ] Test page load speed
- [ ] Confirm HTTPS is working

---

## 🎯 Integration with Development Workflow

### During Development
```bash
# 1. Create new page
# 2. Add SEO metadata
# 3. Run audit
/seo-audit https://localhost:3000/new-page

# 4. Fix issues
# 5. Deploy to staging
```

### Pre-Deployment
```bash
# 1. Full site audit
/seo-audit --full-site

# 2. Review Core Web Vitals
/web-perf https://staging.example.com

# 3. Fix critical issues
# 4. Deploy to production
```

### Post-Deployment
```bash
# 1. Monitor Search Console
# 2. Check for crawl errors
# 3. Track Core Web Vitals
# 4. Review ranking changes
```

---

## 🔗 Related Skills

- **web-perf**: Core Web Vitals optimization
- **vercel-react-best-practices**: Frontend performance
- **fixing-accessibility**: User experience optimization
- **code-review-expert**: Technical implementation review

---

## 📚 Resources

- **Google Search Central**: https://developers.google.com/search
- **PageSpeed Insights**: https://pagespeed.web.dev/
- **Core Web Vitals**: https://web.dev/articles/vitals
- **Schema.org**: https://schema.org/
- **Mobile-Friendly Test**: https://search.google.com/test/mobile-friendly

---

**Last Updated**: 2026-05-26
**Next Review**: 2026-06-26
