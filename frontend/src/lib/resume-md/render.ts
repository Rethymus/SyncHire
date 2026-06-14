/**
 * Extended-Markdown render engine for the resume builder.
 *
 * Adds two mujicv-compatible constructs on top of standard GFM markdown:
 *
 * 1. Column containers (block-level):
 *      ::: left
 *      content
 *      :::
 *      ::: right
 *      content
 *      :::
 *    Consecutive containers are grouped into a `resume-row` (flexbox) so the
 *    header can split into left/right columns. A lone container renders full width.
 *
 * 2. Inline icons:
 *      icon:email chen@x.com            → <span class="ri ri-mail"></span> chen@x.com
 *      [icon:blog GitHub](https://...)  → icon inside a hyperlink
 *
 * Output is run through DOMPurify before use (see {@link sanitizeResumeHtml}),
 * so only `div`/`span`/`class` need to be permitted — no `<svg>` or `data-*`.
 */

import { marked, type Token, type Tokens } from "marked";
import { sanitizeResumeHtml } from "./sanitize-bridge";
import { resolveIconName } from "./icons";

type AnyToken = Tokens.Generic & { [key: string]: unknown };

interface ResumeContainerToken extends AnyToken {
  type: "resumeContainer";
  align: string;
  text: string;
  tokens: Token[];
}

interface ResumeRowToken extends AnyToken {
  type: "resumeRow";
  cols: ResumeContainerToken[];
}

interface ResumeIconToken extends AnyToken {
  type: "resumeIcon";
  name: string;
}

// Marked runtime contexts (kept narrow & typed — no `any`).
interface LexerCtx {
  lexer: { blockTokens(src: string, tokens?: Token[]): Token[] };
}
interface ParserCtx {
  parser: { parse(tokens: Token[]): string; parseInline(tokens: Token[]): string };
}

const CONTAINER_RE =
  /^:::[ \t]*([a-zA-Z-]+)?[ \t]*\n([\s\S]*?)\n[ \t]*:::[ \t]*(?:\n|$)/;
const ICON_RE = /^icon:([a-zA-Z0-9_-]+)(?=$|[\s　.,;:!?())、。，。；：！？])/;

const containerExtension = {
  name: "resumeContainer",
  level: "block" as const,
  start(src: string) {
    const idx = src.search(/^:::/m);
    return idx < 0 ? undefined : idx;
  },
  tokenizer(this: LexerCtx, src: string) {
    if (!renderFlags.columns) {
      return undefined;
    }
    const match = CONTAINER_RE.exec(src);
    if (!match) {
      return undefined;
    }
    const align = (match[1] || "left").toLowerCase();
    const body = match[2].replace(/\n+$/, "");
    const token: ResumeContainerToken = {
      type: "resumeContainer",
      raw: match[0],
      align,
      text: body,
      tokens: [],
    };
    this.lexer.blockTokens(body, token.tokens);
    return token;
  },
  renderer(this: ParserCtx, token: ResumeContainerToken) {
    const inner = this.parser.parse(token.tokens);
    return `<div class="resume-col resume-col-${token.align}">${inner}</div>\n`;
  },
};

const rowExtension = {
  name: "resumeRow",
  level: "block" as const,
  // Rows are synthesized by walkGroup(), never tokenized from source directly.
  tokenizer() {
    return undefined;
  },
  renderer(this: ParserCtx, token: ResumeRowToken) {
    const inner = this.parser.parse(token.cols as unknown as Token[]);
    return `<div class="resume-row">${inner}</div>\n`;
  },
};

const iconExtension = {
  name: "resumeIcon",
  level: "inline" as const,
  start(src: string) {
    const idx = src.indexOf("icon:");
    return idx < 0 ? undefined : idx;
  },
  tokenizer(src: string) {
    if (!renderFlags.icons) {
      return undefined;
    }
    const match = ICON_RE.exec(src);
    if (!match) {
      return undefined;
    }
    const token: ResumeIconToken = {
      type: "resumeIcon",
      raw: match[0],
      name: match[1].toLowerCase(),
    };
    return token;
  },
  renderer(token: ResumeIconToken) {
    const resolved = resolveIconName(token.name);
    if (!resolved) {
      // Unknown icon name — drop the token entirely (no stray text).
      return "";
    }
    return `<span class="ri ri-${resolved}" aria-hidden="true"></span>`;
  },
};

// marked only needs to be configured once per process.
let extensionsApplied = false;
function ensureExtensions() {
  if (extensionsApplied) {
    return;
  }
  marked.use({
    extensions: [containerExtension, rowExtension, iconExtension],
  });
  extensionsApplied = true;
}

/** Per-render feature toggles (the "plugin mode" render plugins). */
export interface ResumeRenderOptions {
  /** Process `:::` column containers. Default true. */
  columns?: boolean;
  /** Process `icon:` inline icons. Default true. */
  icons?: boolean;
}

const renderFlags: Required<ResumeRenderOptions> = { columns: true, icons: true };

/** Group consecutive top-level `resumeContainer` tokens into `resumeRow` tokens. */
function groupRows(tokens: Token[]): Token[] {
  const out: Token[] = [];
  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i] as AnyToken;
    if (t && t.type === "resumeContainer") {
      const cols: ResumeContainerToken[] = [];
      while (
        i < tokens.length &&
        (tokens[i] as AnyToken).type === "resumeContainer"
      ) {
        cols.push(tokens[i] as ResumeContainerToken);
        i += 1;
      }
      if (cols.length <= 1) {
        if (cols[0]) {
          out.push(cols[0]);
        }
      } else {
        out.push({ type: "resumeRow", raw: "", cols } as ResumeRowToken);
      }
    } else {
      out.push(tokens[i]);
      i += 1;
    }
  }
  return out;
}

/** Recursively walk tokens and group container rows at every level. */
function walkGroup(tokens: Token[]): Token[] {
  const grouped = groupRows(tokens);
  return grouped.map((token) => {
    const t = token as AnyToken;
    if (Array.isArray(t.tokens) && t.tokens.length > 0) {
      t.tokens = walkGroup(t.tokens);
    }
    if (Array.isArray(t.items)) {
      t.items = t.items.map((item: AnyToken) => {
        if (Array.isArray(item.tokens)) {
          item.tokens = walkGroup(item.tokens);
        }
        return item;
      });
    }
    return token;
  });
}

/** Render extended-markdown to sanitized HTML ready for `dangerouslySetInnerHTML`. */
export function renderResumeMarkdown(markdown: string, options?: ResumeRenderOptions): string {
  if (!markdown) {
    return "";
  }
  ensureExtensions();
  const previous = { ...renderFlags };
  renderFlags.columns = options?.columns ?? true;
  renderFlags.icons = options?.icons ?? true;
  try {
    const tokens = marked.lexer(markdown);
    const grouped = walkGroup(tokens);
    const raw = marked.parser(grouped);
    return sanitizeResumeHtml(raw);
  } finally {
    renderFlags.columns = previous.columns;
    renderFlags.icons = previous.icons;
  }
}
