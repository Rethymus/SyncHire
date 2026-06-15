/**
 * Renders a {@link DistilledProject} into the resume's Markdown dialect and
 * inserts it into the "项目经历" section. Matches the existing default resume
 * format (### 标题 · 子标题, then `- ` bullets), so the result renders cleanly
 * in the existing preview/export pipeline.
 *
 * Pure: deterministic string building + section-aware splice. Unit-testable.
 */

import type { DistilledProject } from "./types";

/**
 * Build the Markdown block for one project. Mirrors the default resume's
 * `### Name · Role` + bullet-list shape; tech stack becomes a muted footer
 * line so it stays scannable.
 */
export function buildProjectBlock(project: DistilledProject): string {
  const heading = project.category
    ? `### ${project.name} · ${project.category}`
    : `### ${project.name}`;

  const bullets = project.bullets.map((b) => `- ${b}`).join("\n");

  const techFooter =
    project.techStack.length > 0
      ? `\n技术栈：${project.techStack.join("、")}`
      : "";

  return `${heading}\n\n${bullets}${techFooter}`;
}

/** Headings that mark the projects section (zh + en common variants).
 *  NOTE: we avoid `\b` after Chinese chars — JS `\b` is ASCII-only and never
 *  fires adjacent to CJK, so `项目经历\b` would silently never match. We use
 *  `(?:\s|$)` (whitespace or end) to anchor the heading boundary instead. */
const PROJECT_SECTION_PATTERNS: RegExp[] = [
  /^##\s+项目经历(?:\s|$)/m,
  /^##\s+项目经验(?:\s|$)/m,
  /^##\s+个人项目(?:\s|$)/m,
  /^##\s+项目(?:\s|$)/m,
  /^##\s+Projects\b/mi,
  /^##\s+Project\s+Experience\b/mi,
];

/** Headings that should follow the projects section when we must create one. */
const DOWNSTREAM_SECTIONS = [
  /^##\s+技能清单(?:\s|$)/m,
  /^##\s+技能(?:\s|$)/m,
  /^##\s+技术栈(?:\s|$)/m,
  /^##\s+教育背景(?:\s|$)/m,
  /^##\s+教育(?:\s|$)/m,
  /^##\s+Education\b/mi,
  /^##\s+Skills\b/mi,
];

function findProjectSection(content: string): { lineIndex: number } | null {
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (PROJECT_SECTION_PATTERNS.some((re) => re.test(lines[i]))) {
      return { lineIndex: i };
    }
  }
  return null;
}

function findDownstreamSection(content: string): number {
  for (const re of DOWNSTREAM_SECTIONS) {
    const match = re.exec(content);
    if (match) {
      return content.slice(0, match.index).split("\n").length - 1;
    }
  }
  return -1;
}

/**
 * Insert the project block into the content.
 *
 * - If a 项目经历 section exists, prepend the block right under its heading
 *   (newest project first), separated by a blank line.
 * - Otherwise create the section, ideally just before 技能/教育, else at end.
 */
export function insertProjectBlock(
  content: string,
  block: string,
): string {
  const normalized = content.replace(/\s+$/, "");
  const projectSection = findProjectSection(normalized);

  if (projectSection) {
    const lines = normalized.split("\n");
    // Insert immediately after the heading line (+ blank line gap).
    const insertAt = projectSection.lineIndex + 1;
    const withGap: string[] = [...lines];
    withGap.splice(insertAt, 0, "", block);
    return withGap.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
  }

  // No projects section: create one, anchored before skills/education if present.
  const newSection = `## 项目经历\n\n${block}`;
  const downstreamLine = findDownstreamSection(normalized);

  if (downstreamLine >= 0) {
    const lines = normalized.split("\n");
    const head = lines.slice(0, downstreamLine).join("\n").trimEnd();
    const tail = lines.slice(downstreamLine).join("\n");
    return `${head}\n\n${newSection}\n\n${tail}`.replace(/\n{3,}/g, "\n\n").trim() + "\n";
  }

  return `${normalized}\n\n${newSection}\n`;
}

/**
 * Merge distilled skills into an existing skills line/block. Conservative: only
 * adds skills not already present, joined by the same separator already in use.
 * Returned unchanged when no skills line is found.
 */
export function mergeSkillsIntoContent(content: string, skills: string[]): string {
  if (!skills.length) return content;
  const lines = content.split("\n");
  let changed = false;

  const updated = lines.map((line) => {
    const isSkillLine = /^\s*[-*]?\s*(\*\*)?(前端|后端|工程|技能|技术栈|Skills?)(\*\*)?\s*[:：]/i.test(line);
    if (!isSkillLine) return line;
    const existing = line.split(/[:：]/).slice(1).join(":");
    const sep = existing.includes("、") ? "、" : existing.includes(",") ? "," : "、";
    const present = new Set(
      existing.split(/[、,，/|]+/).map((s) => s.replace(/\*\*/g, "").trim().toLowerCase()),
    );
    const additions = skills.filter((s) => !present.has(s.trim().toLowerCase()));
    if (!additions.length) return line;
    changed = true;
    const prefix = line.slice(0, line.indexOf(existing));
    return `${prefix}${existing.replace(/\s+$/, "")}${sep}${additions.join(sep)}`;
  });

  return changed ? updated.join("\n") : content;
}
