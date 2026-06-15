/**
 * Server-only GitHub static-signal fetcher (step 1 of the static-reverse-
 * engineering flow).
 *
 * Reads repo metadata + the file tree + key files + recent commits/issues using
 * the GitHub REST API (api.github.com) and raw.githubusercontent.com. The repo
 * is NEVER cloned and NEVER executed — we only read what GitHub exposes.
 *
 * Rate-limit aware: the unauthenticated GitHub API allows only ~60 requests/hour
 * per IP. File contents are fetched from the raw host (which does NOT count
 * against that quota) to conserve calls; only metadata/tree/commits/issues hit
 * the metered API. An optional token raises the ceiling to 5000/hour.
 *
 * This module MUST stay server-only — it issues network requests and never
 * touches the browser bundle.
 */

import type {
  KeyFileContent,
  KeyFileRole,
  RepoCommit,
  RepoCoordinates,
  RepoIssueSummary,
  RepoSignals,
  RepoTreeEntry,
} from "./types";

export class GithubFetchError extends Error {
  constructor(
    message: string,
    public readonly kind: "rate_limited" | "not_found" | "network" | "unknown",
  ) {
    super(message);
  }
}

const API_ROOT = "https://api.github.com";
const RAW_ROOT = "https://raw.githubusercontent.com";
const UA = "SyncHire-GitHub-Distiller";

interface FetchResult<T> {
  data: T | null;
  rateLimited: boolean;
  notFound: boolean;
  status: number;
}

async function ghApi<T>(
  path: string,
  token?: string,
  init?: RequestInit,
): Promise<FetchResult<T>> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": UA,
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_ROOT}${path}`, { ...init, headers });
  } catch (error) {
    throw new GithubFetchError(
      `无法访问 GitHub API：${error instanceof Error ? error.message : String(error)}`,
      "network",
    );
  }

  const remaining = res.headers.get("X-RateLimit-Remaining");
  if (res.status === 403 || res.status === 429) {
    if (remaining === "0") {
      return { data: null, rateLimited: true, notFound: false, status: res.status };
    }
  }
  if (res.status === 404) {
    return { data: null, rateLimited: false, notFound: true, status: res.status };
  }
  if (!res.ok) {
    return { data: null, rateLimited: false, notFound: false, status: res.status };
  }
  const data = (await res.json().catch(() => null)) as T;
  return { data, rateLimited: false, notFound: false, status: res.status };
}

async function ghRaw(
  owner: string,
  repo: string,
  branch: string,
  path: string,
): Promise<string | null> {
  try {
    const res = await fetch(`${RAW_ROOT}/${owner}/${repo}/${branch}/${path}`, {
      headers: { "User-Agent": UA },
    });
    if (!res.ok) return null;
    // raw returns text/plain; cap to keep the RepoMap bounded upstream too.
    const text = await res.text();
    return text.length > 20000 ? `${text.slice(0, 20000)}` : text;
  } catch {
    return null;
  }
}

interface RepoMetadata {
  description: string | null;
  homepage: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  topics?: string[];
  default_branch: string;
  pushed_at: string | null;
  created_at: string | null;
  license: { name?: string; spdx_id?: string } | null;
}

interface TreeResponse {
  tree: Array<{ path: string; type: string; size?: number }>;
  truncated?: boolean;
}

interface CommitResponse {
  sha: string;
  commit: {
    message: string;
    author?: { date?: string; name?: string };
  };
  author?: { login?: string } | null;
}

interface IssueResponse {
  number: number;
  title: string;
  state: string;
  labels?: Array<{ name: string }>;
  pull_request?: unknown;
}

/** Basenames that declare the dependency stack (the most honest tech signal). */
const MANIFEST_FILES: Array<{ name: string; role: KeyFileRole }> = [
  { name: "package.json", role: "manifest" },
  { name: "go.mod", role: "manifest" },
  { name: "Cargo.toml", role: "manifest" },
  { name: "pyproject.toml", role: "manifest" },
  { name: "requirements.txt", role: "manifest" },
  { name: "pom.xml", role: "manifest" },
  { name: "build.gradle", role: "manifest" },
  { name: "build.gradle.kts", role: "manifest" },
  { name: "composer.json", role: "manifest" },
  { name: "Gemfile", role: "manifest" },
  { name: "mix.exs", role: "manifest" },
  { name: "Pipfile", role: "manifest" },
];

const DEPLOY_FILES: Array<{ name: string; role: KeyFileRole }> = [
  { name: "Dockerfile", role: "deploy" },
  { name: "docker-compose.yml", role: "deploy" },
  { name: "docker-compose.yaml", role: "deploy" },
  { name: "Makefile", role: "deploy" },
];

const CONFIG_GLOBS: Array<{ re: RegExp; role: KeyFileRole }> = [
  { re: /^next\.config\.[a-z]+$/i, role: "config" },
  { re: /^vite\.config\.[a-z]+$/i, role: "config" },
  { re: /^nuxt\.config\.[a-z]+$/i, role: "config" },
  { re: /^tsconfig\.json$/i, role: "config" },
];

const ENTRY_RE = /^(main|app|server|index|manage)\.(go|py|js|ts|tsx|jsx|rs|java|rb)$/i;

interface KeyFileTarget {
  path: string;
  role: KeyFileRole;
}

/** Decide which key files to pull based on the tree (root + common dirs). */
function pickKeyFiles(tree: RepoTreeEntry[]): KeyFileTarget[] {
  const byName = new Map<string, string>();
  for (const entry of tree) {
    if (entry.type !== "blob") continue;
    const base = entry.path.split("/").pop() ?? entry.path;
    // Prefer root-level files; fall back to src/<file> for entry detection.
    if (!byName.has(base) || entry.path.split("/").length === 1) {
      byName.set(base, entry.path);
    }
  }

  const targets: KeyFileTarget[] = [];
  const seen = new Set<string>();
  const add = (base: string, role: KeyFileRole) => {
    const path = byName.get(base);
    if (path && !seen.has(role + ":" + path)) {
      seen.add(role + ":" + path);
      targets.push({ path, role });
    }
  };

  // Manifests — take only the first present (avoid pulling 3 manifests).
  for (const m of MANIFEST_FILES) {
    if (byName.has(m.name)) {
      add(m.name, m.role);
      break;
    }
  }
  for (const d of DEPLOY_FILES) {
    add(d.name, d.role);
  }
  for (const [base] of byName) {
    if (CONFIG_GLOBS.some((g) => g.re.test(base))) {
      const match = CONFIG_GLOBS.find((g) => g.re.test(base))!;
      add(base, match.role);
    }
  }
  // Entry candidate (single most relevant).
  for (const [base] of byName) {
    if (ENTRY_RE.test(base)) {
      add(base, "entry");
      break;
    }
  }

  // CI workflows (up to 2).
  const ci = tree
    .filter((e) => e.type === "blob" && /^\.github\/workflows\/.+\.(yml|yaml)$/i.test(e.path))
    .slice(0, 2)
    .map((e) => ({ path: e.path, role: "ci" as KeyFileRole }));
  targets.push(...ci);

  return targets.slice(0, 7);
}

export interface FetchOutcome {
  signals: RepoSignals;
  rateLimited: boolean;
  /** Count of REST calls that succeeded with usable data. */
  gathered: number;
}

/** Fetch all static signals for a repo. Degrades gracefully per-call. */
export async function fetchRepoSignals(
  coordinates: RepoCoordinates,
  token?: string,
): Promise<FetchOutcome> {
  const { owner, repo } = coordinates;
  let rateLimited = false;

  // 1. Metadata — required. If this 404s, the repo doesn't exist.
  const meta = await ghApi<RepoMetadata>(`/repos/${owner}/${repo}`, token);
  if (meta.notFound) {
    throw new GithubFetchError(
      `仓库 ${owner}/${repo} 不存在或为私有（如为私有仓库，请在设置中配置 GitHub Token）。`,
      "not_found",
    );
  }
  if (meta.rateLimited || !meta.data) {
    rateLimited = true;
    throw new GithubFetchError(
      "GitHub API 已触发未授权限流（每小时 60 次）。请在设置中配置 GitHub Token 后重试。",
      "rate_limited",
    );
  }
  const m = meta.data;
  let gathered = 1;

  const branch = m.default_branch || "main";

  // 2. Tree, commits, issues — each degrades independently.
  const treeRes = await ghApi<TreeResponse>(
    `/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
    token,
  );
  if (treeRes.rateLimited) rateLimited = true;
  const tree: RepoTreeEntry[] = (treeRes.data?.tree ?? []).map((e) => ({
    path: e.path,
    type: (e.type === "tree" ? "tree" : "blob") as RepoTreeEntry["type"],
  }));
  if (treeRes.data) gathered++;

  const commitsRes = await ghApi<CommitResponse[]>(
    `/repos/${owner}/${repo}/commits?per_page=10`,
    token,
  );
  if (commitsRes.rateLimited) rateLimited = true;
  const recentCommits: RepoCommit[] = (commitsRes.data ?? []).map((c) => ({
    sha: c.sha,
    message: c.commit?.message ?? "",
    date: c.commit?.author?.date,
    author: c.author?.login,
  }));
  if (commitsRes.data) gathered++;

  const issuesRes = await ghApi<IssueResponse[]>(
    `/repos/${owner}/${repo}/issues?state=all&per_page=10&sort=created&direction=desc`,
    token,
  );
  if (issuesRes.rateLimited) rateLimited = true;
  const recentIssues: RepoIssueSummary[] = (issuesRes.data ?? []).map((i) => ({
    number: i.number,
    title: i.title,
    state: i.state,
    isPullRequest: Boolean(i.pull_request),
    labels: (i.labels ?? []).map((l) => l.name),
  }));
  if (issuesRes.data) gathered++;

  // 3. Key files via raw host (does not consume API quota).
  const keyFileTargets = pickKeyFiles(tree);
  const keyFiles: KeyFileContent[] = [];
  for (const target of keyFileTargets) {
    const content = await ghRaw(owner, repo, branch, target.path);
    if (content == null) {
      keyFiles.push({ path: target.path, role: target.role, truncated: true });
    } else {
      keyFiles.push({ path: target.path, role: target.role, content });
    }
  }

  // 4. README — prefer raw if a readme path is in the tree, else skip silently.
  const readmeEntry = tree.find(
    (e) => e.type === "blob" && /^readme(\.|$)/i.test(e.path.split("/").pop() ?? ""),
  );
  let readme: string | undefined;
  if (readmeEntry) {
    readme = (await ghRaw(owner, repo, branch, readmeEntry.path)) ?? undefined;
  }

  const signals: RepoSignals = {
    coordinates,
    description: m.description ?? undefined,
    homepage: m.homepage ?? undefined,
    language: m.language ?? undefined,
    stars: m.stargazers_count,
    forks: m.forks_count,
    topics: m.topics,
    defaultBranch: branch,
    pushedAt: m.pushed_at ?? undefined,
    createdAt: m.created_at ?? undefined,
    license: m.license?.spdx_id || m.license?.name || undefined,
    tree,
    keyFiles,
    recentCommits,
    recentIssues,
    readme,
  };

  return { signals, rateLimited, gathered };
}
