# SyncHire Local-First Resume Generation Implementation Plan

## Source Spec

- `docs/superpowers/specs/2026-06-07-local-first-resume-generation-design.md`
- Spec confirmation: user approved on 2026-06-07.

## Planning Goal

Deliver the first production slice of SyncHire as a SQLite-first local job
application manager:

```text
candidate profile
-> career card
-> JD workspace
-> targeted application
-> tailored resume variant
-> real PDF export
-> application materials pack
-> manual submission tracking
```

## Execution Principles

- SQLite is the source of truth for all core data.
- Existing `localStorage` data is migration input, not authoritative state.
- The main workflow must work with no cloud AI key.
- Cloud AI mode is opt-in and requires outbound payload preview.
- Generated resume variants never overwrite candidate facts.
- PDF export must produce real PDF bytes.
- The user always performs final application submission manually.
- Each work unit must include tests before being considered complete.

## Phase Shape

This is a large feature. Implement it as six work units with explicit quality
gates. Do not merge frontend workflow changes before the backend has a tested
SQLite contract for the data it consumes.

## Work Unit 1: SQLite Domain and Lite API Foundation

### Objective

Add the local-first data model and API contract needed by the core product flow.

### File Scope

- `api/app/models/`
- `api/app/schemas/schemas_lite.py`
- `api/app/api/`
- `api/app/core/database_lite.py`
- `api/main_lite.py`
- `api/tests/`

### Tasks

1. Add SQLAlchemy lite models:
   - `candidate_profile_lite.py`
   - `candidate_profile_item_lite.py`
   - `candidate_role_card_lite.py`
   - `ai_provider_settings_lite.py`
   - `resume_variant_lite.py`
   - `resume_export_lite.py`
   - `application_material_lite.py`
2. Extend existing lite models:
   - `jd_lite.py` with platform, source URL, raw text, parsed data, language,
     deadline, notes.
   - `application_lite.py` with platform, source URL, variant/material links,
     manual submission timestamp, next action, contact, timeline, and expanded
     status values.
3. Register all new models in `init_db()`.
4. Add Pydantic lite schemas for new entities and status enums.
5. Add lite API routers:
   - `/api/profile`
   - `/api/profile/items`
   - `/api/ai-settings`
   - `/api/career-cards`
   - `/api/resume-variants`
   - `/api/resume-exports`
   - `/api/application-materials`
6. Wire routers into `api/main_lite.py`.
7. Add compatibility behavior so old resume/JD/application endpoints still work
   during migration.

### Acceptance Criteria

- SQLite creates all new tables on startup.
- CRUD works for profiles, profile items, AI settings, career cards, variants,
  exports, and materials.
- API settings responses never return plaintext API keys.
- Application status supports `targeted`, `materials_ready`, and `submitted`.
- `materials_ready` cannot be set unless linked materials are reviewed or ready.

### Verification

Run:

```bash
cd api && pytest tests/test_lite_local_first_domain.py -q
cd api && black --check app tests
cd api && ruff check app tests
```

## Work Unit 2: Local Generation Services and Privacy Filter

### Objective

Implement deterministic local fallback generation and a privacy-safe provider
boundary for optional cloud AI.

### File Scope

- `api/app/services/`
- `api/app/api/`
- `api/tests/`

### Tasks

1. Add `candidate_profile_service.py` for:
   - resume text to profile item fallback parsing
   - profile summary assembly
2. Add `career_card_service.py` for:
   - deterministic career card generation
   - optional provider call boundary
3. Add `job_match_plan_service.py` for:
   - language detection
   - JD keyword extraction
   - hard/nice-to-have requirement extraction
   - matched facts and gap warnings
4. Add `resume_variant_service.py` for:
   - fallback Chinese/English resume generation
   - Markdown and structured JSON output
   - keyword hit and gap warning persistence
5. Add `application_material_service.py` for:
   - form fields
   - self-introduction
   - cover letter or platform opening message
6. Add `ai_privacy_filter.py` for:
   - removing private profile fields/items
   - producing outbound payload preview
   - preventing sensitive logs
7. Add API actions:
   - `POST /api/profile/parse-resume`
   - `POST /api/career-cards/generate`
   - `POST /api/jds/{id}/match-plan`
   - `POST /api/resume-variants/generate`
   - `POST /api/application-materials/generate`

### Acceptance Criteria

- A user can generate a career card without any API key.
- A user can generate a match plan without any API key.
- Chinese and English resume variants can be generated without any API key.
- The privacy filter excludes fields/items marked `private`.
- Cloud payload preview is available before any cloud call.
- Generated content includes warnings for missing JD requirements instead of
  fabricating facts.

### Verification

Run:

```bash
cd api && pytest tests/test_lite_generation_services.py -q
cd api && pytest tests/test_lite_privacy_filter.py -q
cd api && black --check app tests
cd api && ruff check app tests
```

## Work Unit 3: Real PDF Export

### Objective

Replace HTML-only export behavior with real local PDF generation tied to resume
variants and export records.

### File Scope

- `api/app/services/`
- `api/app/api/`
- `frontend/src/app/api/generate-pdf/route.ts`
- `frontend/public/templates/`
- `api/tests/`

### Tasks

1. Select the PDF implementation for lite backend:
   - Prefer Playwright if existing environment supports Chromium reliably.
   - Use WeasyPrint only if dependency footprint and install behavior are
     acceptable for Windows/Linux packaging.
2. Add `pdf_export_service.py`.
3. Render local resume templates into printable HTML.
4. Generate PDF bytes and save them under `~/.synchire/exports`.
5. Store `resume_exports` with file path, name, and checksum.
6. Add:
   - `POST /api/resume-variants/{id}/export/pdf`
   - `GET /api/resume-exports/{id}/download`
7. Change or deprecate frontend `generate-pdf` route so it no longer claims PDF
   while returning HTML.

### Acceptance Criteria

- PDF download response has `Content-Type: application/pdf`.
- Exported file starts with `%PDF`.
- Export record links to the correct resume variant.
- Exported file name follows the company/job/candidate/language/date pattern
  when those fields are available.

### Verification

Run:

```bash
cd api && pytest tests/test_lite_pdf_export.py -q
cd api && black --check app tests
cd api && ruff check app tests
```

## Work Unit 4: Frontend API Client and State Migration

### Objective

Move core frontend workflow from `localStorage` authority to lite API authority
while preserving existing seeded/local data through explicit migration.

### File Scope

- `frontend/src/lib/api-client-lite.ts`
- `frontend/src/lib/store.ts`
- `frontend/src/app/data/page.tsx`
- `frontend/src/components/`
- `frontend/src/__tests__/`
- `frontend/e2e/`

### Tasks

1. Expand `api-client-lite.ts` for all new endpoints.
2. Add typed frontend domain models for profile, items, career cards, variants,
   materials, exports, and expanded applications.
3. Adjust Zustand store so core data loaded from the API is cached for UI state
   only. It must not silently persist authoritative core records.
4. Add a migration detector for existing `synchire-storage`.
5. Add migration UI in Data Management or startup flow.
6. Add `POST /api/local-storage/migrate` backend endpoint if not completed in
   Work Unit 1.
7. Preserve old e2e route regression seeding by updating tests to seed SQLite
   or use migration setup instead of treating `localStorage` as authoritative.

### Acceptance Criteria

- Existing localStorage data prompts a one-time migration.
- After migration, profile/JD/application data exists in SQLite.
- Refreshing the browser reloads core data from lite API.
- No core workflow depends on `synchire-storage` after migration.

### Verification

Run:

```bash
npm run lint --workspace=frontend
npm run type-check --workspace=frontend
npm run test --workspace=frontend
```

## Work Unit 5: Product Surfaces

### Objective

Build the user-facing screens for the confirmed core journey.

### File Scope

- `frontend/src/app/profile/`
- `frontend/src/app/career-card/`
- `frontend/src/app/jd-input/`
- `frontend/src/app/resume-studio/`
- `frontend/src/app/materials/`
- `frontend/src/app/applications/`
- `frontend/src/components/`
- `frontend/src/locales/`
- `frontend/e2e/`

### Tasks

1. Profile Vault:
   - profile form
   - profile item editor
   - privacy visibility controls
   - resume upload/parse entry
2. AI Settings:
   - local/fallback/cloud mode display
   - local endpoint configuration
   - cloud provider configuration without showing saved key
3. Career Card:
   - generate
   - edit
   - show source data and model metadata
4. Job Workspace:
   - paste JD
   - platform/source/language fields
   - match plan
   - create or open targeted application
5. Resume Variant Studio:
   - select profile/card/JD/template/language
   - outbound payload preview when cloud mode is selected
   - generate/edit/preview
   - show keyword hits and gap warnings
   - mark reviewed
   - export PDF
6. Materials Pack:
   - one-click copy fields
   - self-intro and cover letter/opening message
   - review checklist
7. Application Tracker:
   - status flow
   - linked variant, export, materials, timeline, next action
8. Add Chinese and English UI copy for new screens.

### Acceptance Criteria

- A Chinese JD flow can create profile, career card, JD, targeted application,
  resume variant, PDF export, materials pack, and submitted status.
- An English JD flow can generate an English resume variant and PDF.
- The user can complete the flow without a cloud AI key.
- No screen asks users to let the app submit applications automatically.

### Verification

Run:

```bash
npm run lint --workspace=frontend
npm run type-check --workspace=frontend
npm run test --workspace=frontend
npm run test:e2e --workspace=frontend
```

## Work Unit 6: Portability, Offline Checks, and End-to-End Dogfood

### Objective

Close the product loop with backup/restore support and realistic user-flow
verification.

### File Scope

- `api/app/api/portability.py`
- `frontend/e2e/`
- `docs/`
- `README.md`
- `README.zh-CN.md`

### Tasks

1. Extend JSON export/import to include:
   - candidate profiles
   - profile items
   - role cards
   - AI provider settings metadata without plaintext keys
   - resume variants
   - resume exports
   - application materials
   - expanded application fields
2. Add backup/restore tests for the new tables.
3. Add E2E tests:
   - Chinese JD full flow.
   - English JD full flow.
   - no API key fallback full flow.
   - PDF signature check.
   - no console errors or warnings on primary flow pages.
4. Add a manual dogfood script or report using an entry-level job seeker persona.
5. Update README copy to describe the new local-first resume generation feature.
6. Add screenshots only after the actual flow is implemented and verified.

### Acceptance Criteria

- Backup/restore preserves the generated artifacts metadata and application
  links.
- E2E proves both Chinese and English generation flows.
- PDF check proves the exported file is not HTML.
- README claims match implemented behavior.

### Verification

Run:

```bash
cd api && pytest -q
npm run lint --workspace=frontend
npm run type-check --workspace=frontend
npm run test --workspace=frontend
npm run test:e2e --workspace=frontend
npm run build --workspace=frontend
```

## Cross-Unit Review Gates

### Gate 1: Backend Contract Gate

Run after Work Units 1 and 2.

Pass conditions:

- All new tables initialize.
- Fallback generation works.
- Privacy filtering is tested.
- Core data can be created through lite API without frontend localStorage.

### Gate 2: Artifact Gate

Run after Work Unit 3.

Pass conditions:

- PDF export creates `%PDF` bytes.
- Export record is linked to a variant.
- HTML-only PDF route behavior is removed or renamed.

### Gate 3: Product Flow Gate

Run after Work Units 4 and 5.

Pass conditions:

- User can complete Chinese and English flows in browser.
- Main pages emit no console errors or warnings.
- The app works with no cloud AI key.

### Gate 4: Ship Gate

Run after Work Unit 6.

Pass conditions:

- Full backend, frontend, e2e, and build checks pass.
- Backup/restore includes new data.
- README and screenshots describe real implemented behavior.

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| PDF dependency is too heavy for local packaging | Windows/Linux packaging becomes brittle | Spike Playwright vs WeasyPrint before committing implementation |
| Frontend keeps writing core data to localStorage | SQLite source of truth is undermined | Gate Work Unit 4 on API reload after browser refresh |
| AI output fabricates candidate facts | Product trust failure | Generation service must only use selected facts and surface gap warnings |
| Cloud API key leaks through logs or exports | Security failure | Redaction tests and no plaintext key responses |
| Scope expands into browser extension | First release stalls | Keep autofill out of scope until core flow passes |

## Implementation Order

1. Work Unit 1: SQLite Domain and Lite API Foundation
2. Work Unit 2: Local Generation Services and Privacy Filter
3. Work Unit 3: Real PDF Export
4. Work Unit 4: Frontend API Client and State Migration
5. Work Unit 5: Product Surfaces
6. Work Unit 6: Portability, Offline Checks, and End-to-End Dogfood

## Ready-To-Implement Checklist

- [ ] Confirm PDF engine choice after a short dependency spike.
- [ ] Create backend tests before wiring frontend pages.
- [ ] Keep old screenshots untracked until the implemented flow is re-captured.
- [ ] Do not push README claims until dogfood screenshots are from the new flow.
- [ ] Run the full verification suite before syncing to remote.
