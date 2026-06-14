"use client";

import { memo, useEffect, useMemo, useRef, type RefObject } from "react";
import { renderResumeMarkdown } from "@/lib/resume-md";
import { getResumeThemeStyles } from "@/lib/resume-builder/themes";
import { useOnePageFit, type OnePageFitResult } from "@/lib/resume-builder/use-one-page-fit";

export interface ResumePreviewProps {
  content: string;
  themeId: string;
  columns: boolean;
  icons: boolean;
  onePage: boolean;
  /** Optional generated business headshot (data URL) shown atop the resume. */
  portraitUrl?: string;
  /** Receives the rendered A4 page element (for PNG export). */
  pageRef?: RefObject<HTMLElement | null>;
  /** Receives the latest fit result so the toolbar can show page count. */
  onFitChange?: (result: OnePageFitResult) => void;
}

function ResumePreviewBase({
  content,
  themeId,
  columns,
  icons,
  onePage,
  portraitUrl,
  pageRef,
  onFitChange,
}: ResumePreviewProps) {
  const internalRef = useRef<HTMLElement>(null);
  const ref = pageRef ?? internalRef;

  const html = useMemo(
    () => renderResumeMarkdown(content, { columns, icons }),
    [content, columns, icons],
  );

  const styles = useMemo(() => getResumeThemeStyles(themeId), [themeId]);

  const fit = useOnePageFit({
    enabled: onePage,
    pageRef: ref,
    deps: [content, themeId, columns, icons, portraitUrl],
  });

  // Bubble the fit result up only when it actually changes.
  useEffect(() => {
    onFitChange?.(fit);
  }, [fit, onFitChange]);

  const pageStyle = onePage
    ? { fontSize: `calc(10.5pt * ${fit.scale})` }
    : undefined;

  // The portrait is rendered as a real <img> (NOT through dangerouslySetInnerHTML)
  // because the global sanitizer strips data: URLs. Placing it inside the A4 page
  // element keeps it in print/PNG export.
  return (
    <div className="synchire-resume-shell h-full">
      <style>{styles}</style>
      <main
        ref={ref as React.RefObject<HTMLElement>}
        className="synchire-resume-page"
        style={pageStyle}
      >
        {portraitUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={portraitUrl}
            alt="证件照"
            className="resume-portrait"
          />
        ) : null}
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </main>
    </div>
  );
}

export const ResumePreview = memo(ResumePreviewBase);
