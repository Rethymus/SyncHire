/**
 * Interview review (面试复盘) — types.
 *
 * Turns messy post-interview input (a hurried recall, a pasted Tencent-Meeting
 * AI transcript, or an audio file transcribed to text) into a structured
 * review report. The pipeline has two AI stages:
 *
 *   1. **Normalize**: raw input → ordered, cleaned Q&A turns. Recall is often
 *      out of order and rambling; transcripts are usually already structured
 *      but need dedup/role tagging. The model disambiguates who said what and
 *      reorders into a chronologically sensible interview flow.
 *   2. **Review**: normalized turns → a review report scored across 7
 *      dimensions (technical / behavioral / communication / role-fit / reverse
 *      questions / non-verbal / mindset), with STAR gaps, an action-item list,
 *      highlight bullets to reuse, and risk flags.
 *
 * As with github-distill, the pipeline is split into small pure functions
 * (normalize-prompt / review-prompt / parse-review) so each step is unit-
 * testable without network or model calls; only the route touches the model.
 */

/** How the raw interview material reached the user. Drives copy + AI strategy. */
export type InterviewInputSource = "recall" | "transcript" | "audio";

/**
 * @param recall    The user typed their memory of the interview free-form;
 *                  likely unordered and incomplete.
 * @param transcript The user pasted an AI-generated meeting transcript
 *                  (e.g. Tencent Meeting / 飞书妙记 / Otter). Usually already
 *                  segmented; better signal than recall.
 * @param audio     The user uploaded audio (or dictated live via Web Speech
 *                  API); the resulting transcript is ASR output — possibly
 *                  run-on, no punctuation, speaker-mixed.
 */
export interface InterviewReviewInput {
  source: InterviewInputSource;
  /** The raw text — recall, pasted transcript, or ASR output. */
  rawText: string;
  /** Optional context to tune relevance (company / role). */
  targetRole?: string;
  targetCompany?: string;
  /** Optional focus: things the user explicitly wants feedback on. */
  focusNotes?: string;
}

/**
 * One reconstructed exchange in a normalized interview. The model assigns
 * `speaker` ("interviewer" | "candidate" | "unclear") and may flag turns it
 * is unsure about. `topic` lets the UI group related turns.
 */
export interface NormalizedTurn {
  /** 1-indexed order in the reconstructed interview flow. */
  order: number;
  speaker: "interviewer" | "candidate" | "unclear";
  /** Short topic label, e.g. "项目深挖 / 系统设计 / 反向提问". */
  topic: string;
  text: string;
  /** Model confidence / caveat for this turn (e.g. "原话语序混乱，已重组"). */
  note?: string;
}

/** Output of the normalize stage — a clean, ordered interview record. */
export interface NormalizedInterview {
  source: InterviewInputSource;
  turns: NormalizedTurn[];
  /** One-line summary of what the interview covered. */
  summary: string;
  /** Anything the model could not confidently place or attribute. */
  unresolved: string[];
}

/** The 7 review dimensions, each scored 1-5 with evidence from the turns. */
export interface ReviewDimensionScore {
  /** technical | behavioral | communication | roleFit | reverseQuestions | nonVerbal | mindset */
  dimension: string;
  score: number;
  /** Why this score — must cite specific turns/topics. */
  rationale: string;
  /** Concrete improvement suggestion for this dimension. */
  suggestion: string;
}

/** A gap where the candidate's answer did not follow the STAR structure. */
export interface StarGap {
  /** The question / topic where STAR was incomplete. */
  topic: string;
  /** Which STAR letters were missing: subset of ["S","T","A","R"]. */
  missing: string[];
  /** How to fix it — the result/action the answer lacked. */
  fix: string;
}

/** A concrete, trackable improvement item the user should act on. */
export interface ReviewActionItem {
  /** knowledge | expression | practice | story | mindset */
  category: string;
  text: string;
  /** high | medium | low */
  priority: string;
}

/** A reusable highlight — a strong answer worth banking for future interviews. */
export interface ReviewHighlight {
  topic: string;
  text: string;
}

/**
 * The final review report. Everything here is an AI *hypothesis* grounded in
 * the user's input — the user reviews it before acting. The model is told not
 * to invent questions or metrics that don't appear in the input.
 */
export interface InterviewReviewReport {
  /** Overall readiness impression, 1-5. */
  overallScore: number;
  /** 2-3 sentence verdict. */
  verdict: string;
  dimensions: ReviewDimensionScore[];
  starGaps: StarGap[];
  actionItems: ReviewActionItem[];
  highlights: ReviewHighlight[];
  /** Topics the user should brush up on before the next round. */
  followUpTopics: string[];
  /** Honest cautions (e.g. "记忆文本缺少关键问题，复盘结论仅供参考"). */
  caveats: string[];
}

/** Request shape accepted by POST /api/interview-review. */
export interface InterviewReviewRequest {
  input: InterviewReviewInput;
  /** Which stage to run: "normalize" then "review". */
  stage: "normalize" | "review";
  /** When stage === "review", the previously-normalized interview. */
  normalized?: NormalizedInterview;
  llm: {
    baseUrl: string;
    apiKey?: string;
    model: string;
  };
}

export interface InterviewReviewResponse {
  ok: boolean;
  /** Present when ok and stage === "normalize". */
  normalized?: NormalizedInterview;
  /** Present when ok and stage === "review". */
  report?: InterviewReviewReport;
  error?: string;
}
