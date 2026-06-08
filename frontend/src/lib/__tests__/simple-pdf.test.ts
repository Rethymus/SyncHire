import { describe, expect, it } from "vitest";
import { createSimpleResumePdf, htmlToPlainText } from "../simple-pdf";

describe("simple PDF generator", () => {
  it("converts resume HTML to readable plain text", () => {
    const text = htmlToPlainText(
      "<main><h1>Chen Yu</h1><p>Frontend Engineer</p><ul><li>React</li></ul></main>"
    );

    expect(text).toContain("Chen Yu");
    expect(text).toContain("Frontend Engineer");
    expect(text).toContain("- React");
  });

  it("creates a real PDF buffer for local resume export", () => {
    const pdf = createSimpleResumePdf({
      title: "Chen Yu Resume",
      plainText: "Chen Yu\nFrontend Engineer\nReact TypeScript Playwright",
    });

    expect(pdf.subarray(0, 8).toString("utf8")).toBe("%PDF-1.4");
    expect(pdf.toString("latin1")).toContain("004300680065006e00200059007500200052006500730075006d0065");
    expect(pdf.toString("latin1")).toContain("xref");
    expect(pdf.toString("latin1")).toContain("%%EOF");
  });

  it("keeps Chinese text encoded instead of replacing it with question marks", () => {
    const pdf = createSimpleResumePdf({
      title: "陈宇简历",
      plainText: "陈宇\n前端开发工程师\n项目经历：使用 React 构建求职助手",
    });
    const serialized = pdf.toString("latin1");

    expect(serialized).toContain("/UniGB-UCS2-H");
    expect(serialized).not.toContain("????");
    expect(serialized).toContain("xref");
  });
});
