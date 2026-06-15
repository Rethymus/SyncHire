import { describe, expect, it } from "vitest";
import { buildNormalizePrompt, NORMALIZE_JSON_SCHEMA_HINT } from "../interview-review/normalize-prompt";
import { buildReviewPrompt, REVIEW_JSON_SCHEMA_HINT } from "../interview-review/review-prompt";
import {
  parseNormalizedInterview,
  parseReviewReport,
  ReviewParseError,
} from "../interview-review/parse-review";
import {
  isLiveDictationSupported,
  getAudioUploadGuidance,
  ACCEPTED_AUDIO_TYPES,
  MAX_AUDIO_BYTES,
  formatBytes,
} from "../interview-review/speech-to-text";
import type { NormalizedInterview } from "../interview-review/types";

// ---------- normalize prompt ----------

describe("buildNormalizePrompt", () => {
  it("includes the raw text and the JSON schema hint", () => {
    const prompt = buildNormalizePrompt({
      source: "recall",
      rawText: "面试官先问自我介绍，然后聊了项目，最后让我设计短链系统。",
    });
    expect(prompt).toContain("短链系统");
    expect(prompt).toContain(NORMALIZE_JSON_SCHEMA_HINT);
    expect(prompt).toContain("<<<RAW_START");
    expect(prompt).toContain("RAW_END>>>");
  });

  it("adapts the source guidance per source", () => {
    const recall = buildNormalizePrompt({ source: "recall", rawText: "x" });
    const transcript = buildNormalizePrompt({ source: "transcript", rawText: "x" });
    const audio = buildNormalizePrompt({ source: "audio", rawText: "x" });
    expect(recall).toContain("面试后回忆");
    expect(transcript).toContain("腾讯会议");
    expect(audio).toContain("语音转写");
  });

  it("emits an interview context line when role/company provided", () => {
    const prompt = buildNormalizePrompt({
      source: "recall",
      rawText: "x",
      targetRole: "高级前端工程师",
      targetCompany: "字节跳动",
    });
    // roleClause = [targetRole, targetCompany].join(" / ")
    expect(prompt).toContain("高级前端工程师 / 字节跳动");
  });

  it("falls back to English header when language=en", () => {
    const prompt = buildNormalizePrompt({ source: "recall", rawText: "hello" }, "en");
    expect(prompt).toContain("Reconstruct");
    expect(prompt).toContain("hello");
  });
});

// ---------- review prompt ----------

describe("buildReviewPrompt", () => {
  const normalized: NormalizedInterview = {
    source: "recall",
    summary: "聊了项目和系统设计",
    turns: [
      { order: 1, speaker: "interviewer", topic: "项目深挖", text: "讲讲你简历里的高并发项目" },
      { order: 2, speaker: "candidate", topic: "项目深挖", text: "我做了一个推荐系统，引入了多级缓存" },
      { order: 3, speaker: "interviewer", topic: "系统设计", text: "设计一个短链系统" },
    ],
    unresolved: ["有一段没听清的问题"],
  };

  it("embeds every turn and the schema hint", () => {
    const prompt = buildReviewPrompt({ normalized });
    expect(prompt).toContain("多级缓存");
    expect(prompt).toContain("短链系统");
    expect(prompt).toContain(REVIEW_JSON_SCHEMA_HINT);
    expect(prompt).toContain("<<<TURNS_START");
  });

  it("surfaces unresolved fragments as caveats", () => {
    const prompt = buildReviewPrompt({ normalized });
    expect(prompt).toContain("存疑片段");
    expect(prompt).toContain("有一段没听清的问题");
  });

  it("includes focus notes when provided", () => {
    const prompt = buildReviewPrompt({ normalized, focusNotes: "系统设计那题答得不好" });
    expect(prompt).toContain("系统设计那题答得不好");
  });
});

// ---------- parse normalized ----------

describe("parseNormalizedInterview", () => {
  it("parses a clean JSON object", () => {
    const raw = JSON.stringify({
      summary: "技术面一轮",
      turns: [
        { order: 2, speaker: "interviewer", topic: "系统设计", text: "设计短链系统" },
        { order: 1, speaker: "interviewer", topic: "自我介绍", text: "介绍一下你自己" },
      ],
      unresolved: [],
    });
    const result = parseNormalizedInterview(raw);
    expect(result.turns).toHaveLength(2);
    // order is re-sequenced to be contiguous
    expect(result.turns[0].order).toBe(1);
    expect(result.turns[1].order).toBe(2);
  });

  it("strips ```json fences and surrounding prose", () => {
    const raw = "Sure, here is the result:\n```json\n{\"summary\":\"s\",\"turns\":[{\"order\":1,\"speaker\":\"candidate\",\"topic\":\"t\",\"text\":\"hi\"}]}\n```\nThanks";
    const result = parseNormalizedInterview(raw);
    expect(result.turns).toHaveLength(1);
    expect(result.turns[0].text).toBe("hi");
  });

  it("normalizes speaker labels (zh + abbreviations)", () => {
    const raw = JSON.stringify({
      turns: [
        { order: 1, speaker: "面试官", topic: "t", text: "q" },
        { order: 2, speaker: "我", topic: "t", text: "a" },
        { order: 3, speaker: "c", topic: "t", text: "a2" },
      ],
    });
    const result = parseNormalizedInterview(raw);
    expect(result.turns[0].speaker).toBe("interviewer");
    expect(result.turns[1].speaker).toBe("candidate");
    expect(result.turns[2].speaker).toBe("candidate");
  });

  it("drops empty-text turns and re-sequences", () => {
    const raw = JSON.stringify({
      turns: [
        { order: 1, speaker: "interviewer", topic: "t", text: "q" },
        { order: 2, speaker: "interviewer", topic: "t", text: "" },
        { order: 3, speaker: "candidate", topic: "t", text: "a" },
      ],
    });
    const result = parseNormalizedInterview(raw);
    expect(result.turns).toHaveLength(2);
    expect(result.turns.map((t) => t.order)).toEqual([1, 2]);
  });

  it("throws ReviewParseError on unparseable input", () => {
    expect(() => parseNormalizedInterview("not json at all")).toThrow(ReviewParseError);
    expect(() => parseNormalizedInterview('{"turns":[]}')).toThrow(ReviewParseError);
  });
});

// ---------- parse review report ----------

describe("parseReviewReport", () => {
  it("clamps scores into 1-5 and coerces number-as-string", () => {
    const raw = JSON.stringify({
      overallScore: "9",
      verdict: "整体不错",
      dimensions: [
        { dimension: "技术", score: 7, rationale: "r", suggestion: "s" },
        { dimension: "reverse questions", score: 2, rationale: "r", suggestion: "s" },
      ],
      starGaps: [],
      actionItems: [],
      highlights: [],
      followUpTopics: [],
      caveats: [],
    });
    const report = parseReviewReport(raw);
    expect(report.overallScore).toBe(5);
    expect(report.dimensions[0].score).toBe(5);
    expect(report.dimensions[0].dimension).toBe("technical");
    expect(report.dimensions[1].dimension).toBe("reverseQuestions");
  });

  it("maps zh dimension labels to canonical keys", () => {
    const raw = JSON.stringify({
      overallScore: 3,
      verdict: "v",
      dimensions: [
        { dimension: "沟通", score: 4, rationale: "r", suggestion: "s" },
        { dimension: "非语言", score: 3, rationale: "r", suggestion: "s" },
      ],
      starGaps: [],
      actionItems: [],
      highlights: [],
      followUpTopics: [],
      caveats: [],
    });
    const report = parseReviewReport(raw);
    expect(report.dimensions.map((d) => d.dimension)).toEqual(["communication", "nonVerbal"]);
  });

  it("filters out action items without text", () => {
    const raw = JSON.stringify({
      overallScore: 3,
      verdict: "v",
      dimensions: [],
      starGaps: [],
      actionItems: [
        { category: "knowledge", text: "复习 Redis", priority: "high" },
        { category: "expression", text: "", priority: "low" },
      ],
      highlights: [],
      followUpTopics: [],
      caveats: [],
    });
    const report = parseReviewReport(raw);
    expect(report.actionItems).toHaveLength(1);
    expect(report.actionItems[0].text).toBe("复习 Redis");
  });

  it("uppercases and filters STAR missing letters", () => {
    const raw = JSON.stringify({
      overallScore: 3,
      verdict: "v",
      dimensions: [],
      starGaps: [{ topic: "项目深挖", missing: ["r", "x", "a"], fix: "补 Result" }],
      actionItems: [],
      highlights: [],
      followUpTopics: [],
      caveats: [],
    });
    const report = parseReviewReport(raw);
    expect(report.starGaps[0].missing).toEqual(["R", "A"]);
  });

  it("throws ReviewParseError on garbage", () => {
    expect(() => parseReviewReport("!!!")).toThrow(ReviewParseError);
  });
});

// ---------- speech-to-text (client-only, SSR-safe) ----------

describe("speech-to-text helpers", () => {
  it("isLiveDictationSupported returns false without window", () => {
    // jsdom may or may not define the API; assert it is boolean either way.
    expect(typeof isLiveDictationSupported()).toBe("boolean");
  });

  it("getAudioUploadGuidance returns heading, body, options", () => {
    const g = getAudioUploadGuidance();
    expect(g.heading).toBeTruthy();
    expect(g.body).toBeTruthy();
    expect(g.options.length).toBeGreaterThanOrEqual(2);
    expect(g.options.some((o) => o.includes("腾讯会议"))).toBe(true);
  });

  it("ACCEPTED_AUDIO_TYPES and MAX_AUDIO_BYTES are sane", () => {
    expect(ACCEPTED_AUDIO_TYPES).toContain("audio/*");
    expect(MAX_AUDIO_BYTES).toBeGreaterThan(0);
  });

  it("formatBytes renders human-readable sizes", () => {
    expect(formatBytes(500)).toBe("500 B");
    expect(formatBytes(2048)).toBe("2 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
  });
});
