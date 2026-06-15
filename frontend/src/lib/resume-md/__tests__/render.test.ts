import { describe, expect, it } from "vitest";
import { renderResumeMarkdown } from "../render";
import { resolveIconName, buildIconDataUri } from "../icons";
import { getResumeThemeStyles, buildResumeThemeDocumentHtml } from "@/lib/resume-builder/themes";

describe("resume-md icon resolution", () => {
  it("maps mujicv-style aliases to canonical icons", () => {
    expect(resolveIconName("email")).toBe("mail");
    expect(resolveIconName("info")).toBe("user");
    expect(resolveIconName("fa-edit")).toBe("pencil");
    expect(resolveIconName("school")).toBe("school");
    expect(resolveIconName("unknown-xyz")).toBeNull();
  });

  it("produces an SVG data-uri for known icons", () => {
    expect(buildIconDataUri("mail")).toMatch(/^data:image\/svg\+xml/);
  });
});

describe("resume-md render engine", () => {
  it("renders standard markdown headings and lists", () => {
    const html = renderResumeMarkdown("# Title\n\n- a\n- b");
    expect(html).toContain("<h1");
    expect(html).toContain("Title");
    expect(html).toContain("<li>a</li>");
  });

  it("renders inline icon tokens as masked spans", () => {
    const html = renderResumeMarkdown("icon:email chen@x.com");
    expect(html).toContain('class="ri ri-mail"');
    expect(html).toContain("chen@x.com");
  });

  it("preserves unknown icon names as literal text (no silent drop)", () => {
    // Regression: an unknown icon token used to vanish on render, and the
    // WYSIWYG serializer (which reads the DOM) then lost the user's input.
    // It must now survive as literal text so round-trips are lossless.
    const html = renderResumeMarkdown("icon:notarealicon hello");
    expect(html).toContain("icon:notarealicon");
    expect(html).toContain("hello");
    expect(html).not.toContain('class="ri ');
  });

  it("renders icons inside link text", () => {
    const html = renderResumeMarkdown("[icon:blog GitHub](https://github.com/x)");
    expect(html).toContain('class="ri ri-link"');
    expect(html).toContain('href="https://github.com/x"');
    expect(html).toContain("GitHub");
  });

  it("groups consecutive ::: left / ::: right containers into a row", () => {
    const md = [
      "# Name",
      "",
      "::: left",
      "icon:info 示例用户",
      ":::",
      "",
      "::: right",
      "icon:email a@b.com",
      ":::",
      "",
      "## 正文",
      "hello",
    ].join("\n");
    const html = renderResumeMarkdown(md);
    expect(html).toContain('class="resume-row"');
    expect(html).toContain("resume-col-left");
    expect(html).toContain("resume-col-right");
    // Both columns must live inside a single row wrapper.
    const rowStart = html.indexOf('class="resume-row"');
    const leftIdx = html.indexOf("resume-col-left");
    const rightIdx = html.indexOf("resume-col-right");
    expect(leftIdx).toBeGreaterThan(rowStart);
    expect(rightIdx).toBeGreaterThan(leftIdx);
  });

  it("strips dangerous markup (script / onerror)", () => {
    const html = renderResumeMarkdown("hello <script>x</script> <img src=x onerror=alert(1)>");
    expect(html).not.toContain("<script");
    expect(html).not.toContain("onerror");
    expect(html).not.toContain("<img");
  });
});

describe("resume theme system", () => {
  it("emits icon + column CSS for every theme", () => {
    const css = getResumeThemeStyles("modern");
    expect(css).toContain(".resume-row");
    expect(css).toContain("mask-image");
    expect(css).toContain("--resume-accent:#2563eb");
  });

  it("builds a standalone document html", () => {
    const doc = buildResumeThemeDocumentHtml("# Hi", "elegant");
    expect(doc).toContain("<!doctype html>");
    expect(doc).toContain("synchire-resume-page");
    expect(doc).toContain("<h1");
  });
});
