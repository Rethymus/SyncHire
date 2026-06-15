/**
 * Parses the model's raw response into a validated {@link DistilledProject}.
 *
 * Models are told to emit a single JSON object, but in practice they sometimes
 * wrap it in ```json fences or add stray prose. This module robustly extracts
 * the JSON, coerces the common shape mismatches (arrays delivered as strings,
 * missing fields), and attaches provenance. Pure and unit-testable.
 */

import type { DistillProvenance, DistilledProject } from "./types";

/** Strip ```json / ``` fences if present. */
function stripFences(raw: string): string {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(raw);
  return fenced ? fenced[1] : raw;
}

/** Find the outermost JSON object span, tolerating leading/trailing prose. */
function extractJsonObject(raw: string): string | null {
  const fenced = stripFences(raw);
  const start = fenced.indexOf("{");
  const end = fenced.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  return fenced.slice(start, end + 1);
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => (typeof v === "string" ? v : String(v ?? ""))).filter((s) => s.trim().length > 0);
  }
  if (typeof value === "string" && value.trim()) {
    // Some models deliver a comma-/newline-separated string instead of an array.
    return value
      .split(/[\n,，;；、]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

function asString(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value.trim();
  if (value == null) return fallback;
  return String(value).trim();
}

/**
 * Parse + validate. Throws {@link DistillParseError} with a friendly message
 * when the response cannot be salvaged.
 */
export class DistillParseError extends Error {}

export function parseDistilledProject(rawModelOutput: string, provenance: DistillProvenance): DistilledProject {
  const jsonText = extractJsonObject(rawModelOutput);
  if (!jsonText) {
    throw new DistillParseError("模型未返回可解析的 JSON 对象。请重试，或更换模型。");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (error) {
    throw new DistillParseError(
      `JSON 解析失败：${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (!parsed || typeof parsed !== "object") {
    throw new DistillParseError("模型返回的 JSON 不是对象。");
  }

  const obj = parsed as Record<string, unknown>;
  const bullets = asStringArray(obj.bullets);
  if (!bullets.length) {
    throw new DistillParseError("模型返回的要点为空，无法生成项目经历。");
  }

  const name = asString(obj.name) || provenance.repoUrl.split("/").pop() || "未命名项目";

  return {
    name,
    tagline: asString(obj.tagline) || asString(obj.category) || "（模型未给出一句话概述）",
    category: asString(obj.category, "项目"),
    techStack: asStringArray(obj.techStack),
    bullets,
    skills: asStringArray(obj.skills),
    summary: asString(obj.summary),
    innovations: asStringArray(obj.innovations),
    provenance,
  };
}
