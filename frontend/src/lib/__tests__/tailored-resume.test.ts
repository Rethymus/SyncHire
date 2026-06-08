import { describe, expect, it } from "vitest";
import { createDefaultCandidateRoleCard } from "../browser-fill-assistant";
import { generateTailoredResumeMarkdown } from "../tailored-resume";

describe("tailored resume generation", () => {
  it("builds a local role-specific resume from the role card and JD", () => {
    const profile = createDefaultCandidateRoleCard();
    const resume = {
      id: "resume-1",
      name: "resume.txt",
      content: "Original resume notes",
      uploadedAt: new Date(),
      skills: ["React"],
      experience: ["Built UI workflows"],
    };
    const jd = {
      id: "jd-1",
      title: "Graduate Frontend Engineer",
      company: "Northstar Labs",
      description: "Build React and TypeScript user workflows with Playwright coverage.",
      requirements: ["React", "TypeScript", "Playwright"],
      skills: ["React", "TypeScript", "Playwright"],
      createdAt: new Date(),
    };

    const markdown = generateTailoredResumeMarkdown({ profile, resume, jd });

    expect(markdown).toContain("# Chen Yu");
    expect(markdown).toContain("Graduate Frontend Engineer - Northstar Labs");
    expect(markdown).toContain("## 求职意向");
    expect(markdown).toContain("## 项目经历");
    expect(markdown).toContain("## 原始简历可用证据");
    expect(markdown).toContain("React");
    expect(markdown).toContain("TypeScript");
    expect(markdown).toContain("Original resume notes");
    expect(markdown).not.toContain("Professional Summary");
  });
});
