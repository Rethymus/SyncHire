import { describe, expect, it } from "vitest";
import { proofreadResume, applyProofreadFixes } from "../proofread";

describe("proofreadResume", () => {
  it("flags half-width punctuation between CJK as error", () => {
    const { issues, counts } = proofreadResume("你好,世界");
    expect(counts.punctuation).toBeGreaterThanOrEqual(1);
    expect(issues.some((i) => i.excerpt === "," && i.suggestion === "，")).toBe(true);
  });

  it("flags English term casing", () => {
    const { issues } = proofreadResume("熟悉 Javascript 与 typescript 开发");
    const flagged = issues.filter((i) => i.category === "english-term");
    expect(flagged.length).toBe(2);
    expect(flagged.some((i) => i.suggestion === "JavaScript")).toBe(true);
    expect(flagged.some((i) => i.suggestion === "TypeScript")).toBe(true);
  });

  it("does not flag already-correct English terms", () => {
    const { counts } = proofreadResume("熟练掌握 JavaScript、TypeScript、React");
    expect(counts["english-term"]).toBe(0);
  });

  it("flags wrong casing on s-ending terms (CSS/AWS/iOS) — regression for plural-skip bug", () => {
    // These canonical terms end in "s"; the old plural-skip logic silenced
    // casing warnings for them. Each wrong-casing variant must now be flagged.
    for (const [wrong, right] of [
      ["csS", "CSS"],
      ["awS", "AWS"],
      ["ioS", "iOS"],
      ["macoS", "macOS"],
    ] as const) {
      const { issues } = proofreadResume(`熟悉 ${wrong} 与 Linux`);
      const flagged = issues.find(
        (i) => i.category === "english-term" && i.excerpt === wrong && i.suggestion === right,
      );
      expect(flagged, `expected ${wrong} → ${right} to be flagged`).toBeTruthy();
    }
  });

  it("still allows genuine plural of a single-alpha-word term", () => {
    // A real plural ("Reacts") of a canonical term ("React") is not a casing error.
    const { counts } = proofreadResume("我使用 Reacts 框架");
    expect(counts["english-term"]).toBe(0);
  });

  it("flags known Chinese typos", () => {
    const { issues } = proofreadResume("作为前端,负责部份模块");
    const typos = issues.filter((i) => i.category === "typo");
    expect(typos.some((i) => i.suggestion === "部分")).toBe(true);
  });

  it("flags duplicate full-width punctuation", () => {
    const { issues } = proofreadResume("完成了工作。。");
    expect(issues.some((i) => i.category === "punctuation" && i.excerpt === "。。")).toBe(true);
  });

  it("flags space before full-width punctuation", () => {
    const { issues } = proofreadResume("你好 ，世界");
    expect(issues.some((i) => i.message.includes("多余空格"))).toBe(true);
  });

  it("emits line/column that locate the excerpt", () => {
    const text = "第一行\n你好,世界";
    const { issues } = proofreadResume(text);
    const hit = issues.find((i) => i.excerpt === ",");
    expect(hit).toBeTruthy();
    expect(hit!.line).toBe(2);
  });
});

describe("applyProofreadFixes", () => {
  it("replaces half-width punctuation and typos in place", () => {
    const fixed = applyProofreadFixes("你好,世界,再来");
    expect(fixed).toBe("你好，世界，再来");
  });

  it("does not touch decimal points between digits", () => {
    const fixed = applyProofreadFixes("GPA 3.74/4.0");
    expect(fixed).toBe("GPA 3.74/4.0");
  });

  it("keeps English-term casing for manual review", () => {
    const fixed = applyProofreadFixes("熟悉 Javascript");
    // Casing is not auto-applied (context-dependent) — text unchanged.
    expect(fixed).toBe("熟悉 Javascript");
  });
});
