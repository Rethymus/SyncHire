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
} from "@/lib/interview-review/types";

function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

const MIN_RAW_CHARS = 8;
const MAX_RAW_CHARS = 24_000; // guard against pathological inputs

interface ChatChoice {
  message?: { content?: string };
}
interface ChatCompletionResponse {
  choices?: ChatChoice[];
  error?: { message?: string };
}

async function callChatModel(
  baseUrl: string,
  apiKey: string,
  model: string,
  prompt: string,
): Promise<string> {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content:
            "你是一名严谨的面试复盘助手，只依据用户给定的面试内容做整理与评估，绝不杜撰问题、答案或量化指标，并严格按要求输出单个 JSON 对象。",
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 400)}`);
  }

  const payload = (await res.json().catch(() => null)) as ChatCompletionResponse | null;
  if (payload?.error?.message) {
    throw new Error(payload.error.message);
  }
  const content = payload?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("模型返回为空。");
  }
  return content;
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<InterviewReviewResponse>> {
  try {
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
      const raw = await callChatModel(baseUrl, apiKey, model, prompt);
      const normalized = parseNormalizedInterview(raw);
      // The model doesn't reliably echo `source`; stamp it from the request.
      normalized.source = input.source;

      return NextResponse.json({ ok: true, normalized }, { status: 200 });
    }

    // stage === "review"
    const normalized = body.normalized as NormalizedInterview | undefined;
    if (!normalized || !Array.isArray(normalized.turns) || normalized.turns.length === 0) {
      return NextResponse.json(
        { ok: false, error: "缺少整理后的面试记录（normalized.turns），无法复盘。" },
        { status: 400 },
      );
    }

    const prompt = buildReviewPrompt({
      normalized,
      targetRole: input?.targetRole,
      targetCompany: input?.targetCompany,
      focusNotes: input?.focusNotes,
    });
    const raw = await callChatModel(baseUrl, apiKey, model, prompt);
    const report = parseReviewReport(raw);

    return NextResponse.json({ ok: true, report }, { status: 200 });
  } catch (error) {
    logger.error(LogCategory.API, "interview-review route error", error as Error);

    if (error instanceof ReviewParseError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 200 });
    }
    const msg = error instanceof Error ? error.message : "面试复盘失败。";
    return NextResponse.json({ ok: false, error: `模型调用失败：${msg}` }, { status: 200 });
  }
}
