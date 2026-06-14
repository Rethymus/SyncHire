/**
 * Resume theme system for the Markdown resume builder.
 *
 * Each theme is a self-contained set of design tokens (accent, heading, icon,
 * font, header treatment) compiled into an A4 stylesheet. The stylesheet also
 * embeds the icon glyph CSS (via {@link getResumeIconCss}) and the column/row
 * layout rules used by the extended-markdown engine (`::: left/right`).
 *
 * The stylesheet is intentionally print-aware (`@media print` + `@page A4`) so
 * the exact on-screen layout is what the browser prints to PDF.
 */

import { renderResumeMarkdown, getResumeIconCss } from "@/lib/resume-md";
import type { LiteLocale } from "@/lib/lite-i18n";

export type ResumeThemeId =
  | "minimal"
  | "professional"
  | "modern"
  | "technical"
  | "executive"
  | "creative"
  | "elegant"
  | "fresh";

export interface ResumeTheme {
  id: ResumeThemeId;
  label: Record<LiteLocale, string>;
  accent: string;
  heading: string;
  icon: string;
  border: string;
  background: string;
  /** CSS font stack for body text. */
  font: string;
  /** CSS font stack for headings (e.g. a serif for classic themes). */
  headingFont: string;
  /** Header (h1) alignment: "left" | "center". */
  headerAlign: "left" | "center";
  /** Decorative treatment under h2 section headings. */
  sectionRule: "line" | "accent-bar" | "none";
  /** A short hex used for the theme swatch preview. */
  swatch: string;
}

export const RESUME_THEMES: ResumeTheme[] = [
  {
    id: "minimal",
    label: { "en-US": "Minimal", "zh-CN": "简约" },
    accent: "#111827",
    heading: "#111827",
    icon: "#4b5563",
    border: "#d1d5db",
    background: "#ffffff",
    font: '"Noto Sans CJK SC","PingFang SC","Microsoft YaHei",Arial,sans-serif',
    headingFont: '"Noto Sans CJK SC","PingFang SC",Arial,sans-serif',
    headerAlign: "left",
    sectionRule: "line",
    swatch: "#111827",
  },
  {
    id: "professional",
    label: { "en-US": "Professional", "zh-CN": "商务" },
    accent: "#0f766e",
    heading: "#0f172a",
    icon: "#0f766e",
    border: "#99f6e4",
    background: "#ffffff",
    font: '"Noto Sans CJK SC","PingFang SC","Microsoft YaHei",Arial,sans-serif',
    headingFont: '"Noto Sans CJK SC","PingFang SC",Arial,sans-serif',
    headerAlign: "left",
    sectionRule: "line",
    swatch: "#0f766e",
  },
  {
    id: "modern",
    label: { "en-US": "Modern", "zh-CN": "现代" },
    accent: "#2563eb",
    heading: "#172554",
    icon: "#2563eb",
    border: "#bfdbfe",
    background: "#ffffff",
    font: '"Noto Sans CJK SC","PingFang SC","Microsoft YaHei",Arial,sans-serif',
    headingFont: '"Noto Sans CJK SC","PingFang SC",Arial,sans-serif',
    headerAlign: "left",
    sectionRule: "accent-bar",
    swatch: "#2563eb",
  },
  {
    id: "technical",
    label: { "en-US": "Technical", "zh-CN": "技术" },
    accent: "#7c3aed",
    heading: "#2e1065",
    icon: "#7c3aed",
    border: "#ddd6fe",
    background: "#ffffff",
    font: '"JetBrains Mono","Noto Sans CJK SC","PingFang SC",monospace',
    headingFont: '"JetBrains Mono","Noto Sans CJK SC",monospace',
    headerAlign: "left",
    sectionRule: "accent-bar",
    swatch: "#7c3aed",
  },
  {
    id: "executive",
    label: { "en-US": "Executive", "zh-CN": "高管" },
    accent: "#9f1239",
    heading: "#111827",
    icon: "#9f1239",
    border: "#fecdd3",
    background: "#ffffff",
    font: '"Noto Serif CJK SC","Source Han Serif SC","Georgia",serif',
    headingFont: '"Noto Serif CJK SC","Source Han Serif SC","Georgia",serif',
    headerAlign: "center",
    sectionRule: "line",
    swatch: "#9f1239",
  },
  {
    id: "creative",
    label: { "en-US": "Creative", "zh-CN": "创意" },
    accent: "#c2410c",
    heading: "#1f2937",
    icon: "#c2410c",
    border: "#fed7aa",
    background: "#fffdf7",
    font: '"Noto Sans CJK SC","PingFang SC","Microsoft YaHei",Arial,sans-serif',
    headingFont: '"Noto Sans CJK SC","PingFang SC",Arial,sans-serif',
    headerAlign: "left",
    sectionRule: "accent-bar",
    swatch: "#c2410c",
  },
  {
    id: "elegant",
    label: { "en-US": "Elegant", "zh-CN": "雅致" },
    accent: "#4338ca",
    heading: "#1e1b4b",
    icon: "#4338ca",
    border: "#c7d2fe",
    background: "#ffffff",
    font: '"Noto Serif CJK SC","Source Han Serif SC","Georgia",serif',
    headingFont: '"Noto Serif CJK SC","Source Han Serif SC","Georgia",serif',
    headerAlign: "center",
    sectionRule: "line",
    swatch: "#4338ca",
  },
  {
    id: "fresh",
    label: { "en-US": "Fresh", "zh-CN": "清新" },
    accent: "#059669",
    heading: "#064e3b",
    icon: "#059669",
    border: "#a7f3d0",
    background: "#fbffff",
    font: '"Noto Sans CJK SC","PingFang SC","Microsoft YaHei",Arial,sans-serif',
    headingFont: '"Noto Sans CJK SC","PingFang SC",Arial,sans-serif',
    headerAlign: "left",
    sectionRule: "accent-bar",
    swatch: "#059669",
  },
];

const THEME_MAP: Record<ResumeThemeId, ResumeTheme> = RESUME_THEMES.reduce(
  (acc, theme) => {
    acc[theme.id] = theme;
    return acc;
  },
  {} as Record<ResumeThemeId, ResumeTheme>,
);

export function normalizeResumeThemeId(id?: string | null): ResumeThemeId {
  if (id && id in THEME_MAP) {
    return id as ResumeThemeId;
  }
  return "minimal";
}

export function getResumeTheme(id?: string | null): ResumeTheme {
  return THEME_MAP[normalizeResumeThemeId(id)];
}

export function getResumeThemeLabel(id?: string | null, locale: LiteLocale = "zh-CN"): string {
  return getResumeTheme(id).label[locale];
}

/** Full A4 stylesheet for a theme, including icon glyphs + column layout. */
export function getResumeThemeStyles(themeId?: string | null): string {
  const t = getResumeTheme(themeId);
  const sectionRuleCss =
    t.sectionRule === "accent-bar"
      ? `.synchire-resume-page h2{
        margin:7mm 0 2.4mm;
        padding:1mm 0 1mm 3mm;
        border-left:1.2mm solid var(--resume-accent);
        color:var(--resume-heading);
        font-size:12pt;line-height:1.2;font-weight:800;
      }`
      : t.sectionRule === "none"
        ? `.synchire-resume-page h2{
        margin:7mm 0 2.4mm;color:var(--resume-heading);
        font-size:12pt;line-height:1.2;font-weight:800;
      }`
        : `.synchire-resume-page h2{
        margin:7mm 0 2.4mm;padding-bottom:1.4mm;
        border-bottom:0.45mm solid var(--resume-border);
        color:var(--resume-heading);font-size:12pt;line-height:1.2;font-weight:800;
      }`;

  return `
    .synchire-resume-page{
      --resume-accent:${t.accent};
      --resume-heading:${t.heading};
      --resume-icon-color:${t.icon};
      --resume-border:${t.border};
      --resume-bg:${t.background};
      box-sizing:border-box;
      width:210mm;min-height:297mm;margin:0 auto;
      padding:18mm 18mm 16mm;
      background:var(--resume-bg);color:#111827;
      font-family:${t.font};
      font-size:10.5pt;line-height:1.5;letter-spacing:0;
    }
    .synchire-resume-page *{box-sizing:border-box;}
    .synchire-resume-page .resume-portrait{
      float:right;
      width:24mm;
      height:24mm;
      margin:0 0 4mm 6mm;
      object-fit:cover;
      border-radius:50%;
      border:0.4mm solid var(--resume-border);
      background:#fff;
      shape-outside:circle();
    }
    .synchire-resume-page h1{
      margin:0 0 4mm;color:var(--resume-heading);
      font-size:25pt;line-height:1.1;font-weight:800;
      text-align:${t.headerAlign};
      font-family:${t.headingFont};
    }
    .synchire-resume-page h2{font-family:${t.headingFont};}
    .synchire-resume-page h3{
      margin:4.2mm 0 1.4mm;color:#111827;
      font-size:10.8pt;line-height:1.25;font-weight:700;
    }
    .synchire-resume-page p{margin:1.4mm 0;}
    .synchire-resume-page strong{color:var(--resume-accent);font-weight:700;}
    .synchire-resume-page ul,.synchire-resume-page ol{margin:1.5mm 0 0;padding-left:5mm;}
    .synchire-resume-page li{margin:1.05mm 0;padding-left:0.5mm;}
    .synchire-resume-page a{color:var(--resume-accent);text-decoration:none;}
    .synchire-resume-page blockquote{
      margin:3mm 0;padding:2.5mm 3mm;
      border-left:0.8mm solid var(--resume-accent);
      background:#f9fafb;color:#374151;
    }
    .synchire-resume-page hr{border:0;border-top:0.3mm solid var(--resume-border);margin:4mm 0;}
    .synchire-resume-page code{
      font-family:"JetBrains Mono",monospace;font-size:9.5pt;
      background:#f3f4f6;padding:0.4mm 1.2mm;border-radius:1.2mm;
    }
    /* Column layout from ::: left / ::: right containers */
    .synchire-resume-page .resume-row{
      display:flex;flex-wrap:wrap;align-items:flex-start;
      gap:6mm;margin:0 0 2mm;
    }
    .synchire-resume-page .resume-col{min-width:0;flex:1 1 0;}
    .synchire-resume-page .resume-col-left{flex:1 1 60%;}
    .synchire-resume-page .resume-col-right{
      flex:1 1 32%;margin-left:auto;text-align:right;
    }
    .synchire-resume-page .resume-col-center{flex:1 1 100%;text-align:center;}
    .synchire-resume-page .resume-col p{margin:0.6mm 0;}
    /* Inline icon glyphs */
    ${getResumeIconCss(".synchire-resume-page")}
    ${sectionRuleCss}
    .synchire-resume-shell{background:#eef2f7;padding:24px;overflow:auto;}
    @media screen{
      .synchire-resume-page{
        width:min(100%,210mm);min-height:auto;
        aspect-ratio:210/297;overflow:hidden;
        box-shadow:0 18px 50px rgba(15,23,42,0.16);
      }
    }
    @media print{
      @page{size:A4;margin:0;}
      body{margin:0;background:#fff;}
      .synchire-resume-page{width:210mm;min-height:297mm;box-shadow:none;}
      .synchire-resume-shell{background:#fff;padding:0;overflow:visible;}
    }
  `;
}

/** Build a complete standalone HTML document (used by PNG rasterization / print). */
export function buildResumeThemeDocumentHtml(
  markdown: string,
  themeId?: string | null,
): string {
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>${getResumeThemeStyles(themeId)}</style>
  </head>
  <body>
    <main class="synchire-resume-page">${renderResumeMarkdown(markdown)}</main>
  </body>
</html>`;
}
