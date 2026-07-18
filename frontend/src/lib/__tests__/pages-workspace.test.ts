import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  NON_SECRET_WORKSPACE_KEYS,
  clearNonSecretWorkspace,
  exportNonSecretWorkspace,
  restoreNonSecretWorkspace,
} from "../pages-workspace";

describe("Pages workspace storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("exports only the explicit non-secret workspace allowlist", () => {
    window.localStorage.setItem("synchire-storage", '{"state":"resume data"}');
    window.localStorage.setItem("synchire-saved-searches", '["product manager"]');
    window.localStorage.setItem("synchire-ai-runtime-settings", '{"apiKey":"must-not-export"}');
    window.localStorage.setItem("token", "must-not-export");

    const snapshot = exportNonSecretWorkspace();

    expect(snapshot.values).toMatchObject({
      "synchire-storage": '{"state":"resume data"}',
      "synchire-saved-searches": '["product manager"]',
    });
    expect(snapshot.values).not.toHaveProperty("synchire-ai-runtime-settings");
    expect(snapshot.values).not.toHaveProperty("token");
  });

  it("clears and restores only SyncHire workspace keys", () => {
    window.localStorage.setItem("synchire-storage", "data");
    window.localStorage.setItem("token", "keep-this-unrelated-token");
    const snapshot = exportNonSecretWorkspace();

    clearNonSecretWorkspace();
    expect(window.localStorage.getItem("synchire-storage")).toBeNull();
    expect(window.localStorage.getItem("token")).toBe("keep-this-unrelated-token");

    expect(restoreNonSecretWorkspace(snapshot)).toBe(true);
    expect(window.localStorage.getItem("synchire-storage")).toBe("data");
    expect(NON_SECRET_WORKSPACE_KEYS).toContain("synchire-storage");
  });

  it("clears Page credentials from this session and known legacy credential records only", async () => {
    vi.stubEnv("NEXT_PUBLIC_DEPLOYMENT_TARGET", "github-pages");
    vi.resetModules();
    const { clearPagesSessionCredentials } = await import("../pages-workspace");
    window.sessionStorage.setItem("synchire-ai-runtime-settings", '{"apiKey":"session-key"}');
    window.sessionStorage.setItem("synchire-pages-direct-provider-consent", "approved");
    window.localStorage.setItem("synchire-ai-runtime-settings", '{"apiKey":"legacy-key"}');
    window.localStorage.setItem("synchire-storage", "keep-workspace");

    clearPagesSessionCredentials();

    expect(window.sessionStorage.getItem("synchire-ai-runtime-settings")).toBeNull();
    expect(window.sessionStorage.getItem("synchire-pages-direct-provider-consent")).toBeNull();
    expect(window.localStorage.getItem("synchire-ai-runtime-settings")).toBeNull();
    expect(window.localStorage.getItem("synchire-storage")).toBe("keep-workspace");
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});
