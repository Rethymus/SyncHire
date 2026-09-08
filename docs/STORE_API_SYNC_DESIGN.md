# Store ↔ API Bidirectional Sync Design

> Status: design document (no code changed). Written 2026-09-08 as the
> follow-up to the round-6/9 "dual reality" findings in
> `docs/VISUAL_AUDIT_2026-09-04.md` (C1, S1).
>
> Scope: the Lite frontend store (`frontend/src/lib/store.ts`) and the Lite
> backend (`api/main_lite.py` → `api/app/api/*_lite.py`). Everything here must
> respect the product's local-first contract (`README_LITE.md`,
> `LITE_ARCHITECTURE.md`, `docs/DESIGN_ETHICS.md`, `/transparency` page).

---

## 1. Problem statement: the "dual reality"

SyncHire Lite runs two parallel data worlds that never meet:

1. **The store world.** The main creation journey — upload resume
   (`app/upload/page.tsx` → `addResume`), add JD (`app/jd-input/page.tsx` →
   `addJobDescription`), create application
   (`components/application-create-dialog.tsx` → `addApplication`) — operates
   entirely on the zustand store persisted under the `synchire-storage`
   localStorage key. Round-6 audit C1 confirmed: **zero API calls**; the
   create dialog's "mutation" is a mock (`sleep(150)` then a fabricated
   response in `createApplicationMutation`).

2. **The API world.** The Lite backend persists resumes/JDs/applications in
   SQLite (`~/.synchire/synchire.db`), and several features talk to it:
   match analysis persistence, interview prep fallback, application notes,
   status history, FTS search (authenticated mode), job-source sync, the
   company radar, and portability export/backup.

Consequences (all observed in the audit):

- **UI-created data is invisible to the backend.** An application created in
  the dialog cannot be found by `GET /api/applications/{id}`, so every
  API-only component silently fails for it (`components/application-notes.tsx`
  PUTs notes to a nonexistent ID; `components/application-status-manager.tsx`
  updates status on the backend the UI never reads back;
  `lib/use-workflow-automation.ts` reads store IDs but calls
  `applicationAPI.updateStatus` with them).
- **Backend data is invisible to the UI.** Round 9 (S1): 287 seeded backend
  rows produced "no results" in Lite search, because `hooks/use-search.ts`
  routes unauthenticated users to `buildLocalSearchResults` over the store.
  Background features that write to the backend — `jobSourceAPI.sync`
  creating JDs, `jobSourceAPI.logApplication` creating JD+application —
  produce rows the main list page (`app/applications/page.tsx`, store-only)
  will never show.
- **Hybrid pages fork their logic.** `app/applications/[id]/application-detail-client.tsx`
  branches on `isLocalApplication`: local entities get a stub match score
  ("connect the API service for AI analysis"), API entities get the real
  `applicationAPI.getMatchScore`. Two code paths, two user experiences, for
  the same conceptual object.

This is not a bug in any single page — it is the absence of a sync layer.
This document designs that layer.

### Design constraints (from the product's own documents)

| Constraint | Source |
|---|---|
| Data stays local by default; leaving the device is explicit | `README_LITE.md` privacy section; `/transparency` page |
| The store must work with **no backend at all** (static GitHub Pages build runs no API) | `README.md` (SyncHire Pages), `lib/deployment-mode.ts` |
| Measurement honesty: never silently invent or discard progress data | `docs/DESIGN_ETHICS.md` §4 |
| No silent overwrites of user-visible state; neutral copy | `docs/DESIGN_ETHICS.md` §3 |
| Canonical status vocabulary is the 12-value openapi enum, legacy values normalized on hydration | `lib/status-vocabulary.ts` |
| Incremental rollout: existing e2e suites (26 specs) and 319 unit tests must stay green at every phase | `README_LITE.md` CI section |

---

## 2. Current data flow map

### 2.1 Who reads/writes what (frontend)

| Feature | File | Reads | Writes | Notes |
|---|---|---|---|---|
| Resume upload | `frontend/src/app/upload/page.tsx` | — | store (`addResume`) | Parsing is simulated; no `resumeAPI.upload` |
| JD add (paste) | `frontend/src/app/jd-input/page.tsx` | store (`currentJD`) | store (`addJobDescription`) | Local parse only |
| JD import (URL) | `frontend/src/app/jd-input/page.tsx` | — | API `unifiedClient.jd.import` → backend job | Creates a **backend** JD the store never sees; result is polled into local view only |
| Create application | `frontend/src/components/application-create-dialog.tsx` | store (`resumes`, `jobDescriptions`) | store (`addApplication`) | Mock mutation (`sleep(150)`), `crypto.randomUUID()` IDs |
| Applications list | `frontend/src/app/applications/page.tsx` | store | — | Store-only |
| Application detail | `frontend/src/app/applications/[id]/application-detail-client.tsx` | store first, API fallback (`applicationAPI.getById` + `resumeAPI.getById` + `jdAPI.getById`) | local: `updateApplication`/`updateResume`; API: `applicationAPI.updateStatus`, `applicationAPI.update` | Forks on `isLocalApplication` |
| Match analysis | `frontend/src/app/applications/[id]/match/match-analysis-client.tsx` | store | — | Local deterministic scoring via `lib/match-ranking.ts` |
| Match score persist | detail page → `applicationAPI.getMatchScore` (`GET /applications/{id}/match`) | API | backend | Only works for API-resident entities |
| Interview prep | `frontend/src/app/interview-prep/page.tsx` | store first (`findLocalApplicationContext` + `buildLocalInterviewPrep`), API fallback (`applicationAPI.getInterviewPrep`) | — | Forks on local context existence |
| Notes | `frontend/src/components/application-notes.tsx` | — | API (`applicationAPI.update`) | **Broken for store entities** (PUT to unknown ID) |
| Status manager | `frontend/src/components/application-status-manager.tsx` | API (`getStatusHistory`) | API (`updateStatus`) | **Broken for store entities** |
| Workflow automation | `frontend/src/lib/use-workflow-automation.ts` | store (`applications`) | API (`applicationAPI.updateStatus`) | **Broken for store entities** |
| Progress page | `frontend/src/app/progress/page.tsx` | store via `storeApplicationToProgress` | — | Rewired in audit V2 |
| Dashboard / analytics | `frontend/src/app/dashboard/page.tsx`, `app/analytics/page.tsx` | store | — | Store-only |
| Search | `frontend/src/hooks/use-search.ts` | unauth: store (`buildLocalSearchResults`); auth: API (`unifiedClient.search.*`) | — | The clearest "dual reality" seam |
| Interviews | `frontend/src/lib/interviews-local.ts` + `app/interviews/*` | localStorage `synchire-interviews` | same | Deliberate local-first module (audit I1) |
| Quick schedule | `frontend/src/components/interview-quick-schedule.tsx` | store (`applications`), `readLocalInterviews` | `saveLocalInterview` | Fixed in audit I2 |
| Job feed / sources / radar | `frontend/src/app/job-feed/page.tsx`, `app/job-sources/page.tsx`, `app/company-board/page.tsx` | API (`jobSourceAPI`, `companyAPI`, `signalFeedAPI`) | backend | Backend-owned domain |
| Data export/import | `frontend/src/app/data/page.tsx` | store + `readLocalInterviews` | local JSON snapshot (v2) | Backend portability APIs also exist separately |
| Auth | `frontend/src/lib/auth.ts` | token storage | — | Optional; `isAuthenticated` gates search branch |

### 2.2 Backend surface relevant to sync (`api/main_lite.py` mounts)

| Router | File | Endpoints |
|---|---|---|
| resumes | `api/app/api/resumes_lite.py` | `POST/GET /api/resumes`, `GET/PUT/DELETE /api/resumes/{id}`, `POST /api/resumes/{id}/optimize`, `GET /api/resumes/{id}/file` |
| jds | `api/app/api/jds_lite.py` | `POST/GET /api/jds`, `GET/PUT/DELETE /api/jds/{id}`, `POST /api/jds/parse`, `POST /api/jds/import` |
| applications | `api/app/api/applications_lite.py` | `POST/GET /api/applications`, `GET/PUT/DELETE /api/applications/{id}`, `PATCH /api/applications/{id}/status`, `GET .../history`, `GET/POST .../match`, `GET .../interview-prep`, `POST /api/applications/batch-update` |
| portability | `api/app/api/portability.py` | `GET /api/portability/export/json`, `POST /api/portability/import`, `GET /api/portability/status`, backup endpoints |
| search | `api/app/api/search_lite.py` | FTS over backend SQLite |

Two properties of the backend are decisive for this design:

1. **`POST` endpoints mint their own IDs** (`jd_id = uuid4()` in
   `create_jd`; same for resumes/applications). The **only** write path that
   preserves caller-supplied IDs is `POST /api/portability/import`
   (`parse_uuid(resume_data["id"])` → `Resume(id=resume_id, ...)`), which also
   imports in FK-safe order: profiles → resumes → JDs → applications, with
   `conflict_resolution` ∈ {`skip`, `overwrite`, `rename`} in merge mode.
2. **`POST /api/applications` validates FKs** — it 404s if the referenced
   resume or JD does not already exist in SQLite. Any push strategy must
   therefore be dependency-ordered: **resumes → JDs → applications**.

### 2.3 What happens today when an entity exists in both

Nothing good, because identity is never shared:

- Store entity IDs (`crypto.randomUUID()` from the create dialog) and backend
  IDs are disjoint, so "the same" application is two unrelated rows. No
  merge, no conflict — just mutual invisibility.
- The detail page is the only place that tries both: store lookup by ID, then
  `applicationAPI.getById` fallback. Since IDs never overlap in practice, the
  fallback only ever fires for backend-seeded data.
- Timestamps exist on both sides (`updatedAt` on store entities, `updated_at`
  with `onupdate=utcnow` on every lite model), so entity-level last-write-
  wins *is computable* — but see §5.1 for a gap: `updateApplication` and
  `updateResume` in `store.ts` **do not bump `updatedAt`** (only
  `updateCandidateProfile` does, at `store.ts:603`).

### 2.4 Schema asymmetries (must be mapped, not ignored)

| Store (camelCase, `Date`) | Backend (snake_case, ISO strings) | Losses |
|---|---|---|
| `Resume { name, content, skills?, experience?, fileUrl? }` | `LiteResume { title, content, file_name? }` | `skills`/`experience` have no column — park in `parsed_json`-style extension or accept lossy round-trip (see §6 Phase 1) |
| `JobDescription { title, company, description, requirements[], skills[] }` | `LiteJd { title, company, description, parsed_json?, ... }` | `requirements`/`skills` → serialize into `parsed_json` under a `local` key; `POST /api/portability/import` currently drops them |
| `JobApplication { companyName, position, status, jobId, resumeId, matchScore?, appliedAt? }` | `LiteApplication { jd_id, resume_id, status, match_score?, applied_date?, ... }` | `companyName`/`position` are denormalized locally, derived from the JD join on the backend — regenerate on pull |
| Status: canonical 12-value (post `status-vocabulary.ts` fix) | Same 12-value ORM enum | Aligned since audit W1/C2; pulls still run through `canonicalizeStatus` as a dirty-value guard (audit F4) |

---

## 3. Sync strategy options

### Option A — Store is the single source of truth; backend is an optional cache

The UI keeps reading/writing only the store (today's behavior). The backend
is a write-through cache: store mutations are best-effort mirrored to the
API; backend data is never authoritative.

- **Pros:** zero change to every store-reading page; works with no backend
  (static Pages deployment unaffected); matches the privacy contract; no
  network on the hot path.
- **Cons:** *as stated, it cannot work* — the backend is not a passive cache.
  It has its own write paths (job-source sync inserts JDs every 12 h;
  `logApplication` creates JD+application; `POST /jds/import` creates JDs;
  `POST /applications/{id}/match` mutates scores). Pure A makes that data
  permanently invisible, which is exactly the dual reality we are fixing. A
  must be amended with a pull/merge step (→ Option A+ in §4).

### Option B — API is the single source of truth; store is an offline buffer

All writes go API-first (or through a store acting as a write-behind buffer
with mandatory flush). The backend list endpoints become the canonical read;
the store is a cache to be invalidated.

- **Pros:** one authority, so backend features (search, match persistence,
  notes, status history, portability backups) are consistent by construction;
  API-only components (`application-notes.tsx`,
  `application-status-manager.tsx`) work unchanged.
- **Cons:** violates the product contract — data would live in SQLite as the
  system of record and the primary journey would require a reachable backend
  (breaks the static Pages build and the "no backend" Lite promise);
  `logout()` currently clears persisted state, which under B would mean
  wiping the system of record; every store-reading page (20+ files, §2.1)
  needs rewiring from `Date`-typed camelCase entities to snake_case API
  payloads (or a full repository layer); offline becomes an error state
  instead of the default. Highest regression risk by far.

### Option C — Eventual consistency: CRDT or per-entity last-write-wins

Two variants:

- **C1 (CRDT):** model each entity as a CRDT; both sides merge without
  coordination. For this product it is overkill: SyncHire is a single-user
  local tool — there is no multi-peer authorship, only one browser store and
  one localhost SQLite. Resume content is a large markdown blob; CRDT text
  merging (Yjs/Automerge) adds a heavy dependency to a Lite build whose
  selling point is a small footprint. The only field with genuine lattice
  semantics is `status` (an ordered pipeline), and a two-line max() captures
  that without a CRDT framework.
- **C2 (per-entity LWW):** every entity carries a mutation timestamp; on
  sync, the newer version wins wholesale, per entity. Cheap, adequate for
  single-user reality, and — crucially — the timestamps already exist on both
  sides (modulo the `updateApplication` gap, §5.1).

**Assessment:** C2 is the right *mechanism*, but a mechanism is not an
architecture — it must be embedded in a direction. Option B's direction is
unacceptable for this product; Option A's direction is right but incomplete.
The recommendation is the combination below.

---

## 4. Recommended approach: Option A+ (local-first store with a synchronized backend mirror)

**The store stays the single source of truth for the UI. The backend becomes
a synchronized replica — pushed to and pulled from by a background sync
engine — reconciled with per-entity LWW (Option C2).**

```
                       UI (all pages, unchanged)
                              │  read/write
                              ▼
                    ┌───────────────────┐        persist (existing)
                    │  useAppStore      │◄──────────────────────────┐
                    │  (zustand)        │                           │
                    └────────┬──────────┘      platform-storage /
                             │ subscribe       localStorage
                             │ (mutation events)
                             ▼
   push (outbox)   ┌───────────────────┐   pull (reconcile)
┌─────────────────►│   SyncEngine      │◄─────────────────┐
│                  │ lib/sync/engine   │                  │
│  ordered:        └───────────────────┘  merge by ID,    │
│  resumes →       │  outbox    mappers   entity-level     │
│  jds → apps      │  LWW + tombstones    LWW (§5)         │
└──────────────────┼──────────────────────┼────────────────┘
                   ▼                      │
        POST /api/portability/import      │  GET /api/{resumes,jds,applications}
        (ID-preserving bulk upsert)       │  GET /api/portability/export/json
        + PUT/PATCH for targeted updates  │
                   │                      │
                   ▼                      ▼
            ┌─────────────────────────────────┐
            │ Lite backend (SQLite replica)   │
            │ …whose features (search, match, │
            │ job-source sync, portability)   │
            │ now see the same entities       │
            └─────────────────────────────────┘
```

### Why this fits *this* product

1. **It preserves the local-first contract.** The store remains the only
   thing the UI touches; the sync engine is entirely opportunistic — if the
   backend is down, absent (static Pages build), or unreachable, nothing
   user-visible changes. This is the same posture as the AI features: nice
   when available, never load-bearing.
2. **It is additive, not a rewrite.** §2.1 shows ~20 store-reading surfaces
   and 6 API-only components. A+ leaves the 20 untouched and repairs the 6 by
   pointing them at the store (Phase 4), with sync happening behind them.
   Option B would invert all 26.
3. **It makes the backend's unique features actually usable.** Once store
   entities are mirrored with stable IDs, `applicationAPI.getMatchScore`,
   `getStatusHistory`, FTS search in authenticated mode, job-feed scoring
   against "your resume", and portability backups all operate on the same
   entity set — the detail page's `isLocalApplication` fork can collapse.
4. **The ID problem already has a backend answer.** Regular POST endpoints
   mint their own UUIDs, but `POST /api/portability/import` preserves
   caller-supplied IDs and imports in FK-safe order. Using client-generated
   UUIDs (`crypto.randomUUID()`, already what the create dialog produces) as
   the universal primary key requires **zero backend schema changes** for the
   bulk path; only small backend additions for targeted updates (§6 Phase 2).
5. **Single-user reality bounds conflict complexity.** Both replicas live on
   the same machine, mutated by the same one user. Concurrent divergence is
   rare and narrow (e.g., status changed in the UI while the backend's
   `POST /match` updated `match_score`). Entity-level LWW plus the small set
   of field rules in §5 covers it; a CRDT would be complexity without a
   corresponding failure mode.

### Explicit non-goals

- No multi-device merge (the Lite backend is localhost; there is no account
  system in lite mode). If multi-device sync ever lands, it extends this
  design by giving the mirror a transport, not by changing the store's role.
- No sync of anything in §7 (interviews, profile, credentials, UI state…).
- No new always-on infrastructure: no service worker background sync is
  *required* (the engine runs on app start, on `online` events, on
  visibility change, and after each local mutation with a debounce).

---

## 5. Conflict resolution

### 5.1 Prerequisite fixes (before any merging can be trusted)

1. **Stamp `updatedAt` on every mutating store action.** Today
   `updateApplication` (`store.ts:523`), `updateResume` (`store.ts:432`),
   `batchUpdateApplications` (`store.ts:550`) spread `updates` without
   touching `updatedAt`; only `updateCandidateProfile` stamps it. LWW is
   meaningless with stale timestamps. Every action that changes a synced
   entity must set `updatedAt: new Date()` (the sync wrapper in Phase 1 does
   this centrally to avoid touching every call site — see below).
2. **Normalize clocks at comparison time.** Backend timestamps are naive UTC
   (`api/app/core/clock.py::utcnow`, per audit P3); store timestamps are
   client-local `Date`s serialized as ISO strings. The comparator must
   convert both to UTC epoch millis. Because both clocks are the same machine
   in lite mode, skew is small; still, guard with a monotonic
   `lastPulledAt` watermark so a slow client clock cannot make local edits
   look older than they are (never let pulled data win against an entity the
   outbox still holds locally-unpushed changes for — §5.4 rule 0).
3. **Tombstones for deletes.** `deleteApplication`/`deleteResume` (and JDs,
   via `setJobDescriptions` compaction) physically remove rows, so a pull
   would resurrect backend copies. Deletion must write a tombstone
   `{ id, entityType, deletedAt }` that survives until the delete has been
   pushed and confirmed.

### 5.2 Entity-level rule: last-write-wins, guarded

For each entity ID present on both sides:

```
if local.pendingOps(id) is non-empty        → local wins (rule 0: never clobber unpushed work)
else if remote.updated_at > local.updatedAt → apply remote mapping into store
else if local.updatedAt > remote.updated_at → enqueue push (upsert)
else                                        → identical; refresh syncMeta only
```

LWW applies to the *entity record*; the targeted-update path (Phase 2) keeps
this per-entity, not per-field, to stay predictable and debuggable.

### 5.3 Field-level overrides (the small, honest exceptions)

Wholesale LWW is right for `content`, `title`, `description`, `notes`. Three
fields deserve explicit rules, in the spirit of `DESIGN_ETHICS.md` §4:

| Field | Rule | Rationale |
|---|---|---|
| `status` | LWW by timestamp, **but** when both sides changed status since last sync and neither is a plain replay, keep the winner *and* append the loser's value to the application's sync log surfaced on `/data` | Status is the user's progress record; silently discarding a transition violates "measurement honesty". `canonicalizeStatus` guards against dirty enums on pull (audit F4). |
| `appliedAt` / `applied_date` | Earliest non-null wins | It records *when the application was first proven sent* (store.ts comment, audit W9). A later overwrite should never move that date. |
| `matchScore` / `match_score` | Remote wins when remote recomputed it (presence of a newer backend `updated_at` with score change) | The backend score is the computed artifact (`GET /applications/{id}/match` persists it); the local `match-ranking.ts` score is the offline fallback. |

### 5.4 New-entity merge (the actual "dual reality" repair)

On pull, a backend entity with no store counterpart is a **backend-born
entity** (from job-source sync, `logApplication`, `/jds/import`, or seeded
data). It is mapped into the store with a fresh `syncMeta` entry marking
`origin: "remote"`. No user prompt — this is additive data appearing in the
list for the first time, which is precisely the fix the audit asked for.
Conversely, store entities without backend counterparts are pushed
(dependency-ordered). Because IDs are universally client-UUIDs (backend-born
rows carry backend UUIDs, which are just as valid client UUIDs), there is no
ID-mapping table to maintain: **the ID *is* the join key on both sides**.

### 5.5 What the user sees

Per the transparency/honesty principles, sync is visible but quiet:

- A single sync-status indicator (synced / syncing / offline / N pending) on
  the `/data` page and (small) in the app shell — copy in both locales via
  the `useLiteCopy` pattern.
- A per-application sync note only when a conflict override occurred (§5.3
  status case). Neutral wording, no alerts.
- No dialogs asking the user to resolve conflicts. In a single-user
  localhost product, a conflict prompt is almost always a design smell; the
  rules above make the choice deterministic and disclose it after the fact.

---

## 6. Implementation phases

Each phase ships independently, leaves all existing tests green, and defaults
to *off* behind a settings flag (`NEXT_PUBLIC_ENABLE_SYNC` + a runtime toggle
in `app/settings`), consistent with how `ENABLE_AUTH` gates the search branch
in `hooks/use-search.ts`.

### Phase 0 — Sync foundations (store-only, zero behavior change)

**Goal:** the store becomes sync-*capable* without syncing anything.

- Add a `syncMeta` slice to `PersistedAppState` in `frontend/src/lib/store.ts`:
  `Record<entityId, { origin: "local" | "remote"; remoteUpdatedAt?: string; lastSyncedAt?: string }>`
  plus `tombstones: Array<{ id: string; entityType: "resume" | "jd" | "application"; deletedAt: string }>`.
- Bump `STORAGE_VERSION` 1 → 2; extend `hydratePersistedState` to backfill
  `syncMeta` (`origin: "local"`) for existing rows — same pattern as the
  legacy-status normalization in `hydrateApplication` (audit W1), so old data
  migrates for free.
- Stamp `updatedAt` in `updateApplication`, `updateResume`,
  `batchUpdateApplications` (fix the §5.1/1 gap).
- New module `frontend/src/lib/sync/mappers.ts`: pure functions
  `storeResumeToApi(Resume): LiteResume`, `apiResumeToStore(LiteResume): Resume`,
  and the JD/application equivalents, implementing the §2.4 mappings
  (JD `requirements`/`skills` → `parsed_json.local`; application
  `companyName`/`position` regenerated from the JD on pull; all statuses via
  `canonicalizeStatus`). Unit-tested in isolation — these are the only place
  schema knowledge lives.
- **Tests:** mapper round-trip unit tests; hydration-migration test; no e2e
  changes.

### Phase 1 — One-way push (store → backend mirror)

**Goal:** backend features stop being blind to UI data. No merging yet.

- New module `frontend/src/lib/sync/outbox.ts`: a persisted FIFO of pending
  operations under a new localStorage key `synchire-sync-outbox` (kept
  **outside** `synchire-storage` so `logout()`'s `clearPersistedState()` can
  flush it deliberately rather than orphaning half-pushed batches). Entries:
  `{ op: "upsert" | "delete", entityType, id, payloadSnapshot?, enqueuedAt }`.
- New module `frontend/src/lib/sync/engine.ts`:
  - Subscribe to store changes (zustand `subscribe` in
    `components/providers.tsx` next to the existing `hydrateFromStorage`
    call), diff against `syncMeta`, enqueue.
  - `flush()`: batches upserts into `POST /api/portability/import`
    (payload built with `buildExportData`-style shape — reuse the versioned
    snapshot format from `app/data/page.tsx` so one serializer serves export
    *and* sync) with `conflict_resolution: "overwrite"` **but only for
    entities where `local.updatedAt > remote.updated_at`** — the backend
    import endpoint itself compares nothing (§2.2), so the client must make
    the LWW decision *before* the call. Deletes replay as: DELETE endpoint
    (`DELETE /api/resumes/{id}` etc.) → on 404 treat as success → drop
    tombstone.
  - Ordering guarantee: resumes batch before JDs before applications (the
    import endpoint already orders internally, but the *outbox flush* must
    not send an application whose resume batch failed — drain in dependency
    waves, stop the wave on error, retry with backoff using the existing
    `retryWithBackoff` shape from `application-create-dialog.tsx`).
  - Health gate: `unifiedClient.health.check()` (`GET /health`) before the
    first flush; offline → park the outbox, retry on `online`.
- Replace the mock `createApplicationMutation` in
  `components/application-create-dialog.tsx` with a direct `addApplication`
  call (keeping the optimistic-update UX via `lib/optimistic-updates.ts`) —
  the `sleep(150)` fake response goes away; the store write is the mutation.
- **Tests:** unit tests with a mocked fetch asserting dependency ordering,
  404-tolerant deletes, and outbox persistence across "reload"; e2e: create
  journey with lite backend running, assert `GET /api/applications` contains
  the created ID.

### Phase 2 — Pull (backend-born entities enter the store)

**Goal:** job-source-synced JDs, `logApplication` rows, `/jds/import` results,
and any seeded/migrated data appear in the main UI.

- `pull()` in `engine.ts`: `GET /api/resumes`, `GET /api/jds/`,
  `GET /api/applications/` (envelope core — its base-URL fix from audit V1 is
  the right transport), map through `mappers.ts`, merge with the §5 rules,
  write via existing store actions (`setResumes`/`setJobDescriptions`/
  `setApplications` — note these setters currently *replace* arrays; the
  merge must compute the union first and pass it in one set to avoid
  intermediate states).
- Triggers: after `hydrateFromStorage` on app start; on `visibilitychange`;
  after each successful flush; manual "sync now" button on `/data`.
- Backend-born JDs land in the store with `parsed_json.local` absent — mapper
  tolerates missing `requirements`/`skills` (empty arrays), same defensive
  hydration style as `hydrateBrowserFillSession`.
- **Tests:** e2e — seed backend (reuse the audit's `tmp/seed_visual.py`
  approach), open applications page, assert seeded rows render; delete a
  backend row via API, reload, assert it does not resurrect.

### Phase 3 — Full bidirectionality (targeted updates + delete propagation)

**Goal:** steady-state two-way sync with bounded traffic.

- Add diff-push: for a changed single entity, prefer targeted endpoints over
  the bulk import — `PUT /api/resumes/{id}`, `PUT /api/jds/{id}`,
  `PUT /api/applications/{id}` + `PATCH .../status` for status changes (the
  PATCH path preserves backend status-history rows, which the bulk import
  path does not). This needs two small backend additions (lite-mode,
  additive, no schema change): accept `client_updated_at` on PUT (or a
  `If-Unmodified-Since`-style guard header) so the backend can 409 instead of
  blindly overwriting a newer remote state — the same LWW check the client
  does, enforced server-side for safety.
- Delete propagation both directions: store tombstones push as DELETEs
  (Phase 1); remote deletions detected on pull (ID absent from list) only
  delete locally if `local.updatedAt <= lastSyncedAt` — otherwise the entity
  was locally changed after the last sync and the delete is suspicious;
  keep it and log (never silently destroy recent local work).
- Conflict log (§5.3) surfaced on `/data`: last N overrides with entity,
  field, losing value, timestamp.
- **Tests:** unit tests for every §5 rule table row; e2e: divergent-status
  scenario (change status offline, change backend row via curl, reconnect,
  assert documented outcome).

### Phase 4 — Collapse the dual-reality seams in components

**Goal:** the `isLocalApplication` forks disappear because *every* entity is
both local and mirrored.

- `components/application-notes.tsx` → write notes to the store
  (`updateApplication(id, { notes })`; add `notes?: string` to
  `JobApplication`), sync propagates. Drop the direct `applicationAPI.update`.
- `components/application-status-manager.tsx` → status changes through
  `updateApplication` (+ store-side status-history list on the entity, or
  read history from the API when mirrored). Drop direct
  `applicationAPI.updateStatus`.
- `lib/use-workflow-automation.ts` → stop calling `applicationAPI.updateStatus`
  with store IDs; drive `updateApplication` and let the engine push.
- `app/applications/[id]/application-detail-client.tsx` → remove the
  store-vs-API fallback fork; store is the read; `getMatchScore` /
  `getInterviewPrep` become enrichments over the mirrored ID (still guarded:
  when the mirror is offline the local fallbacks `buildLocalInterviewPrep`
  and `lib/match-ranking.ts` keep working — the fork narrows to "backend
  enrichment available or not", not "two data realities").
- `hooks/use-search.ts` → keep the branch (local search remains the Lite
  default) but authenticated mode may now also *union* local results with API
  results since both sides share IDs; dedupe by `id`.

### Phase ordering rationale

Phases 1→2 before 3→4 means the risky direction (merge) is only enabled once
push has already converged the two worlds for *new* data, shrinking the
conflict surface that Phase 3's rules must actually handle. Phase 4 is pure
cleanup and could even interleave with Phase 3 per-component.

---

## 7. What NOT to sync (and why)

| Domain | Where it lives | Why it stays out |
|---|---|---|
| **Interviews** | `frontend/src/lib/interviews-local.ts` (`synchire-interviews` key) | Deliberately local-first module built in audit round 7 (I1): the Lite backend exposes **no** `/api/interviews` route (the old API calls 404'd). It is self-consistent CRUD + its own schema validation (`isValidInterview`), included in local export/import (I4) and the edit loop (E1, D1–D3). Syncing it would re-open the exact seam round 7 closed. `LocalInterview.application_id` references store application IDs, which stay stable under this design — no action needed. |
| **Candidate profile & role card** | store `candidateProfile` (`lib/browser-fill-assistant.ts` types) | The `/transparency` page's core promise: personal profile data never leaves the device. The backend has `profile_lite`/`candidate_role_card_lite` tables for *its own* AI flows, but they must not become mirrors. Out of scope by privacy contract. |
| **Browser-fill sessions & learned updates** | store `browserFillSessions` | Same privacy boundary; also device-scoped UX history (capped at 12), not job-search data. |
| **Template preferences** | store `selectedTemplate` / `templateCustomization` (plus separate platform-storage keys) | Device-local appearance settings; meaningless to replicate. |
| **Rejection-recovery card state** | store `rejectionRecovery` | UI dismiss/choice state keyed by store application IDs; a device-local interaction record (`DESIGN_ETHICS.md` §2 autonomy support), not entity data. |
| **Saved searches, search history, local backups** | their own localStorage keys (`app/saved-searches`, `app/data` local backups) | Locally self-consistent loops (audit S4, N2); the backend's search-history table serves its authenticated-mode search only. |
| **AI provider settings / API keys** | `lib/ai-runtime-settings.ts` | Secrets. Device-local by design (`deployment-mode.ts` even gates them to sessionStorage on Pages). Never replicated. |
| **Job-sources / companies / signal-feeds** | backend-only domain (`jobSourceAPI`, `companyAPI`, `signalFeedAPI`) | These are *backend-owned* services (scrapers, RSS sync). Sync direction is strictly one-way *into* the user's world: the JDs they produce flow into the store via Phase 2 pull; the subscription configuration itself is not store data. |
| **Auth/session state** | `lib/auth.ts` | Explicitly out of scope; lite mode has no accounts (`LITE_ARCHITECTURE.md`). |

Rule of thumb for future contributors: **sync entities the user creates or
edits as part of their job search (resume, JD, application); never sync
identity, preferences, credentials, or interaction-only state.**

---

## 8. Risks and open questions

1. **Portability-import shape drift.** Phase 1 leans on
   `POST /api/portability/import` accepting the export-JSON shape. Its
   application import maps a limited field set (§2.2) and currently drops JD
   `requirements`/`skills`. Either extend the import endpoint to round-trip
   `parsed_json` (small, additive) or accept that the *bulk* path is
   lossy for those two fields while the Phase 3 targeted `PUT /api/jds/{id}`
   path preserves them (PUT accepts the optional-fields `JobDescriptionUpdate`
   schema in `api/app/schemas/schemas_lite.py`).
2. **`logout()` semantics.** It clears `synchire-storage` (and must now also
   clear the outbox and tombstones) — but the backend mirror keeps its rows.
   In lite mode (no account) that is arguably correct (data ownership says
   local wipe ≠ backend wipe); document the behavior on `/data`. If this
   ever feels wrong, the fix is an explicit "wipe backend copy" action, not
   an implicit sync behavior.
3. **Static Pages deployments.** `lib/deployment-mode.ts` environments have
   no backend; the engine must no-op cleanly there (health check fails →
   outbox parked forever). Consider hiding the sync status indicator entirely
   in that build target.
4. **Status history asymmetry.** Store-side status changes pushed via bulk
   import create no `application_status_history` rows; the PATCH path does.
   Phase 3's diff-push resolves this going forward; historical rows created
   during Phases 1–2 will have gaps in history — acceptable, disclosed on
   `/data` if the history view ships.
5. **Backend concurrency.** The lite backend is single-user/localhost, but
   the job-source scheduler writes JDs every 12 h in the same process. The
   Phase 3 server-side `client_updated_at` guard (§6 Phase 3) is the safety
   net against racing `updated_at` values.

---

## 9. Reference index

- Audit findings: `docs/VISUAL_AUDIT_2026-09-04.md` — C1 (zero-API creation
  journey), S1 (dual reality), I1–I5 (interviews local-first), V2 (progress
  page store rewire), W1/C2 (status vocabulary), F4 (dirty enum self-heal).
- Store: `frontend/src/lib/store.ts` (`STORAGE_KEY`, `persistState`,
  `hydrateFromStorage`, all entity actions).
- API surface: `frontend/src/lib/api-client.ts` (envelope core
  `resumeAPI`/`jdAPI`/`applicationAPI`; direct-return core `unifiedClient`,
  `jobSourceAPI`, `companyAPI`, `signalFeedAPI`; `resolveEnvelopeBaseURL`).
- Backend routers: `api/app/api/resumes_lite.py`, `api/app/api/jds_lite.py`,
  `api/app/api/applications_lite.py`, `api/app/api/portability.py`; mounted
  in `api/main_lite.py`.
- Status vocabulary: `frontend/src/lib/status-vocabulary.ts`
  (`canonicalizeStatus`, `CANONICAL_STATUSES`, `statusImpliesSent`).
- Local interviews (explicitly out of scope): `frontend/src/lib/interviews-local.ts`.
- Ethics constraints: `docs/DESIGN_ETHICS.md` §3–4; privacy contract:
  `README_LITE.md`, `/transparency` (`app/transparency`).
