# SyncHire (知遇)

<p align="center">
  <strong>The AI-powered job application command center for people who refuse to send generic resumes.</strong>
  <br />
  Build sharper resumes, decode job descriptions, manage every opportunity, and walk into interviews with a plan.
</p>

<p align="center">
  <a href="./README.md"><strong>English</strong></a>
  ·
  <a href="./README.zh-CN.md">简体中文</a>
</p>

<p align="center">
  <a href="https://opensource.org/licenses/MIT"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-blue.svg" /></a>
  <img alt="Next.js 16.2.7" src="https://img.shields.io/badge/Next.js-16.2.7-black.svg" />
  <img alt="React 19" src="https://img.shields.io/badge/React-19.2.7-61DAFB.svg" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-blue.svg" />
  <img alt="FastAPI" src="https://img.shields.io/badge/FastAPI-Python%203.11+-009688.svg" />
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL%20%2B%20PGVector-16-336791.svg" />
</p>

<p align="center">
  <img src="docs/assets/readme/en-linux-dashboard.png" alt="SyncHire Lite English Linux dashboard preview" width="860" />
</p>

## The Product Pitch

Job hunting should not feel like throwing your career into a black box.

SyncHire is built for one clear promise: turn every application into a targeted, measurable, high-confidence campaign. It brings your resume, job descriptions, role card, tailored PDF export, match scoring, interview preparation, application tracking, browser-assisted form filling, and data portability into one focused workspace. No more scattered files, half-finished notes, lost links, or guessing whether your resume actually speaks the language of the role.

Use SyncHire in local-first Lite mode when you want a private, fast, no-backend workflow where personal data stays on your machine. Turn on the full stack when you want AI analysis, vector matching, API-backed persistence, OAuth, 2FA, object storage, and production-grade infrastructure.

## Why SyncHire Wins

| What job seekers usually fight                | What SyncHire gives them                              |
| --------------------------------------------- | ----------------------------------------------------- |
| One resume sent everywhere                    | Role-specific resume and job-description workflows    |
| Job links buried in tabs and notes            | A structured application pipeline                     |
| Vague "looks good" feedback                   | Match scores, gaps, and next actions                  |
| Interview prep starting too late              | Role-aware prep generated from the actual opportunity |
| Data trapped in a product                     | JSON/CSV export, import preview, and local backups    |
| Fragile demos that need every service running | Lite mode that works locally without backend noise    |
| Application forms that steal your time        | Agent-ready fill plans that stop before submission    |

## What You Can Do

- Upload and manage resumes with visible validation for file type and size.
- Save job descriptions manually or preserve job URLs when auto-import is unavailable.
- Create local applications from a resume and a job description in minutes.
- Maintain a local candidate role card that powers tailored resumes and browser fill suggestions.
- Generate local PDF resume exports without sending personal data to the cloud.
- Produce browser-agent instructions for Kimi WebBridge-style assisted form filling while excluding every submit control.
- Review generated field values, edit them as a real applicant, and approve learning only when you want the role card updated.
- Track application status, notes, search views, interviews, analytics, and saved searches.
- Export, import, and back up your data from a dedicated data management console.
- Connect a full backend for AI-powered resume analysis, job matching, interview prep, authentication, storage, and vector search.

## English Linux Dogfood Showcase

These screenshots come from the June 8, 2026 Linux standalone production validation run. SyncHire was tested in English as Chen Yu, a 2026 fresh graduate targeting graduate frontend roles. The workflow starts from a blank local profile, uploads a resume, enters a job description, creates an application, and then exercises the complete Lite flow: dashboard, resume assets, job descriptions, applications, role-specific A4 resume rendering, local PDF export, role-card assisted browser filling, match analysis, interview prep, interview scheduling, saved searches, notification settings and history, analytics, search, data management, AI provider/model settings, Skill and MCP switchboards, discovery, and repository management.

### Core Workflow

| Dashboard | Resumes |
| --------- | ------- |
| <img src="docs/assets/readme/en-linux-dashboard.png" alt="SyncHire Lite English dashboard after Linux validation" width="420" /> | <img src="docs/assets/readme/en-linux-resumes.png" alt="SyncHire Lite English resume management screen from Linux validation" width="420" /> |

| Job Descriptions | Applications |
| ---------------- | ------------ |
| <img src="docs/assets/readme/en-linux-job-descriptions.png" alt="SyncHire Lite English job descriptions screen from Linux validation" width="420" /> | <img src="docs/assets/readme/en-linux-applications.png" alt="SyncHire Lite English applications screen from Linux validation" width="420" /> |

### Resume And Browser Agent

Full generated resume artifact: [Chen Yu graduate frontend tailored resume](docs/assets/readme/en-fresh-graduate-tailored-resume.md)

| Application Detail | Tailored Resume PDF Flow |
| ------------------ | ------------------------ |
| <img src="docs/assets/readme/en-linux-application-detail.png" alt="SyncHire Lite English application detail with local resume optimization completed" width="420" /> | <img src="docs/assets/readme/en-linux-tailored-resume-pdf.png" alt="SyncHire Lite English role-specific resume editor and local PDF export flow" width="420" /> |

| Role Card & Browser Fill | Match Analysis |
| ------------------------ | -------------- |
| <img src="docs/assets/readme/en-linux-profile.png" alt="SyncHire Lite English role card and browser fill assistant with user-reviewed learning" width="420" /> | <img src="docs/assets/readme/en-linux-match-analysis.png" alt="SyncHire Lite English match analysis screen from Linux validation" width="420" /> |

### Insights And Search

| Interview Prep | Analytics |
| -------------- | --------- |
| <img src="docs/assets/readme/en-linux-interview-prep.png" alt="SyncHire Lite English interview preparation generated from resume, role card, and job description" width="420" /> | <img src="docs/assets/readme/en-linux-analytics.png" alt="SyncHire Lite English analytics dashboard from Linux validation" width="420" /> |

| Search | Data Management |
| ------ | --------------- |
| <img src="docs/assets/readme/en-linux-search.png" alt="SyncHire Lite English local search screen from Linux validation" width="420" /> | <img src="docs/assets/readme/en-linux-data-management.png" alt="SyncHire Lite English data management screen from Linux validation" width="420" /> |

### Interviews And Alerts

| Interview Pipeline | Interview Scheduling |
| ------------------ | -------------------- |
| <img src="docs/assets/readme/en-linux-interviews.png" alt="SyncHire Lite English interview pipeline with upcoming and completed interviews from Linux validation" width="420" /> | <img src="docs/assets/readme/en-linux-interview-schedule.png" alt="SyncHire Lite English interview scheduling form from Linux validation" width="420" /> |

| Saved Searches | Notification Settings |
| -------------- | --------------------- |
| <img src="docs/assets/readme/en-linux-saved-searches.png" alt="SyncHire Lite English saved search cards with filters and match notifications from Linux validation" width="420" /> | <img src="docs/assets/readme/en-linux-settings-notifications.png" alt="SyncHire Lite English local notification settings from Linux validation" width="420" /> |

| Notification History |
| -------------------- |
| <img src="docs/assets/readme/en-linux-settings-history.png" alt="SyncHire Lite English local notification history from Linux validation" width="860" /> |

### Focused Search Views

| Resume Search | Job Description Search |
| ------------- | ---------------------- |
| <img src="docs/assets/readme/en-linux-search-resumes.png" alt="SyncHire Lite English resume search results from Linux validation" width="420" /> | <img src="docs/assets/readme/en-linux-search-jds.png" alt="SyncHire Lite English job description search results from Linux validation" width="420" /> |

| Application Search | Settings Overview |
| ------------------ | ----------------- |
| <img src="docs/assets/readme/en-linux-search-applications.png" alt="SyncHire Lite English application search results from Linux validation" width="420" /> | <img src="docs/assets/readme/en-linux-settings.png" alt="SyncHire Lite English AI runtime settings overview from Linux validation" width="420" /> |

### AI Runtime Control

| AI Provider & Model Routing | Skill Switchboard |
| --------------------------- | ----------------- |
| <img src="docs/assets/readme/en-linux-settings-ai.png" alt="SyncHire Lite English AI provider API key and model routing settings from Linux validation" width="420" /> | <img src="docs/assets/readme/en-linux-settings-skills.png" alt="SyncHire Lite English Skill switchboard filtered for resume capabilities from Linux validation" width="420" /> |

| MCP Switchboard | Discovery Search |
| --------------- | ---------------- |
| <img src="docs/assets/readme/en-linux-settings-mcp.png" alt="SyncHire Lite English MCP switchboard filtered for browser bridge capabilities from Linux validation" width="420" /> | <img src="docs/assets/readme/en-linux-settings-discover.png" alt="SyncHire Lite English Skill and MCP discovery search from Linux validation" width="420" /> |

| Repository Management |
| --------------------- |
| <img src="docs/assets/readme/en-linux-settings-repositories.png" alt="SyncHire Lite English runtime repository management with a private metadata catalog from Linux validation" width="860" /> |

## Product Modes

| Mode            | Best for                                                     | What runs                                                           |
| --------------- | ------------------------------------------------------------ | ------------------------------------------------------------------- |
| Lite Mode       | Private local workflows, demos, offline-friendly exploration | Next.js frontend, browser local storage, local PDF export, no required API |
| Full Stack Mode | AI features, team deployments, API-backed persistence        | Next.js, FastAPI, PostgreSQL + PGVector, Redis, Minio, MCP services |

## Core Capabilities

### Resume Intelligence

Upload PDF, DOC, DOCX, or TXT resumes, extract structured content, tailor the resume to a target role, and export a local PDF artifact for manual submission. SyncHire treats the resume as a living asset, not a forgotten attachment.

### Local Role Card

Store your candidate identity as a local role card: contact details, target title, education, skills, project proof points, work authorization, availability, and compensation expectations. SyncHire uses it as the source of truth for personalized resumes and browser fill plans without cloud storage.

### Job Description Command Center

Capture job descriptions, company context, requirements, skills, and links in a structured format. Every role becomes something you can compare, analyze, and act on.

### Match and Gap Analysis

The full AI workflow is designed to score fit, identify missing skills, surface keyword gaps, and recommend stronger positioning. The product goal is simple: make every application more intentional than the last.

### Browser Fill Assistant

Generate a reviewed fill plan for application pages and hand the policy to Kimi WebBridge or another local browser agent. SyncHire fills known fields, excludes submit controls, stops for user review, and learns from user edits only after explicit approval.

### Interview Preparation

Generate role-specific technical, behavioral, HR, and STAR-method prep from the opportunity itself. SyncHire helps you prepare for the conversation you are actually walking into.

### Data Ownership

Export JSON or CSV, preview imports, resolve conflicts, and keep local backup metadata. Your job search is strategic data; SyncHire keeps it accessible.

## Architecture

```text
SyncHire/
├── frontend/        Next.js 16 app, Lite mode UX, E2E coverage
├── api/             FastAPI backend, auth, data, AI orchestration
├── mcp-servers/     Modular AI services for parsing, matching, and prep
├── db/              Database schema and migrations
├── deploy/          Deployment assets
├── k8s/             Kubernetes manifests
├── docs/            Engineering and product documentation
└── docker-compose.yml
```

### Technology Stack

| Layer    | Stack                                                                           |
| -------- | ------------------------------------------------------------------------------- |
| Frontend | Next.js 16.2.7, React 19.2.7, TypeScript, Tailwind CSS, Zustand, TanStack Query |
| Backend  | FastAPI, Python 3.11+, Pydantic, PyJWT                                          |
| Data     | PostgreSQL 16, PGVector, Redis, Minio                                           |
| AI       | OpenAI, Anthropic, modular MCP servers                                          |
| Quality  | Vitest, Playwright, Pytest, Ruff, Black, Bandit, pip-audit, ESLint              |

## Quick Start

### Prerequisites

- Node.js 22+ and npm 10+
- Python 3.11+
- Docker and Docker Compose
- Git

### Option 1: Run Lite Mode

Lite Mode is the fastest way to experience the product. It does not require the backend.

```bash
git clone https://github.com/Rethymus/SyncHire.git
cd SyncHire
npm install
npm run dev:frontend
```

Open:

```text
http://localhost:3000
```

### Option 2: Run the Full Stack

Use this when you want the API, database, object storage, AI services, and full platform behavior.

```bash
git clone https://github.com/Rethymus/SyncHire.git
cd SyncHire
cp .env.example .env
npm install
npm run docker:up
npm run db:migrate
npm run dev
```

Service URLs:

| Service       | URL                        |
| ------------- | -------------------------- |
| Frontend      | http://localhost:3000      |
| API           | http://localhost:8000      |
| API Docs      | http://localhost:8000/docs |
| PostgreSQL    | localhost:5432             |
| Minio Console | http://localhost:9001      |

AI features require provider keys in `.env`:

```bash
OPENAI_API_KEY=sk-your-openai-key
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key
```

## Developer Commands

```bash
# Development
npm run dev
npm run dev:frontend
npm run dev:api
npm run dev:mcp

# Infrastructure
npm run docker:up
npm run docker:down
npm run docker:logs
npm run db:migrate

# Frontend quality
npm run type-check --workspace=frontend
npm run lint:nocache --workspace=frontend -- --max-warnings=0
npm test --workspace=frontend
npm run test:integration --workspace=frontend
npm run test:e2e --workspace=frontend
npm run build --workspace=frontend

# Backend quality
cd api
pytest -q -W error --tb=short
ruff check .
black --check .
bandit -q -r app main.py
pip check
pip-audit
```

## Quality Bar

The current QA baseline is intentionally strict because a job-search tool cannot feel fragile.

| Gate                       | Current baseline                                                                   |
| -------------------------- | ---------------------------------------------------------------------------------- |
| Backend tests              | 344 passing with warnings treated as errors                                        |
| Frontend unit tests        | 320 passing                                                                        |
| Frontend integration tests | 18 passing                                                                         |
| Playwright E2E             | 13 passing                                                                         |
| Route dogfood sweep        | 13 key routes across desktop and mobile, HTTP 200, zero console errors or warnings |
| Security checks            | Bandit, pip-audit, pip check passing                                               |
| Production build           | Passing                                                                            |

Current user-facing workflow evidence lives in the language-specific README screenshot matrix and the Playwright README screenshot regression:
`cd frontend && npx playwright test e2e/readme-screenshots.spec.ts --workers=1`.

## Roadmap

- Deeper AI resume rewrites with explainable changes.
- Better job-source importing and enrichment.
- Stronger interview simulation loops.
- Collaboration workflows for mentors, recruiters, and career coaches.
- Deployment-ready observability, alerts, and analytics dashboards.

## Contributing

We welcome focused contributions that make the job-search workflow sharper, faster, more reliable, or more humane.

1. Fork the repository.
2. Create a feature branch.
3. Keep changes scoped and tested.
4. Run the relevant quality gates.
5. Open a pull request with a clear product impact summary.

Commit messages should follow conventional commits:

```text
feat: add role-specific interview prep flow
fix: preserve job URL during import fallback
docs: refresh bilingual README
```

## License

SyncHire is released under the [MIT License](https://opensource.org/licenses/MIT).
