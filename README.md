# SyncHire (知遇)

<div align="center">

**AI-Powered Job Application Platform**

让每一次求职，都是一场被看见的知遇之恩

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16.2.6-black.svg)](https://nextjs.org/)
[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://www.python.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791.svg)](https://www.postgresql.org/)

</div>

## 🌟 Overview

**SyncHire** is an innovative AI-powered job application platform designed to revolutionize how job seekers create optimized resumes, analyze job descriptions, and match their experience with requirements. The platform leverages cutting-edge technologies including Next.js 16, FastAPI, and Model Context Protocol (MCP) servers to provide intelligent job matching and resume optimization services.

## ✨ Key Features

### Core Capabilities
- **AI-Powered Resume Analysis**: Parse and analyze resumes from multiple formats (PDF, DOC, DOCX) with comprehensive skill extraction
- **Job Description Intelligence**: Deep analysis of job requirements with structured data extraction and matching scores
- **Smart Job Matching**: Calculate compatibility scores (0-100%) with detailed gap analysis and improvement recommendations
- **Interview Preparation**: Generate role-specific interview questions, HR screening prep, and STAR method behavioral questions
- **Real-time Analytics**: Track application status, skill development, and job search progress with detailed dashboards

### Technical Excellence
- **MCP Server Architecture**: Modular AI processing with 4 specialized servers for scalable, maintainable AI operations
- **Advanced Security**: JWT authentication, OAuth2 (Google, GitHub), Two-Factor Authentication (2FA), and GDPR compliance
- **Accessibility First**: WCAG 2.1 AA compliant with comprehensive ARIA support and keyboard navigation
- **Performance Optimized**: React Server Components, lazy loading, React Query caching, and efficient state management
- **Internationalization**: Multi-language support with next-intl for global accessibility
- **Modern UI/UX**: Built with Next.js 16, TypeScript 5, TailwindCSS 4, and shadcn/ui components

### Developer Experience
- **Comprehensive Testing**: Unit tests (Vitest), integration tests, and E2E tests (Playwright)
- **Type Safety**: Full TypeScript coverage with strict mode enabled
- **Code Quality**: ESLint 9 flat config, Prettier formatting, and pre-commit hooks
- **CI/CD Pipeline**: GitHub Actions with automated testing and deployment
- **Security-Validated Skills**: Development automation with security-vetted Claude Code skills

## 🏗️ Architecture

### Technology Stack

**Frontend:**
- **Framework**: Next.js 16.2.6 (App Router + Turbopack)
- **Language**: TypeScript 5 with strict mode
- **Styling**: TailwindCSS 4 with custom components
- **State Management**: Zustand 5 + React Query (TanStack Query)
- **Forms**: React Hook Form + Zod validation
- **Security**: DOMPurify (XSS protection), CSRF tokens
- **Testing**: Vitest, Playwright, Testing Library
- **Internationalization**: next-intl for multi-language support

**Backend:**
- **Framework**: FastAPI (Python 3.11+)
- **Database**: PostgreSQL 16 + PGVector (vector embeddings)
- **Cache/Queue**: Redis 7 for caching and rate limiting
- **Storage**: Minio (S3-compatible) for resume/JD files
- **Authentication**: JWT, OAuth2 (Google, GitHub), 2FA
- **Validation**: Pydantic models for request/response
- **Testing**: Pytest with async support

**AI Services:**
- **Primary Models**: OpenAI GPT-4, Anthropic Claude 3
- **MCP Architecture**: 4 specialized servers for modular AI processing
- **Vector Search**: PGVector for semantic matching
- **Prompt Engineering**: Few-shot examples with structured outputs

### Project Structure

```
SyncHire/
├── frontend/                 # Next.js 16 application (App Router)
│   ├── app/                 # App Router pages and layouts
│   ├── components/          # React components
│   ├── lib/                 # Utilities and configurations
│   └── public/              # Static assets
├── api/                     # FastAPI backend
│   ├── app/                 # FastAPI application setup
│   ├── routers/             # API endpoint handlers
│   ├── models/              # Database models
│   └── tests/               # Backend test suite
├── mcp-servers/            # Modular MCP services
│   ├── jd-parser/          # Parse job descriptions
│   ├── resume-analyzer/    # Analyze resumes
│   ├── job-matcher/        # Calculate compatibility
│   └── interview-prep/     # Generate interview prep
├── db/                      # Database schemas and migrations
├── docs/                    # Technical documentation
├── deploy/                  # Deployment configurations
├── k8s/                     # Kubernetes manifests
└── docker-compose.yml       # Local development stack
```

## 🚀 Quick Start

### Prerequisites

- **Docker** and Docker Compose (for infrastructure)
- **Node.js** 22+ (engines: >=22.0.0)
- **npm** 10+ (engines: >=10.0.0)
- **Python** 3.11+ (for backend development)
- **Git** for version control

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Rethymus/synchire.git
   cd SyncHire
   ```

2. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   # Required: AI API keys (OpenAI, Anthropic)
   # Required: Database credentials
   # Optional: OAuth credentials (Google, GitHub)
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Start the development environment**
   ```bash
   # Start infrastructure (PostgreSQL, Redis, Minio)
   npm run docker:up
   
   # Run database migrations
   npm run db:migrate
   
   # Start all services (frontend + API)
   npm run dev
   ```

5. **Access the application**
   - **Frontend**: http://localhost:3000
   - **API**: http://localhost:8000
   - **API Docs**: http://localhost:8000/docs
   - **Database**: localhost:5432

### Development Scripts

```bash
# Start services
npm run dev              # Start frontend + API
npm run dev:frontend     # Frontend only
npm run dev:api          # API only
npm run dev:mcp          # Start MCP servers

# Database operations
npm run db:migrate       # Run migrations
npm run db:seed          # Seed database
npm run db:reset         # Reset database

# Testing
npm run test             # Run all tests
npm run test:unit        # Unit tests
npm run test:e2e         # E2E tests

# Code quality
npm run lint             # ESLint check
npm run lint:fix         # Fix linting issues
npm run type-check       # TypeScript check
npm run format           # Prettier format

# Docker operations
npm run docker:up        # Start containers
npm run docker:down      # Stop containers
npm run docker:logs      # View logs
```

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
