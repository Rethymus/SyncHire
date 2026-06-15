/**
 * Builds the model prompt for the **normalize** stage: turning messy
 * post-interview input into an ordered, speaker-tagged Q&A transcript.
 *
 * Input sources differ in messiness, so the prompt names the source and asks
 * the model to adapt:
 *   - recall:      likely unordered, rambling, possibly missing questions.
 *   - transcript:  already segmented, but may need dedup + speaker tagging.
 *   - audio (ASR): run-on, sparse punctuation, speaker-mixed.
 *
 * The model is told to reconstruct a chronologically sensible interview flow,
 * attribute each turn to interviewer/candidate/unclear, and confess anything
 * it cannot confidently place into `unresolved` — never fabricate questions.
 *
 * Pure: deterministic string building, fully unit-testable.
 */

import type { InterviewInputSource } from "./types";

export interface NormalizePromptInput {
  source: InterviewInputSource;
  rawText: string;
  targetRole?: string;
  targetCompany?: string;
}

/** Per-source guidance, keyed by source then language. One place to edit. */
const SOURCE_GUIDE: Record<InterviewInputSource, { zh: string; en: string }> = {
  recall: {
    zh: "输入类型是「面试后回忆」：候选人事后凭记忆写下，语序可能混乱、前后跳跃、甚至遗漏关键问题。请尽量重组为合理的面试顺序，缺失的部分不要凭空补造，归入 unresolved。",
    en: 'Input type is "post-interview recall": written from memory afterward, possibly unordered, jumpy, or missing key questions. Reconstruct a sensible order; do NOT fabricate missing parts — put them in unresolved.',
  },
  transcript: {
    zh: "输入类型是「会议转写」：通常来自腾讯会议 / 飞书妙记 / Otter 等，已分段，但可能重复、说话人混杂。请去重、标注说话人、保持原意。",
    en: 'Input type is "meeting transcript": usually from Tencent Meeting / Feishu Minutes / Otter, already segmented but possibly duplicated or with mixed speakers. Dedup, tag speakers, preserve meaning.',
  },
  audio: {
    zh: "输入类型是「语音转写」：来自 ASR，常缺少标点、连读、说话人未区分。请补全断句、区分说话人、还原为问答对话。",
    en: 'Input type is "ASR transcript": from speech-to-text, often missing punctuation, run-on, speakers unseparated. Add sentence breaks, separate speakers, restore as Q&A dialogue.',
  },
};

export const NORMALIZE_JSON_SCHEMA_HINT = `{
  "summary": "string（一句话概括这次面试谈了什么）",
  "turns": [
    {
      "order": "number（从1开始的顺序）",
      "speaker": "interviewer | candidate | unclear",
      "topic": "string（简短主题，如 项目深挖 / 系统设计 / 反向提问）",
      "text": "string（这一轮的对话内容，可合并问答）",
      "note": "string？（可选：重组说明或存疑，如 原话语序混乱已重组）"
    }
  ],
  "unresolved": ["string？（无法确定归属或顺序的片段，没有则空数组）"]
}`;

export type NormalizeLanguage = "zh" | "en";

export function buildNormalizePrompt(
  input: NormalizePromptInput,
  language: NormalizeLanguage = "zh",
): string {
  const roleClause = [input.targetRole, input.targetCompany]
    .filter(Boolean)
    .map((v) => v!.trim())
    .join(" / ");

  const guide = SOURCE_GUIDE[input.source][language];

  const headerZh = `你是一名严谨的面试记录整理员。下面是用户提供的「面试原始记录」，它可能语序混乱、重复或残缺。你的任务是在不改变原意、不杜撰的前提下，把它整理成结构清晰、按合理面试顺序排列的「问答对话」。

${guide}

约束（严格遵守）：
- 不得杜撰面试官没有问过的问题，也不得替候选人编造答案。只能基于给定文本整理。
- 把内容拆成若干「轮次 turns」，每一轮标注说话人（interviewer=面试官，candidate=候选人，unclear=无法判断），并给出简短主题。
- 重新排序为符合面试逻辑的顺序（通常：开场/自我介绍 → 项目/技术深挖 → 系统设计/编码 → 行为问题 → 候选人反向提问 → 结束），但只能依据文本中真实出现的内容。
- 凡是无法确定归属、顺序或含义的片段，放进 unresolved，不要硬塞进 turns。
- 只输出一个 JSON 对象，不要输出 Markdown 代码块、注释或 JSON 以外文字。

输出 JSON 结构（字段名必须完全一致）：
${NORMALIZE_JSON_SCHEMA_HINT}`;

  const headerEn = `You are a meticulous interview-notes editor. Below is the user's "raw interview record" — it may be out of order, repetitive, or incomplete. Your job is to reorganize it into clearly structured Q&A turns in a sensible interview order, WITHOUT changing meaning or fabricating anything.

${guide}

Hard constraints:
- Do NOT invent questions the interviewer never asked, and do NOT fabricate answers for the candidate. Reorganize only from the given text.
- Split the content into "turns"; tag each turn's speaker (interviewer / candidate / unclear) and give a short topic.
- Reorder into a logically sensible interview flow (typically: intro → project/technical deep-dive → system-design/coding → behavioral → candidate's reverse questions → close), but ONLY for content that actually appears in the text.
- Anything whose attribution, order, or meaning you cannot determine goes into unresolved — do not force it into turns.
- Output exactly ONE JSON object — no Markdown fences, no comments, no prose outside JSON.

Output JSON shape (field names must match exactly):
${NORMALIZE_JSON_SCHEMA_HINT}`;

  const header = language === "zh" ? headerZh : headerEn;
  const roleLine = roleClause
    ? language === "zh"
      ? `面试背景：${roleClause}`
      : `Interview context: ${roleClause}`
    : "";
  const rawLabel = language === "zh" ? "面试原始记录（raw）：" : "Raw interview record:";

  return `${header}

${roleLine}

${rawLabel}
<<<RAW_START
${input.rawText}
RAW_END>>>`;
}
