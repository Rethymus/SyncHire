/**
 * Resume-specific HTML sanitizer.
 *
 * The extended-markdown renderer emits `div.resume-col`/`div.resume-row` layout
 * containers and `span.ri` icon glyphs (the glyph itself comes from CSS
 * `mask-image`, never from an inline `<svg>`). This allowlist permits exactly
 * that structure while stripping scripts, styles, event handlers and unsafe
 * URL protocols.
 */

import DOMPurify from "dompurify";

const RESUME_ALLOWED_TAGS = [
  "h1", "h2", "h3", "h4", "h5", "h6",
  "p", "br", "hr",
  "strong", "em", "u", "s", "del",
  "a", "ul", "ol", "li",
  "span", "div",
  "blockquote", "code", "pre",
  "table", "thead", "tbody", "tr", "th", "td",
];

const RESUME_ALLOWED_ATTR = ["href", "class", "id", "target", "rel", "title"];

export function sanitizeResumeHtml(dirty: string): string {
  if (!dirty) {
    return "";
  }
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: RESUME_ALLOWED_TAGS,
    ALLOWED_ATTR: RESUME_ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ["style", "script", "iframe", "object", "embed", "form", "input", "button"],
    FORBID_ATTR: [
      "onerror", "onload", "onclick", "onmouseover", "onfocus", "onblur", "onchange",
    ],
    ADD_ATTR: ["rel", "target"],
  });
}
