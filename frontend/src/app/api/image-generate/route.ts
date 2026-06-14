/**
 * Portrait / business-headshot image generation (server-side proxy).
 *
 * Accepts the user's uploaded personal photo (base64 data URL) + a prompt, and
 * calls the configured image model. Server-side so the API key stays out of the
 * browser network tab and CORS is handled. Supports several protocols:
 *
 *  - openai-images: POST /images/generations  (text-to-image, prompt only)
 *  - openai-edit:   POST /images/edits        (multipart: image + prompt)
 *  - siliconflow:   POST /images/generations or /images/edits (Bearer)
 *  - doubao:        POST {baseUrl}/images/generations (OpenAI-style on Ark)
 *
 * Returns { ok, imageUrl } where imageUrl is a base64 data URL (so the image
 * renders in <img> without a network fetch and round-trips through export).
 */

import { NextRequest, NextResponse } from "next/server";
import { logger, LogCategory } from "@/lib/logger";

interface GenerateBody {
  baseUrl?: string;
  apiKey?: string;
  model?: string;
  prompt?: string;
  imageDataUrl?: string;
  presetId?: string;
  size?: string;
}

function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

/** Extract raw base64 + mime from a data URL. */
function parseDataUrl(dataUrl: string): { mime: string; base64: string } | null {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl.trim());
  if (!match) return null;
  return { mime: match[1], base64: match[2] };
}

function base64ToBuffer(base64: string): Buffer {
  return Buffer.from(base64, "base64");
}

function extFromMime(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

interface GeneratedImage {
  imageUrl: string;
}

async function callOpenAIEdit(
  baseUrl: string,
  apiKey: string,
  model: string,
  prompt: string,
  image: { mime: string; base64: string },
  size: string,
): Promise<GeneratedImage> {
  // OpenAI /images/edits uses multipart/form-data.
  const form = new FormData();
  form.append("model", model);
  form.append("prompt", prompt);
  form.append("n", "1");
  form.append("size", size && size !== "1:1" && size !== "auto" ? size : "1024x1024");
  const ext = extFromMime(image.mime);
  const bytes = new Uint8Array(base64ToBuffer(image.base64));
  const blob = new Blob([bytes], { type: image.mime });
  form.append("image", blob, `photo.${ext}`);

  const res = await fetch(`${baseUrl}/images/edits`, {
    method: "POST",
    headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
    body: form,
  });
  return parseGenerationResponse(res);
}

async function callOpenAIImages(
  baseUrl: string,
  apiKey: string,
  model: string,
  prompt: string,
  size: string,
): Promise<GeneratedImage> {
  const res = await fetch(`${baseUrl}/images/generations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      model,
      prompt,
      n: 1,
      size: size && size !== "1:1" && size !== "auto" ? size : "1024x1024",
    }),
  });
  return parseGenerationResponse(res);
}

async function callSiliconFlow(
  baseUrl: string,
  apiKey: string,
  model: string,
  prompt: string,
  image: { mime: string; base64: string } | null,
  size: string,
): Promise<GeneratedImage> {
  // SiliconFlow: /images/edits supports image+prompt; fall back to /images/generations.
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };
  if (image) {
    const res = await fetch(`${baseUrl}/images/edits`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        prompt,
        image: image.base64,
        image_size: size === "1:1" || size === "auto" ? "1024x1024" : size,
        batch_size: 1,
      }),
    });
    return parseGenerationResponse(res);
  }
  const res = await fetch(`${baseUrl}/images/generations`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      prompt,
      image_size: size === "1:1" || size === "auto" ? "1024x1024" : size,
      batch_size: 1,
    }),
  });
  return parseGenerationResponse(res);
}

async function callDoubao(
  baseUrl: string,
  apiKey: string,
  model: string,
  prompt: string,
  image: { mime: string; base64: string } | null,
): Promise<GeneratedImage> {
  // Volcengine Ark exposes an OpenAI-style /images/generations for seedream.
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };
  const body: Record<string, unknown> = { model, prompt, n: 1, response_format: "b64_json" };
  if (image) body.image = image.base64;
  const res = await fetch(`${baseUrl}/images/generations`, { method: "POST", headers, body: JSON.stringify(body) });
  return parseGenerationResponse(res);
}

async function parseGenerationResponse(res: Response): Promise<GeneratedImage> {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 400)}`);
  }
  const payload = (await res.json().catch(() => null)) as
    | { data?: Array<{ b64_json?: string; url?: string }>; images?: string[]; url?: string; b64_json?: string }
    | null;

  const firstData = payload?.data?.[0];
  if (firstData?.b64_json) {
    return { imageUrl: `data:image/png;base64,${firstData.b64_json}` };
  }
  if (firstData?.url) {
    // Fetch the remote URL and re-encode to a data URL so it renders without a
    // second network hop and survives export.
    return { imageUrl: await fetchToDataUrl(firstData.url) };
  }
  if (Array.isArray(payload?.images) && payload.images[0]) {
    return { imageUrl: `data:image/png;base64,${payload.images[0]}` };
  }
  if (payload?.b64_json) {
    return { imageUrl: `data:image/png;base64,${payload.b64_json}` };
  }
  if (payload?.url) {
    return { imageUrl: await fetchToDataUrl(payload.url) };
  }
  throw new Error("供应商响应中未找到图像字段（data[].b64_json / data[].url / images[]）。");
}

async function fetchToDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`下载生成图失败 HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const mime = res.headers.get("content-type") || "image/png";
  return `data:${mime};base64,${buf.toString("base64")}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as GenerateBody;
    const baseUrl = normalizeBaseUrl(body.baseUrl || "");
    const apiKey = (body.apiKey || "").trim();
    const model = (body.model || "").trim();
    const prompt = (body.prompt || "").trim();
    const presetId = body.presetId || "custom";
    const size = body.size || "1024x1024";

    if (!baseUrl || !model || !prompt) {
      return NextResponse.json(
        { ok: false, error: "缺少必填项：baseUrl / model / prompt。" },
        { status: 400 },
      );
    }

    const image = body.imageDataUrl ? parseDataUrl(body.imageDataUrl) : null;

    try {
      let result: GeneratedImage;
      switch (presetId) {
        case "openai":
          // gpt-image-1 supports image edits (photo → headshot).
          result = image
            ? await callOpenAIEdit(baseUrl, apiKey, model, prompt, image, size)
            : await callOpenAIImages(baseUrl, apiKey, model, prompt, size);
          break;
        case "siliconflow":
          result = await callSiliconFlow(baseUrl, apiKey, model, prompt, image, size);
          break;
        case "doubao":
          result = await callDoubao(baseUrl, apiKey, model, prompt, image);
          break;
        case "baidu-image2":
        case "zhipu-cogview":
        case "custom":
        default:
          // Generic OpenAI-compatible. Prefer edits when a source image is given.
          result = image
            ? await callOpenAIEdit(baseUrl, apiKey, model, prompt, image, size)
            : await callOpenAIImages(baseUrl, apiKey, model, prompt, size);
          break;
      }
      return NextResponse.json({ ok: true, imageUrl: result.imageUrl }, { status: 200 });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error(LogCategory.API, "image-generate provider error", error as Error);
      return NextResponse.json({ ok: false, error: `图像生成失败：${msg}` }, { status: 200 });
    }
  } catch (error) {
    logger.error(LogCategory.API, "image-generate route error", error as Error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "图像生成路由异常" },
      { status: 500 },
    );
  }
}
