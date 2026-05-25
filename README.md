# SyncHire (知遇)

<div align="center">

**AI-Powered Job Application Platform**

让每一次求职，都是一场被看见的知遇之恩

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org/)

</div>

## 🌟 Overview

**SyncHire** is an innovative AI-powered job application platform designed to help job seekers create optimized resumes and analyze job descriptions with AI assistance. The platform leverages modern technologies including Next.js 14, FastAPI, and Model Context Protocol (MCP) servers to provide intelligent job matching and resume optimization services.

## ✨ Key Features

- **AI-Powered Resume Optimization**: Automatically optimize resume content for specific job positions
- **Job Description Analysis**: Deep analysis of job requirements with matching score calculation
- **Real-time Skill Matching**: Visual representation of skill gaps and requirements
- **Secure Authentication**: JWT-based authentication with OAuth2 (Google, GitHub)
- **Modern UI/UX**: Built with Next.js 14, TypeScript, and TailwindCSS
- **Accessibility First**: WCAG 2.1 compliant with comprehensive ARIA support
- **Performance Optimized**: React Server Components, lazy loading, and efficient state management

## 🏗️ Architecture

### Technology Stack

**Frontend:**
- Next.js 14 (App Router)
- TypeScript 5
- TailwindCSS 4
- Zustand (state management)
- React Hook Form + Zod (validation)
- DOMPurify (XSS protection)

**Backend:**
- FastAPI (Python 3.11+)
- PostgreSQL 16 + PGVector
- Redis 7 (cache/queue)
- Minio (S3-compatible storage)

**AI Services:**
- OpenAI GPT-4
- Anthropic Claude 3
- MCP Servers for modular AI processing

### Project Structure

```
SyncHire/
├── frontend/          # Next.js 14 application
├── api/              # FastAPI backend
├── mcp-servers/     # Modular MCP services
├── db/               # Database schemas and migrations
├── docs/             # Technical documentation
└── docker-compose.yml
```

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 18+
- Python 3.11+
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Rethymus/synchire.git
   cd synchire
   ```

2. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start the development environment**
   ```bash
   docker-compose up -d
   npm run db:migrate
   npm run dev
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

## 📸 Screenshots

<div align="center">
  <img src="docs/images/dashboard-preview.png" alt="Dashboard Preview" width="800">
  <p align="center">Dashboard Overview</p>
</div>

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. **Run pre-commit skills**:
   ```bash
   /code-review-expert          # Security & architecture review
   /fixing-accessibility        # WCAG 2.1 AA compliance check
   /supabase-postgres-best-practices  # Database optimization
   ```
4. Commit your changes (`git commit -m 'feat: Add amazing feature'`)
5. **Run CI/CD validation**:
   ```bash
   npm run type-check          # TypeScript compilation
   npm run lint                # ESLint check
   npm run build               # Production build
   npm run test                # Test suite
   ```
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Skills & Tools

This project uses **security-validated Claude Code skills** for development automation:

| Skill | Purpose | Usage |
|-------|---------|-------|
| `code-review-expert` | Security & SOLID review | Pre-commit |
| `vercel-react-best-practices` | React/Next.js optimization | Active ✅ |
| `fixing-accessibility` | WCAG 2.1 AA compliance | UI development |
| `supabase-postgres-best-practices` | PostgreSQL optimization | Backend development |
| `web-perf` | Performance audit | Pre-deployment |
| `seo-audit` | SEO health check | Public pages |
| `skill-vetter` | Security vetting | New skill installation |

**Documentation**:
- [Skills Index](SKILLS_INDEX.md) - Central navigation hub
- [Skills Search Guide](SKILLS_SEARCH_GUIDE.md) - Find skills by tag/use case
- [Skills Quick Reference](SKILLS_QUICK_REFERENCE.md) - Daily command reference
- [Version Tracking](docs/VERSION_TRACKING.md) - Skill versions and updates

**Modular Documentation**:
- [Security & Code Review](docs/security-review.md) - code-review-expert, skill-vetter
- [Database & Performance](docs/database-optimization.md) - PostgreSQL, web-perf
- [Frontend & Accessibility](docs/frontend-performance.md) - React, accessibility
- [Testing & QA](docs/testing-qa.md) - Exploratory testing with dogfood
- [SEO & Analytics](docs/seo-analytics.md) - SEO optimization

**All skills have been security-vetted** using the `skill-vetter` protocol.

### Commit Message Guidelines

- Use conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, etc.
- All commit messages **MUST be in English**
- Be descriptive and concise
- Reference issues: `Fixes #123`, `Relates to #456`

**Examples:**
```
feat: implement user authentication with OAuth2
fix: resolve memory leak in performance monitoring
docs: update API documentation with new endpoints
refactor: optimize resume preview component rendering
```

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors

- **Rethymus** - Initial work

## 🙏 Acknowledgments

- Next.js team for the amazing framework
- OpenAI and Anthropic for AI capabilities
- All contributors and supporters

## 📞 Contact

For questions, suggestions, or issues:
- Email: [928136377@qq.com](mailto:928136377@qq.com)
- GitHub Issues: [Create an issue](https://github.com/Rethymus/synchire/issues)

---

<div align="center">
  <sub>Built with ❤️ by the SyncHire team</sub>
</div>
