import { describe, expect, it } from "vitest";
import {
  addRuntimeRepository,
  applyRecommendedRuntimeDefaults,
  createDefaultAIRuntimeSettings,
  hydrateAIRuntimeSettings,
  maskApiKey,
  refreshRuntimeCatalog,
  removeRuntimeRepository,
  searchRuntimeCatalog,
  setRuntimeCapabilityEnabled,
  setRuntimeCapabilityInstalled,
} from "../ai-runtime-settings";

describe("AI runtime settings", () => {
  it("creates recommended local-first defaults for providers, skills, MCPs, and catalogs", () => {
    const settings = createDefaultAIRuntimeSettings(new Date("2026-06-08T00:00:00.000Z"));

    expect(settings.providerMode).toBe("auto");
    expect(settings.providers.some((provider) => provider.id === "openai")).toBe(true);
    expect(settings.skills.filter((skill) => skill.enabled).map((skill) => skill.id)).toContain(
      "role-card-distiller"
    );
    expect(settings.mcps.filter((mcp) => mcp.enabled).map((mcp) => mcp.id)).toContain(
      "review-only-webbridge"
    );
    expect(settings.repositories.map((repository) => repository.id)).toEqual([
      "synchire-built-in",
      "skill-sh",
      "mcp-sh",
    ]);
  });

  it("hydrates older or partial settings without losing newly shipped defaults", () => {
    const settings = hydrateAIRuntimeSettings({
      providerMode: "manual",
      activeProviderId: "moonshot",
      providers: [{ id: "moonshot", apiKey: "kimi-test-key", enabled: true }],
      skills: [{ id: "role-card-distiller", enabled: false }],
    });

    expect(settings.providerMode).toBe("manual");
    expect(settings.activeProviderId).toBe("moonshot");
    expect(settings.providers.find((provider) => provider.id === "moonshot")?.apiKey).toBe(
      "kimi-test-key"
    );
    expect(settings.skills.some((skill) => skill.id === "jd-resume-tailor")).toBe(true);
    expect(settings.mcps.some((mcp) => mcp.id === "synchire-jd-parser")).toBe(true);
  });

  it("masks API keys without exposing the full secret", () => {
    expect(maskApiKey("")).toBe("Not configured");
    expect(maskApiKey("short")).toBe("••••••••");
    expect(maskApiKey("sk-1234567890abcdef")).toBe("sk-1••••cdef");
  });

  it("enables, installs, and restores recommended capabilities consistently", () => {
    let settings = createDefaultAIRuntimeSettings();

    settings = setRuntimeCapabilityInstalled(settings, "skill", "recruiter-message-writer", true);
    settings = setRuntimeCapabilityEnabled(settings, "skill", "recruiter-message-writer", true);
    expect(settings.skills.find((skill) => skill.id === "recruiter-message-writer")?.enabled).toBe(
      true
    );

    settings = applyRecommendedRuntimeDefaults(settings);
    const optionalSkill = settings.skills.find((skill) => skill.id === "recruiter-message-writer");
    expect(optionalSkill?.enabled).toBe(false);
    expect(optionalSkill?.installed).toBe(true);
    expect(settings.mcps.find((mcp) => mcp.id === "review-only-webbridge")?.enabled).toBe(true);
  });

  it("searches both skill and MCP catalogs", () => {
    const settings = createDefaultAIRuntimeSettings();

    expect(searchRuntimeCatalog(settings, "browser").map((item) => item.id)).toEqual(
      expect.arrayContaining(["browser-fill-review", "review-only-webbridge"])
    );
    expect(searchRuntimeCatalog(settings, "resume", "skill").every((item) => item.kind === "skill")).toBe(
      true
    );
    expect(searchRuntimeCatalog(settings, "resume", "mcp").every((item) => item.kind === "mcp")).toBe(
      true
    );
  });

  it("refreshes enabled repositories as metadata-only catalog updates", () => {
    const settings = refreshRuntimeCatalog(
      createDefaultAIRuntimeSettings(),
      new Date("2026-06-08T01:02:03.000Z")
    );

    expect(settings.lastCatalogRefreshAt).toBe("2026-06-08T01:02:03.000Z");
    expect(settings.repositories.every((repository) => repository.lastRefreshedAt)).toBe(true);
    expect(settings.skills.every((skill) => skill.updatedAt)).toBe(true);
    expect(settings.mcps.every((mcp) => mcp.updatedAt)).toBe(true);
  });

  it("adds custom repositories while protecting built-in sources from removal", () => {
    let settings = createDefaultAIRuntimeSettings();

    settings = addRuntimeRepository(settings, {
      name: "Private Catalog",
      url: "https://example.com/catalog.json",
      description: "Team curated metadata",
      kind: "mixed",
      scriptHint: "catalog.json",
    });
    expect(settings.repositories.some((repository) => repository.name === "Private Catalog")).toBe(true);

    settings = removeRuntimeRepository(settings, "synchire-built-in");
    expect(settings.repositories.some((repository) => repository.id === "synchire-built-in")).toBe(true);

    const customId = settings.repositories.find((repository) => repository.name === "Private Catalog")?.id;
    expect(customId).toBeTruthy();
    settings = removeRuntimeRepository(settings, customId as string);
    expect(settings.repositories.some((repository) => repository.name === "Private Catalog")).toBe(false);
  });
});
