/**
 * Builds a compact "RepoMap" string from raw {@link RepoSignals}.
 *
 * This is step 2 of the static-reverse-engineering flow: instead of dumping the
 * whole codebase at the model, we surface only the highest-signal artifacts —
 * directory structure, manifest files, entry points, deploy/CI config, recent
 * commits and issues, and a truncated README. The result is token-budgeted so
 * it fits a chat context cheaply regardless of repo size.
 *
 * Pure: no network, no IO — fully unit-testable.
 */

import type {
  KeyFileContent,
  RepoCommit,
  RepoIssueSummary,
  RepoSignals,
  RepoTreeEntry,
} from "./types";

/** Per-file content cap (chars). Keeps any single manifest from dominating. */
export const KEY_FILE_MAX_CHARS = 2400;
/** Total RepoMap budget (chars). ~ this/4 is a rough token estimate. */
export const REPO_MAP_MAX_CHARS = 12000;
/** README cap (chars). */
export const README_MAX_CHARS = 2500;
/** Max tree entries surfaced (top-level dirs + a few key files). */
export const TREE_MAX_ENTRIES = 80;

/** Human-readable label for each key-file role, shown in the map. */
const ROLE_LABEL: Record<KeyFileContent["role"], string> = {
  manifest: "依赖清单",
  readme: "说明文档",
  entry: "入口",
  deploy: "部署",
  ci: "持续集成",
  config: "配置",
};

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  // Keep the head; it carries the most signal (dependencies, FROM lines…).
  return `${value.slice(0, max)}\n…（已截断 ${value.length - max} 字符）`;
}

/** Only top-level + one-level-deep entries make the "module map" legible. */
function isMapWorthy(entry: RepoTreeEntry): boolean {
  const depth = entry.path.split("/").length;
  return depth <= 2;
}

function formatTree(tree: RepoTreeEntry[]): string {
  const dirs = tree
    .filter((e) => e.type === "tree" && isMapWorthy(e))
    .map((e) => e.path)
    .sort();
  const files = tree
    .filter((e) => e.type === "blob" && isMapWorthy(e))
    .map((e) => e.path)
    .sort();
  const lines: string[] = [];
  if (dirs.length) {
    lines.push("目录：");
    for (const d of dirs.slice(0, TREE_MAX_ENTRIES)) lines.push(`  - ${d}/`);
  }
  if (files.length) {
    lines.push("根文件：");
    for (const f of files.slice(0, TREE_MAX_ENTRIES)) lines.push(`  - ${f}`);
  }
  return lines.join("\n");
}

function formatCommits(commits: RepoCommit[]): string {
  if (!commits.length) return "（无公开提交）";
  return commits
    .slice(0, 12)
    .map((c) => {
      const subject = c.message.split("\n")[0]?.trim() || "(空提交信息)";
      const tail = c.author ? ` — @${c.author}` : "";
      return `  - ${subject}${tail}`;
    })
    .join("\n");
}

function formatIssues(issues: RepoIssueSummary[]): string {
  if (!issues.length) return "（无公开 Issue / PR）";
  return issues
    .slice(0, 12)
    .map((i) => {
      const kind = i.isPullRequest ? "PR" : "Issue";
      const labels = i.labels.length ? ` [${i.labels.join(", ")}]` : "";
      return `  - #${i.number} (${kind}, ${i.state})${labels} ${i.title}`;
    })
    .join("\n");
}

function formatKeyFile(file: KeyFileContent): string {
  const label = ROLE_LABEL[file.role] ?? file.role;
  if (file.truncated || !file.content) {
    return `[${label}] ${file.path}（存在但内容过大/二进制，已省略）`;
  }
  return `[${label}] ${file.path}:\n${truncate(file.content, KEY_FILE_MAX_CHARS)}`;
}

/**
 * Assemble the RepoMap. Sections are built independently then trimmed to the
 * total budget, prioritizing manifests > tree > readme > commits/issues.
 */
export function buildRepoMap(signals: RepoSignals): string {
  const { coordinates, tree, keyFiles, recentCommits, recentIssues } = signals;
  const sections: string[] = [];

  // Header / metadata
  const meta: string[] = [`仓库：${coordinates.owner}/${coordinates.repo}`];
  meta.push(`链接：${coordinates.url}`);
  if (signals.description) meta.push(`简介：${signals.description}`);
  if (signals.language) {
    const counts: string[] = [signals.language];
    if (typeof signals.stars === "number") counts.push(`★ ${signals.stars}`);
    if (signals.forks) counts.push(`⑂ ${signals.forks}`);
    meta.push(`语言/热度：${counts.join(" · ")}`);
  }
  if (signals.topics?.length) meta.push(`主题：${signals.topics.join(", ")}`);
  if (signals.license) meta.push(`许可证：${signals.license}`);
  if (signals.pushedAt) meta.push(`最近推送：${signals.pushedAt.slice(0, 10)}`);
  sections.push(meta.join("\n"));

  // Directory map
  const mapText = formatTree(tree);
  if (mapText) sections.push(`目录结构（模块地图）\n${mapText}`);

  // Key files
  const fileBlocks = keyFiles
    .slice()
    .sort((a, b) => roleWeight(a.role) - roleWeight(b.role))
    .map(formatKeyFile)
    .filter(Boolean);
  if (fileBlocks.length) sections.push(`关键文件\n${fileBlocks.join("\n\n")}`);

  // Commits
  sections.push(`最近提交\n${formatCommits(recentCommits)}`);

  // Issues / PRs
  sections.push(`最近 Issue / PR\n${formatIssues(recentIssues)}`);

  // README (truncated) — highest-prose signal when present
  if (signals.readme && signals.readme.trim()) {
    sections.push(`README（节选）\n${truncate(signals.readme, README_MAX_CHARS)}`);
  }

  let joined = sections.join("\n\n---\n\n");
  if (joined.length > REPO_MAP_MAX_CHARS) {
    joined = `${joined.slice(0, REPO_MAP_MAX_CHARS)}\n\n…（RepoMap 已整体截断）`;
  }
  return joined;
}

/** Lower weight = higher priority when trimming/ordering key files. */
function roleWeight(role: KeyFileContent["role"]): number {
  const order: KeyFileContent["role"][] = [
    "manifest",
    "config",
    "entry",
    "deploy",
    "ci",
    "readme",
  ];
  const idx = order.indexOf(role);
  return idx === -1 ? 99 : idx;
}
