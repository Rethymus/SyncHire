/**
 * Resume export — PDF / PNG / Markdown.
 *
 * - PDF: open the standalone A4 document in a new window and trigger the
 *   browser print dialog (vector text, exact layout). This matches how
 *   professional Markdown-resume tools produce PDFs without a headless Chrome
 *   dependency, and respects the print stylesheet in {@link getResumeThemeStyles}.
 * - PNG: rasterize the live preview node with `html-to-image`.
 * - MD: download the raw markdown source as a `.md` blob.
 */

import { toPng } from "html-to-image";
import { buildResumeThemeDocumentHtml } from "./themes";

function safeFilename(name?: string | null, fallback = "resume"): string {
  const raw = (name || "").trim() || fallback;
  return raw.replace(/[\\/:*?"<>|]/g, "-").slice(0, 80);
}

function triggerDownload(href: string, filename: string): void {
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

/** Download the raw markdown source. */
export function exportResumeMarkdown(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  triggerDownload(url, `${safeFilename(filename)}.md`);
  // Revoke on the next tick so the download has a chance to start.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Rasterize the resume preview node to a PNG. Pass the `.synchire-resume-page`
 * element (or the shell). The capture is forced to full A4 dimensions so the
 * output is print-quality regardless of the on-screen scaled width.
 */
export async function exportResumePng(
  node: HTMLElement,
  filename: string,
): Promise<void> {
  // A4 @ 96dpi ≈ 794×1123. pixelRatio 2 → ~1588×2246, crisp for print.
  const dataUrl = await toPng(node, {
    pixelRatio: 2,
    cacheBust: true,
    width: 794,
    height: 1123,
    style: {
      width: "210mm",
      minWidth: "210mm",
      maxWidth: "210mm",
      aspectRatio: "auto",
      boxShadow: "none",
    },
  });
  triggerDownload(dataUrl, `${safeFilename(filename)}.png`);
}

/**
 * Open the print dialog for the resume (Save as PDF in the browser dialog).
 * Throws a user-friendly error if the popup is blocked.
 */
export function printResumeToPdf(
  markdown: string,
  themeId: string,
  filename: string,
  portraitUrl?: string | null,
): void {
  const html = buildResumeThemeDocumentHtml(markdown, themeId, portraitUrl);
  const printWindow = window.open("", "_blank", "noopener,noreferrer,width=900,height=1200");
  if (!printWindow) {
    throw new Error(
      "无法打开打印窗口，请允许本站的弹出式窗口后重试。",
    );
  }
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();

  // Give fonts/layout a tick to settle before invoking print.
  setTimeout(() => {
    printWindow.print();
    // Some browsers close the dialog tab automatically; offer cleanup otherwise.
    setTimeout(() => {
      try {
        printWindow.close();
      } catch {
        // ignore — user may still be in the dialog
      }
    }, 500);
  }, 450);
}
