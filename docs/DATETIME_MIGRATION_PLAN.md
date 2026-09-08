# DateTime Migration Plan: Naive UTC to Timezone-Aware UTC

Status: DESIGN DOCUMENT (no code changed)
Date: 2026-09-08
Owner: backend
Applies to: `F:\ZCodeData\SyncHire\api` (SyncHire Lite stack first, legacy full-stack second)

---

## 0. Executive summary

The codebase is in a **declared-aware / actually-naive** state:

- Every model in the **active Lite stack** (the app launched by `api/main_lite.py`, 15 model files, 40 columns) declares `DateTime(timezone=True)`, but every value written through Python goes through `app/core/clock.py::utcnow()`, which **deliberately drops tzinfo**. The declaration is a lie on SQLite.
- The **legacy full-stack models** (11 model files, 47 columns) are the inverse mix: 35 columns declared naive `DateTime`, 12 declared `timezone=True` (`interview.py`, `password_reset_token.py`).
- On SQLite, `timezone=True` is a no-op for both DDL and storage. SQLAlchemy's sqlite `DATETIME` type stores a fixed-width string `YYYY-MM-DD HH:MM:SS.ffffff` and **silently discards any tzinfo** on write; reads always come back naive. So the database is uniformly naive-UTC-on-disk today, regardless of declarations.
- The real user-visible bug is at the edges, not in storage: the API serializes naive datetimes as ISO strings **without an offset** (`2026-09-08T04:00:00`), and the frontend parses those with `new Date(...)` **as local time**. For the primary audience (UTC+8) every timestamp rendered this way is **8 hours early**.

**Recommendation: Option A (full aware migration), executed in phases with a storage-compatible `TypeDecorator`** so that no SQLite data rewrite is required. The on-disk format never changes; only the Python-side semantics (tzinfo attached on read, normalized on write) and the API wire format (offset suffix) change. Estimated scope for the Lite stack: ~20 files, ~60 write/comparison call sites, ~30 schema fields, ~6 test files (2–4 dev-days). Details below.

---

## 1. Current state analysis

### 1.1 Two parallel stacks

| | Lite stack (active) | Legacy full-stack |
|---|---|---|
| Entrypoint | `api/main_lite.py` | `api/main.py` (imports `app.main` re-export) |
| DB module | `app/core/database_lite.py` (aiosqlite) | `app/core/database.py` (Postgres or SQLite fallback) |
| Config | `app/core/config_lite.py` → `data/synchire.db` | `app/core/config.py` (`DATABASE_URL`, Redis, email) |
| Schema creation | `Base.metadata.create_all` + hand-rolled additive migrations in `_run_lite_schema_migrations()` | Alembic (`api/alembic/versions/`, 12 revisions) — **not wired to the Lite DB** |
| Models | 15 files, all `DateTime(timezone=True)` | 11 files: 35 naive `DateTime` + 12 `DateTime(timezone=True)` |
| Values written | `utcnow()` (naive UTC) + 5 aware write sites (see 1.4) | `utcnow()` (naive UTC), `server_default=func.now()` |

The Lite scheduler (`main_lite.py::_job_source_scheduler`) runs `job_source_service.sync_all_enabled` and `signal_feed_service.sync_all_signal_feeds` periodically, which is how some of the aware writes reach the Lite DB at runtime.

### 1.2 Column inventory (verified by AST scan of `app/models/`)

**Lite stack — 40 columns, 100% declared `DateTime(timezone=True)`:**

| Model file | Aware-declared columns |
|---|---|
| `ai_provider_settings_lite.py` | 2 (`created_at`, `updated_at`) |
| `application_lite.py` | 6 (`applied_date`, `submitted_manually_at`, `next_action_at`, `last_updated`, `created_at`, `updated_at`) |
| `application_material_lite.py` | 2 |
| `candidate_profile_item_lite.py` | 2 |
| `candidate_profile_lite.py` | 2 |
| `candidate_role_card_lite.py` | 2 |
| `company_directory.py` | 3 (`signal_detected_at`, `created_at`, `updated_at`) |
| `extensions.py` | 4 (two tables: `last_sync`, `created_at`/`updated_at` x2) |
| `jd_lite.py` | 3 (`deadline`, `created_at`, `updated_at`) |
| `job_source.py` | 3 (`last_synced_at`, `created_at`, `updated_at`) |
| `local_profile.py` | 2 |
| `resume_export_lite.py` | 2 |
| `resume_lite.py` | 2 |
| `resume_variant_lite.py` | 2 |
| `signal_feed.py` | 3 (`last_fetched_at`, `created_at`, `updated_at`) |

**Legacy full-stack — 47 columns, mixed declarations:**

| Model file | Naive | Aware-declared |
|---|---|---|
| `user.py` | 8 | 0 |
| `search.py` | 8 | 0 |
| `audit_log.py` | 6 | 0 |
| `task.py` | 4 | 0 |
| `application.py` | 2 | 0 |
| `jd.py` | 2 | 0 |
| `notification.py` | 2 | 0 |
| `resume.py` | 2 | 0 |
| `application_status_history.py` | 1 | 0 |
| `interview.py` | 0 | 10 |
| `password_reset_token.py` | 0 | 2 |

**Totals: 87 DateTime columns — 52 declared aware, 35 declared naive; 100% stored and read as naive on SQLite.**

### 1.3 What SQLite actually stores (SQLAlchemy 2.0.36, aiosqlite 0.20.0)

1. **Bind format.** The sqlite dialect's `DATETIME` bind processor formats datetimes as `YYYY-MM-DD HH:MM:SS.ffffff` (space separator, fixed width) from the datetime's own `year…microsecond` fields. `tzinfo` is not part of the format string, so:
   - Binding an **aware UTC** datetime stores its UTC wall clock with the offset **silently dropped**.
   - Binding an aware datetime in a **non-UTC zone would store that zone's wall clock** — no such site exists today, but this is the sharpest edge of the current convention.
2. **Read format.** The result processor parses the stored string with a strict regexp and always returns a **naive** datetime. A value written by an external tool with a `T` separator or an offset (e.g. `2026-08-15T10:00:00+00:00`) fails the regexp and raises `ValueError` on row load — the same "own history poisons the listing" failure mode already self-healed for enums by `_normalize_application_statuses` in `database_lite.py`.
3. **`timezone=True` is a no-op on SQLite** for both DDL (`DATETIME` column, datetime affinity) and storage. It only matters on PostgreSQL (`TIMESTAMP WITH TIME ZONE`).
4. **`server_default=func.now()`** compiles to `CURRENT_TIMESTAMP` on SQLite, which returns **UTC, second precision, no microseconds** (`YYYY-MM-DD HH:MM:SS`). So rows defaulting server-side and rows written Python-side (microsecond precision) coexist; both are UTC and lexicographically comparable because the format is fixed-width prefix-compatible.
5. **SQL comparisons never raise.** `WHERE created_at >= :cutoff` becomes string comparison in SQLite. Since all writers produce the same UTC format, ordering/filtering is internally consistent today — the fragility is entirely in Python-side comparisons and in the JSON wire format.

### 1.4 Write paths currently feeding the Lite DB

| # | Path | Value written | Where |
|---|---|---|---|
| W1 | `clock.utcnow()` | naive UTC | 117 call sites / 35 files (see 1.6) |
| W2 | `datetime.now(timezone.utc)` **direct writes** | AWARE UTC | 5 sites: `api/companies_lite.py:245`, `api/job_sources_lite.py:391` (`applied_date` + `submitted_manually_at`), `services/hiring_signal_service.py:150`, `services/job_source_service.py:523` (`last_synced_at`), `services/signal_feed_service.py:184` (`last_fetched_at`) |
| W3 | Pydantic request bodies | naive **or** aware, depending on client string | e.g. `ManualSignalRequest.detected_at`, `ApplicationCreate.applied_date` (`schemas_lite.py`); Pydantic 2.10 accepts both `2026-08-15T10:00:00` and `...Z` |
| W4 | `server_default=func.now()` | naive UTC string, second precision | all `created_at`/`updated_at` |
| W5 | `job_source_service._parse_datetime` | AWARE (epoch-ms → `fromtimestamp(tz=utc)`; ISO `Z` → aware) — flows into `NormalizedJob.posted_at`, serialized **with `+00:00`** into `job_descriptions.parsed_json` TEXT | `services/job_source_service.py:157-172, 429` |
| W6 | Embedded JSON | `utcnow().isoformat()` → naive ISO strings inside `applications.timeline_json`, backups, websocket payloads | `api/applications_lite.py:677`, `services/websocket_notification_service.py`, etc. |

Note W2: the **same table** (`applications`) receives aware `applied_date` from `job_sources_lite.py` and naive `last_updated` from `applications_lite.py`. Harmless on SQLite (offset stripped), a live grenade if the DB ever moves to Postgres with `TIMESTAMP WITH TIME ZONE` columns (naive input gets interpreted in the server's session timezone).

### 1.5 What the API returns

- ORM datetimes are always naive on read (1.3.2), so FastAPI/Pydantic serializes them as **ISO without offset**: `2026-09-08T04:00:00.123456`. There is no `Z`, no `+00:00`.
- Hand-formatted responses do the same: `utcnow().isoformat()`, `created_at.isoformat()` (e.g. `applications_lite.py:195`, `portability.py:102-140`).
- Exception: strings extracted from `parsed_json` (`posted_at`) keep their `+00:00` because they were stringified from aware datetimes (W5). The wire format is therefore **inconsistent between endpoints**.
- Frontend (`frontend/src/app/**`): `new Date(application.created_at)` — JavaScript parses an offset-less ISO string as **local time**. Since the backend means UTC, every such timestamp renders shifted by the user's UTC offset (**8 hours for the primary zh-CN audience**), and sorting/filtering in the client mixes real instants with misparsed ones. `frontend/src/lib/utils.ts` has no date helper; there is no compensation layer. (Values that do carry `+00:00`, like `posted_at`, are parsed correctly — inconsistent UX today.)

### 1.6 Call-site inventory (naive side)

- `from app.core.clock import utcnow`: **35 app files**.
- `utcnow()` usages in `app/`: **117** (excluding `clock.py`). Rough buckets:
  - ORM attribute writes / constructor kwargs: ~60 (models' `default=`/`onupdate=` plus service writes)
  - `.isoformat()` into JSON payloads / responses: ~40
  - `.strftime(...)` export/backup filenames: ~10 (local-time OK, cosmetic)
  - arithmetic/cutoffs and comparisons: ~10 (`analytics.py`, `compliance.py`, `password_reset.py:151,228`, `search_history.py`, `websocket/manager.py` heartbeats, `middleware/audit_middleware.py`)
- `datetime.fromtimestamp(stat.st_ctime)` in `portability.py:679,743`: **naive local time**, but only used for display metadata in exports — flag for cleanup, not blocking.
- Tests: `utcnow()` in 3 files (14 sites: `conftest.py`, `test_analytics_service.py`, `test_two_factor.py`); aware `datetime.now(timezone.utc)` fixtures in `test_job_source_service.py`, `test_hiring_signal_service.py`. No test currently asserts presence/absence of a UTC offset in API responses (checked `test_lite_contract_drift.py`).

---

## 2. Migration strategy — options

### Option A — Full aware migration (RECOMMENDED)

Migrate all Lite columns to a custom `AwareDateTime` type, convert every producer (`clock.utcnow()` → aware) and consumer, keeping the SQLite storage format byte-identical (bind normalizes to naive-UTC string; result attaches `timezone.utc`). Then repeat or retire the legacy stack.

- Pros:
  - Fixes the actual user-facing bug (wire format gains `+00:00`; `new Date()` becomes correct with zero frontend changes).
  - Makes the models' existing `timezone=True` claim true; Postgres migration later is a non-event.
  - Removes the permanent deprecation-shim awkwardness of `clock.utcnow()` (Python 3.12+ `datetime.utcnow` removal was the original driver).
  - **No data rewrite**: all existing rows are already UTC on disk; attaching `tzinfo=timezone.utc` on read interprets them correctly.
- Cons:
  - Largest code-touch footprint (~60 write/compare sites + schemas + tests).
  - Transition period must be managed so naive and aware values never meet in a Python comparison (see Phase rules, §4).

### Option B — Naive forever (codify the convention)

Change Lite model declarations from `DateTime(timezone=True)` to plain `DateTime` (making the code honest), keep `clock.utcnow()` naive permanently, document "all datetimes are naive UTC" everywhere, and fix the wire format separately (e.g. a response wrapper that appends `Z`).

- Pros: smallest diff; zero risk of naive/aware mixing.
- Cons:
  - Does not fix the DB layer, only the paper trail; every future contributor must relearn the convention.
  - Wire-format fix still needed (the `Z`-appending wrapper reimplements half of Option A's serialization work).
  - Leaves the 5 aware write sites (W2) as permanent booby traps: they only "work" because SQLite silently strips tzinfo.
  - Any future Postgres/D1/hosted-DB plan reopens the whole question (`timestamptz` + naive drivers = wrong instants).

### Option C — Hybrid (new tables aware, old tables naive behind an adapter)

Keep existing 15 Lite tables naive; introduce `AwareDateTime` only for new tables; read old tables through an adapter that coerces to aware at the service layer.

- Pros: incremental, each new feature is born correct.
- Cons:
  - **Guarantees long-term mixed state** — the exact situation this migration exists to end. Cross-table comparisons (analytics, CSV export, portability) need adapters at every join point forever.
  - Two conventions to document, lint, and teach; the adapter layer becomes permanent load-bearing code.
  - Worst option for a codebase this size (~40 Lite columns is small enough to do wholesale).

**Decision: Option A.** The table count is small, storage needs no rewrite, and the frontend bug is real today. Option C's mixed state is strictly worse than either endpoint state.

---

## 3. Risk assessment

### 3.1 The hard failure: mixing naive and aware in Python

`naive < aware` raises `TypeError: can't compare offset-naive and offset-aware datetimes` at runtime. Concrete current or future collision points:

| Site | Today | After a naive global `utcnow()` flip (what NOT to do) |
|---|---|---|
| `api/password_reset.py:151,228` (`utcnow() > token.expires_at`) | naive vs naive — OK | aware vs naive — 500 on every token check |
| `websocket/manager.py:456,501` heartbeat pruning (`current_time` vs stored) | naive vs naive | aware vs naive — connection pruning crashes |
| `analytics.py:316` `max(timestamps)` across tables | all naive | mixed — TypeError mid-aggregation |
| `test_analytics_service.py` fixtures vs ORM reads | naive vs naive | aware vs naive — suite failure |

This is why the rollout flips **per table group with its code paths in the same commit** and flips `clock.utcnow()` itself **last** (§4).

### 3.2 What SQLite actually does with tzinfo (why storage is safe)

- Offset is **dropped on write**, never stored (§1.3.1). Existing and future aware writes are therefore storage-compatible with historical naive rows — this is what makes the no-rewrite migration possible.
- Reads are always naive; awareness is a **Python-side property** we add via `TypeDecorator.result_processor`.
- Risk to watch: any code path that binds an aware datetime **not in UTC** would store the wrong wall clock. The `AwareDateTime` bind processor must `.astimezone(timezone.utc)` before storage, making this class of bug impossible through the new type.
- Risk: rows written by external tools with `T`/offset strings fail SQLAlchemy's parse regexp on load. Today nothing writes such strings into DateTime columns (verified: `_parse_datetime` output only goes into JSON TEXT), but a **preflight verification script** (§4 Phase 0) should scan for them.

### 3.3 Wire-format / API contract risks

- Every datetime response field changes from `2026-09-08T04:00:00.123456` to `2026-09-08T04:00:00.123456+00:00`. Frontend `new Date()` handles both, and the offset fixes the 8-hour skew — but any consumer doing strict string comparison, regex, or length-sensitive assertions breaks. Known consumers: `frontend/src` (~30 `new Date(...)` sites — all benefit), CSV exports (`export.py`, `portability.py` — column text changes shape), backup/import round-trips (`backup_service.py`, `portability.py` import parses with `datetime.fromisoformat`, which accepts the offset).
- Embedded JSON blobs (`timeline_json`, backups, `parsed_json`) contain naive ISO strings. These do **not** get fixed by the column migration; they are serialized from `utcnow()` call sites (W6) and will start carrying `+00:00` automatically once `utcnow()` becomes aware — old blob entries stay naive forever. Frontend date handling of `timeline_json` entries must tolerate both (it already must, because `parsed_json.posted_at` is offset-carrying today). Mark as accepted residual, document in the API docs.

### 3.4 Legacy-stack and platform risks

- Legacy `api/main.py` stack shares services with the Lite stack (`job_source_service`, `signal_feed_service`, `hiring_signal_service` write legacy-adjacent aware values; `interview.py`/`password_reset_token.py` are declared aware in a naive family). If the full-stack app is ever run against the same SQLite file, both `Base` metadatas define overlapping table names with different conventions. Mitigation: Phase 5 decision — migrate-or-retire legacy models together with their routers.
- `func.now()` server defaults remain naive-UTC strings in SQLite. After the read-side flip, rows that were INSERTed server-side (no Python default) also gain `tzinfo=utc` on read — uniform, no action needed. On a future Postgres move, `server_default=func.now()` must become `timezone('utc', now())` or rely on `timestamptz` semantics — note it in the Postgres runbook, not this migration.
- Windows dev boxes: `datetime.fromtimestamp(...)` without `tz` (portability file metadata) yields local time — unrelated to correctness of DB values but should be swept in Phase 1 for hygiene.

### 3.5 Rollout-order risks (summary)

1. Flipping `clock.utcnow()` before the columns = TypeErrors across 117 sites → flip last.
2. Flipping a table's ORM type without updating that table's writers in the same change = aware reads vs naive `utcnow()` comparisons in that module only → flip group = table + its API/service files + its schema fields together.
3. Mixing flipped and unflipped tables inside one analytics/export expression = TypeError → analytics/export endpoints form their own flip group (all tables they touch at once).

---

## 4. Rollout plan (Option A, phased)

Guiding invariants:
- **I1** — The SQLite on-disk format never changes (naive UTC string). Only Python-side semantics and JSON output change.
- **I2** — At any commit, no Python expression can compare a naive value with an aware one (enforced by group flips + tests).
- **I3** — Every new aware value originates from exactly one helper in `app/core/clock.py`.

### Phase 0 — Baseline and guardrails (half day)

1. Add contract tests capturing current output (`tests/test_lite_contract_drift.py` is the natural home): for representative endpoints (`GET /api/applications`, `GET /api/jds`, `GET /api/companies`), assert `created_at` is a datetime and record whether it carries an offset. These assertions get updated **deliberately** per phase.
2. Add a roundtrip fixture: create row with naive `utcnow()` writer → read via ORM → assert naive (pins current behavior; the flip phases assert the aware counterpart).
3. Write the DB preflight script `scripts/verify_datetime_storage.py` (design here, no code yet):
   - open the user's `data/synchire.db`;
   - for every table, `SELECT` all DateTime-ish columns as text and validate against `^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d+)?$`;
   - report any `T`-separator or offset-carrying rows (expected zero) so we know attaching `utc` on read is safe for 100% of historical data.
4. **Checkpoint C0**: suite green; preflight run against the developer DBs shows only canonical formats.

### Phase 1 — Consolidate producers in clock.py (half day)

1. Add `aware_now()` (name final: `now_utc()`) to `clock.py`: `datetime.now(timezone.utc)` — the single source of aware time. Keep `utcnow()` naive for now.
2. Convert the 5 direct aware sites (W2) to `utcnow()` **for now** (they are stored identically; this makes every DB write go through one function before any type changes):
   - `api/companies_lite.py:245`
   - `api/job_sources_lite.py:391`
   - `services/hiring_signal_service.py:150`
   - `services/job_source_service.py:523`
   - `services/signal_feed_service.py:184`
3. Normalize `services/job_source_service.py::_parse_datetime` to return `utcnow()`-compatible naive UTC (`.astimezone(timezone.utc).replace(tzinfo=None)`), keeping its serialized output inside `parsed_json` explicitly offset-carrying via `"...+00:00"` suffix formatting if the ATS value had an offset (decide once, document).
4. Add the lint rule (CI grep or ruff custom rule, design reference): forbid `datetime.now(`, `datetime.utcnow(`, `fromisoformat` result flowing into ORM writes, **outside `app/core/clock.py`**. `utcnow()`/`now_utc()` are the only approved constructors.
5. **Checkpoint C1**: `grep -rn "datetime.now(" app/` returns only `clock.py`; full test suite green; DB writes unchanged (verified by C0 script).

### Phase 2 — Introduce `AwareDateTime` and flip table groups (1.5–2 days)

Add `app/core/datetime_aware.py` (design):

```python
class AwareDateTime(TypeDecorator):
    """DateTime that STORES naive-UTC strings (SQLite-compatible, identical
    to historical rows) and HANDS OUT aware-UTC datetimes in Python."""
    impl = DateTime
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is not None and value.tzinfo is not None:
            value = value.astimezone(timezone.utc).replace(tzinfo=None)
        return value                      # naive UTC string via impl

    def process_result_value(self, value, dialect):
        if value is not None and value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value
```

Key property: **a database written entirely before this change and one written entirely after are byte-identical.** Mixed-era rows (old naive, new via this type) all read as aware UTC.

Flip order — smallest blast radius first, one commit per group, each group = models + routers/services + schema fields + tests:

| Group | Tables | Why this order | Files touched (approx) |
|---|---|---|---|
| G1 leaf metadata | `ai_provider_settings_lite`, `local_profile`, `extensions`, `candidate_profile_lite`, `candidate_profile_item_lite`, `candidate_role_card_lite`, `resume_export_lite` | timestamps never cross-compared; API surface tiny | 7 models + 5 routers + schemas_lite |
| G2 sync/directory | `job_source`, `signal_feed`, `company_directory` | contains the W2 aware sites and `_parse_datetime` inputs; self-contained read paths (`last_synced_at` only displayed) | 3 models + `job_sources_lite.py`, `signal_feeds_lite.py`, `companies_lite.py`, `career_cards`/profile consumers + 3 services |
| G3 core content | `resume_lite`, `jd_lite`, `resume_variant_lite`, `application_material_lite` | compared/exported together (CSV, portability, analytics) → must flip as one unit | 4 models + `resumes_lite.py`, `jds_lite.py`, `resume_variants_lite.py`, `application_materials_lite.py`, `portability.py`, `export` paths |
| G4 applications hub | `application_lite` | largest API surface (`applications_lite.py` ~1000 lines, timeline_json, batch ops, analytics `created_at` groupings); depends on G3 FKs already aware | 1 model + `applications_lite.py` + `search_lite.py` + analytics endpoints + `schemas_lite.py` (~30 datetime fields total across G1–G4) |

Per-group mechanics:
1. Change columns `DateTime(timezone=True)` → `AwareDateTime()` in the group's models. (No `create_all` diff — SQLite DDL is identical, so no migration step is triggered; verify in a scratch DB.)
2. Change that group's writers from `utcnow()` to `now_utc()` (the naive shim stays for not-yet-flipped groups).
3. Update the group's tests: fixture writers use `now_utc()`; assertions expect `.tzinfo is timezone.utc`; contract tests updated to expect `+00:00` in responses.
4. **Checkpoint per group (C2.Gn)**: `pytest tests/` green; manual smoke of the group's endpoints shows `+00:00` in JSON; C0 preflight still clean (no storage drift); a mixed-era DB (seeded pre-flip, appended post-flip) round-trips all rows as aware UTC.

### Phase 3 — Flip the clock and delete the shim (half day)

1. After G4, every ORM read is aware and every ORM writer uses `now_utc()`. Remaining `utcnow()` users are non-DB usages: isoformat-to-JSON (~40), filenames (~10), internal arithmetic (websocket heartbeats, middleware, security token expiries in `core/security.py`).
2. Redefine `utcnow() = datetime.now(timezone.utc)` (aware) — or delete it and sed `utcnow(` → `now_utc(` everywhere; the second is cleaner. Update `clock.py` docstring to remove the "until the storage layer migrates" caveat. JSON payloads and embedded blobs now carry offsets (consistent wire format).
3. Audit the comparison sites from §3.1: all values on both sides must now be aware (DB via type, non-DB via clock). `password_reset`, websocket manager, analytics cutoffs, audit middleware — each gets a one-line justification in the PR description.
4. **Checkpoint C3**: full suite green; `grep -rn "replace(tzinfo=None)" app/` only in `datetime_aware.py`; frontend manual pass on Applications/Analytics/Companies pages — timestamps display correctly in a UTC+8 locale (the 8-hour skew is gone); `timeline_json` old entries still render (tolerate both formats).

### Phase 4 — Contract hardening (half day)

1. Lock the wire format: contract tests assert **every** API datetime ends with `+00:00`.
2. Document in `docs/API_DOCUMENTATION.md`: all datetimes are UTC ISO-8601 with explicit offset; embedded JSON blobs may contain legacy offset-less strings (accepted residual, §3.3).
3. Add a changelog/release note: export CSVs and backups produced before this change contain offset-less timestamps; the importer (`portability.py` `fromisoformat`) accepts both — add a roundtrip test proving a pre-migration backup imports correctly (this is the data-compatibility insurance for user backups).
4. **Checkpoint C4**: roundtrip test (old backup → import → aware reads) green.

### Phase 5 — Legacy stack decision (separate effort, 1–2 days or retire)

Options for `api/main.py` + 11 legacy models (35 naive + 12 aware columns):
- **Retire**: if the full-stack Postgres app is dormant, delete or freeze it and note that only the Lite conventions are supported. Cheapest; removes the overlapping-table-name hazard (§3.4).
- **Migrate in place**: same `AwareDateTime` treatment, plus real Alembic revisions (the legacy stack is the only one with Alembic). Also align `interview.py`/`password_reset_token.py` (already declared aware, fed naive by `password_reset.py`).
Do not start Phase 5 before C4; the legacy routers (`gdpr`, `compliance`, `auth`) are not part of the Lite deployment.

### Rollback strategy

Each phase is a self-contained commit group with tests. Because storage never changes, **rollback of any phase is a pure code revert** — no data rollback exists or is needed. The only semi-irreversible artifact is new JSON output (offsets) reaching clients; the frontend treats offsets as an improvement, and old clients that string-match timestamps are unknown (grep of `frontend/src` shows only `new Date` and `date-fns` usage).

---

## 5. Estimated scope

| Item | Count | Notes |
|---|---|---|
| Model files to change (Lite, Phases 2) | 15 | column type swap only |
| DateTime columns flipped (Lite) | 40 | mechanical, per group |
| New files | 2 | `app/core/datetime_aware.py`, `scripts/verify_datetime_storage.py` |
| Direct aware write sites to convert | 5 | §1.4 W2 |
| `utcnow()` call sites (Lite-relevant writers/comparisons) | ~60 of 117 | rest are filename/format strings that flip for free in Phase 3 |
| API/service/router files touched | ~20 | listed per group in §4 |
| Pydantic schema datetime fields | ~30 in `schemas_lite.py` (+ legacy schemas untouched until Phase 5) | no type change — serialization changes implicitly; only tests/assertions |
| Test files to update | ~6 | `conftest.py`, `test_analytics_service.py`, `test_two_factor.py`, `test_job_source_service.py`, `test_hiring_signal_service.py`, `test_lite_contract_drift.py` (+ new tests from Phases 0/4) |
| New tests | ~10 | contract (3), roundtrip (2), mixed-era DB (1), backup-import (1), preflight script (1), lint rule (2) |
| Frontend changes | 0 mandatory | verify ~30 `new Date()` sites render correctly (manual pass in C3) |
| Data migration / backfill | **0** | all existing rows already UTC on disk; read-side reinterpretation only |
| Effort | 2–4 dev-days (Phases 0–4) | Phase 5 extra 1–2 days or retirement decision |

### Sequencing summary

```
C0 guards  ->  C1 one producer  ->  C2.G1 leaf  ->  C2.G2 sync  ->  C2.G3 content
          ->  C2.G4 applications  ->  C3 clock flip  ->  C4 contract lock  ->  Phase 5 legacy
```

### What NOT to do (anti-patterns this plan avoids)

1. **Do not** change `clock.utcnow()` to aware first — instant `TypeError` surface across 117 sites (§3.1).
2. **Do not** rely on `DateTime(timezone=True)` doing anything on SQLite — it never did (§1.3.3); only the `TypeDecorator` gives the ORM aware values.
3. **Do not** rewrite stored values to include offsets — breaks SQLAlchemy's parse regexp and lexicographic ordering; storage stays naive-UTC forever.
4. **Do not** flip a table without its code paths — group definition (§4 Phase 2) exists to keep invariant I2.
5. **Do not** let new code construct datetimes ad hoc — the Phase-1 lint rule makes `clock.py` the only entry point, so any future flip (or platform move) is a one-file change.
