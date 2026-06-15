/**
 * Interview review (面试复盘) — server-side proxy.
 *
 * POST /api/interview-review
 *   { input: { source, rawText, targetRole?, targetCompany?, focusNotes? },
 *     stage: "normalize" | "review",
 *     normalized?,        // required when stage === "review"
 *     llm: { baseUrl, apiKey?, model } }
 *
 * Two-stage pipeline (the model + API key stay server-side, never exposed in
 * the browser network tab — same posture as /api/github-analyze):
 *   1. normalize: raw recall/transcript/ASR text → ordered Q&A turns JSON.
 *   2. review:    normalized turns → 7-dimension + STAR + action-item report.
 *
 * Returns { ok, normalized? | report?, error? }.
 */

import { NextRequest, NextResponse } from "next/server";
import { logger, LogCategory } from "@/lib/logger";
import { buildNormalizePrompt } from "@/lib/interview-review/normalize-prompt";
import { buildReviewPrompt } from "@/lib/interview-review/review-prompt";
import {
  parseNormalizedInterview,
  parseReviewReport,
  ReviewParseError,
} from "@/lib/interview-review/parse-review";
import type {
  InterviewReviewRequest,
  InterviewReviewResponse,
  NormalizedInterview,
  NormalizedTurn,
} from "@/lib/interview-review/types";
import {
  callOpenAIChat,
  getClientKey,
  enforceRateLimit,
  normalizeBaseUrl,
  RATE_LIMITS,
  llmProxyErrorResponse,
} from "@/lib/llm-proxy";

const MIN_RAW_CHARS = 8;
const MAX_RAW_CHARS = 24_000; // guard against pathological inputs

/** Coerce a client-supplied speaker into the typed union; unknown → "unclear". */
function coerceSpeaker(value: unknown): NormalizedTurn["speaker"] {
  if (typeof value !== "string") return "unclear";
  const s = value.trim().toLowerCase();
  if (s.startsWith("interviewer") || s === "面试官" || s === "i") return "interviewer";
  if (s.startsWith("candidate") || s === "候选人" || s === "我" || s === "c") return "candidate";
  return "unclear";
}

const REVIEW_SYSTEM_PROMPT =
  "你是一名严谨的面试复盘助手，只依据用户给定的面试内容做整理与评估，绝不杜撰问题、答案或量化指标，并严格按要求输出单个 JSON 对象。";

/** Normalize and shallow-validate the client-supplied normalized turns. */
function coerceNormalized(
  value: unknown,
): { normalized: NormalizedInterview } | { error: string } {
  if (!value || typeof value !== "object") {
    return { error: "缺少整理后的面试记录（normalized.turns），无法复盘。" };
  }
  const obj = value as Record<string, unknown>;
  const rawTurns = Array.isArray(obj.turns) ? obj.turns : [];
  if (rawTurns.length === 0) {
    return { error: "缺少整理后的面试记录（normalized.turns），无法复盘。" };
  }
  const turns: NormalizedTurn[] = [];
  for (const t of rawTurns) {
    if (!t || typeof t !== "object") continue;
    const r = t as Record<string, unknown>;
    const text = typeof r.text === "string" ? r.text.trim() : "";
    if (!text) continue;
    turns.push({
      order: typeof r.order === "number" ? r.order : turns.length + 1,
      // Validate membership rather than trusting a cast — otherwise an arbitrary
      // client string (e.g. an injection payload) flows into the typed union and
      // from there into the review prompt / studio render. Unknown → "unclear".
      speaker: coerceSpeaker(r.speaker),
      topic: typeof r.topic === "string" ? r.topic : "",
      text,
      note: typeof r.note === "string" ? r.note : undefined,
    });
  }
  if (turns.length === 0) {
    return { error: "缺少整理后的面试记录（normalized.turns），无法复盘。" };
  }
  const rawSource = typeof obj.source === "string" ? obj.source : "";
  const source: NormalizedInterview["source"] =
    rawSource === "recall" || rawSource === "transcript" || rawSource === "audio"
      ? rawSource
      : "recall";
  return {
    normalized: {
      source,
      turns,
      summary: typeof obj.summary === "string" ? obj.summary : "",
      unresolved: Array.isArray(obj.unresolved)
        ? obj.unresolved.filter((s): s is string => typeof s === "string")
        : [],
    },
  };
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<InterviewReviewResponse>> {
  try {
    enforceRateLimit(
      `interview-review:${getClientKey(request)}`,
      RATE_LIMITS.chat.max,
      RATE_LIMITS.chat.windowMs,
    );

    const body = (await request.json().catch(() => ({}))) as InterviewReviewRequest;
    const input = body.input;
    const stage = body.stage;
    const baseUrl = normalizeBaseUrl(body.llm?.baseUrl || "");
    const apiKey = (body.llm?.apiKey || "").trim();
    const model = (body.llm?.model || "").trim();

    if (stage !== "normalize" && stage !== "review") {
      return NextResponse.json(
        { ok: false, error: "未知的处理阶段，应为 normalize 或 review。" },
        { status: 400 },
      );
    }
    if (!baseUrl || !model) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "尚未配置文本模型供应商。请先在「设置 → AI 运行时」中配置 baseUrl 与模型。",
        },
        { status: 400 },
      );
    }

    if (stage === "normalize") {
      const rawText = (input?.rawText || "").trim();
      if (rawText.length < MIN_RAW_CHARS) {
        return NextResponse.json(
          { ok: false, error: `内容太短（至少 ${MIN_RAW_CHARS} 个字符），请补充更多面试细节。` },
          { status: 400 },
        );
      }
      if (rawText.length > MAX_RAW_CHARS) {
        return NextResponse.json(
          {
            ok: false,
            error: `内容过长（上限 ${MAX_RAW_CHARS} 字符），请精简或分段后再提交。`,
          },
          { status: 400 },
        );
      }

      const prompt = buildNormalizePrompt({
        source: input.source,
        rawText,
        targetRole: input.targetRole,
        targetCompany: input.targetCompany,
      });
      const raw = await callOpenAIChat({
        baseUrl,
        apiKey,
        model,
        systemPrompt: REVIEW_SYSTEM_PROMPT,
        userPrompt: prompt,
      });
      const normalized = parseNormalizedInterview(raw);
      // The model doesn't reliably echo `source`; stamp it from the request.
      normalized.source = input.source;

      return NextResponse.json({ ok: true, normalized }, { status: 200 });
    }

    // stage === "review" — validate the client-supplied normalized turns
    // rather than trusting the cast. Never accept client JSON as a domain type
    // at the boundary without coercing it.
    const coerced = coerceNormalized(body.normalized);
    if ("error" in coerced) {
      return NextResponse.json({ ok: false, error: coerced.error }, { status: 400 });
    }
    const normalized = coerced.normalized;

    const prompt = buildReviewPrompt({
      normalized,
      targetRole: input?.targetRole,
      targetCompany: input?.targetCompany,
      focusNotes: input?.focusNotes,
    });
    const raw = await callOpenAIChat({
      baseUrl,
      apiKey,
      model,
      systemPrompt: REVIEW_SYSTEM_PROMPT,
      userPrompt: prompt,
    });
    const report = parseReviewReport(raw);

    return NextResponse.json({ ok: true, report }, { status: 200 });
  } catch (error) {
    logger.error(LogCategory.API, "interview-review route error", error as Error);

    const mapped = llmProxyErrorResponse<InterviewReviewResponse>(error);
    if (mapped) return mapped;
    if (error instanceof ReviewParseError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 200 });
    }
    const msg = error instanceof Error ? error.message : "面试复盘失败。";
    return NextResponse.json({ ok: false, error: `模型调用失败：${msg}` }, { status: 200 });
  }
}
