/**
 * Smart one-page ("智能一页") helpers.
 *
 * The preview measures the rendered A4 page; if content overflows, we shrink
 * the base font size by a {@link MIN_SCALE}–1.0 multiplier until it fits (never
 * upscale — only compress). Pure helpers here; the DOM measurement lives in
 * the {@link useOnePageFit} hook.
 */

export const MIN_SCALE = 0.74;
/** Binary-search iterations — 8 gives <0.5% precision over the [MIN_SCALE, 1] band. */
export const FIT_ITERATIONS = 8;

export type FitState = "idle" | "fit" | "overflow";

export interface OnePageFit {
  /** Font-size multiplier to apply (1.0 = no change). */
  scale: number;
  /** Whether content currently fits the A4 page at this scale. */
  state: FitState;
  /** Estimated page count at scale 1.0 (for the indicator when auto-fit is off). */
  estimatedPages: number;
}

/**
 * Binary-search the largest font multiplier in [MIN_SCALE, 1] for which the
 * measured content height fits the page height. `measure(scale)` must return
 * the content's pixel height when the page is rendered at that multiplier.
 */
export function computeFitScale(
  measure: (scale: number) => number,
  pageHeightPx: number,
): { scale: number; state: FitState } {
  // Short content — already fits at full size; never upscale.
  if (measure(1) <= pageHeightPx) {
    return { scale: 1, state: "fit" };
  }
  // Even the minimum scale can't bring it onto one page.
  if (measure(MIN_SCALE) > pageHeightPx) {
    return { scale: MIN_SCALE, state: "overflow" };
  }

  let lo = MIN_SCALE;
  let hi = 1;
  let best = MIN_SCALE;
  for (let i = 0; i < FIT_ITERATIONS; i += 1) {
    const mid = (lo + hi) / 2;
    if (measure(mid) <= pageHeightPx) {
      best = mid;
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return { scale: best, state: "fit" };
}

export function estimatePageCount(contentHeightPx: number, pageHeightPx: number): number {
  if (pageHeightPx <= 0) {
    return 1;
  }
  return Math.max(1, Math.ceil(contentHeightPx / pageHeightPx - 0.02));
}

export function clampScale(scale: number): number {
  if (!Number.isFinite(scale)) {
    return 1;
  }
  return Math.min(1, Math.max(MIN_SCALE, scale));
}
