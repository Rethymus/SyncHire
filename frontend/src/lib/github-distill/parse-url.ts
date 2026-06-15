/**
 * Parse + validate a GitHub repository URL into {@link RepoCoordinates}.
 *
 * Accepts the common shapes users paste: `owner/repo`,
 * `https://github.com/owner/repo`, with optional trailing `.git`, trailing
 * slash, subpaths (`/tree/main`, `/blob/…/file`), query, and fragment. Pure.
 */

import type { RepoCoordinates } from "./types";

export class InvalidRepoUrlError extends Error {}

const REPO_NAME_RE = /^[A-Za-z0-9._-]+$/;

export function parseRepoUrl(input: string): RepoCoordinates {
  const trimmed = (input || "").trim();
  if (!trimmed) {
    throw new InvalidRepoUrlError("请输入 GitHub 仓库链接。");
  }

  let owner = "";
  let repo = "";

  // Bare "owner/repo" shorthand (no scheme, no extra path).
  if (/^[\w.-]+\/[\w.-]+$/.test(trimmed)) {
    [owner, repo] = trimmed.split("/");
  } else {
    let url: URL;
    try {
      url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    } catch {
      throw new InvalidRepoUrlError("链接格式无法识别，请粘贴形如 https://github.com/owner/repo 的地址。");
    }
    if (!/github\.com$/i.test(url.hostname) && url.hostname !== "github.com") {
      throw new InvalidRepoUrlError("目前仅支持 github.com 仓库链接。");
    }
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length < 2) {
      throw new InvalidRepoUrlError("未在链接中找到 owner/repo，请检查地址。");
    }
    [owner, repo] = parts;
  }

  repo = repo.replace(/\.git$/i, "");
  if (!REPO_NAME_RE.test(owner) || !REPO_NAME_RE.test(repo)) {
    throw new InvalidRepoUrlError("owner 或 repo 名称包含非法字符。");
  }
  if (!owner || !repo) {
    throw new InvalidRepoUrlError("未在链接中找到 owner/repo，请检查地址。");
  }

  return {
    owner,
    repo,
    url: `https://github.com/${owner}/${repo}`,
  };
}
