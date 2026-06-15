/**
 * GitHub project distiller (server-side proxy).
 *
 * POST /api/github-analyze
 *   { repoUrl, githubToken?, focusRole?, llm: { baseUrl, apiKey, model } }
 *
 * Pipeline (static reverse engineering — the repo is never cloned or run):
 *   1. fetch static signals (metadata + tree + key files + commits + issues)
 *      via repo-fetcher (GitHub REST API + raw host)
 *   2. build a compact, token-budgeted RepoMap
 *   3. ask the configured OpenAI-compatible chat model to distill the map into
 *      resume-ready JSON (four-layer prompt: purpose → stack → modules → tradeoffs)
 *   4. parse + validate the JSON into a DistilledProject
 *
 * The model + GitHub token stay server-side (never exposed in the browser
 * network tab). Returns { ok, distilled, meta } or { ok: false, error }.
 */

import { NextRequest, NextResponse } from "next/server";
import { logger, LogCategory } from "@/lib/logger";
import { fetchRepoSignals, GithubFetchError } from "@/lib/github-distill/repo-fetcher";
import { buildRepoMap } from "@/lib/github-distill/repo-map";
import { buildDistillPrompt } from "@/lib/github-distill/distill-prompt";
import { parseDistilledProject, DistillParseError } from "@/lib/github-distill/parse-distill";
import { parseRepoUrl, InvalidRepoUrlError } from "@/lib/github-distill/parse-url";
import type { GithubAnalyzeRequest, GithubAnalyzeResponse } from "@/lib/github-distill/types";
import {
  callOpenAIChat,
  getClientKey,
  enforceRateLimit,
  normalizeBaseUrl,
  RATE_LIMITS,
  llmProxyErrorResponse,
} from "@/lib/llm-proxy";

const DISTILL_SYSTEM_PROMPT =
  "你是一名严谨的资深软件架构师，只依据给定的仓库静态信号做推断，绝不杜撰，并按要求的 JSON 结构输出。";

export async function POST(request: NextRequest): Promise<NextResponse<GithubAnalyzeResponse>> {
  try {
    enforceRateLimit(
      `github-analyze:${getClientKey(request)}`,
      RATE_LIMITS.chat.max,
      RATE_LIMITS.chat.windowMs,
    );

    const body = (await request.json().catch(() => ({}))) as GithubAnalyzeRequest;
    const repoUrl = (body.repoUrl || "").trim();
    const focusRole = (body.focusRole || "").trim();
    const githubToken = (body.githubToken || "").trim();
    const baseUrl = normalizeBaseUrl(body.llm?.baseUrl || "");
    const apiKey = (body.llm?.apiKey || "").trim();
    const model = (body.llm?.model || "").trim();

    if (!repoUrl) {
      return NextResponse.json({ ok: false, error: "请输入 GitHub 仓库链接。" }, { status: 400 });
    }
    if (!baseUrl || !model) {
      return NextResponse.json(
        { ok: false, error: "尚未配置文本模型供应商。请先在「设置 → AI 运行时」中配置 baseUrl 与模型。" },
        { status: 400 },
      );
    }

    const coordinates = parseRepoUrl(repoUrl);

    const { signals, rateLimited, gathered } = await fetchRepoSignals(coordinates, githubToken);

    const repoMap = buildRepoMap(signals);
    const prompt = buildDistillPrompt({ repoMap, focusRole: focusRole || undefined });

    const raw = await callOpenAIChat({
      baseUrl,
      apiKey,
      model,
      systemPrompt: DISTILL_SYSTEM_PROMPT,
      userPrompt: prompt,
    });

    const distilled = parseDistilledProject(raw, {
      repoUrl: coordinates.url,
      description: signals.description,
      language: signals.language,
      stars: signals.stars,
      topics: signals.topics,
      topDirs: signals.tree
        .filter((e) => e.type === "tree" && e.path.split("/").length === 1)
        .map((e) => e.path)
        .slice(0, 12),
      keyFiles: signals.keyFiles.map((f) => f.path),
      staticOnly: true,
    });

    return NextResponse.json(
      {
        ok: true,
        distilled,
        meta: {
          signalsGathered: gathered,
          repoDescription: signals.description,
          rateLimited,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    logger.error(LogCategory.API, "github-analyze route error", error as Error);

    const mapped = llmProxyErrorResponse<GithubAnalyzeResponse>(error);
    if (mapped) return mapped;
    if (error instanceof InvalidRepoUrlError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }
    if (error instanceof GithubFetchError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 200 });
    }
    if (error instanceof DistillParseError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 200 });
    }
    const msg = error instanceof Error ? error.message : "GitHub 项目蒸馏失败。";
    return NextResponse.json({ ok: false, error: `模型调用失败：${msg}` }, { status: 200 });
  }
}
