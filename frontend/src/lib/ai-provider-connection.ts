import type { AIModelOption, AIProviderConfig, AIProviderId } from "./ai-runtime-settings";

export type AIProviderPresetId =
  | "openai"
  | "deepseek"
  | "moonshot"
  | "anthropic"
  | "gemini"
  | "ollama"
  | "openai-compatible";

export interface AIProviderPreset {
  id: AIProviderPresetId;
  providerId: AIProviderId;
  label: string;
  baseUrl: string;
  apiKeyUrl: string;
  requiresApiKey: boolean;
  protocol: "openai" | "anthropic" | "gemini";
}

export interface AIConnectionResult {
  ok: boolean;
  status?: number;
  message: string;
  detail: string;
  models: AIModelOption[];
}

export const AI_PROVIDER_PRESETS: AIProviderPreset[] = [
  {
    id: "openai",
    providerId: "openai",
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    apiKeyUrl: "https://platform.openai.com/api-keys",
    requiresApiKey: true,
    protocol: "openai",
  },
  {
    id: "deepseek",
    providerId: "deepseek",
    label: "DeepSeek",
    baseUrl: "https://api.deepseek.com",
    apiKeyUrl: "https://platform.deepseek.com/api_keys",
    requiresApiKey: true,
    protocol: "openai",
  },
  {
    id: "moonshot",
    providerId: "moonshot",
    label: "Kimi / Moonshot",
    baseUrl: "https://api.moonshot.cn/v1",
    apiKeyUrl: "https://platform.moonshot.cn/console/api-keys",
    requiresApiKey: true,
    protocol: "openai",
  },
  {
    id: "anthropic",
    providerId: "anthropic",
    label: "Anthropic",
    baseUrl: "https://api.anthropic.com",
    apiKeyUrl: "https://console.anthropic.com/settings/keys",
    requiresApiKey: true,
    protocol: "anthropic",
  },
  {
    id: "gemini",
    providerId: "gemini",
    label: "Google Gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    apiKeyUrl: "https://aistudio.google.com/app/apikey",
    requiresApiKey: true,
    protocol: "gemini",
  },
  {
    id: "ollama",
    providerId: "local",
    label: "Ollama 本地服务",
    baseUrl: "http://localhost:11434/v1",
    apiKeyUrl: "https://ollama.com/library",
    requiresApiKey: false,
    protocol: "openai",
  },
  {
    id: "openai-compatible",
    providerId: "openai",
    label: "自定义 OpenAI 兼容接口",
    baseUrl: "",
    apiKeyUrl: "https://platform.openai.com/docs/api-reference/models/list",
    requiresApiKey: false,
    protocol: "openai",
  },
];

export function getPresetsForProvider(providerId: AIProviderId) {
  return AI_PROVIDER_PRESETS.filter((preset) => preset.providerId === providerId);
}

export function findPresetByBaseUrl(providerId: AIProviderId, baseUrl: string) {
  const normalized = normalizeBaseUrl(baseUrl);
  return getPresetsForProvider(providerId).find((preset) => normalizeBaseUrl(preset.baseUrl) === normalized);
}

export function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}

function buildModelOption(modelId: string): AIModelOption {
  return {
    id: modelId,
    label: modelId,
    description: "由供应商接口返回的可用模型。",
    useCases: ["custom endpoint"],
  };
}

function mergeModels(existing: AIModelOption[], discovered: string[]) {
  const seen = new Set<string>();
  const merged: AIModelOption[] = [];

  [...existing, ...discovered.map(buildModelOption)].forEach((model) => {
    if (!model.id || seen.has(model.id)) return;
    seen.add(model.id);
    merged.push(model);
  });

  if (!seen.has("custom")) {
    merged.push({
      id: "custom",
      label: "Custom model ID",
      description: "Use any model ID supported by your endpoint.",
      useCases: ["custom endpoint"],
    });
  }

  return merged;
}

function getFriendlyStatusMessage(status: number) {
  if (status === 401 || status === 403) {
    return {
      message: "API key 无效或权限不足",
      detail: "供应商拒绝了请求。请检查 API key 是否复制完整、是否过期、是否有模型列表权限，以及账号额度是否可用。",
    };
  }

  if (status === 404) {
    return {
      message: "Base URL 或模型列表端点不正确",
      detail: "接口返回 404。常见原因是 Base URL 少了 /v1、填成了网页控制台地址，或该供应商不是 OpenAI 兼容的 /models 端点。",
    };
  }

  if (status === 429) {
    return {
      message: "请求频率或额度受限",
      detail: "供应商返回限流。请稍后重试，并检查账号余额、免费额度、组织限额和并发限制。",
    };
  }

  if ([500, 502, 503, 504].includes(status)) {
    return {
      message: "供应商服务暂时不可用",
      detail: `接口返回 ${status}。可能是供应商故障、代理网关异常、区域网络不可达，或 Base URL 指向了不可用的中转服务。`,
    };
  }

  return {
    message: "连接测试失败",
    detail: `供应商返回 HTTP ${status}。请核对 Base URL、API key、模型权限和网络代理设置。`,
  };
}

function getNetworkErrorMessage(error: unknown) {
  const text = error instanceof Error ? error.message : String(error);

  if (text.toLowerCase().includes("abort")) {
    return {
      message: "连接超时",
      detail: "8 秒内没有收到响应。请检查 Base URL 是否可访问、本地模型服务是否已启动，或网络代理是否阻断。",
    };
  }

  return {
    message: "浏览器无法连接到该接口",
    detail:
      "常见原因是 Base URL 写错、网络不可达、本地服务未启动，或供应商禁止浏览器直连导致 CORS 失败。可改用本地代理/桌面后端，或换用允许浏览器访问的兼容端点。",
  };
}

async function parseModels(response: Response, preset: AIProviderPreset) {
  const payload = await response.json().catch(() => null);
  const modelIds = new Set<string>();

  if (Array.isArray(payload?.data)) {
    payload.data.forEach((item: { id?: string }) => {
      if (item.id) modelIds.add(item.id);
    });
  }

  if (Array.isArray(payload?.models)) {
    payload.models.forEach((item: { name?: string; displayName?: string }) => {
      const id = item.name || item.displayName;
      if (id) modelIds.add(id.replace(/^models\//, ""));
    });
  }

  if (Array.isArray(payload) && preset.protocol === "anthropic") {
    payload.forEach((item: { id?: string }) => {
      if (item.id) modelIds.add(item.id);
    });
  }

  return Array.from(modelIds).sort();
}

function buildRequest(provider: AIProviderConfig, preset: AIProviderPreset) {
  const baseUrl = normalizeBaseUrl(provider.baseUrl || preset.baseUrl);

  if (!baseUrl) {
    throw new Error("Base URL 不能为空。请选择供应商或填写兼容接口地址。");
  }

  if (preset.requiresApiKey && !provider.apiKey.trim()) {
    throw new Error("请先填写 API key。该供应商的模型列表接口需要密钥。");
  }

  if (preset.protocol === "gemini") {
    return {
      url: `${baseUrl}/models?key=${encodeURIComponent(provider.apiKey.trim())}`,
      headers: {} as Record<string, string>,
    };
  }

  if (preset.protocol === "anthropic") {
    return {
      url: `${baseUrl}/v1/models`,
      headers: {
        "x-api-key": provider.apiKey.trim(),
        "anthropic-version": "2023-06-01",
      } satisfies Record<string, string>,
    };
  }

  const headers: Record<string, string> = {};
  if (provider.apiKey.trim()) {
    headers.Authorization = `Bearer ${provider.apiKey.trim()}`;
  }

  return {
    url: `${baseUrl}/models`,
    headers,
  };
}

export async function testAIProviderConnection(provider: AIProviderConfig): Promise<AIConnectionResult> {
  const preset =
    findPresetByBaseUrl(provider.id, provider.baseUrl) ??
    getPresetsForProvider(provider.id)[0] ??
    AI_PROVIDER_PRESETS[AI_PROVIDER_PRESETS.length - 1];

  let request: { url: string; headers: Record<string, string> };
  try {
    request = buildRequest(provider, preset);
  } catch (error) {
    return {
      ok: false,
      message: "配置不完整",
      detail: error instanceof Error ? error.message : "请检查 Base URL 与 API key。",
      models: [],
    };
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(request.url, {
      method: "GET",
      headers: request.headers,
      signal: controller.signal,
    });

    if (!response.ok) {
      const friendly = getFriendlyStatusMessage(response.status);
      return { ok: false, status: response.status, ...friendly, models: [] };
    }

    const discovered = await parseModels(response, preset);
    const models = mergeModels(provider.models, discovered);

    return {
      ok: true,
      status: response.status,
      message: discovered.length > 0 ? "连接成功，已获取可用模型" : "连接成功，但未返回模型列表",
      detail:
        discovered.length > 0
          ? `已发现 ${discovered.length} 个模型。测试仅拉取模型列表，不发送简历或职位内容。`
          : "接口可访问，但响应中没有标准模型列表。可以继续手动填写模型 ID。",
      models,
    };
  } catch (error) {
    const friendly = getNetworkErrorMessage(error);
    return { ok: false, ...friendly, models: [] };
  } finally {
    window.clearTimeout(timeout);
  }
}
