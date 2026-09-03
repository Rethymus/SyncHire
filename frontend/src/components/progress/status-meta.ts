/**
 * Shared labels for the REAL ApplicationStatus enum values
 * (openapi: ApplicationStatus — see frontend/src/lib/api-client.ts).
 *
 * Deliberately neutral wording: statuses are recorded facts, not grades.
 * `rejected` renders as "已拒绝" (what happened), never "被淘汰" (a verdict
 * about the person) — see docs/DESIGN_ETHICS.md, copy do/don't table.
 */

import type { ApplicationStatus } from "@/lib/api-client";
import type { LiteLocale } from "@/lib/lite-i18n";

export const PROGRESS_STATUS_LABELS: Record<ApplicationStatus, string> = {
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

export const PROGRESS_STATUS_LABELS_EN: Record<ApplicationStatus, string> = {
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

export function progressStatusLabels(locale: LiteLocale): Record<ApplicationStatus, string> {
  return locale === "en-US" ? PROGRESS_STATUS_LABELS_EN : PROGRESS_STATUS_LABELS;
}
