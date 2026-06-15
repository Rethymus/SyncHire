import { describe, expect, it } from "vitest";
import {
  buildPortraitPrompt,
  PORTRAIT_PROMPT_TEMPLATE,
  PORTRAIT_BACKGROUND_OPTIONS,
} from "../portrait-prompt";

describe("buildPortraitPrompt", () => {
  it("embeds the master business-headshot style", () => {
    const p = buildPortraitPrompt({ name: "", title: "", department: "" });
    expect(p).toContain(PORTRAIT_PROMPT_TEMPLATE);
    expect(p).toContain("正式商务档案头像海报");
  });

  it("injects name/title/department into the info-bar spec", () => {
    const p = buildPortraitPrompt({
      name: "陈宇",
      title: "前端工程师",
      department: "前端开发部",
    });
    expect(p).toContain("姓名：[陈宇]");
    expect(p).toContain("职位：[前端工程师]");
    expect(p).toContain("部门：[前端开发部]");
  });

  it("keeps the Chinese-to-English translation rule", () => {
    const p = buildPortraitPrompt({ name: "李雷", title: "", department: "" });
    expect(p).toMatch(/翻译.*英文|英文/);
  });

  it("emits a blank info-bar when no details given", () => {
    const p = buildPortraitPrompt({ name: "", title: "", department: "" });
    expect(p).toContain("信息栏留白");
  });

  it("defaults to the white background (keeps the raw template)", () => {
    const p = buildPortraitPrompt({ name: "", title: "", department: "" });
    expect(p).toContain("背景为纯白色素色背景");
    expect(p).not.toContain("蓝色背景");
    expect(p).not.toContain("红色背景");
  });

  it("injects the selected background color (blue) and drops the white clause", () => {
    const p = buildPortraitPrompt({
      name: "",
      title: "",
      department: "",
      backgroundId: "blue",
    });
    expect(p).toContain("标准证件照蓝色背景");
    expect(p).not.toContain("背景为纯白色素色背景");
  });

  it("injects the selected background color (red)", () => {
    const p = buildPortraitPrompt({
      name: "",
      title: "",
      department: "",
      backgroundId: "red",
    });
    expect(p).toContain("证件照红色背景");
    expect(p).not.toContain("背景为纯白色素色背景");
  });

  it("exposes white / blue / red as the supported background options", () => {
    const ids = PORTRAIT_BACKGROUND_OPTIONS.map((o) => o.id);
    expect(ids).toEqual(["white", "blue", "red"]);
    for (const option of PORTRAIT_BACKGROUND_OPTIONS) {
      expect(option.label).toBeTruthy();
      expect(option.scenario).toBeTruthy();
      expect(option.prompt).toContain("背景");
    }
  });
});
