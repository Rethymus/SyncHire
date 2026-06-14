"use client";

import { useLayoutEffect, useState, type RefObject } from "react";
import {
  computeFitScale,
  estimatePageCount,
  type FitState,
} from "./one-page";

export interface UseOnePageFitOptions {
  enabled: boolean;
  /** Re-run measurement when any of these change (content, theme, plugin flags...). */
  deps: ReadonlyArray<unknown>;
  pageRef: RefObject<HTMLElement | null>;
}

export interface OnePageFitResult {
  /** Font-size multiplier the preview should apply (1.0 = base). */
  scale: number;
  state: FitState;
  estimatedPages: number;
}

/**
 * Measure the rendered A4 page and, when enabled, binary-search the largest
 * font multiplier that keeps it on one page. The component applies `scale` to
 * the page's font-size; the hook only reads layout and reports a result.
 */
export function useOnePageFit({
  enabled,
  deps,
  pageRef,
}: UseOnePageFitOptions): OnePageFitResult {
  const [scale, setScale] = useState(1);
  const [state, setState] = useState<FitState>("idle");
  const [estimatedPages, setEstimatedPages] = useState(1);

  useLayoutEffect(() => {
    const el = pageRef.current;
    if (!el) {
      return;
    }
    const pageHeight = el.clientHeight;
    if (pageHeight <= 0) {
      return;
    }

    const restore = el.style.fontSize;
    try {
      if (!enabled) {
        el.style.fontSize = "";
        const contentHeight = el.scrollHeight;
        setScale(1);
        setState("idle");
        setEstimatedPages(estimatePageCount(contentHeight, pageHeight));
        return;
      }

      const measure = (s: number) => {
        el.style.fontSize = `calc(10.5pt * ${s})`;
        return el.scrollHeight;
      };
      const result = computeFitScale(measure, pageHeight);

      // Base-page estimate (scale 1) for the indicator.
      el.style.fontSize = "";
      const baseHeight = el.scrollHeight;

      setScale(result.scale);
      setState(result.state);
      setEstimatedPages(estimatePageCount(baseHeight, pageHeight));
    } finally {
      // Let the component's controlled inline style (driven by `scale`) take over.
      el.style.fontSize = "";
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, pageRef, ...deps]);

  return { scale, state, estimatedPages };
}
