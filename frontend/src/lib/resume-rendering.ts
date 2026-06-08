import { marked } from "marked";
import { sanitizeMarkdownHtml } from "./sanitize";
import type { LiteLocale } from "./lite-i18n";

export type ResumeTemplateId = "minimal" | "professional" | "modern" | "technical" | "executive" | "creative";

const TEMPLATE_TOKENS: Record<
  ResumeTemplateId,
  {
    label: Record<LiteLocale, string>;
    accent: string;
    heading: string;
    border: string;
    background: string;
  }
> = {
  minimal: {
    label: { "en-US": "Minimal", "zh-CN": "简约" },
    accent: "#111827",
    heading: "#111827",
    border: "#d1d5db",
    background: "#ffffff",
  },
  professional: {
    label: { "en-US": "Professional", "zh-CN": "商务" },
    accent: "#0f766e",
    heading: "#0f172a",
    border: "#99f6e4",
    background: "#ffffff",
  },
  modern: {
    label: { "en-US": "Modern", "zh-CN": "现代" },
    accent: "#2563eb",
    heading: "#172554",
    border: "#bfdbfe",
    background: "#ffffff",
  },
  technical: {
    label: { "en-US": "Technical", "zh-CN": "技术" },
    accent: "#7c3aed",
    heading: "#2e1065",
    border: "#ddd6fe",
    background: "#ffffff",
  },
  executive: {
    label: { "en-US": "Executive", "zh-CN": "高管" },
    accent: "#9f1239",
    heading: "#111827",
    border: "#fecdd3",
    background: "#ffffff",
  },
  creative: {
    label: { "en-US": "Creative", "zh-CN": "创意" },
    accent: "#c2410c",
    heading: "#1f2937",
    border: "#fed7aa",
    background: "#ffffff",
  },
};

export function normalizeResumeTemplateId(templateId?: string): ResumeTemplateId {
  if (
    templateId === "minimal" ||
    templateId === "professional" ||
    templateId === "modern" ||
    templateId === "technical" ||
    templateId === "executive" ||
    templateId === "creative"
  ) {
    return templateId;
  }

  return "minimal";
}

export function getResumeTemplateLabel(templateId?: string, locale: LiteLocale = "zh-CN") {
  return TEMPLATE_TOKENS[normalizeResumeTemplateId(templateId)].label[locale];
}

export function renderResumeMarkdownHtml(markdown: string) {
  const rawHtml = marked(markdown, { gfm: true, breaks: false }) as string;
  return sanitizeMarkdownHtml(rawHtml);
}

export function getResumeTemplateStyles(templateId?: string) {
  const tokens = TEMPLATE_TOKENS[normalizeResumeTemplateId(templateId)];

  return `
    .synchire-resume-page {
      --resume-accent: ${tokens.accent};
      --resume-heading: ${tokens.heading};
      --resume-border: ${tokens.border};
      --resume-bg: ${tokens.background};
      box-sizing: border-box;
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      padding: 18mm 18mm 16mm;
      background: var(--resume-bg);
      color: #111827;
      font-family: "Noto Sans CJK SC", "Microsoft YaHei", "PingFang SC", "Source Han Sans SC", Arial, sans-serif;
      font-size: 10.5pt;
      line-height: 1.48;
      letter-spacing: 0;
    }
    .synchire-resume-page * { box-sizing: border-box; }
    .synchire-resume-page h1 {
      margin: 0 0 4mm;
      color: var(--resume-heading);
      font-size: 25pt;
      line-height: 1.1;
      font-weight: 800;
      letter-spacing: 0;
    }
    .synchire-resume-page h1 + p,
    .synchire-resume-page h1 + p + p {
      margin-top: 0;
      color: #4b5563;
      font-size: 9.5pt;
    }
    .synchire-resume-page h2 {
      margin: 7mm 0 2.4mm;
      padding-bottom: 1.4mm;
      border-bottom: 0.45mm solid var(--resume-border);
      color: var(--resume-heading);
      font-size: 12pt;
      line-height: 1.2;
      font-weight: 800;
      letter-spacing: 0;
    }
    .synchire-resume-page h3 {
      margin: 4.2mm 0 1.4mm;
      color: #111827;
      font-size: 10.8pt;
      line-height: 1.25;
      font-weight: 700;
    }
    .synchire-resume-page p {
      margin: 1.6mm 0;
    }
    .synchire-resume-page strong {
      color: var(--resume-accent);
      font-weight: 700;
    }
    .synchire-resume-page ul,
    .synchire-resume-page ol {
      margin: 1.5mm 0 0;
      padding-left: 5mm;
    }
    .synchire-resume-page li {
      margin: 1.1mm 0;
      padding-left: 0.5mm;
    }
    .synchire-resume-page a {
      color: var(--resume-accent);
      text-decoration: none;
    }
    .synchire-resume-page blockquote {
      margin: 3mm 0;
      padding: 2.5mm 3mm;
      border-left: 0.8mm solid var(--resume-accent);
      background: #f9fafb;
      color: #374151;
    }
    .synchire-resume-page hr {
      border: 0;
      border-top: 0.3mm solid var(--resume-border);
      margin: 4mm 0;
    }
    .synchire-resume-shell {
      background: #eef2f7;
      padding: 24px;
      overflow: auto;
    }
    .synchire-resume-preview-scale {
      width: min(100%, 210mm);
      margin: 0 auto;
      transform-origin: top center;
    }
    @media screen {
      .synchire-resume-page {
        width: min(100%, 210mm);
        min-height: auto;
        aspect-ratio: 210 / 297;
        overflow: hidden;
        box-shadow: 0 18px 50px rgba(15, 23, 42, 0.16);
      }
    }
    @media print {
      @page {
        size: A4;
        margin: 0;
      }
      body {
        margin: 0;
        background: #ffffff;
      }
      .synchire-resume-page {
        width: 210mm;
        min-height: 297mm;
        box-shadow: none;
      }
    }
  `;
}

export function buildResumeDocumentHtml(markdown: string, templateId?: string) {
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>${getResumeTemplateStyles(templateId)}</style>
  </head>
  <body>
    <main class="synchire-resume-page">${renderResumeMarkdownHtml(markdown)}</main>
  </body>
</html>`;
}
