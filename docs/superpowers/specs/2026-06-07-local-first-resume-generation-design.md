# SyncHire Local-First Resume Generation Design

## Purpose

SyncHire must become a local-first AI job application manager, not only a resume
upload and application tracking shell. The core product promise is:

> A user records their career information locally, SyncHire distills it into a
> reusable career card, matches it against each job description, generates a
> tailored resume PDF and application material pack, and lets the user manually
> review and submit applications while tracking every job locally.

This design targets the first production slice of that promise.

## Confirmed Product Decisions

- SQLite is the single source of truth for core user data.
- Browser `localStorage` may keep UI preferences, temporary drafts, and migration
  compatibility only. It must not be the long-term authority for resumes, job
  descriptions, applications, candidate profiles, or generated resume variants.
- AI runs in dual mode:
  - Default: local AI or deterministic local fallback.
  - Optional: user-provided cloud API keys. Cloud calls require explicit user
    confirmation and a preview of exactly what will be sent.
- Candidate profiles are built through both resume parsing and structured forms.
- Resume output supports Chinese and English. The app can infer language from
  the JD and the user can override it.
- First release supports safe application material packs and one-click copying.
  Browser extension or native webpage autofill is a later phase.
- Final application submission is always performed by the user.

## Existing Gaps

Current code has several useful pieces but lacks the main user journey:

- `api/main_lite.py` exists and uses local SQLite, but the frontend's lite flow
  still relies heavily on Zustand plus `localStorage`.
- `LocalProfile` exists but only stores basic preferences. It is not a structured
  candidate profile suitable for resume generation.
- Application records are mostly a simple relation between a resume and a JD.
  They do not track generated resume variants, PDF exports, material packs, or
  manual review state.
- The frontend `generate-pdf` route currently returns HTML as a download. It
  does not generate a real PDF.
- Existing "AI optimize" behavior optimizes an existing resume but does not
  generate a JD-specific resume variant from a candidate role card.
- The product lacks a Profile Vault, Career Card, Job Workspace, Resume Variant
  Studio, and Materials Pack review workflow.

## Target User Journey

The release must support an entry-level job seeker using SyncHire locally.

1. Start the local lite backend and frontend.
2. Create a candidate profile by uploading an existing resume or filling forms.
3. Review and complete personal information, education, projects, skills, links,
   target role, location, and privacy rules.
4. Generate or edit a career card.
5. Paste a Chinese JD, such as a Boss Zhipin job description.
6. Review the JD analysis and match plan.
7. Generate a Chinese tailored resume variant.
8. Edit, preview, and export a real PDF.
9. Generate a Chinese application material pack and copy fields manually.
10. Mark the materials reviewed and the application manually submitted.
11. Paste an English JD and repeat the flow in English.
12. View both applications in the tracker with linked JD, resume variant, PDF,
    materials, status, next action, and timeline.
13. Disconnect from the network and still view local data and exported artifacts.
14. Export a JSON backup and restore it.

## Architecture

```text
Next.js frontend
  -> lite API client
  -> local FastAPI lite backend
  -> SQLite database under ~/.synchire
  -> local files under ~/.synchire/files and ~/.synchire/exports
  -> optional local AI provider or user-approved cloud AI provider
```

The lite backend owns core data and generation side effects. The frontend owns
interaction, editing, preview, and explicit user approvals.

## Domain Model

### Candidate Profile

`candidate_profiles` stores the user's local identity and career direction.

Required fields:

```text
id
display_name
target_title
email
phone
location
links_json
summary
privacy_settings_json
created_at
updated_at
```

`privacy_settings_json` must support marking fields or item ids as private, so
cloud AI requests can omit them.

### Candidate Profile Items

`candidate_profile_items` stores reusable career facts.

```text
id
profile_id
item_type
title
organization
role
start_date
end_date
description
highlights_json
skills_json
metrics_json
visibility
sort_order
created_at
updated_at
```

`item_type` values include:

```text
education
work
project
skill
certificate
award
language
```

`visibility` values include:

```text
resume
form
internal
private
```

### Career Card

`candidate_role_cards` stores a distilled job-search identity.

```text
id
profile_id
name
target_roles_json
strengths_json
weaknesses_json
core_skills_json
proof_points_json
tone_preferences_json
generated_from_json
model_provider
model_name
created_at
updated_at
```

The career card is user-editable and must avoid unverifiable claims.

### AI Provider Settings

`ai_provider_settings` stores local AI and optional cloud AI configuration
metadata. API keys must be stored locally only and must not be exported unless
the user explicitly chooses an encrypted settings export in a future release.

```text
id
provider
mode
display_name
base_url
model_name
api_key_ref
enabled
send_confirmation_required
created_at
updated_at
```

`mode` values:

```text
local
cloud
fallback
```

`api_key_ref` points to the local runtime secret location. The database should
not store plaintext API keys if the platform shell provides a safer key store.

### Job Description

Keep the existing `job_descriptions` table and extend it:

```text
platform
source_url
raw_text
parsed_json
language
deadline
notes
```

`platform` values include:

```text
boss
linkedin
lagou
company_site
manual
other
```

### Resume Variant

`resume_variants` is the central new object. It stores a JD-specific generated
resume without overwriting the candidate's base facts or previous resumes.

```text
id
profile_id
role_card_id
jd_id
application_id
title
language
template_id
content_markdown
content_json
match_score
keyword_hits_json
gap_warnings_json
generation_rationale
ai_provider
ai_model
status
created_at
updated_at
```

`status` values include:

```text
draft
reviewed
exported
used
archived
```

### Resume Export

`resume_exports` records generated files.

```text
id
resume_variant_id
format
file_path
file_name
checksum
created_at
```

`format` initially supports `pdf` and can later support `html`.

### Application Materials

`application_materials` stores the safe manual submission pack.

```text
id
application_id
resume_variant_id
cover_letter
self_intro
form_fields_json
review_status
created_at
updated_at
```

`review_status` values:

```text
draft
reviewed
ready
submitted
```

An application record must exist before a material pack is saved. The normal
flow creates a `targeted` application as soon as the user decides to work on a
JD. Resume variants, exports, and materials are then linked to that application.

### Application Tracker

Extend `applications` from a simple resume-JD relation into a job-search record:

```text
platform
source_url
resume_variant_id
materials_id
submitted_manually_at
next_action
next_action_at
contact_name
contact_channel
timeline_json
```

Application status flow:

```text
targeted
materials_ready
submitted
screening
interview
offer
rejected
withdrawn
```

## AI Flow

### 1. Profile Structuring

The user uploads a resume or enters structured facts. The system extracts facts
into `candidate_profile_items`. The user reviews extracted content before it
becomes trusted profile data.

### 2. Career Card Distillation

The system creates a local career card from the trusted candidate profile. The
card includes:

- candidate positioning
- core skills
- proof points
- quantifiable evidence
- target role families
- writing tone
- weaknesses and mitigation strategy
- forbidden exaggerations
- private or disallowed fields

### 3. JD Match Plan

For each JD, the system generates a match plan:

- JD keywords
- hard requirements
- nice-to-have requirements
- matched candidate facts
- missing or weak areas
- recommended projects and experiences to highlight
- facts that must not be invented
- recommended language and template

The user can inspect this plan before generating the final resume variant.

### 4. Resume Variant Generation

The generator uses:

```text
career card
selected candidate profile facts
JD match plan
language
template
privacy rules
```

It outputs both Markdown and structured JSON. The result must not invent
education, employers, certifications, dates, metrics, or projects. Missing JD
requirements should become gap warnings or careful transferable-skill phrasing.

### 5. Application Lifecycle Timing

The product flow creates a lightweight application record before generation:

```text
JD saved
-> user clicks "Work on this job"
-> application created with status targeted
-> resume variant generated for that application
-> PDF export linked to the variant
-> material pack generated for that application
-> user reviews materials
-> application can move to materials_ready
-> user manually submits
-> application can move to submitted
```

### 6. Fallback Behavior

If no AI key is configured and no local AI is available, the product still
supports:

- deterministic keyword matching
- basic JD parsing
- template-based resume draft generation
- match score and gap warnings
- material pack generation from structured profile fields

The main workflow must not dead-end just because AI is unavailable.

## Privacy and Security

Default mode is local:

```text
SQLite -> local model or deterministic fallback -> local result
```

Cloud AI mode is opt-in:

```text
user configures provider key
user starts generation
app shows outbound payload preview
user confirms
backend sends only the required profile summary, selected facts, career card, and JD
result is saved locally
```

Rules:

- Never send fields marked `private`.
- Never send API keys in logs.
- Never log complete resumes, complete JDs, generated PDFs, or outbound prompts.
- Do not store cloud provider responses anywhere except the local generated
  objects that the user asked to create.
- Do not store platform login credentials.
- Do not click final application submission buttons.
- Do not bypass platform anti-automation controls.
- API key configuration must stay local to the user's device.

## Product Surfaces

### Profile Vault

Create and maintain the candidate profile.

Required capabilities:

- Upload resume to parse initial profile data.
- Add and edit basic information.
- Add and edit education, work, project, skill, certificate, award, and language
  items.
- Configure target role, location, salary preference, and language preference.
- Configure privacy rules.
- Save to SQLite through lite API.

### AI Settings

Configure generation providers without making cloud AI a requirement.

Required capabilities:

- Show local/fallback/cloud provider mode.
- Let users configure a local model endpoint.
- Let users configure a cloud provider API key.
- Explain that cloud mode sends selected profile/JD content only after explicit
  confirmation.
- Let users disable cloud providers at any time.
- Never display stored API keys after save.

### Career Card

Show and edit the distilled profile.

Required capabilities:

- Generate from profile.
- Edit strengths, target roles, proof points, tone, and forbidden claims.
- Show when the card was generated and which profile data it used.

### Job Workspace

Ingest and manage job descriptions.

Required capabilities:

- Paste JD manually.
- Enter platform, company, title, source URL, notes, and language override.
- Parse and save JD locally.
- Show keyword analysis, requirements, match score, gaps, and recommended
  resume strategy.
- Create or open a `targeted` application record for the JD before generating
  resume variants and materials.

### Resume Variant Studio

Generate, edit, preview, and export tailored resumes.

Required capabilities:

- Select candidate profile, career card, JD, language, and template.
- Show match plan before generation.
- Show outbound payload preview for cloud AI.
- Generate resume variant.
- Edit Markdown content.
- Preview formatted resume.
- Show keyword coverage and gap warnings.
- Mark variant reviewed.
- Export PDF.

### Materials Pack

Prepare safe manual application content.

Required capabilities:

- Generate copyable form fields from profile and JD.
- Generate self-introduction, cover letter, and platform opening message.
- Provide one-click copy for each field.
- Require user review before marking materials ready.
- Link materials to application and resume variant.

### Application Tracker

Manage job pipeline.

Required capabilities:

- Create application from JD, resume variant, and materials pack.
- Show platform, source URL, company, title, status, next action, and timeline.
- Enforce that `materials_ready` requires reviewed materials.
- Let user mark manual submission time.
- Show which PDF and resume variant were used.

## PDF Generation

PDF export must produce a real PDF.

Requirements:

- Render from local resume templates.
- Save files under `~/.synchire/exports`.
- Create a `resume_exports` row.
- Return a downloadable response with `application/pdf`.
- Generate a stable checksum.
- Do not return HTML when the user asks for PDF.

Recommended file naming:

```text
<company>_<job_title>_<candidate_name>_<language>_<date>.pdf
```

Examples:

```text
字节跳动_前端开发工程师_张三_zh-CN_2026-06-07.pdf
Acme_Frontend_Engineer_Alex_Chen_en-US_2026-06-07.pdf
```

## Data Migration

Existing `localStorage` users should not silently lose data.

The frontend should detect existing `synchire-storage` data and offer a one-time
migration into SQLite. The migration should map:

- stored resumes to `resumes` or profile seed data
- stored job descriptions to `job_descriptions`
- stored applications to `applications`

After a successful migration, the app should mark migration complete in a
non-core preference key.

## API Surface

The lite backend should expose endpoints for:

```text
GET/POST/PUT /api/profile
GET/POST/PUT/DELETE /api/profile/items
POST /api/profile/parse-resume
GET/POST/PUT/DELETE /api/ai-settings
GET/POST/PUT /api/career-cards
POST /api/career-cards/generate
POST /api/jds/parse
POST /api/jds/{id}/match-plan
GET/POST/PUT /api/resume-variants
POST /api/resume-variants/generate
POST /api/resume-variants/{id}/export/pdf
GET /api/resume-exports/{id}/download
GET/POST/PUT /api/application-materials
POST /api/application-materials/generate
POST /api/local-storage/migrate
```

Existing lite endpoints may remain for compatibility but should not be the only
path for the new workflow.

## Testing and Acceptance

### Backend Tests

- SQLite initializes all new tables.
- Candidate profile CRUD works.
- Profile item CRUD works.
- Resume parsing fallback creates editable profile items.
- AI provider settings CRUD works without exposing plaintext API keys in
  responses.
- Career card deterministic fallback works.
- JD parse fallback works.
- JD match plan fallback works.
- Resume variant generation fallback works.
- Privacy filter excludes private fields from cloud payloads.
- PDF export writes a real PDF and creates a `resume_exports` row.
- Application material pack generation works.
- Application status flow enforces reviewed materials before `materials_ready`.
- JSON export and import include new tables.

### Frontend Tests

- Profile Vault saves and reloads from lite API.
- Career Card can be generated, displayed, and edited.
- Job Workspace can save a pasted JD.
- Resume Variant Studio can generate, edit, preview, and export.
- Materials Pack copy and review controls work.
- Application Tracker shows status, linked variant, linked PDF, and timeline.
- Chinese and English generation flows both work.
- No-API-key fallback flow works.
- Existing localStorage migration prompt appears when old data exists.
- AI Settings can configure local mode, fallback mode, and optional cloud mode
  without requiring cloud mode for the main flow.

### End-to-End Tests

- Chinese JD full workflow from profile to submitted application.
- English JD full workflow from profile to PDF export.
- Offline or no-API-key fallback workflow.
- PDF download exists and starts with the `%PDF` signature.
- The primary workflow emits no console errors or warnings.

## Out of Scope for First Release

- Automatic final application submission.
- Browser extension autofill.
- Cloud sync.
- Multi-user collaboration.
- Platform login custody.
- Job board scraping that bypasses platform rules.
- Guaranteed ATS pass claims.
- Fabricating experience, certificates, employers, education, dates, or metrics.

## Implementation Readiness

This spec is ready for implementation planning when:

- The SQLite schema changes are accepted.
- The frontend agrees to use lite API as the core data authority.
- PDF generation dependency is selected for the local backend environment.
- The first implementation plan splits work into data layer, generation layer,
  PDF layer, frontend workflow, migration, and tests.
