/**
 * GitHub project distiller — types.
 *
 * Turns a GitHub repo URL into resume-ready project evidence via *static
 * reverse engineering*: we only read repo metadata + key files (never clone,
 * never run), feed a compact "RepoMap" to an LLM, and ask it to infer purpose,
 * tech stack, architecture and innovation points. Everything the model emits is
 * treated as an AI *hypothesis* the user reviews before it lands on a resume.
 *
 * The pipeline is split into small pure functions (repo-map / distill-prompt /
 * parse-distill / resume-insert) so each step is unit-testable without network
 * or model calls; only {@link fetchRepoSignals} (server-only) touches the
 * network, and only the route touches the model.
 */

/** Parsed GitHub coordinates: `owner/repo` plus the canonical web URL. */
export interface RepoCoordinates {
  owner: string;
  repo: string;
  /** Canonical https URL, e.g. https://github.com/owner/repo. */
  url: string;
}

/** A tree entry from the GitHub git-trees API. */
export interface RepoTreeEntry {
  path: string;
  type: "blob" | "tree" | string;
}

/** A recent commit (only the fields we surface to the model). */
export interface RepoCommit {
  sha: string;
  message: string;
  date?: string;
  author?: string;
}

/** A recent issue or PR title + state (issues endpoint returns both). */
export interface RepoIssueSummary {
  number: number;
  title: string;
  state: string;
  isPullRequest: boolean;
  labels: string[];
}

/** The static signals harvested from a repo — the model's only input. */
export interface RepoSignals {
  coordinates: RepoCoordinates;
  description?: string;
  homepage?: string;
  language?: string;
  stars?: number;
  forks?: number;
  topics?: string[];
  defaultBranch?: string;
  /** Pushed-at ISO timestamp, used to gauge how active the repo is. */
  pushedAt?: string;
  createdAt?: string;
  license?: string;
  /** Top-level + one-level-deep directory structure (the "module map"). */
  tree: RepoTreeEntry[];
  /** Key file basenames present (package.json, go.mod, Dockerfile, …). */
  keyFiles: KeyFileContent[];
  recentCommits: RepoCommit[];
  recentIssues: RepoIssueSummary[];
  readme?: string;
}

/** A key file's path + truncated content (token-budgeted server-side). */
export interface KeyFileContent {
  path: string;
  /** Why we fetched this file (manifest, entry, deploy, CI, …). */
  role: KeyFileRole;
  /** Truncated to KEY_FILE_MAX_BYTES server-side. */
  content?: string;
  /** True when the file is known to exist but its body was too large / binary. */
  truncated?: boolean;
}

export type KeyFileRole =
  | "manifest" // package.json / go.mod / requirements.txt / pyproject.toml / Cargo.toml / pom.xml / build.gradle
  | "readme" // README.md
  | "entry" // main.* / app.* / index.* / server.* / cmd/*
  | "deploy" // Dockerfile / docker-compose.yml / Makefile
  | "ci" // .github/workflows/*
  | "config"; // next.config.* / vite.config.* / tsconfig.json

/**
 * The distilled, resume-ready representation of a repo. Produced by the model
 * and shown to the user for review before insertion.
 */
export interface DistilledProject {
  /** Project name (defaults to the repo name). */
  name: string;
  /** One-line statement of what the project does. */
  tagline: string;
  /** Software category: Web 应用 / CLI / SDK / 库 / 平台 / 工具. */
  category: string;
  /** Languages + frameworks + key libraries, normalized. */
  techStack: string[];
  /** 3–5 achievement-oriented resume bullets (verifiable, no fabrication). */
  bullets: string[];
  /** Skills extracted for the candidate role card. */
  skills: string[];
  /** 1–2 sentence project summary usable in a personal-summary / pitch. */
  summary: string;
  /** Notable design / architecture points (the 4th-round output). */
  innovations: string[];
  /** The signals the distillation was based on (transparency / provenance). */
  provenance: DistillProvenance;
}

export interface DistillProvenance {
  repoUrl: string;
  description?: string;
  language?: string;
  stars?: number;
  topics?: string[];
  topDirs?: string[];
  keyFiles?: string[];
  /** Static-only analysis: the repo was never cloned or executed. */
  staticOnly: true;
}

/** Client → server request body for POST /api/github-analyze. */
export interface GithubAnalyzeRequest {
  repoUrl: string;
  /** Optional GitHub token; raises rate limits and unlocks private repos the
   *  token can read. Sent only to api.github.com via the server proxy. */
  githubToken?: string;
  /** The target role / JD title, so bullets can be tuned to relevance. */
  focusRole?: string;
  /** OpenAI-compatible chat-completions provider config (kept server-side). */
  llm: LlmConfig;
}

export interface LlmConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

/** Server → client response. */
export interface GithubAnalyzeResponse {
  ok: boolean;
  distilled?: DistilledProject;
  /** A friendly, localized error message when ok === false. */
  error?: string;
  /** Diagnostics surfaced to the result panel (signals actually gathered). */
  meta?: AnalyzeMeta;
}

export interface AnalyzeMeta {
  signalsGathered: number;
  repoDescription?: string;
  rateLimited?: boolean;
}
