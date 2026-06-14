/**
 * Extended-Markdown resume engine.
 *
 * - {@link renderResumeMarkdown} — parse + render + sanitize.
 * - {@link getResumeIconCss} / {@link RESUME_ICON_KEYS} — icon glyph CSS & palette.
 */

export { renderResumeMarkdown } from "./render";
export {
  getResumeIconCss,
  buildIconDataUri,
  resolveIconName,
  RESUME_ICON_KEYS,
} from "./icons";
