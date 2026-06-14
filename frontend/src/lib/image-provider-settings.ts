/**
 * Image provider settings — kept SEPARATE from the text-AI providers in
 * {@link ai-runtime-settings}, because many LLM providers cannot generate
 * images. Users configure a dedicated image model (e.g. an image2 / DALL·E /
 * doubao-seedream / siliconflow image endpoint) with its own API key.
 *
 * Persisted under its own localStorage key. Keys are stored locally only and
 * never sent anywhere except the configured image endpoint (via the server
 * proxy routes, which keep them out of the browser network tab).
 */

export type ImageProtocol =
  | "openai-images" // POST /images/generations (DALL·E / OpenAI-compatible)
  | "openai-edit" // POST /images/edits (image-to-image, multipart)
  | "siliconflow" // POST /images/generations, Bearer auth
  | "doubao" // volcengine visual generation
  | "gemini-image"; // generateContent with responseModalities

export type ImagePresetId =
  | "siliconflow"
  | "openai"
  | "doubao"
  | "baidu-image2"
  | "zhipu-cogview"
  | "custom";

export interface ImageProviderPreset {
  id: ImagePresetId;
  label: string;
  baseUrl: string;
  apiKeyUrl: string;
  /** Recommended model id for image generation. */
  defaultModel: string;
  protocol: ImageProtocol;
  requiresApiKey: boolean;
  /** Short help shown under the model field. */
  modelHint: string;
}

export const IMAGE_PROVIDER_PRESETS: ImageProviderPreset[] = [
  {
    id: "siliconflow",
    label: "SiliconFlow 硅基流动",
    baseUrl: "https://api.siliconflow.cn/v1",
    apiKeyUrl: "https://cloud.siliconflow.cn/account/ak",
    defaultModel: "Kwai-Kolors/Kolors",
    protocol: "siliconflow",
    requiresApiKey: true,
    modelHint: "如 Kwai-Kolors/Kolors、 stabilityai/stable-diffusion-3-5-large",
  },
  {
    id: "openai",
    label: "OpenAI (DALL·E / gpt-image)",
    baseUrl: "https://api.openai.com/v1",
    apiKeyUrl: "https://platform.openai.com/api-keys",
    defaultModel: "gpt-image-1",
    protocol: "openai-edit",
    requiresApiKey: true,
    modelHint: "gpt-image-1（图像编辑/生成）或 dall-e-3",
  },
  {
    id: "doubao",
    label: "火山引擎豆包（视觉生成）",
    baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
    apiKeyUrl: "https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey",
    defaultModel: "doubao-seedream-3-0-t2i-250415",
    protocol: "doubao",
    requiresApiKey: true,
    modelHint: "doubao-seedream 系列图像生成模型 ID",
  },
  {
    id: "baidu-image2",
    label: "百度千帆 Image2",
    baseUrl: "https://qianfan.baidubce.com/v2",
    apiKeyUrl: "https://console.bce.baidu.com/iam/#/iam/apikey/list",
    defaultModel: "image2",
    protocol: "openai-images",
    requiresApiKey: true,
    modelHint: "image2（百度图像生成大模型）",
  },
  {
    id: "zhipu-cogview",
    label: "智谱 CogView",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    apiKeyUrl: "https://open.bigmodel.cn/usercenter/apikeys",
    defaultModel: "cogview-3-plus",
    protocol: "openai-images",
    requiresApiKey: true,
    modelHint: "cogview-3-plus 或更新版本",
  },
  {
    id: "custom",
    label: "自定义 OpenAI 兼容图像接口",
    baseUrl: "",
    apiKeyUrl: "",
    defaultModel: "",
    protocol: "openai-images",
    requiresApiKey: false,
    modelHint: "填写支持 /images/generations 或 /images/edits 的兼容端点",
  },
];

export const IMAGE_PROVIDER_SETTINGS_STORAGE_KEY = "synchire-image-provider-settings";
export const IMAGE_PROVIDER_SETTINGS_VERSION = 1;

export interface ImageProviderSettings {
  version: number;
  updatedAt: string;
  presetId: ImagePresetId;
  baseUrl: string;
  apiKey: string;
  model: string;
  /** Image output size hint passed to the model when supported. */
  size: "1024x1024" | "1:1" | "auto";
}

export function getImagePreset(id: ImagePresetId): ImageProviderPreset {
  return IMAGE_PROVIDER_PRESETS.find((p) => p.id === id) ?? IMAGE_PROVIDER_PRESETS[0];
}

export function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

export function createDefaultImageProviderSettings(): ImageProviderSettings {
  const preset = IMAGE_PROVIDER_PRESETS[0];
  return {
    version: IMAGE_PROVIDER_SETTINGS_VERSION,
    updatedAt: "",
    presetId: preset.id,
    baseUrl: preset.baseUrl,
    apiKey: "",
    model: preset.defaultModel,
    size: "1024x1024",
  };
}

export function hydrateImageProviderSettings(raw: unknown): ImageProviderSettings {
  const fallback = createDefaultImageProviderSettings();
  if (!raw || typeof raw !== "object") {
    return fallback;
  }
  const obj = raw as Partial<ImageProviderSettings>;
  const presetId: ImagePresetId =
    obj.presetId && IMAGE_PROVIDER_PRESETS.some((p) => p.id === obj.presetId)
      ? obj.presetId
      : fallback.presetId;
  const preset = getImagePreset(presetId);
  return {
    version: IMAGE_PROVIDER_SETTINGS_VERSION,
    updatedAt: typeof obj.updatedAt === "string" ? obj.updatedAt : "",
    presetId,
    baseUrl: normalizeBaseUrl(obj.baseUrl ?? preset.baseUrl),
    apiKey: typeof obj.apiKey === "string" ? obj.apiKey : "",
    model: (obj.model ?? preset.defaultModel).toString(),
    size: obj.size === "1:1" || obj.size === "auto" ? obj.size : "1024x1024",
  };
}

function nowIso(): string {
  return new Date().toISOString();
}

export function loadImageProviderSettings(): ImageProviderSettings {
  if (typeof window === "undefined") {
    return createDefaultImageProviderSettings();
  }
  try {
    const stored = window.localStorage.getItem(IMAGE_PROVIDER_SETTINGS_STORAGE_KEY);
    return hydrateImageProviderSettings(stored ? JSON.parse(stored) : undefined);
  } catch {
    return createDefaultImageProviderSettings();
  }
}

export function saveImageProviderSettings(settings: ImageProviderSettings): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(
    IMAGE_PROVIDER_SETTINGS_STORAGE_KEY,
    JSON.stringify({ ...settings, version: IMAGE_PROVIDER_SETTINGS_VERSION, updatedAt: nowIso() }),
  );
}

export function maskApiKey(apiKey: string): string {
  if (!apiKey) {
    return "未配置";
  }
  if (apiKey.length <= 8) {
    return "••••••••";
  }
  return `${apiKey.slice(0, 4)}••••${apiKey.slice(-4)}`;
}

export interface ImageConnectionResult {
  ok: boolean;
  status?: number;
  message: string;
  detail: string;
}

/**
 * Test the image provider connection via the server proxy route (keeps the key
 * off the browser network tab and sidesteps CORS). Returns a friendly result.
 */
export async function testImageProviderConnection(
  settings: ImageProviderSettings,
): Promise<ImageConnectionResult> {
  if (!settings.baseUrl) {
    return { ok: false, message: "Base URL 不能为空", detail: "请选择图像供应商或填写接口地址。" };
  }
  try {
    const res = await fetch("/api/image-provider-test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        baseUrl: settings.baseUrl,
        apiKey: settings.apiKey,
        model: settings.model,
        presetId: settings.presetId,
      }),
    });
    const data = (await res.json().catch(() => null)) as ImageConnectionResult | null;
    if (!data) {
      return { ok: false, message: "测试服务异常", detail: `代理路由返回 HTTP ${res.status}` };
    }
    return data;
  } catch (error) {
    return {
      ok: false,
      message: "无法连接测试服务",
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}
