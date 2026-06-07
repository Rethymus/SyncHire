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
    expect(pdf.toString("latin1")).toContain("Chen Yu Resume");
    expect(pdf.toString("latin1")).toContain("xref");
    expect(pdf.toString("latin1")).toContain("%%EOF");
  });
});
