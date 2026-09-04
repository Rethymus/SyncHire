/**
 * Re-export of the canonical status label maps — the single home is
 * lib/status-vocabulary.ts so both lib and component layers share one
 * vocabulary. New code should import from lib/status-vocabulary directly.
 */

export {
  PROGRESS_STATUS_LABELS,
  PROGRESS_STATUS_LABELS_EN,
  progressStatusLabels,
} from "@/lib/status-vocabulary";
