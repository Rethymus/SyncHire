/**
 * Smart resume proofreading — the "智能检测" feature.
 *
 * Pure, dependency-free rules over the raw markdown text. Returns structured
 * issues for: common Chinese typos (错别字), professional English-term casing
 * (常见专业英文词汇), and CJK punctuation misuse (标点误用) including
 * full/half-width and spacing problems.
 *
 * Safe fixes (error-severity punctuation + unambiguous typos) can be applied
 * in bulk via {@link applyProofreadFixes} for a "一键修正" button.
 */

export type ProofreadCategory = "typo" | "english-term" | "punctuation" | "spacing";
export type Severity = "error" | "warning" | "info";

export interface ProofreadIssue {
  id: string;
  category: ProofreadCategory;
  severity: Severity;
  /** 1-based line number. */
  line: number;
  /** 1-based column number. */
  column: number;
  /** The offending text. */
  excerpt: string;
  /** zh-CN explanation shown in the detection panel. */
  message: string;
  /** Suggested replacement for the excerpt (whole match), if deterministic. */
  suggestion?: string;
}

export interface ProofreadResult {
  issues: ProofreadIssue[];
  counts: Record<ProofreadCategory, number>;
}

const CJK = "\\u4e00-\\u9fff\\u3400-\\u4dbf\\uf900-\\ufaff";

/* ----------------------------------------------------------------------- *
 * 1. Common Chinese typos (错别字) — unambiguous confusables.
 * ----------------------------------------------------------------------- */
const TYPO_PAIRS: ReadonlyArray<{ wrong: string; right: string; note?: string }> = [
  { wrong: "帐号", right: "账号" },
  { wrong: "帐户", right: "账户" },
  { wrong: "帐目", right: "账目" },
  { wrong: "部份", right: "部分" },
  { wrong: "做为", right: "作为" },
  { wrong: "充份", right: "充分" },
  { wrong: "过份", right: "过分" },
  { wrong: "其它", right: "其他" },
  { wrong: "既使", right: "即使" },
  { wrong: "积垒", right: "积累" },
  { wrong: "按装", right: "安装" },
  { wrong: "并按", right: "并按照" },
  { wrong: "明符其实", right: "名副其实" },
  { wrong: "不可思异", right: "不可思议" },
  { wrong: "无微不致", right: "无微不至" },
  { wrong: "默守成规", right: "墨守成规" },
  { wrong: "走头无路", right: "走投无路" },
  { wrong: "迫不急待", right: "迫不及待" },
  { wrong: "融汇贯通", right: "融会贯通" },
  { wrong: "变本加利", right: "变本加厉" },
  { wrong: "一股作气", right: "一鼓作气" },
];

/* ----------------------------------------------------------------------- *
 * 2. Professional English terms — canonical casing.
 * ----------------------------------------------------------------------- */
const ENGLISH_TERMS: ReadonlyArray<string> = [
  "JavaScript", "TypeScript", "CoffeeScript",
  "GitHub", "GitLab", "Gitee",
  "Node.js", "Next.js", "Nuxt.js", "Vue.js", "Express.js", "Nest.js",
  "React", "Angular", "jQuery", "Redux", "Zustand",
  "Python", "Java", "Golang", "Rust", "Kotlin", "Swift",
  "Kubernetes", "PostgreSQL", "MySQL", "MongoDB", "Redis", "SQLite",
  "Elasticsearch", "MinIO", "Docker", "Nginx",
  "GraphQL", "RESTful", "gRPC", "WebSocket",
  "macOS", "iOS", "Android", "Linux", "Windows", "Ubuntu",
  "Tailwind CSS", "HTML", "CSS", "JSON", "YAML", "TOML", "SQL", "NoSQL",
  "OpenAI", "ChatGPT", "Claude",
  "AWS", "GCP", "Vercel", "Cloudflare",
];

/* ----------------------------------------------------------------------- *
 * 3. Punctuation maps.
 * ----------------------------------------------------------------------- */
const HALF_TO_FULL: Record<string, string> = {
  ",": "，", ".": "。", ":": "：", ";": "；", "!": "！", "?": "？",
  "(": "（", ")": "）",
};
const FULL_PUNCT = "，。；：！？、）】》」』）";
const HALF_PUNCT_KEYS = Object.keys(HALF_TO_FULL);

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function lineColAt(text: string, index: number): { line: number; column: number } {
  let line = 1;
  let column = 1;
  for (let i = 0; i < index && i < text.length; i += 1) {
    if (text[i] === "\n") {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
  }
  return { line, column };
}

let issueCounter = 0;
function makeIssue(
  category: ProofreadCategory,
  severity: Severity,
  text: string,
  index: number,
  excerpt: string,
  message: string,
  suggestion?: string,
): ProofreadIssue {
  const { line, column } = lineColAt(text, index);
  issueCounter += 1;
  return {
    id: `pr-${issueCounter}`,
    category,
    severity,
    line,
    column,
    excerpt,
    message,
    suggestion,
  };
}

/* ----------------------------------------------------------------------- *
 * Individual rule scanners. Each pushes to `issues`.
 * ----------------------------------------------------------------------- */
function scanTypos(text: string, issues: ProofreadIssue[]): void {
  for (const { wrong, right } of TYPO_PAIRS) {
    const re = new RegExp(escapeRegex(wrong), "g");
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      issues.push(
        makeIssue(
          "typo",
          "warning",
          text,
          m.index,
          wrong,
          `疑似错别字：「${wrong}」常被误写，建议改为「${right}」。`,
          right,
        ),
      );
    }
  }
}

function scanEnglishTerms(text: string, issues: ProofreadIssue[]): void {
  for (const term of ENGLISH_TERMS) {
    const pattern = escapeRegex(term).replace(/\\ /g, "\\s+");
    const re = new RegExp(`(?<![\\w])(${pattern})(?![\\w])`, "gi");
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const matched = m[1];
      if (matched === term) {
        continue;
      }
      // Allow a trailing plural "s" only for pure-alphabetic single-word terms.
      const stripped = matched.replace(/s$/i, "");
      if (stripped.toLowerCase() === term.toLowerCase().replace(/s$/i, "") && term.endsWith("s")) {
        continue;
      }
      issues.push(
        makeIssue(
          "english-term",
          "warning",
          text,
          m.index,
          matched,
          `专业英文词汇大小写不规范，建议写为「${term}」。`,
          term,
        ),
      );
    }
  }
}

function scanPunctuation(text: string, issues: ProofreadIssue[]): void {
  // (a) Half-width punctuation sitting between CJK characters → should be full-width.
  for (const half of HALF_PUNCT_KEYS) {
    const re = new RegExp(`([${CJK}])${escapeRegex(half)}([${CJK}])`, "g");
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      issues.push(
        makeIssue(
          "punctuation",
          "error",
          text,
          m.index + 1,
          half,
          `中文之间使用了半角标点「${half}」，建议改为全角「${HALF_TO_FULL[half]}」。`,
          HALF_TO_FULL[half],
        ),
      );
    }
  }

  // (b) Duplicate full-width punctuation.
  const dupRe = /([，。；：！？、])\1+/g;
  let dm: RegExpExecArray | null;
  while ((dm = dupRe.exec(text)) !== null) {
    issues.push(
      makeIssue(
        "punctuation",
        "error",
        text,
        dm.index,
        dm[0],
        `连续重复的标点「${dm[0]}」，建议保留一个。`,
        dm[1],
      ),
    );
  }

  // (c) Space(s) before full-width punctuation.
  const spaceBeforeRe = new RegExp(`([${CJK}A-Za-z0-9]) +([${FULL_PUNCT}])`, "g");
  let sbm: RegExpExecArray | null;
  while ((sbm = spaceBeforeRe.exec(text)) !== null) {
    issues.push(
      makeIssue(
        "punctuation",
        "warning",
        text,
        sbm.index + 1,
        `${sbm[1]} ${sbm[2]}`,
        `标点「${sbm[2]}」前有多余空格，建议去除。`,
        `${sbm[1]}${sbm[2]}`,
      ),
    );
  }
}

function scanSpacing(text: string, issues: ProofreadIssue[]): void {
  // CJK letter directly adjacent to a latin letter with no space — readability hint.
  const re = new RegExp(`([${CJK}])([A-Za-z])|([A-Za-z])([${CJK}])`, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const idx = m.index;
    const pair = m[0];
    // Skip inside inline code / icon syntax (cheap heuristic).
    if (/icon:/.test(pair)) {
      continue;
    }
    issues.push(
      makeIssue(
        "spacing",
        "info",
        text,
        idx,
        pair,
        "中英文之间建议加一个空格，提升可读性。",
        m[1] ? `${m[1]} ${m[2]}` : `${m[3]} ${m[4]}`,
      ),
    );
  }
}

/* ----------------------------------------------------------------------- *
 * Public API.
 * ----------------------------------------------------------------------- */
export function proofreadResume(text: string): ProofreadResult {
  issueCounter = 0;
  if (!text) {
    return { issues: [], counts: emptyCounts() };
  }
  const issues: ProofreadIssue[] = [];
  scanTypos(text, issues);
  scanEnglishTerms(text, issues);
  scanPunctuation(text, issues);
  scanSpacing(text, issues);

  issues.sort((a, b) =>
    a.line !== b.line ? a.line - b.line : a.column - b.column,
  );

  const counts = emptyCounts();
  for (const issue of issues) {
    counts[issue.category] += 1;
  }
  return { issues, counts };
}

function emptyCounts(): Record<ProofreadCategory, number> {
  return { typo: 0, "english-term": 0, punctuation: 0, spacing: 0 };
}

/**
 * Apply deterministic, safe fixes in place: error-severity punctuation issues
 * and unambiguous typos. Returns the rewritten text. Spacing/english-term
 * issues are left to the user (too context-dependent).
 */
export function applyProofreadFixes(text: string): string {
  const result = proofreadResume(text);
  // Collect replacements as [index, length, replacement], then apply right→left.
  const edits: Array<{ index: number; length: number; replacement: string }> = [];
  for (const issue of result.issues) {
    if (issue.suggestion === undefined) {
      continue;
    }
    const safe =
      issue.category === "typo" ||
      (issue.category === "punctuation" && issue.severity === "error");
    if (!safe) {
      continue;
    }
    // Re-locate the excerpt at the reported line/column to stay robust.
    const offset = indexOfLineCol(text, issue.line, issue.column);
    if (offset < 0) {
      continue;
    }
    if (text.substr(offset, issue.excerpt.length) === issue.excerpt) {
      edits.push({
        index: offset,
        length: issue.excerpt.length,
        replacement: issue.suggestion,
      });
    }
  }
  edits.sort((a, b) => b.index - a.index);
  let out = text;
  for (const edit of edits) {
    out = out.slice(0, edit.index) + edit.replacement + out.slice(edit.index + edit.length);
  }
  return out;
}

function indexOfLineCol(text: string, line: number, column: number): number {
  let l = 1;
  let i = 0;
  while (l < line && i < text.length) {
    if (text[i] === "\n") {
      l += 1;
    }
    i += 1;
  }
  if (l !== line) {
    return -1;
  }
  return i + (column - 1);
}
