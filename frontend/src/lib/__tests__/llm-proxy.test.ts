import { afterEach, describe, expect, it } from "vitest";
import {
  assertSafeBaseUrl,
  callOpenAIChat,
  enforceRateLimit,
  getClientKey,
  isPrivateHost,
  normalizeBaseUrl,
  ProviderConfigError,
  RateLimitError,
} from "../llm-proxy";
import type { NextRequest } from "next/server";

function fakeRequest(headers: Record<string, string>): NextRequest {
  return { headers: { get: (k: string) => headers[k] ?? null } } as unknown as NextRequest;
}

describe("normalizeBaseUrl", () => {
  it("strips trailing slashes", () => {
    expect(normalizeBaseUrl("https://api.x.com/v1///")).toBe("https://api.x.com/v1");
    expect(normalizeBaseUrl("  https://api.x.com  ")).toBe("https://api.x.com");
  });
});

describe("assertSafeBaseUrl", () => {
  it("accepts real public provider URLs", () => {
    expect(assertSafeBaseUrl("https://api.openai.com/v1")).toBe("https://api.openai.com/v1");
    expect(assertSafeBaseUrl("https://ark.cn-beijing.volces.com/api/v3")).toBe(
      "https://ark.cn-beijing.volces.com/api/v3",
    );
    expect(assertSafeBaseUrl("https://api.siliconflow.cn/v1")).toBe("https://api.siliconflow.cn/v1");
  });

  it("rejects missing / malformed / non-http schemes", () => {
    expect(() => assertSafeBaseUrl("")).toThrow(ProviderConfigError);
    expect(() => assertSafeBaseUrl("not a url")).toThrow(ProviderConfigError);
    expect(() => assertSafeBaseUrl("file:///etc/passwd")).toThrow(ProviderConfigError);
    expect(() => assertSafeBaseUrl("javascript:alert(1)")).toThrow(ProviderConfigError);
  });

  it("rejects private / loopback / link-local hosts", () => {
    for (const url of [
      "http://localhost",
      "http://127.0.0.1",
      "http://10.0.0.1",
      "http://192.168.1.1",
      "http://169.254.169.254", // cloud metadata
      "http://172.16.0.1",
      "http://metadata.google.internal",
    ]) {
      expect(() => assertSafeBaseUrl(url), url).toThrow(ProviderConfigError);
    }
  });

  it("rejects decimal / hex IP encodings of loopback (SSRF bypass)", () => {
    expect(() => assertSafeBaseUrl("https://2130706433/")).toThrow(ProviderConfigError); // 127.0.0.1
    expect(() => assertSafeBaseUrl("https://0x7f000001/")).toThrow(ProviderConfigError); // 127.0.0.1
    // Whole-number IP 0 → 0.0.0.0 → localhost. `Number("0")===0` is falsy, so a
    // naive `||` decode would skip it; this guards the regression.
    expect(() => assertSafeBaseUrl("https://0/")).toThrow(ProviderConfigError);
  });
});

describe("isPrivateHost", () => {
  it("returns false for public hosts", () => {
    expect(isPrivateHost("api.openai.com")).toBe(false);
    expect(isPrivateHost("8.8.8.8")).toBe(false);
  });
  it("returns true for private encodings", () => {
    expect(isPrivateHost("127.0.0.1")).toBe(true);
    expect(isPrivateHost("2130706433")).toBe(true);
  });
});

describe("enforceRateLimit", () => {
  afterEach(() => {
    // Buckets are module-global; each test uses a fresh key so they don't collide.
  });

  it("allows N requests then throws RateLimitError", () => {
    const key = `test-allow-${Math.random()}`;
    for (let i = 0; i < 5; i += 1) enforceRateLimit(key, 5);
    expect(() => enforceRateLimit(key, 5)).toThrow(RateLimitError);
  });

  it("isolates buckets by key", () => {
    const a = `test-iso-a-${Math.random()}`;
    const b = `test-iso-b-${Math.random()}`;
    enforceRateLimit(a, 1);
    // a is exhausted, b is independent
    expect(() => enforceRateLimit(a, 1)).toThrow(RateLimitError);
    expect(() => enforceRateLimit(b, 1)).not.toThrow();
  });
});

describe("getClientKey", () => {
  // The RIGHTMOST XFF entry is appended by the trusted edge proxy (the real
  // client IP); the LEFTMOST is client-supplied and therefore spoofable. Using
  // the leftmost would let an attacker rotate a fake leading value to get a
  // fresh rate-limit bucket per request.
  it("uses the rightmost (proxy-appended) X-Forwarded-For IP, not the spoofable first", () => {
    expect(getClientKey(fakeRequest({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" }))).toBe("5.6.7.8");
  });
  it("prefers x-real-ip over X-Forwarded-For when both are present", () => {
    expect(
      getClientKey(fakeRequest({ "x-real-ip": "9.9.9.9", "x-forwarded-for": "1.2.3.4" })),
    ).toBe("9.9.9.9");
  });
  it("falls back to x-real-ip", () => {
    expect(getClientKey(fakeRequest({ "x-real-ip": "9.9.9.9" }))).toBe("9.9.9.9");
  });
  it("returns unknown when no trusted header is present", () => {
    expect(getClientKey(fakeRequest({}))).toBe("unknown");
  });
});

describe("callOpenAIChat", () => {
  it("rejects an unsafe base URL before any network call", async () => {
    await expect(
      callOpenAIChat({
        baseUrl: "http://169.254.169.254",
        apiKey: "k",
        model: "m",
        systemPrompt: "s",
        userPrompt: "u",
      }),
    ).rejects.toThrow(ProviderConfigError);
  });
});
