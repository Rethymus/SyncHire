/**
 * Builds the model prompt for the **review** stage: turning a normalized
 * interview transcript into a structured 复盘 report.
 *
 * The methodology encoded here (synthesized from established interview-review
 * practice) scores seven dimensions, checks every candidate answer against the
 * STAR framework, and produces a prioritized action-item list plus a
 * highlight bank of strong answers worth reusing. The model is grounded to the
 * normalized turns — it must cite topics and must not invent questions or
 * metrics that don't appear.
 *
 * Seven dimensions:
 *   1. technical        — knowledge depth, problem-solving, optimal solutions
 *   2. behavioral       — STAR stories with conflict/growth, leadership signals
 *   3. communication    — clarity, structure, pace, composure under pressure
 *   4. roleFit          — alignment with the target role/JD
 *   5. reverseQuestions — depth and authenticity of the candidate's questions
 *   6. nonVerbal        — eye contact, body language, dress (where inferable)
 *   7. mindset          — calm under hard questions, recovery from setbacks
 *
 * Pure: deterministic string building, fully unit-testable.
 */

import type { NormalizedInterview } from "./types";

export interface ReviewPromptInput {
  normalized: NormalizedInterview;
  targetRole?: string;
  targetCompany?: string;
  /** Things the user explicitly wants feedback on. */
  focusNotes?: string;
}

export const REVIEW_JSON_SCHEMA_HINT = `{
  "overallScore": "number（1-5 整体印象分）",
  "verdict": "string（2-3 句总体评价）",
  "dimensions": [
    {
      "dimension": "technical | behavioral | communication | roleFit | reverseQuestions | nonVerbal | mindset",
      "score": "number（1-5）",
      "rationale": "string（为什么这个分，必须引用具体轮次/主题）",
      "suggestion": "string（针对该维度的具体改进建议）"
    }
  ],
  "starGaps": [
    { "topic": "string", "missing": ["S|T|A|R"], "fix": "string（如何补全）" }
  ],
  "actionItems": [
    { "category": "knowledge | expression | practice | story | mindset", "text": "string", "priority": "high | medium | low" }
  ],
  "highlights": [
    { "topic": "string", "text": "string（值得复用的好答案要点）" }
  ],
  "followUpTopics": ["string（下一轮前需要复习的主题）"],
  "caveats": ["string（坦诚的提醒/局限，如 记忆文本缺失关键信息）"]
}`;

export type ReviewLanguage = "zh" | "en";

const DIMENSION_DEFS_ZH = [
  "1. technical（技术）：知识深度、解题过程、是否给出最优解、复杂度与边界讨论。",
  "2. behavioral（行为）：是否用 STAR 讲故事、是否有冲突与成长、是否体现领导力/影响力。",
  "3. communication（沟通）：表达是否清晰有条理、节奏与语速、压力下是否镇定。",
  "4. roleFit（岗位匹配）：经历与目标岗位/JD 的相关度、定位是否准确。",
  "5. reverseQuestions（反向提问）：候选人提问是否有深度、是否展现真实兴趣。",
  "6. nonVerbal（非语言）：眼神、肢体语言、着装（仅在文本能推断时评分，否则给中性分并说明）。",
  "7. mindset（心态）：遇难题是否冷静、单题失利后是否影响后续发挥。",
];

export function buildReviewPrompt(
  input: ReviewPromptInput,
  language: ReviewLanguage = "zh",
): string {
  const roleClause = [input.targetRole, input.targetCompany]
    .filter(Boolean)
    .map((v) => v!.trim())
    .join(" / ");

  const turnsBlock = input.normalized.turns
    .map(
      (t) =>
        `[${t.order}] ${t.speaker} · ${t.topic}${t.note ? `（${t.note}）` : ""}\n${t.text}`,
    )
    .join("\n\n");

  const unresolvedBlock = input.normalized.unresolved.length
    ? `\n\n⚠️ 存疑片段（仅供参考，不要据此打分）：\n${input.normalized.unresolved
        .map((u) => `- ${u}`)
        .join("\n")}`
    : "";

  const zh = `你是一名资深面试官，正在帮候选人做「面试复盘」。下面是已经整理好的结构化面试记录（轮次 + 说话人 + 主题）。请基于这些真实内容，给出一份诚实、可执行、不吹捧也不打击的复盘报告。

评估维度（每个维度都给 1-5 分，并必须引用具体轮次/主题作为依据）：
${DIMENSION_DEFS_ZH.join("\n")}

约束（严格遵守）：
- 一切结论必须基于给定轮次。不得杜撰面试官没问的问题、不得编造候选人没说的答案、不得捏造量化指标（如通过率、排名）。
- 对每个候选人的回答，检查是否符合 STAR（Situation/Task/Action/Result）。缺哪一项就记进 starGaps，并给出补全方法。回忆类输入常缺 Result，务必指出。
- actionItems 必须具体、可执行、可追踪（如「复习 Redis 持久化 RDB vs AOF」而非「加强基础」）。给出 3-6 条，覆盖知识与表达。
- highlights 用来沉淀「值得复用的好答案」，没有就空数组，不要硬夸。
- 如果输入信息不足（比如记忆文本缺失关键问题、或无法判断非语言维度），要在 caveats 里坦诚说明，并相应给中性分，不要硬评。
- 只输出一个 JSON 对象，不要输出 Markdown 代码块、注释或 JSON 以外文字。

输出 JSON 结构（字段名必须完全一致）：
${REVIEW_JSON_SCHEMA_HINT}`;

  const en = `You are a senior interviewer helping the candidate debrief. Below is a structured interview record (turns + speakers + topics). Based ONLY on this real content, produce an honest, actionable, neither flattering nor harsh review report.

Score each of the 7 dimensions 1-5, each time citing specific turns/topics as evidence. STAR-check every candidate answer (missing letters go to starGaps with a fix). actionItems must be specific and trackable (3-6). highlights bank reusable strong answers (empty array if none). If the input is insufficient (recall missing key questions, or non-verbal not inferable), say so in caveats and give a neutral score rather than guessing.

Hard constraints:
- Ground every conclusion in the given turns. Do NOT invent questions, answers, or metrics that don't appear.
- Output exactly ONE JSON object — no Markdown fences, no comments, no prose outside JSON.

Output JSON shape (field names must match exactly):
${REVIEW_JSON_SCHEMA_HINT}`;

  const header = language === "zh" ? zh : en;
  const contextLine = roleClause
    ? language === "zh"
      ? `目标岗位/公司：${roleClause}`
      : `Target role/company: ${roleClause}`
    : "";
  const focusLine = input.focusNotes?.trim()
    ? language === "zh"
      ? `候选人特别想听反馈的点：${input.focusNotes.trim()}`
      : `Candidate wants feedback on: ${input.focusNotes.trim()}`
    : "";

  return `${header}

${contextLine}
${focusLine}

结构化面试记录（normalized）：
<<<TURNS_START
${turnsBlock}
TURNS_END>>>${unresolvedBlock}`;
}
