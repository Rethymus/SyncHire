/**
 * Single home for the application status vocabulary.
 *
 * Historically this repo had THREE parallel status vocabularies: the real
 * 12-value `ApplicationStatus` in api-client (openapi), a 7-value legacy
 * union in the lite store, and a duplicate 7-value union in
 * workflow-engine. The lite store now stores the canonical enum (legacy
 * persisted values are normalized on hydration), so every consumer should
 * import the type and helpers from here instead of re-declaring unions.
 *
 * Canonical = the openapi `ApplicationStatus` — see api-client.ts.
 */

import type { ApplicationStatus } from "@/lib/api-client";

export type { ApplicationStatus };

/** All canonical values, in openapi enum order. */
export const CANONICAL_STATUSES: readonly ApplicationStatus[] = [
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

const CANONICAL_SET: ReadonlySet<string> = new Set(CANONICAL_STATUSES);

/**
 * Legacy lite-store status values (pre-canonical persisted data, e2e
 * seeds). Mapped on hydration; kept here so the mapping has exactly one
 * home. `pending` maps to `submitted` (handed over and waiting),
 * `optimized` to `materials_ready` (a local prep stage) — both preserve
 * the "controllable process" framing of the progress page.
 */
export const LEGACY_STATUS_TO_CANONICAL: ReadonlyMap<string, ApplicationStatus> =
  new Map([
    ["draft", "saved"],
    ["optimized", "materials_ready"],
    ["pending", "submitted"],
  ]);

/**
 * Normalize a persisted (possibly legacy or unknown) status value.
 * Canonical values pass through, legacy values map forward, and anything
 * unknown falls back to `saved` rather than dropping the record — a
 * dropped record would silently understate totals (docs/DESIGN_ETHICS.md
 * §4).
 */
export function canonicalizeStatus(value: unknown): ApplicationStatus {
  if (typeof value === "string") {
    if (CANONICAL_SET.has(value)) {
      return value as ApplicationStatus;
    }
    const legacy = LEGACY_STATUS_TO_CANONICAL.get(value);
    if (legacy) return legacy;
  }
  return "saved";
}

/** Statuses that imply the application was actually sent out. */
export const APPLIED_OR_BEYOND: ReadonlySet<ApplicationStatus> = new Set([
  "submitted",
  "applied",
  "screening",
  "interview",
  "technical",
  "offer",
  "hired",
  "rejected",
]);

/** True when the status proves the application was handed over at some point. */
export function statusImpliesSent(status: ApplicationStatus): boolean {
  return APPLIED_OR_BEYOND.has(status);
}

/**
 * Neutral display labels (Chinese primary, English gloss) — deliberately
 * non-judgmental wording per docs/DESIGN_ETHICS.md: `rejected` renders as
 * 已拒绝 (what happened), never 被淘汰 (a verdict about the person).
 */
export const STATUS_LABELS_ZH: Record<ApplicationStatus, string> = {
  saved: "已收藏",
  targeted: "已定位",
  materials_ready: "材料就绪",
  submitted: "已递交",
  applied: "已投递",
  screening: "筛选中",
  interview: "面试中",
  technical: "技术面",
  offer: "Offer",
  hired: "已入职",
  rejected: "已拒绝",
  withdrawn: "已撤回",
};

export const STATUS_LABELS_EN: Record<ApplicationStatus, string> = {
  saved: "Saved",
  targeted: "Targeted",
  materials_ready: "Materials ready",
  submitted: "Submitted",
  applied: "Sent",
  screening: "Screening",
  interview: "Interview",
  technical: "Technical round",
  offer: "Offer",
  hired: "Hired",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

/** Aliases kept for the progress components' historical import path. */
export const PROGRESS_STATUS_LABELS = STATUS_LABELS_ZH;
export const PROGRESS_STATUS_LABELS_EN = STATUS_LABELS_EN;

export function progressStatusLabels(locale: "zh-CN" | "en-US"): Record<ApplicationStatus, string> {
  return locale === "en-US" ? STATUS_LABELS_EN : STATUS_LABELS_ZH;
}
