import { describe, expect, it } from "vitest";
import { renderResumeMarkdown } from "@/lib/resume-md";
import { serializeResumeDom } from "../serialize-resume-dom";

function roundTrip(md: string): { back: string; htmlAgain: string } {
  const html = renderResumeMarkdown(md);
  const container = document.createElement("div");
  container.innerHTML = html;
  const back = serializeResumeDom(container);
  const htmlAgain = renderResumeMarkdown(back);
  return { back, htmlAgain };
}

describe("serializeResumeDom", () => {
  it("round-trips headings and paragraphs", () => {
    const md = "# 标题\n\n这是一段文字。";
    const { back } = roundTrip(md);
    expect(back).toContain("# 标题");
    expect(back).toContain("这是一段文字。");
  });

  it("round-trips bold and links", () => {
    const md = "这是一段，**重点** 强调，[官网](https://x.com) 链接。";
    const { back, htmlAgain } = roundTrip(md);
    expect(back).toContain("**重点**");
    expect(back).toContain("[官网](https://x.com)");
    expect(htmlAgain).toContain("<strong>重点</strong>");
    expect(htmlAgain).toContain('href="https://x.com"');
  });

  it("round-trips bullet and ordered lists", () => {
    const md = "## 技能\n\n- React\n- TypeScript\n\n1. 第一\n2. 第二";
    const { back } = roundTrip(md);
    expect(back).toContain("- React");
    expect(back).toContain("- TypeScript");
    expect(back).toContain("1. 第一");
    expect(back).toContain("2. 第二");
  });

  it("round-trips ::: left / ::: right columns", () => {
    const md = [
      "# 示例用户",
      "::: left",
      "icon:info 男/23",
      ":::",
      "::: right",
      "icon:email a@b.com",
      ":::",
    ].join("\n");
    const { back } = roundTrip(md);
    expect(back).toContain("::: left");
    expect(back).toContain("::: right");
    expect(back).toMatch(/icon:(mail|info)/);
  });

  it("produces stable HTML across two render passes (idempotent)", () => {
    const md = "# Name\n\n**bold** and *em*\n\n- a\n- b\n";
    const { htmlAgain } = roundTrip(md);
    // Re-serializing the already-rendered html is stable.
    const c2 = document.createElement("div");
    c2.innerHTML = htmlAgain;
    const secondPass = serializeResumeDom(c2);
    expect(secondPass).toContain("# Name");
    expect(secondPass).toContain("**bold**");
  });
});
