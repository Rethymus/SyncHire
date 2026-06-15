/**
 * Resume-specific HTML sanitizer.
 *
 * The extended-markdown renderer emits `div.resume-col`/`div.resume-row` layout
 * containers and `span.ri` icon glyphs (the glyph itself comes from CSS
 * `mask-image`, never from an inline `<svg>`). This allowlist permits exactly
 * that structure while stripping scripts, styles, event handlers and unsafe
 * URL protocols.
 *
 * A DOMPurify `uponSanitizeElement` hook hardens every link that opens a new
 * context (`target=_blank`) with `rel="noopener noreferrer"` so exported HTML
 * (e.g. the print window from {@link printResumeToPdf}) cannot be used for
 * reverse tabnabbing (window.opener takeover).
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

/**
 * Register the link-hardening hook exactly once. DOMPurify's hook registry is
 * process-global and persists across module reloads, while a module-scoped
 * boolean resets on every Next dev HMR reload — so the flag alone would let
 * hooks stack. removeHook first (by event name, clears any prior instance from
 * a previous module version) then addHook keeps exactly one registration.
 */
const LINK_HOOK_EVENT = "uponSanitizeElement";
const HOOK_FLAG = "__resumeLinkHookInstalled";
function linkHardener(node: Node, data: { tagName?: string }): void {
  if (data.tagName !== "a") return;
  const el = node as Element;
  if (el.getAttribute("target") !== "_blank") return;
  const existing = el.getAttribute("rel");
  const merged = new Set((existing || "").toLowerCase().split(/\s+/).filter(Boolean));
  merged.add("noopener");
  merged.add("noreferrer");
  el.setAttribute("rel", Array.from(merged).join(" "));
}
/**
 * Install the link-hardening hook once per process. DOMPurify's hook registry
 * is process-global and persists across module reloads, so a module-scoped
 * boolean would let hooks stack under HMR — but calling removeHook+addHook on
 * EVERY render churns the registry on every keystroke. Resolve both by storing
 * the installed function reference on globalThis (stable across renders within
 * one module instance, a new reference when this module is hot-replaced): skip
 * re-registration when the reference already matches, re-bind when it changes.
 */
function ensureLinkHook(): void {
  const store = globalThis as unknown as Record<string, typeof linkHardener | undefined>;
  if (store[HOOK_FLAG] === linkHardener) return;
  DOMPurify.removeHook(LINK_HOOK_EVENT);
  DOMPurify.addHook(LINK_HOOK_EVENT, linkHardener);
  store[HOOK_FLAG] = linkHardener;
}

export function sanitizeResumeHtml(dirty: string): string {
  if (!dirty) {
    return "";
  }
  // DOMPurify needs a DOM (window). The resume render pipeline is client-only,
  // but guard explicitly so a future server-side call fails loudly with a clear
  // message instead of a cryptic "ReferenceError: window is not defined".
  if (typeof window === "undefined") {
    throw new Error(
      "sanitizeResumeHtml requires a browser environment (DOMPurify needs window). " +
        "Do not call renderResumeMarkdown during SSR — render on the client.",
    );
  }
  ensureLinkHook();
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: RESUME_ALLOWED_TAGS,
    ALLOWED_ATTR: RESUME_ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ["style", "script", "iframe", "object", "embed", "form", "input", "button"],
    FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus", "onblur", "onchange"],
    ADD_ATTR: ["rel", "target"],
  });
}
