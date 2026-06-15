/**
 * Parses the model's raw response into validated
 * {@link NormalizedInterview} and {@link InterviewReviewReport}.
 *
 * Models are told to emit a single JSON object, but in practice they sometimes
 * wrap it in ```json fences or add stray prose. This module robustly extracts
 * the JSON, coerces common shape mismatches (numbers delivered as strings,
 * missing fields, speaker/dimension enums), and clamps scores into range.
 *
 * Mirrors github-distill/parse-distill.ts: pure, defensive, unit-testable.
 */

import type {
  InterviewReviewReport,
  NormalizedInterview,
  NormalizedTurn,
  ReviewActionItem,
  ReviewDimensionScore,
  ReviewHighlight,
  StarGap,
} from "./types";

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

export class ReviewParseError extends Error {}

function asString(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value.trim();
  if (value == null) return fallback;
  return String(value).trim();
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((v) => (typeof v === "string" ? v : String(v ?? "")))
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }
  if (typeof value === "string" && value.trim()) {
    return value
      .split(/[\n,，;；、]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

/** Clamp a numeric-ish value into [min, max]; falls back to default. */
function asClampedNumber(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === "number" ? value : Number.parseFloat(String(value ?? ""));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function normalizeSpeaker(value: unknown): NormalizedTurn["speaker"] {
  const s = asString(value).toLowerCase();
  if (s.startsWith("interviewer") || s === "面试官" || s === "i") return "interviewer";
  if (s.startsWith("candidate") || s === "候选人" || s === "我" || s === "c") return "candidate";
  return "unclear";
}

/**
 * Parse the normalize-stage output. Throws {@link ReviewParseError} with a
 * friendly message when the response cannot be salvaged.
 */
export function parseNormalizedInterview(rawModelOutput: string): NormalizedInterview {
  const jsonText = extractJsonObject(rawModelOutput);
  if (!jsonText) {
    throw new ReviewParseError("模型未返回可解析的 JSON 对象。请重试，或更换模型。");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (error) {
    throw new ReviewParseError(
      `JSON 解析失败：${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (!parsed || typeof parsed !== "object") {
    throw new ReviewParseError("模型返回的 JSON 不是对象。");
  }

  const obj = parsed as Record<string, unknown>;
  const rawTurns = Array.isArray(obj.turns) ? obj.turns : [];

  const turns: NormalizedTurn[] = rawTurns
    .filter((t): t is Record<string, unknown> => typeof t === "object" && t !== null)
    .map((t, idx) => ({
      order: asClampedNumber(t.order, 1, Number.POSITIVE_INFINITY, idx + 1),
      speaker: normalizeSpeaker(t.speaker),
      topic: asString(t.topic, "未分类"),
      text: asString(t.text),
      note: asString(t.note, "") || undefined,
    }))
    .filter((t) => t.text.length > 0)
    // Re-sequence order so it is contiguous after filtering.
    .map((t, idx) => ({ ...t, order: idx + 1 }));

  if (!turns.length) {
    throw new ReviewParseError("模型整理后的对话为空，无法进入复盘。");
  }

  return {
    // source is supplied by the route (the model doesn't echo it reliably)
    source: "recall",
    turns,
    summary: asString(obj.summary, `共整理出 ${turns.length} 轮对话。`),
    unresolved: asStringArray(obj.unresolved),
  };
}

const DIMENSION_KEYS = new Set([
  "technical",
  "behavioral",
  "communication",
  "rolefit",
  "reversequestions",
  "nonverbal",
  "mindset",
]);

function normalizeDimensionKey(value: unknown): string {
  const s = asString(value).toLowerCase().replace(/[\s_-]+/g, "");
  if (DIMENSION_KEYS.has(s)) {
    // restore canonical camelCase
    if (s === "rolefit") return "roleFit";
    if (s === "reversequestions") return "reverseQuestions";
    if (s === "nonverbal") return "nonVerbal";
    return s;
  }
  // tolerate Chinese labels
  const zh: Record<string, string> = {
    技术: "technical",
    行为: "behavioral",
    沟通: "communication",
    匹配: "roleFit",
    反向: "reverseQuestions",
    非语言: "nonVerbal",
    心态: "mindset",
  };
  for (const [k, v] of Object.entries(zh)) {
    if (asString(value).includes(k)) return v;
  }
  return asString(value, "technical");
}

function parseStarGap(raw: unknown): StarGap | null {
  if (typeof raw !== "object" || raw === null) return null;
  const g = raw as Record<string, unknown>;
  const missing = asStringArray(g.missing)
    .map((m) => m.trim().toUpperCase().slice(0, 1))
    .filter((m) => ["S", "T", "A", "R"].includes(m));
  const topic = asString(g.topic);
  const fix = asString(g.fix);
  if (!topic && !fix) return null;
  return { topic: topic || "未标注主题", missing, fix: fix || "（模型未给出补全方法）" };
}

function parseActionItem(raw: unknown): ReviewActionItem | null {
  if (typeof raw !== "object" || raw === null) return null;
  const a = raw as Record<string, unknown>;
  const text = asString(a.text);
  if (!text) return null;
  const category = asString(a.category, "knowledge").toLowerCase();
  const validCat = new Set(["knowledge", "expression", "practice", "story", "mindset"]);
  const priority = asString(a.priority, "medium").toLowerCase();
  const validPri = new Set(["high", "medium", "low"]);
  return {
    category: validCat.has(category) ? category : "knowledge",
    text,
    priority: validPri.has(priority) ? priority : "medium",
  };
}

function parseDimension(raw: unknown): ReviewDimensionScore | null {
  if (typeof raw !== "object" || raw === null) return null;
  const d = raw as Record<string, unknown>;
  return {
    dimension: normalizeDimensionKey(d.dimension),
    score: asClampedNumber(d.score, 1, 5, 3),
    rationale: asString(d.rationale, "（模型未给出依据）"),
    suggestion: asString(d.suggestion, "（模型未给出建议）"),
  };
}

function parseHighlight(raw: unknown): ReviewHighlight | null {
  if (typeof raw !== "object" || raw === null) return null;
  const h = raw as Record<string, unknown>;
  const text = asString(h.text);
  if (!text) return null;
  return { topic: asString(h.topic, "未标注主题"), text };
}

/**
 * Parse the review-stage output. Throws {@link ReviewParseError} when the
 * response cannot be salvaged.
 */
export function parseReviewReport(rawModelOutput: string): InterviewReviewReport {
  const jsonText = extractJsonObject(rawModelOutput);
  if (!jsonText) {
    throw new ReviewParseError("模型未返回可解析的 JSON 对象。请重试，或更换模型。");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (error) {
    throw new ReviewParseError(
      `JSON 解析失败：${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (!parsed || typeof parsed !== "object") {
    throw new ReviewParseError("模型返回的 JSON 不是对象。");
  }

  const obj = parsed as Record<string, unknown>;

  const dimensions = asClampedScoreSet(
    Array.isArray(obj.dimensions) ? obj.dimensions.map(parseDimension).filter(Boolean) : [],
  );

  const starGaps = (Array.isArray(obj.starGaps) ? obj.starGaps : [])
    .map(parseStarGap)
    .filter(Boolean) as StarGap[];

  const actionItems = (Array.isArray(obj.actionItems) ? obj.actionItems : [])
    .map(parseActionItem)
    .filter(Boolean) as ReviewActionItem[];

  const highlights = (Array.isArray(obj.highlights) ? obj.highlights : [])
    .map(parseHighlight)
    .filter(Boolean) as ReviewHighlight[];

  return {
    overallScore: asClampedNumber(obj.overallScore, 1, 5, 3),
    verdict: asString(obj.verdict, "（模型未给出总体评价）"),
    dimensions: dimensions as ReviewDimensionScore[],
    starGaps,
    actionItems,
    highlights,
    followUpTopics: asStringArray(obj.followUpTopics),
    caveats: asStringArray(obj.caveats),
  };
}

/** Type-narrowing helper: TypeScript can't infer the `.filter(Boolean)` result type inline. */
function asClampedScoreSet(arr: (ReviewDimensionScore | null)[]): ReviewDimensionScore[] {
  return arr.filter((d): d is ReviewDimensionScore => d !== null);
}
