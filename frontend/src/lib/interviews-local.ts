/**
 * Local interviews storage — the Lite-mode source of truth for interviews.
 *
 * History: the list page read `synchire-interviews` from localStorage while
 * every write path (schedule form, quick-schedule modal, delete button)
 * posted to `/api/interviews` — a route the Lite backend does not expose.
 * Result: scheduled interviews 404'd on create, and would never have shown
 * up in the list anyway. Everything now reads and writes through this
 * module, mirroring how the lite store backs applications.
 */

import type { LiteLocale } from "@/lib/lite-i18n";

export interface LocalInterview {
  id: string;
  title: string;
  description?: string;
  interview_type: string;
  status: string;
  scheduled_date: string;
  duration_minutes: number;
  timezone: string;
  location_type: string;
  location_url?: string;
  location_address?: string;
  meeting_platform?: string;
  meeting_id?: string;
  meeting_password?: string;
  interviewers: Array<{ name: string; role?: string; email?: string }>;
  preparation_notes?: string;
  feedback?: string;
  rating?: number;
  next_steps?: string;
  reminder_enabled: boolean;
  reminder_timings: number[];
  created_at: string;
  updated_at: string;
  job_title?: string;
}

const LOCAL_INTERVIEWS_KEY = "synchire-interviews";

function isValidInterview(item: unknown): item is LocalInterview {
  return (
    typeof item === "object" &&
    item !== null &&
    typeof (item as LocalInterview).id === "string" &&
    typeof (item as LocalInterview).title === "string" &&
    typeof (item as LocalInterview).interview_type === "string" &&
    typeof (item as LocalInterview).status === "string" &&
    typeof (item as LocalInterview).scheduled_date === "string" &&
    typeof (item as LocalInterview).duration_minutes === "number" &&
    typeof (item as LocalInterview).location_type === "string"
  );
}

export function readLocalInterviews(): LocalInterview[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const stored = window.localStorage.getItem(LOCAL_INTERVIEWS_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed.filter(isValidInterview) : [];
  } catch {
    return [];
  }
}

function writeLocalInterviews(interviews: LocalInterview[]): void {
  window.localStorage.setItem(LOCAL_INTERVIEWS_KEY, JSON.stringify(interviews));
}

/** Persist a new (or updated) interview; assigns an id when missing. */
export function saveLocalInterview(
  interview: Omit<LocalInterview, "id"> & { id?: string }
): LocalInterview {
  const interviews = readLocalInterviews();
  const stored: LocalInterview = {
    ...interview,
    id: interview.id ?? `iv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  };
  writeLocalInterviews([stored, ...interviews.filter((i) => i.id !== stored.id)]);
  return stored;
}

export function deleteLocalInterview(id: string): void {
  writeLocalInterviews(readLocalInterviews().filter((i) => i.id !== id));
}

/** Neutral labels for interview statuses (zh primary, en gloss). */
export const INTERVIEW_STATUS_LABELS: Record<string, Record<LiteLocale, string>> = {
  scheduled: { "zh-CN": "已预约", "en-US": "Scheduled" },
  confirmed: { "zh-CN": "已确认", "en-US": "Confirmed" },
  completed: { "zh-CN": "已完成", "en-US": "Completed" },
  cancelled: { "zh-CN": "已取消", "en-US": "Cancelled" },
  rescheduled: { "zh-CN": "已改期", "en-US": "Rescheduled" },
};
