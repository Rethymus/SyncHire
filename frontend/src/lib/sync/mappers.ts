/**
 * Store ↔ API mappers (docs/STORE_API_SYNC_DESIGN.md §2.4, §6 Phase 0).
 *
 * The only place schema knowledge lives: every asymmetry between the zustand
 * store (camelCase, Date objects) and the lite backend (snake_case, ISO
 * strings) is translated here. Pure functions — no store access, no network —
 * so they are unit-testable in isolation.
 *
 * Statuses pass through `canonicalizeStatus` in both directions as a
 * dirty-value guard (audit F4): a legacy or unknown value can never leak
 * into the backend nor into the store through sync.
 */

import type { LiteApplication, LiteJd, LiteResume } from "@/lib/api-client";
import { canonicalizeStatus } from "@/lib/status-vocabulary";
import type { JobApplication, JobDescription, Resume } from "@/lib/store";

/**
 * Resume → LiteResume push payload.
 *
 * Lossy by design (§2.4): `skills`/`experience` have no backend column and
 * LiteResume has no extension slot, so they do not survive the round trip
 * until a later phase parks them in an extension. `uploadedAt` is the
 * resume's only timestamp, so it seeds both created_at and updated_at.
 */
export function storeResumeToApi(resume: Resume): Partial<LiteResume> {
  const uploadedAt = resume.uploadedAt.toISOString();
  return {
    id: resume.id,
    title: resume.name,
    content: resume.content,
    file_name: resume.fileUrl ?? null,
    created_at: uploadedAt,
    updated_at: uploadedAt,
  };
}

/** LiteResume → store resume. `uploadedAt` tracks the backend created_at. */
export function apiResumeToStore(api: LiteResume): Resume {
  return {
    id: api.id,
    name: api.title,
    content: api.content,
    uploadedAt: new Date(api.created_at),
    fileUrl: api.file_name ?? undefined,
  };
}

/** Parsed-json key where local-only JD fields ride (§2.4). */
const JD_LOCAL_PARSED_KEY = "local";

/**
 * JobDescription → LiteJd push payload. `requirements`/`skills` have no
 * backend columns — they are serialized into `parsed_json.local` so the
 * round trip is lossless.
 */
export function storeJdToApi(jd: JobDescription): Partial<LiteJd> {
  const createdAt = jd.createdAt.toISOString();
  return {
    id: jd.id,
    title: jd.title,
    company: jd.company,
    description: jd.description,
    parsed_json: {
      [JD_LOCAL_PARSED_KEY]: {
        requirements: jd.requirements,
        skills: jd.skills,
      },
    },
    created_at: createdAt,
    updated_at: createdAt,
  };
}

/**
 * LiteJd → store JD. Backend-born JDs land with `parsed_json.local` absent —
 * tolerated with empty arrays (same defensive hydration style as
 * `hydrateBrowserFillSession` in store.ts).
 */
export function apiJdToStore(api: LiteJd): JobDescription {
  const local = readJdLocal(api.parsed_json);
  return {
    id: api.id,
    title: api.title,
    company: api.company,
    description: api.description,
    requirements: local.requirements,
    skills: local.skills,
    createdAt: new Date(api.created_at),
  };
}

/**
 * JobApplication → LiteApplication push payload. `companyName`/`position` are
 * intentionally absent: they are local denormalizations of the JD join and
 * are regenerated on pull by `apiApplicationToStore` (§2.4).
 */
export function storeApplicationToApi(
  app: JobApplication
): Partial<LiteApplication> {
  return {
    id: app.id,
    resume_id: app.resumeId,
    jd_id: app.jobId,
    status: canonicalizeStatus(app.status),
    match_score: app.matchScore ?? null,
    applied_date: app.appliedAt ? app.appliedAt.toISOString() : null,
    created_at: app.createdAt.toISOString(),
    updated_at: app.updatedAt.toISOString(),
  };
}

/**
 * LiteApplication → store application. `companyName`/`position` are
 * regenerated from the JD when it is available; without one they fall back
 * to empty strings (the pull path in a later phase supplies the JD).
 */
export function apiApplicationToStore(
  api: LiteApplication,
  jd?: LiteJd
): JobApplication {
  return {
    id: api.id,
    companyName: jd?.company ?? "",
    position: jd?.title ?? "",
    status: canonicalizeStatus(api.status),
    jobId: api.jd_id,
    resumeId: api.resume_id,
    matchScore: api.match_score ?? undefined,
    createdAt: new Date(api.created_at),
    updatedAt: new Date(api.updated_at),
    appliedAt: api.applied_date ? new Date(api.applied_date) : null,
  };
}

/** Read `parsed_json.local` defensively; anything malformed yields empties. */
function readJdLocal(
  parsedJson: LiteJd["parsed_json"]
): { requirements: string[]; skills: string[] } {
  const local = parsedJson?.[JD_LOCAL_PARSED_KEY];
  if (!local || typeof local !== "object" || Array.isArray(local)) {
    return { requirements: [], skills: [] };
  }
  const candidate = local as { requirements?: unknown; skills?: unknown };
  return {
    requirements: toStringArray(candidate.requirements),
    skills: toStringArray(candidate.skills),
  };
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
    ? value
    : [];
}
