import { afterEach, describe, expect, it, vi } from "vitest";
import type { ResolvedTextProvider } from "../github-distill/llm-resolver";

const originalSecureContext = window.isSecureContext;

async function loadPagesAdapter() {
  vi.stubEnv("NEXT_PUBLIC_DEPLOYMENT_TARGET", "github-pages");
  Object.defineProperty(window, "isSecureContext", { configurable: true, value: true });
  vi.resetModules();
  return import("../direct-text-provider");
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  Object.defineProperty(window, "isSecureContext", {
    configurable: true,
    value: originalSecureContext,
  });
});

describe("direct text provider", () => {
  it("sends an OpenAI-compatible request without putting the key in its URL or body", async () => {
    const { completeTextDirectly } = await loadPagesAdapter();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ message: { content: "{}" } }] }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const provider: ResolvedTextProvider = {
      providerId: "openai",
      baseUrl: "https://models.example.test/v1",
      apiKey: "secret-value",
      model: "test-model",
      configured: true,
    };

    await expect(
      completeTextDirectly({ provider, systemPrompt: "system", userPrompt: "user" }),
    ).resolves.toBe("{}");

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://models.example.test/v1/chat/completions");
    expect(url).not.toContain("secret-value");
    expect(options.headers).toMatchObject({ Authorization: "Bearer secret-value" });
    expect(options.body).not.toContain("secret-value");
    expect(options.redirect).toBe("error");
    expect(options.referrerPolicy).toBe("no-referrer");
  });

  it("uses the Gemini header rather than a key-bearing query parameter", async () => {
    const { completeTextDirectly } = await loadPagesAdapter();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ candidates: [{ content: { parts: [{ text: "ok" }] } }] }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const provider: ResolvedTextProvider = {
      providerId: "gemini",
      baseUrl: "https://generativelanguage.googleapis.com/v1beta",
      apiKey: "gemini-secret",
      model: "models/gemini-2.0-flash",
      configured: true,
    };

    await expect(
      completeTextDirectly({ provider, systemPrompt: "system", userPrompt: "user" }),
    ).resolves.toBe("ok");

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
    );
    expect(url).not.toContain("gemini-secret");
    expect(options.headers).toMatchObject({ "x-goog-api-key": "gemini-secret" });
  });
});
