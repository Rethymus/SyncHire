/**
 * Image provider connection test (server-side proxy).
 *
 * Keeps the image API key off the browser network tab and sidesteps CORS by
 * probing the configured endpoint from the server. We attempt a lightweight
 * /models GET for OpenAI-compatible providers; for others we report that a real
 * generation call is the authoritative test.
 */

import { NextRequest, NextResponse } from "next/server";
import { logger, LogCategory } from "@/lib/logger";

interface TestBody {
  baseUrl?: string;
  apiKey?: string;
  model?: string;
  presetId?: string;
}

function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

function friendlyHttpError(status: number): { message: string; detail: string } {
  if (status === 401 || status === 403) {
    return {
      message: "API key 无效或权限不足",
      detail: "图像供应商拒绝了请求。请检查 key 是否完整、是否开通图像生成权限、账户额度是否可用。",
    };
  }
  if (status === 404) {
    return {
      message: "接口地址不正确",
      detail: "返回 404。请确认 Base URL 是否为图像接口（部分供应商图像端点与文本端点不同）。",
    };
  }
  if (status === 429) {
    return { message: "请求频率或额度受限", detail: "供应商限流，请稍后重试并检查额度。" };
  }
  if (status >= 500) {
    return { message: "供应商服务暂时不可用", detail: `接口返回 HTTP ${status}。` };
  }
  return { message: "连接测试失败", detail: `供应商返回 HTTP ${status}。` };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as TestBody;
    const baseUrl = normalizeBaseUrl(body.baseUrl || "");
    const apiKey = (body.apiKey || "").trim();
    const model = (body.model || "").trim();
    const presetId = body.presetId || "custom";

    if (!baseUrl) {
      return NextResponse.json(
        { ok: false, message: "Base URL 不能为空", detail: "请填写图像供应商接口地址。" },
        { status: 200 },
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    // OpenAI-compatible providers expose /models — a cheap probe.
    const openaiCompatible = ["siliconflow", "openai", "baidu-image2", "zhipu-cogview", "custom"].includes(
      presetId,
    );

    try {
      if (openaiCompatible) {
        const headers: Record<string, string> = {};
        if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
        const res = await fetch(`${baseUrl}/models`, {
          method: "GET",
          headers,
          signal: controller.signal,
        });
        if (!res.ok) {
          const friendly = friendlyHttpError(res.status);
          return NextResponse.json({ ok: false, status: res.status, ...friendly }, { status: 200 });
        }
        const payload = (await res.json().catch(() => null)) as { data?: { id?: string }[] } | null;
        const count = Array.isArray(payload?.data) ? payload.data.length : 0;
        return NextResponse.json(
          {
            ok: true,
            status: res.status,
            message: "连接成功",
            detail: count
              ? `接口可达，返回 ${count} 个模型。注意：/models 仅验证连通性，是否支持图像生成取决于所选模型（${model || "未填写"}）。`
              : "接口可达。建议直接发起一次生成测试以确认模型支持图像。",
          },
          { status: 200 },
        );
      }

      // doubao / other — no generic /models probe; advise a generation test.
      return NextResponse.json(
        {
          ok: true,
          message: "已保存配置",
          detail: `该供应商无通用模型探测接口。请直接在「证件照」中发起一次生成作为连通性验证（模型：${model || "未填写"}）。`,
        },
        { status: 200 },
      );
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    logger.error(LogCategory.API, "image-provider-test error", error as Error);
    const text = error instanceof Error ? error.message : String(error);
    const aborted = text.toLowerCase().includes("abort");
    return NextResponse.json(
      {
        ok: false,
        message: aborted ? "连接超时" : "无法连接到该接口",
        detail: aborted
          ? "10 秒内无响应。请检查 Base URL 是否可达、网络代理是否阻断。"
          : `网络错误：${text}。常见原因是 Base URL 写错或网络不可达。`,
      },
      { status: 200 },
    );
  }
}
