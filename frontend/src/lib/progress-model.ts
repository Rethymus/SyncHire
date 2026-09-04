/**
 * Progress display model — pure, deterministic aggregation over
 * `LiteApplication[]` (the envelope-core `/applications/` payload).
 *
 * Design constraints (see docs/DESIGN_ETHICS.md for the full rationale):
 * - The hero metric counts CONTROLLABLE PROCESS ACTIONS (creating an
 *   application, advancing its status), not outcomes. Job-search
 *   interventions that build skills/self-efficacy outperform
 *   outcome-only feedback (Liu, Huang & Wang, 2014).
 * - Weekly framing supports perceived progress, which self-regulates
 *   search effort (Wanberg, Zhu & van Hooft, 2010). The model never
 *   produces "days since you last acted" style shaming inputs.
 *
 * Mapping policy (mirrors match-display-model.ts):
 * - Only fields that actually exist on `LiteApplication` are read.
 * - Unknown values stay unknown: a missing/invalid timestamp contributes
 *   no activity rather than an invented date. Rates return `null`
 *   (not 0%) when their denominator is 0.
 * - Timestamps are bucketed into ISO weeks (Monday start) in local time;
 *   every function that depends on "today" accepts a `now` parameter so
 *   tests stay deterministic.
 */

import type { ApplicationStatus } from "@/lib/api-client";
import type { JobApplication as StoreApplication } from "@/lib/store";
import { canonicalizeStatus } from "@/lib/status-vocabulary";

/**
 * Structural input the progress model actually reads. `LiteApplication`
 * (envelope-core API payload) satisfies it directly; the lite-store
 * `JobApplication` reaches it through `storeApplicationToProgress`.
 */
export interface ProgressApplication {
  id: string;
  status: ApplicationStatus;
  created_at?: string | null;
  updated_at?: string | null;
  applied_date?: string | null;
  submitted_manually_at?: string | null;
  last_updated?: string | null;
}

/** Activity types counted as controllable process actions. */
export type ProgressActivityType = "created" | "applied" | "interview";

export interface ActivityCounts {
  created: number;
  applied: number;
  interview: number;
}

/** One ISO week in the visible window (zero-filled). */
export interface WeekActivity {
  /** Local-time ISO week start, "YYYY-MM-DD" (always a Monday). */
  weekKey: string;
  /** Same instant as `weekKey`, for sorting/labels. */
  weekStart: Date;
  /** Compact axis label, e.g. "8/24". */
  label: string;
  counts: ActivityCounts;
  total: number;
  isCurrentWeek: boolean;
}

export interface StatusDistributionEntry {
  status: ApplicationStatus;
  count: number;
}

/** A rate as raw counts; the UI renders "x/y" without percentages. */
export interface RateCounts {
  numerator: number;
  denominator: number;
}

export interface ProgressSummary {
  /** Oldest → newest, length = `weeksToShow`, zero-filled. */
  weeks: WeekActivity[];
  currentWeek: {
    weekKey: string;
    counts: ActivityCounts;
    actionCount: number;
  };
  /** All real ApplicationStatus values in enum order, zero counts included. */
  statusDistribution: StatusDistributionEntry[];
  /** Activity totals across ALL applications, including weeks outside the window. */
  totals: ActivityCounts & { applications: number };
  /**
   * Applications where the company visibly moved things forward
   * (screening/interview/offer/hired/rejected) over applications that were
   * actually applied. `null` while nothing has been applied (unknown, not 0%).
   */
  responseRate: RateCounts | null;
  /**
   * Applications that reached an interview stage at some point
   * (interview/technical/offer/hired today) over applied base. `null`
   * while nothing has been applied.
   */
  interviewRate: RateCounts | null;
}

/**
 * The real ApplicationStatus enum (openapi: ApplicationStatus), in enum order.
 * NOTE: there is no "closed" value — `rejected` and `withdrawn` are the two
 * terminal closed-out statuses.
 */
export const ALL_APPLICATION_STATUSES: readonly ApplicationStatus[] = [
  "saved",
  "targeted",
  "materials_ready",
  "submitted",
  "applied",
  "screening",
  "interview",
  "technical",
  "offer",
  "hired",
  "rejected",
  "withdrawn",
];

/**
 * Statuses that imply the application was actually sent out at some point
 * (past the local prep stages). Used as the denominator base for the rates.
 */
const APPLIED_OR_BEYOND: ReadonlySet<ApplicationStatus> = new Set([
  "submitted",
  "applied",
  "screening",
  "interview",
  "technical",
  "offer",
  "hired",
  "rejected",
]);

/** Statuses that mean the application is in an interview stage right now. */
export const INTERVIEW_STAGE_STATUSES: ReadonlySet<ApplicationStatus> = new Set([
  "interview",
  "technical",
]);

/**
 * Statuses that imply the company responded (moved past applied/submitted
 * without silence). `screening` counts — someone looked at it.
 */
const RESPONDED_STATUSES: ReadonlySet<ApplicationStatus> = new Set([
  "screening",
  "interview",
  "technical",
  "offer",
  "hired",
  "rejected",
]);

/**
 * Statuses that today sit at or beyond a passed interview (interview itself
 * plus the stages that can only follow one).
 */
const EVER_INTERVIEWED_STATUSES: ReadonlySet<ApplicationStatus> = new Set([
  "interview",
  "technical",
  "offer",
  "hired",
]);

/**
 * Terminal closed-out statuses. The rejection-recovery flow is offered for
 * these (the real enum has no "closed"; `withdrawn` is a closed outcome the
 * user chose, so its card copy stays decision-neutral).
 */
export const CLOSED_OUT_STATUSES: readonly ApplicationStatus[] = [
  "rejected",
  "withdrawn",
];

/**
 * Parse a backend timestamp defensively. Returns `null` for missing, empty,
 * or invalid values — unknown stays unknown, never `new Date(0)`.
 */
export function parseProgressTimestamp(
  value: string | null | undefined
): Date | null {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Monday 00:00 (local time) of the ISO week containing `date`. */
export function getIsoWeekStart(date: Date): Date {
  const start = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
  const day = start.getDay(); // 0 = Sunday … 6 = Saturday
  const offsetToMonday = (day + 6) % 7;
  start.setDate(start.getDate() - offsetToMonday);
  return start;
}

/** Local-time "YYYY-MM-DD" key for a date (no timezone shifting). */
export function getLocalDateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Compact chart-axis label, e.g. "8/24". */
export function formatWeekLabel(weekStart: Date): string {
  return `${weekStart.getMonth() + 1}/${weekStart.getDate()}`;
}

/**
 * Derive the dated activity signals of one application from fields that
 * actually exist on `LiteApplication`. Field-by-field rules:
 *
 * - `created`   <- `created_at` (required by the schema; tolerated missing).
 * - `applied`   <- `applied_date`, else `submitted_manually_at`, else — when
 *                 the current status proves it was sent out — `updated_at`
 *                 as an APPROXIMATION (documented; the API has no
 *                 "advanced-to-applied" timestamp). If nothing backs it,
 *                 stays null.
 * - `interview` <- only for applications currently in an interview stage
 *                 (`interview` / `technical`): `last_updated` else
 *                 `updated_at`, again an approximation of when the stage was
 *                 reached. Historical interview activity that has since
 *                 moved on is not dated anywhere on the application object,
 *                 so it is intentionally not counted here (the status
 *                 distribution and `interviewRate` still see it via status).
 */
export function deriveApplicationActivities(application: ProgressApplication): {
  created: Date | null;
  applied: Date | null;
  interview: Date | null;
} {
  const created = parseProgressTimestamp(application?.created_at);

  const applied =
    parseProgressTimestamp(application?.applied_date) ??
    parseProgressTimestamp(application?.submitted_manually_at) ??
    (APPLIED_OR_BEYOND.has(application?.status)
      ? parseProgressTimestamp(application?.updated_at)
      : null);

  const interview = INTERVIEW_STAGE_STATUSES.has(application?.status)
    ? parseProgressTimestamp(application?.last_updated) ??
      parseProgressTimestamp(application?.updated_at)
    : null;

  return { created, applied, interview };
}

function emptyCounts(): ActivityCounts {
  return { created: 0, applied: 0, interview: 0 };
}

function addToCounts(counts: ActivityCounts, type: ProgressActivityType): void {
  counts[type] += 1;
}

/**
 * Aggregate applications into the weekly action summary consumed by the
 * 求职进度 page. Pure: identical inputs (including `now`) produce identical
 * output. `weeksToShow` defaults to 6 — enough for a weekly rhythm without
 * ranking the user against a long history.
 */
export function buildProgressSummary(
  applications: ProgressApplication[],
  now: Date,
  weeksToShow: number = 6
): ProgressSummary {
  const windowSize = Math.max(1, Math.floor(weeksToShow));

  const currentWeekStart = getIsoWeekStart(now);
  const currentWeekKey = getLocalDateKey(currentWeekStart);

  // Oldest → newest zero-filled window.
  const weekBuckets = new Map<string, WeekActivity>();
  const orderedWeeks: WeekActivity[] = [];
  for (let i = windowSize - 1; i >= 0; i -= 1) {
    const weekStart = new Date(currentWeekStart);
    weekStart.setDate(weekStart.getDate() - 7 * i);
    const weekKey = getLocalDateKey(weekStart);
    const week: WeekActivity = {
      weekKey,
      weekStart,
      label: formatWeekLabel(weekStart),
      counts: emptyCounts(),
      total: 0,
      isCurrentWeek: weekKey === currentWeekKey,
    };
    weekBuckets.set(weekKey, week);
    orderedWeeks.push(week);
  }

  const totals = { ...emptyCounts(), applications: applications.length };
  const statusCounts = new Map<ApplicationStatus, number>();
  let respondedCount = 0;
  let everInterviewedCount = 0;
  let appliedBase = 0;

  for (const application of applications ?? []) {
    const status = application?.status;
    if (status) {
      statusCounts.set(status, (statusCounts.get(status) ?? 0) + 1);
      if (APPLIED_OR_BEYOND.has(status)) {
        appliedBase += 1;
      }
      if (RESPONDED_STATUSES.has(status)) {
        respondedCount += 1;
      }
      if (EVER_INTERVIEWED_STATUSES.has(status)) {
        everInterviewedCount += 1;
      }
    }

    const activities = deriveApplicationActivities(application);

    for (const type of ["created", "applied", "interview"] as const) {
      const timestamp = activities[type];
      if (!timestamp) continue;

      totals[type] += 1;

      const weekKey = getLocalDateKey(getIsoWeekStart(timestamp));
      const bucket = weekBuckets.get(weekKey);
      if (!bucket) continue; // Outside the visible window; still in `totals`.

      addToCounts(bucket.counts, type);
      bucket.total += 1;
    }
  }

  const currentWeekBucket = weekBuckets.get(currentWeekKey);
  const currentWeekCounts = currentWeekBucket
    ? { ...currentWeekBucket.counts }
    : emptyCounts();

  return {
    weeks: orderedWeeks,
    currentWeek: {
      weekKey: currentWeekKey,
      counts: currentWeekCounts,
      actionCount:
        currentWeekCounts.created +
        currentWeekCounts.applied +
        currentWeekCounts.interview,
    },
    statusDistribution: ALL_APPLICATION_STATUSES.map((status) => ({
      status,
      count: statusCounts.get(status) ?? 0,
    })),
    totals,
    responseRate: appliedBase > 0 ? { numerator: respondedCount, denominator: appliedBase } : null,
    interviewRate:
      appliedBase > 0
        ? { numerator: everInterviewedCount, denominator: appliedBase }
        : null,
  };
}

// ---------------------------------------------------------------------------
// Lite-store adapter
// ---------------------------------------------------------------------------

function toIsoOrNull(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/**
 * Map a lite-store application into the progress input shape.
 *
 * The store now carries the canonical status directly (legacy persisted
 * values are normalized at hydration — lib/status-vocabulary.ts), so the
 * old status remapping is gone. `appliedAt` is stamped by the store the
 * moment a status first proves the application was sent out; it maps to
 * `applied_date`, replacing the former updatedAt approximation. Records
 * hydrated before `appliedAt` existed were backfilled at hydration, so the
 * approximation lives in exactly one place (the store) rather than here.
 */
export function storeApplicationToProgress(
  application: StoreApplication
): ProgressApplication {
  const updatedAt = toIsoOrNull(application?.updatedAt);
  return {
    id: application?.id ?? "",
    // Canonicalize defensively: hydration normalizes persisted data, but
    // the adapter is the progress boundary and in-memory callers (tests,
    // optimistic creates) may bypass it.
    status: canonicalizeStatus(application?.status),
    created_at: toIsoOrNull(application?.createdAt),
    updated_at: updatedAt,
    applied_date: toIsoOrNull(application?.appliedAt),
    submitted_manually_at: null,
    last_updated: updatedAt,
  };
}
