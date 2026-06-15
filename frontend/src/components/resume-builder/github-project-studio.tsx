"use client";

import { memo, useCallback, useState } from "react";
import {
  GitBranch,
  Wand2,
  Loader2,
  X,
  Check,
  AlertCircle,
  Settings as SettingsIcon,
  ExternalLink,
  Info,
} from "lucide-react";
import Link from "next/link";
import { loadAIRuntimeSettings } from "@/lib/ai-runtime-settings";
import { resolveActiveTextProvider } from "@/lib/github-distill/llm-resolver";
import { parseRepoUrl, InvalidRepoUrlError } from "@/lib/github-distill/parse-url";
import type { DistilledProject, GithubAnalyzeResponse } from "@/lib/github-distill/types";

const GITHUB_TOKEN_STORAGE_KEY = "synchire-github-token";

interface GithubProjectStudioProps {
  open: boolean;
  onClose: () => void;
  /** Called when the user applies the (possibly edited) distilled project. */
  onApplyProject: (project: DistilledProject) => void;
}

type AnalyzeStatus = "idle" | "analyzing" | "done" | "error";

function loadGithubToken(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(GITHUB_TOKEN_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function saveGithubToken(token: string): void {
  if (typeof window === "undefined") return;
  try {
    if (token) {
      window.localStorage.setItem(GITHUB_TOKEN_STORAGE_KEY, token);
    } else {
      window.localStorage.removeItem(GITHUB_TOKEN_STORAGE_KEY);
    }
  } catch {
    /* ignore quota / privacy errors */
  }
}

function GithubProjectStudioBase({ open, onClose, onApplyProject }: GithubProjectStudioProps) {
  const [repoUrl, setRepoUrl] = useState("");
  const [urlError, setUrlError] = useState("");
  const [focusRole, setFocusRole] = useState("");
  // Lazy-init from localStorage: SSR renders null (modal closed) so there is no
  // hydration mismatch; by the time the modal opens (client-only) the persisted
  // token is already in state. Avoids setState-in-effect.
  const [token, setToken] = useState<string>(() => loadGithubToken());
  const [status, setStatus] = useState<AnalyzeStatus>("idle");
  const [result, setResult] = useState<DistilledProject | null>(null);
  const [error, setError] = useState("");
  const [meta, setMeta] = useState<GithubAnalyzeResponse["meta"] | null>(null);

  const validateUrl = useCallback((value: string) => {
    if (!value.trim()) {
      setUrlError("");
      return false;
    }
    try {
      parseRepoUrl(value);
      setUrlError("");
      return true;
    } catch (e) {
      setUrlError(e instanceof InvalidRepoUrlError ? e.message : "链接格式有误。");
      return false;
    }
  }, []);

  const handleUrlChange = useCallback(
    (value: string) => {
      setRepoUrl(value);
      validateUrl(value);
    },
    [validateUrl],
  );

  const handleAnalyze = useCallback(async () => {
    setError("");
    setResult(null);
    setMeta(null);

    const provider = resolveActiveTextProvider(loadAIRuntimeSettings());
    if (!provider.configured) {
      setStatus("error");
      setError("尚未配置文本模型供应商。请先在「设置 → AI 运行时」中启用并填写 baseUrl 与模型。");
      return;
    }
    if (!validateUrl(repoUrl)) {
      setStatus("error");
      if (!urlError) setError("请输入有效的 GitHub 仓库链接。");
      return;
    }

    setStatus("analyzing");
    saveGithubToken(token);
    try {
      const res = await fetch("/api/github-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoUrl,
          focusRole,
          githubToken: token || undefined,
          llm: {
            baseUrl: provider.baseUrl,
            apiKey: provider.apiKey,
            model: provider.model,
          },
        }),
      });
      const data = (await res.json().catch(() => null)) as GithubAnalyzeResponse | null;
      if (!data || !data.ok || !data.distilled) {
        throw new Error(data?.error || "蒸馏失败，请检查模型与 GitHub 链接后重试。");
      }
      setResult(data.distilled);
      setMeta(data.meta ?? null);
      setStatus("done");
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [repoUrl, focusRole, token, validateUrl, urlError]);

  const handleApply = useCallback(() => {
    if (!result) return;
    onApplyProject(result);
    onClose();
  }, [result, onApplyProject, onClose]);

  if (!open) return null;

  const provider = resolveActiveTextProvider(loadAIRuntimeSettings());

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="GitHub 项目蒸馏"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-gray-900" />
            <h3 className="text-lg font-semibold text-gray-900">GitHub 项目蒸馏</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="关闭">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Method note */}
          <div className="flex items-start gap-2 rounded-md bg-blue-50 border border-blue-200 text-blue-800 text-xs px-3 py-2">
            <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>
              只读取仓库的目录结构、依赖清单、入口、部署/CI、提交与 Issue 等<strong>静态信号</strong>，
              不克隆、不运行项目，用 AI 推断用途、技术栈与创新点。结果均为 AI 推断，应用前请核对。
            </span>
          </div>

          {/* Provider status */}
          <div className="flex items-center justify-between rounded-lg bg-gray-50 border border-gray-200 px-4 py-2.5">
            <div className="text-xs text-gray-600">
              <span className="font-medium text-gray-800">文本模型</span>
              <span className="mx-2 text-gray-300">·</span>
              <code className="text-gray-700">{provider.model || "未设置"}</code>
              <span className="mx-2 text-gray-300">·</span>
              Key {provider.apiKey ? "已配置" : "未配置"}
            </div>
            <Link
              href="/settings?tab=runtime"
              onClick={onClose}
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
            >
              <SettingsIcon className="h-3 w-3" /> 前往配置
            </Link>
          </div>

          {/* Inputs */}
          <div className="space-y-3">
            <div>
              <label htmlFor="gh-url" className="block text-sm font-medium text-gray-700 mb-1.5">
                1. GitHub 仓库链接
              </label>
              <input
                id="gh-url"
                value={repoUrl}
                onChange={(e) => handleUrlChange(e.target.value)}
                placeholder="https://github.com/owner/repo"
                className="w-full h-9 px-3 rounded-md border border-gray-200 text-sm focus:border-blue-400 focus:outline-none"
              />
              {urlError && <p className="text-xs text-red-600 mt-1">{urlError}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label htmlFor="gh-role" className="block text-sm font-medium text-gray-700 mb-1.5">
                  目标岗位（可选）
                </label>
                <input
                  id="gh-role"
                  value={focusRole}
                  onChange={(e) => setFocusRole(e.target.value)}
                  placeholder="如：前端工程师 / Go 后端"
                  className="w-full h-9 px-3 rounded-md border border-gray-200 text-sm focus:border-blue-400 focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="gh-token" className="block text-sm font-medium text-gray-700 mb-1.5">
                  GitHub Token（可选，避免限流）
                </label>
                <input
                  id="gh-token"
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="ghp_…（仅用于读取公开仓库，本地保存）"
                  className="w-full h-9 px-3 rounded-md border border-gray-200 text-sm focus:border-blue-400 focus:outline-none"
                  autoComplete="off"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Action */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleAnalyze}
              disabled={status === "analyzing"}
              className="inline-flex items-center gap-2 h-10 px-5 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-60 transition"
            >
              {status === "analyzing" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4" />
              )}
              {status === "analyzing" ? "蒸馏中…" : "蒸馏项目"}
            </button>
            <span className="text-xs text-gray-400">
              将抓取静态信号并调用文本模型，可能需要数秒到数十秒。
            </span>
          </div>

          {/* Result */}
          {result && (
            <div className="space-y-4 border-t border-gray-100 pt-4">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">2. 蒸馏结果（可编辑）</label>
                {result.provenance.repoUrl && (
                  <a
                    href={result.provenance.repoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                  >
                    <ExternalLink className="h-3 w-3" /> 查看仓库
                  </a>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <span className="text-xs text-gray-500">项目名</span>
                  <input
                    value={result.name}
                    onChange={(e) => setResult({ ...result, name: e.target.value })}
                    className="mt-1 w-full h-9 px-3 rounded-md border border-gray-200 text-sm focus:border-blue-400 focus:outline-none"
                  />
                </div>
                <div>
                  <span className="text-xs text-gray-500">分类 / 角色</span>
                  <input
                    value={result.category}
                    onChange={(e) => setResult({ ...result, category: e.target.value })}
                    className="mt-1 w-full h-9 px-3 rounded-md border border-gray-200 text-sm focus:border-blue-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <span className="text-xs text-gray-500">一句话概述</span>
                <input
                  value={result.tagline}
                  onChange={(e) => setResult({ ...result, tagline: e.target.value })}
                  className="mt-1 w-full h-9 px-3 rounded-md border border-gray-200 text-sm focus:border-blue-400 focus:outline-none"
                />
              </div>

              <div>
                <span className="text-xs text-gray-500">项目要点（每行一条，将写入「项目经历」）</span>
                <textarea
                  value={result.bullets.join("\n")}
                  onChange={(e) =>
                    setResult({
                      ...result,
                      bullets: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  rows={5}
                  className="mt-1 w-full px-3 py-2 rounded-md border border-gray-200 text-sm focus:border-blue-400 focus:outline-none font-mono"
                />
              </div>

              <div>
                <span className="text-xs text-gray-500">技术栈（逗号分隔，将并入「技能清单」）</span>
                <input
                  value={result.techStack.join("、")}
                  onChange={(e) =>
                    setResult({
                      ...result,
                      techStack: e.target.value
                        .split(/[、,，]+/)
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                  className="mt-1 w-full h-9 px-3 rounded-md border border-gray-200 text-sm focus:border-blue-400 focus:outline-none"
                />
              </div>

              {result.innovations.length > 0 && (
                <div>
                  <span className="text-xs text-gray-500">亮点与设计取舍（参考，不写入简历）</span>
                  <ul className="mt-1 space-y-1">
                    {result.innovations.map((item, idx) => (
                      <li key={idx} className="text-xs text-gray-600 flex gap-1.5">
                        <span className="text-gray-400">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {meta && (
                <p className="text-[11px] text-gray-400">
                  基于静态信号推断（未克隆/未运行）。抓取到 {meta.signalsGathered} 类仓库元信息。
                  {meta.rateLimited && " · 已触发未授权限流，建议配置 Token 后重试以获得更完整信号。"}
                </p>
              )}

              <div className="flex items-center gap-3">
                <button
                  onClick={handleApply}
                  className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-green-600 text-white text-sm hover:bg-green-700 transition"
                >
                  <Check className="h-4 w-4" /> 写入简历
                </button>
                <button
                  onClick={() => {
                    setResult(null);
                    setStatus("idle");
                  }}
                  className="inline-flex items-center gap-2 h-9 px-4 rounded-md border border-gray-200 text-gray-700 text-sm hover:bg-gray-50 transition"
                >
                  重新蒸馏
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export const GithubProjectStudio = memo(GithubProjectStudioBase);
