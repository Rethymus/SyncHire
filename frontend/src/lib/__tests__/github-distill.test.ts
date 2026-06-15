import { describe, expect, it } from "vitest";
import { parseRepoUrl, InvalidRepoUrlError } from "../github-distill/parse-url";
import { buildRepoMap } from "../github-distill/repo-map";
import { buildDistillPrompt, DISTILL_JSON_SCHEMA_HINT } from "../github-distill/distill-prompt";
import { parseDistilledProject, DistillParseError } from "../github-distill/parse-distill";
import {
  buildProjectBlock,
  insertProjectBlock,
  mergeSkillsIntoContent,
} from "../github-distill/resume-insert";
import { resolveActiveTextProvider, PROVIDER_DEFAULT_MODEL } from "../github-distill/llm-resolver";
import type { AIRuntimeSettings, AIProviderConfig } from "../ai-runtime-settings";
import type { DistilledProject, RepoSignals } from "../github-distill/types";

function makeRepoSignals(overrides: Partial<RepoSignals> = {}): RepoSignals {
  return {
    coordinates: { owner: "owner", repo: "repo", url: "https://github.com/owner/repo" },
    description: "A demo project.",
    language: "TypeScript",
    stars: 42,
    topics: ["resume", "ai"],
    defaultBranch: "main",
    license: "MIT",
    pushedAt: "2026-05-01T00:00:00Z",
    tree: [
      { path: "src", type: "tree" },
      { path: "src/index.ts", type: "blob" },
      { path: "package.json", type: "blob" },
      { path: "README.md", type: "blob" },
    ],
    keyFiles: [
      { path: "package.json", role: "manifest", content: '{ "name": "demo" }' },
    ],
    recentCommits: [{ sha: "abc", message: "feat: init", author: "dev" }],
    recentIssues: [{ number: 1, title: "bug x", state: "open", isPullRequest: false, labels: [] }],
    readme: "# Demo\nA demo project.",
    ...overrides,
  };
}

function makeDistilledProject(overrides: Partial<DistilledProject> = {}): DistilledProject {
  return {
    name: "Demo",
    tagline: "A demo tool",
    category: "工具",
    techStack: ["TypeScript", "Vitest"],
    bullets: ["built x", "shipped y"],
    skills: ["TypeScript"],
    summary: "It demos things.",
    innovations: ["clever abstraction"],
    provenance: {
      repoUrl: "https://github.com/owner/repo",
      staticOnly: true,
    },
    ...overrides,
  };
}

describe("parseRepoUrl", () => {
  it("parses a canonical https URL", () => {
    expect(parseRepoUrl("https://github.com/owner/repo")).toEqual({
      owner: "owner",
      repo: "repo",
      url: "https://github.com/owner/repo",
    });
  });

  it("parses bare owner/repo shorthand", () => {
    expect(parseRepoUrl("owner/repo").url).toBe("https://github.com/owner/repo");
  });

  it("strips .git suffix and trailing subpaths", () => {
    expect(parseRepoUrl("https://github.com/owner/repo.git/tree/main/src")).toEqual({
      owner: "owner",
      repo: "repo",
      url: "https://github.com/owner/repo",
    });
  });

  it("rejects empty input", () => {
    expect(() => parseRepoUrl("")).toThrow(InvalidRepoUrlError);
  });

  it("rejects non-github hosts", () => {
    expect(() => parseRepoUrl("https://gitlab.com/owner/repo")).toThrow(InvalidRepoUrlError);
  });
});

describe("buildRepoMap", () => {
  it("surfaces metadata, tree, key files, commits, issues, readme", () => {
    const map = buildRepoMap(makeRepoSignals());
    expect(map).toContain("owner/repo");
    expect(map).toContain("TypeScript");
    expect(map).toContain("目录结构");
    expect(map).toContain("src/");
    expect(map).toContain("关键文件");
    expect(map).toContain("依赖清单");
    expect(map).toContain("最近提交");
    expect(map).toContain("feat: init");
    expect(map).toContain("最近 Issue / PR");
    expect(map).toContain("#1 (Issue, open)");
    expect(map).toContain("README（节选）");
  });

  it("truncates oversized content", () => {
    const big = "x".repeat(100000);
    const map = buildRepoMap(makeRepoSignals({ readme: big }));
    expect(map.length).toBeLessThan(big.length);
    expect(map).toContain("截断");
  });
});

describe("buildDistillPrompt", () => {
  it("encodes the four-layer flow and JSON schema", () => {
    const prompt = buildDistillPrompt({ repoMap: "MAP" });
    expect(prompt).toContain("用途");
    expect(prompt).toContain("技术栈");
    expect(prompt).toContain("核心模块");
    expect(prompt).toContain("创新点");
    expect(prompt).toContain(DISTILL_JSON_SCHEMA_HINT);
    expect(prompt).toContain("MAP");
  });

  it("injects the focus role when provided", () => {
    const prompt = buildDistillPrompt({ repoMap: "MAP", focusRole: "前端工程师" });
    expect(prompt).toContain("前端工程师");
  });

  it("emits an English variant", () => {
    const prompt = buildDistillPrompt({ repoMap: "MAP" }, "en");
    expect(prompt).toContain("STATIC REVERSE ENGINEERING");
  });
});

describe("parseDistilledProject", () => {
  it("parses a clean JSON object", () => {
    const raw = JSON.stringify({
      name: "X",
      tagline: "t",
      category: "工具",
      techStack: ["a"],
      bullets: ["b1", "b2"],
      skills: ["s"],
      summary: "sum",
      innovations: ["i"],
    });
    const out = parseDistilledProject(raw, { repoUrl: "https://github.com/o/r", staticOnly: true });
    expect(out.name).toBe("X");
    expect(out.bullets).toEqual(["b1", "b2"]);
    expect(out.provenance.repoUrl).toBe("https://github.com/o/r");
  });

  it("parses JSON wrapped in ```json fences", () => {
    const raw = 'Here you go:\n```json\n{"name":"Y","bullets":["one"]}\n```';
    const out = parseDistilledProject(raw, { repoUrl: "https://github.com/o/r", staticOnly: true });
    expect(out.name).toBe("Y");
    expect(out.bullets).toEqual(["one"]);
  });

  it("coerces a comma-separated string into arrays", () => {
    const raw = JSON.stringify({ name: "Z", bullets: "a, b, c", techStack: "x、y" });
    const out = parseDistilledProject(raw, { repoUrl: "https://github.com/o/r", staticOnly: true });
    expect(out.bullets).toEqual(["a", "b", "c"]);
    expect(out.techStack).toEqual(["x", "y"]);
  });

  it("falls back to the repo name when name is missing", () => {
    const raw = JSON.stringify({ bullets: ["one"] });
    const out = parseDistilledProject(raw, { repoUrl: "https://github.com/o/myrepo", staticOnly: true });
    expect(out.name).toBe("myrepo");
  });

  it("throws when there are no bullets", () => {
    const raw = JSON.stringify({ name: "Z", bullets: [] });
    expect(() => parseDistilledProject(raw, { repoUrl: "https://github.com/o/r", staticOnly: true })).toThrow(
      DistillParseError,
    );
  });

  it("throws when no JSON object is present", () => {
    expect(() =>
      parseDistilledProject("no json here", { repoUrl: "https://github.com/o/r", staticOnly: true }),
    ).toThrow(DistillParseError);
  });
});

describe("buildProjectBlock", () => {
  it("renders heading, bullets, and tech footer in the resume dialect", () => {
    const block = buildProjectBlock(makeDistilledProject());
    expect(block).toContain("### Demo · 工具");
    expect(block).toContain("- built x");
    expect(block).toContain("技术栈：TypeScript、Vitest");
  });

  it("omits the category when absent", () => {
    const block = buildProjectBlock(makeDistilledProject({ category: "" }));
    expect(block.startsWith("### Demo\n")).toBe(true);
  });
});

describe("insertProjectBlock", () => {
  it("prepends under an existing 项目经历 section", () => {
    const content = "## 项目经历\n\n### Old · 旧\n\n- old bullet\n";
    const out = insertProjectBlock(content, buildProjectBlock(makeDistilledProject()));
    const demoIdx = out.indexOf("### Demo");
    const oldIdx = out.indexOf("### Old");
    expect(demoIdx).toBeGreaterThan(-1);
    expect(demoIdx).toBeLessThan(oldIdx);
  });

  it("creates a 项目经历 section before 技能 when none exists", () => {
    const content = "## 个人优势\n\n- foo\n\n## 技能清单\n\n- bar\n";
    const out = insertProjectBlock(content, buildProjectBlock(makeDistilledProject()));
    expect(out).toContain("## 项目经历");
    const projIdx = out.indexOf("## 项目经历");
    const skillIdx = out.indexOf("## 技能清单");
    expect(projIdx).toBeGreaterThan(-1);
    expect(projIdx).toBeLessThan(skillIdx);
  });
});

describe("mergeSkillsIntoContent", () => {
  it("appends missing skills using the existing separator", () => {
    const content = "- 前端：React、Next.js\n";
    const out = mergeSkillsIntoContent(content, ["React", "TypeScript", "Vite"]);
    expect(out).toContain("TypeScript");
    expect(out).toContain("Vite");
    // React already present — not duplicated.
    const reactMatches = out.match(/React/g) || [];
    expect(reactMatches.length).toBe(1);
  });

  it("leaves content unchanged when no skill line matches", () => {
    const content = "## 项目经历\n\n- foo\n";
    expect(mergeSkillsIntoContent(content, ["X"])).toBe(content);
  });
});

describe("resolveActiveTextProvider", () => {
  function makeSettings(activeId: AIProviderConfig["id"], providers: Partial<AIProviderConfig>[]): AIRuntimeSettings {
    const base = {
      version: 1,
      providerMode: "auto" as const,
      activeProviderId: activeId,
      providers: providers.map((p, i) => ({
        id: (p.id ?? ("openai" as AIProviderConfig["id"])) as AIProviderConfig["id"],
        name: p.name ?? "p",
        description: "",
        baseUrl: p.baseUrl ?? "https://api.openai.com/v1",
        apiKey: p.apiKey ?? "k",
        enabled: p.enabled ?? true,
        modelMode: "auto" as const,
        selectedModel: p.selectedModel ?? "auto",
        customModelId: p.customModelId ?? "",
        priority: p.priority ?? i,
        models: [],
      })) as AIProviderConfig[],
      skills: [],
      mcps: [],
      repositories: [],
      defaultSkillIds: [],
      defaultMcpIds: [],
      autoRefreshCatalogs: false,
      allowRemoteMetadataRefresh: false,
      updatedAt: "",
    };
    return base;
  }

  it("uses customModelId when set", () => {
    const s = makeSettings("moonshot", [{ id: "moonshot", customModelId: "kimi-k2-strict" }]);
    expect(resolveActiveTextProvider(s).model).toBe("kimi-k2-strict");
  });

  it("falls back to the provider default for 'auto'", () => {
    const s = makeSettings("moonshot", [{ id: "moonshot", selectedModel: "auto" }]);
    expect(resolveActiveTextProvider(s).model).toBe(PROVIDER_DEFAULT_MODEL.moonshot);
  });

  it("flags unconfigured when baseUrl is empty", () => {
    const s = makeSettings("local", [{ id: "local", baseUrl: "", selectedModel: "auto" }]);
    expect(resolveActiveTextProvider(s).configured).toBe(false);
  });
});
