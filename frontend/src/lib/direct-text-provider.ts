import type { ResolvedTextProvider } from "@/lib/github-distill/llm-resolver";
import { canUseDirectByokInThisRuntime } from "@/lib/deployment-mode";

export type DirectProviderProtocol = "openai-compatible" | "anthropic" | "gemini";

export class DirectProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DirectProviderError";
  }
}

export function protocolForProvider(providerId: ResolvedTextProvider["providerId"]): DirectProviderProtocol {
  if (providerId === "anthropic") return "anthropic";
  if (providerId === "gemini") return "gemini";
  return "openai-compatible";
}

export function normalizeDirectBaseUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new DirectProviderError("供应商地址无效。请检查 Base URL。");
  }
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) {
    throw new DirectProviderError("GitHub Pages 仅允许不含查询参数的 HTTPS 供应商地址。");
  }
  return url;
}

function endpoint(base: URL, path: string): string {
  const normalized = base.toString().replace(/\/+$/, "");
  return `${normalized}/${path.replace(/^\/+/, "")}`;
}

function readModelText(protocol: DirectProviderProtocol, payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const body = payload as Record<string, unknown>;
  if (protocol === "openai-compatible") {
    const choices = body.choices;
    if (Array.isArray(choices)) {
      const message = choices[0] as { message?: { content?: unknown } } | undefined;
      return typeof message?.message?.content === "string" ? message.message.content : null;
    }
  }
  if (protocol === "anthropic") {
    const content = body.content;
    if (Array.isArray(content)) {
      const text = (content[0] as { text?: unknown } | undefined)?.text;
      return typeof text === "string" ? text : null;
    }
  }
  if (protocol === "gemini") {
    const candidates = body.candidates;
    if (Array.isArray(candidates)) {
      const parts = (candidates[0] as { content?: { parts?: { text?: unknown }[] } } | undefined)?.content?.parts;
      if (Array.isArray(parts)) {
        return parts.map((part) => (typeof part.text === "string" ? part.text : "")).join("") || null;
      }
    }
  }
  return null;
}

export function directConsentId(provider: ResolvedTextProvider): string {
  const url = normalizeDirectBaseUrl(provider.baseUrl);
  return [protocolForProvider(provider.providerId), url.origin, provider.model].join("|");
}

export async function completeTextDirectly(input: {
  provider: ResolvedTextProvider;
  systemPrompt: string;
  userPrompt: string;
}): Promise<string> {
  if (!canUseDirectByokInThisRuntime()) {
    throw new DirectProviderError("此页面不是安全上下文，已禁止直接使用 API Key。");
  }
  if (!input.provider.apiKey.trim()) {
    throw new DirectProviderError("请先填写 API Key。");
  }
  const base = normalizeDirectBaseUrl(input.provider.baseUrl);
  const protocol = protocolForProvider(input.provider.providerId);
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  let url: string;
  let body: Record<string, unknown>;

  if (protocol === "anthropic") {
    url = endpoint(base, base.pathname.replace(/\/+$/, "").endsWith("/v1") ? "messages" : "v1/messages");
    headers["x-api-key"] = input.provider.apiKey.trim();
    headers["anthropic-version"] = "2023-06-01";
    headers["anthropic-dangerous-direct-browser-access"] = "true";
    body = {
      model: input.provider.model,
      max_tokens: 4096,
      system: input.systemPrompt,
      messages: [{ role: "user", content: input.userPrompt }],
    };
  } else if (protocol === "gemini") {
    const model = input.provider.model.replace(/^models\//, "");
    url = endpoint(base, `models/${encodeURIComponent(model)}:generateContent`);
    headers["x-goog-api-key"] = input.provider.apiKey.trim();
    body = {
      systemInstruction: { parts: [{ text: input.systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: input.userPrompt }] }],
      generationConfig: { temperature: 0.3 },
    };
  } else {
    url = endpoint(base, "chat/completions");
    headers.Authorization = `Bearer ${input.provider.apiKey.trim()}`;
    body = {
      model: input.provider.model,
      temperature: 0.3,
      messages: [
        { role: "system", content: input.systemPrompt },
        { role: "user", content: input.userPrompt },
      ],
    };
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      redirect: "error",
      referrerPolicy: "no-referrer",
      signal: AbortSignal.timeout(60_000),
    });
    if (!response.ok) {
      throw new DirectProviderError("供应商拒绝或未能完成请求。请检查模型、额度和权限。");
    }
    const text = readModelText(protocol, await response.json().catch(() => null));
    if (!text) throw new DirectProviderError("供应商返回为空或格式不受支持。");
    return text;
  } catch (error) {
    if (error instanceof DirectProviderError) throw error;
    throw new DirectProviderError("无法连接供应商（可能是 CORS、网络或超时）。SyncHire 未使用代理回退。");
  }
}
