/**
 * Shared LLM-proxy helpers for the server-side AI route handlers.
 *
 * Every AI route (image-generate, interview-review, github-analyze) proxies a
 * caller-supplied OpenAI-compatible endpoint from the server so the API key
 * never reaches the browser network tab. That same posture makes the routes an
 * attractive abuse target, so this module centralizes the protections each
 * route MUST apply before issuing an upstream call:
 *
 *   1. {@link assertSafeBaseUrl} — reject non-http(s) schemes and hostnames
 *      that resolve to private / loopback / link-local addresses (SSRF
 *      mitigation). Blocks obvious cloud-metadata probes
 *      (169.254.169.254, metadata.google.internal).
 *   2. {@link fetchWithTimeout} — every upstream call is bounded by an
 *      AbortController so a hung provider cannot pin a worker until the
 *      platform hard-timeout (worker-starvation DoS).
 *   3. {@link enforceRateLimit} — per-client token bucket so one origin cannot
 *      exhaust a third-party provider's quota through us.
 *
 * Plus the shared {@link callOpenAIChat} + {@link normalizeBaseUrl} that the
 * routes had copy-pasted verbatim across three files.
 *
 * NOTE: rate limiting + per-client state here is in-memory and therefore only
 * accurate for a single server instance (the current Docker-only deploy runs
 * one instance). For multi-instance / serverless deploys, move the bucket store
 * to Redis (CLAUDE.md already names Redis as the rate-limit store); the
 * function signatures are shaped so a Redis backing can drop in later.
 */

import { NextResponse, type NextRequest } from "next/server";

/**
 * Opt-in escape hatch for local-LLM development (Ollama / LM Studio at
 * 127.0.0.1, a LAN-hosted model). When set to "1", {@link assertSafeBaseUrl}
 * stops rejecting loopback/private targets so a developer can point the proxy
 * at a local endpoint. SSRF protection is DISABLED in this mode — never set
 * this in a deployment reachable from the internet.
 */
const ALLOW_LOOPBACK = process.env.LLM_PROXY_ALLOW_LOOPBACK === "1";

/** Hard cap on the in-process rate-limit bucket map, bounding memory under a
 * flood of distinct client keys. See {@link enforceRateLimit}. */
const MAX_BUCKETS = 10_000;

/** Strip trailing slashes from a provider base URL. */
export function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

/** Thrown when a caller-supplied provider URL is missing or unsafe. */
export class ProviderConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProviderConfigError";
  }
}

/**
 * Hostname patterns that resolve to private / loopback / link-local space.
 * String-based (no DNS lookup) so it is runtime-agnostic; a DNS-rebinding-proof
 * check that also resolves hostnames is a future hardening step.
 */
const PRIVATE_HOST_PATTERNS: ReadonlyArray<RegExp> = [
  /^localhost$/i,
  /^127\./,
  /^0\./,
  /^10\./,
  /^192\.168\./,
  /^169\.254\./, // link-local — incl. AWS/GCP metadata 169.254.169.254
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, // CGNAT 100.64.0.0/10
  /^\[?::1\]?$/,
  /^\[?(fc|fd)[0-9a-f]{2}:/i, // IPv6 unique-local fc00::/7
  /^\[?fe80:/i, // IPv6 link-local
  /\.local$/i,
  /^metadata\.google\.internal$/i, // GCP metadata host
];

/**
 * Test a hostname for private/loopback/link-local targets. Also normalizes the
 * numeric-IP encodings browsers accept (`https://2130706433/` = 127.0.0.1,
 * `https://0x7f000001/`, `https://0177.0.0.1/`) which the dotted-quad regexes
 * alone would miss. DNS-rebinding (a public hostname that resolves to a private
 * IP) is NOT caught here — needs a DNS-resolution guard; documented as such.
 */
export function isPrivateHost(hostname: string): boolean {
  if (PRIVATE_HOST_PATTERNS.some((re) => re.test(hostname))) {
    return true;
  }
  // Whole-number / hex IP encodings → decode to dotted-quad and re-test. NOTE:
  // a plain `||` chain is WRONG here: the decimal value `0` (http://0/ →
  // 0.0.0.0 → localhost) is falsy and would short-circuit into the hex branch,
  // skipping the decode entirely. Use explicit branches instead.
  let numeric = NaN;
  if (/^\d+$/.test(hostname) && Number.isSafeInteger(Number(hostname))) {
    numeric = Number(hostname);
  } else if (/^0[xX][0-9a-fA-F]+$/.test(hostname)) {
    numeric = parseInt(hostname, 16);
  }
  if (Number.isFinite(numeric) && numeric >= 0 && numeric <= 0xffffffff) {
    const a = (numeric >>> 24) & 0xff;
    const b = (numeric >>> 16) & 0xff;
    const c = (numeric >>> 8) & 0xff;
    const d = numeric & 0xff;
    const dotted = `${a}.${b}.${c}.${d}`;
    if (PRIVATE_HOST_PATTERNS.some((re) => re.test(dotted))) {
      return true;
    }
  }
  return false;
}

/**
 * Validate and normalize a caller-supplied provider base URL. Throws
 * {@link ProviderConfigError} for missing, malformed, non-http(s), or
 * private/local targets.
 */
export function assertSafeBaseUrl(rawBaseUrl: string): string {
  const baseUrl = normalizeBaseUrl(rawBaseUrl);
  if (!baseUrl) {
    throw new ProviderConfigError("缺少 baseUrl。");
  }
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    throw new ProviderConfigError("baseUrl 不是合法的 URL。");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new ProviderConfigError(`不允许的协议：${url.protocol}（仅支持 http/https）。`);
  }
  const host = url.hostname.replace(/^\[|\]$/g, ""); // strip IPv6 brackets
  if (isPrivateHost(host) && !ALLOW_LOOPBACK) {
    throw new ProviderConfigError("目标地址指向内网/本地地址，已被安全策略拦截。");
  }
  return baseUrl;
}

/**
 * fetch wrapper bounded by an AbortController. A hung upstream resolves to a
 * TimeoutError instead of hanging the worker until the platform hard-timeout.
 */
export async function fetchWithTimeout(
  input: string,
  init: RequestInit = {},
  timeoutMs = 60_000,
): Promise<Response> {
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  const callerSignal = init.signal;
  // Merge the caller's signal with the timeout so aborting either aborts the
  // fetch. When AbortSignal.any is available this is one call; otherwise link
  // them via a manual controller so the caller's signal is never silently
  // dropped (which would break request teardown on older runtimes).
  const signal = !callerSignal
    ? timeoutSignal
    : "any" in AbortSignal
      ? AbortSignal.any([callerSignal, timeoutSignal])
      : linkAbortSignals(callerSignal, timeoutSignal);
  return fetch(input, { ...init, signal });
}

/** AbortSignal.any fallback: abort the returned signal when EITHER source aborts. */
function linkAbortSignals(a: AbortSignal, b: AbortSignal): AbortSignal {
  if (a.aborted) return a;
  if (b.aborted) return b;
  const ctrl = new AbortController();
  const abort = (reason: unknown): void => ctrl.abort(reason);
  a.addEventListener("abort", () => abort(a.reason), { once: true });
  b.addEventListener("abort", () => abort(b.reason), { once: true });
  return ctrl.signal;
}

interface ChatChoice {
  message?: { content?: string };
}

interface ChatCompletionResponse {
  choices?: ChatChoice[];
  error?: { message?: string };
}

export interface CallChatOptions {
  baseUrl: string;
  apiKey: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  /** Per-call upstream timeout. Default 60s. */
  timeoutMs?: number;
}

/**
 * POST {baseUrl}/chat/completions (OpenAI-compatible) and return the first
 * assistant message's content. Validates the URL, attaches a Bearer key when
 * present, enforces a timeout, and surfaces upstream error payloads.
 */
export async function callOpenAIChat(opts: CallChatOptions): Promise<string> {
  const safeBase = assertSafeBaseUrl(opts.baseUrl);
  const res = await fetchWithTimeout(
    `${safeBase}/chat/completions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(opts.apiKey ? { Authorization: `Bearer ${opts.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: opts.model,
        temperature: opts.temperature ?? 0.3,
        messages: [
          { role: "system", content: opts.systemPrompt },
          { role: "user", content: opts.userPrompt },
        ],
      }),
    },
    opts.timeoutMs ?? 60_000,
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 400)}`);
  }
  const payload = (await res.json().catch(() => null)) as ChatCompletionResponse | null;
  if (payload?.error?.message) {
    throw new Error(payload.error.message);
  }
  const content = payload?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("模型返回为空。");
  }
  return content;
}

interface Bucket {
  tokens: number;
  resetAt: number;
}

/** Thrown when a client exceeds its rate limit. `retryAfterMs` for Retry-After. */
export class RateLimitError extends Error {
  readonly retryAfterMs: number;
  constructor(retryAfterMs: number) {
    super("请求过于频繁，请稍后再试。");
    this.name = "RateLimitError";
    this.retryAfterMs = retryAfterMs;
  }
}

const buckets = new Map<string, Bucket>();

/**
 * In-memory token-bucket rate limit. Throws {@link RateLimitError} when the
 * caller has exhausted its allowance for the current window.
 *
 * Single-instance only — see the module note about Redis for multi-instance.
 */
export function enforceRateLimit(
  key: string,
  maxPerWindow: number,
  windowMs = 60_000,
): void {
  const now = Date.now();
  // Opportunistic eviction: once the map grows past the cap, drop every expired
  // bucket. Without this, a flood of distinct (spoofable) client keys would let
  // the map grow without bound — a memory leak / OOM under abuse.
  if (buckets.size > MAX_BUCKETS) {
    for (const [k, b] of buckets) {
      if (b.resetAt <= now) buckets.delete(k);
    }
  }
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { tokens: maxPerWindow - 1, resetAt: now + windowMs });
    return;
  }
  if (bucket.tokens <= 0) {
    throw new RateLimitError(bucket.resetAt - now);
  }
  bucket.tokens -= 1;
}

/**
 * Map the two shared AI-proxy errors to their HTTP responses. Every AI route
 * handler calls this at the top of its catch block and returns the result when
 * non-null, so the {@link RateLimitError} → 429 (with Retry-After) and
 * {@link ProviderConfigError} → 400 mapping lives in one place with the classes
 * that throw them — a 4th route can't get the Retry-After arithmetic subtly
 * wrong by copy-pasting it. Returns null for any other error so the route can
 * fall through to its own domain-specific handling.
 */
export function llmProxyErrorResponse<T extends { ok: boolean; error?: string }>(
  error: unknown,
): NextResponse<T> | null {
  if (error instanceof RateLimitError) {
    return NextResponse.json<T>(
      // The body is the error variant of any T satisfying the constraint; the
      // assertion is sound because T is limited to { ok: boolean; error?: string }.
      { ok: false, error: error.message } as T,
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(error.retryAfterMs / 1000)) },
      },
    );
  }
  if (error instanceof ProviderConfigError) {
    return NextResponse.json<T>({ ok: false, error: error.message } as T, { status: 400 });
  }
  return null;
}

/**
 * Best-effort stable client key for rate limiting.
 *
 * Prefers `x-real-ip` (set by the trusted edge proxy from the actual TCP peer,
 * overwriting any client-supplied value), then the RIGHTMOST entry of
 * `x-forwarded-for` (appended by the edge proxy = the real client IP). The
 * LEFTMOST XFF entry is client-controlled and therefore spoofable, so it is
 * deliberately NOT used — otherwise an attacker rotating a fake leading XFF
 * value gets a fresh bucket per request and the limit never bites.
 *
 * Returns "unknown" when neither trusted header is present. This requires the
 * deployment to terminate traffic behind a proxy that sets X-Real-IP /
 * X-Forwarded-For (the Docker/Next reverse-proxy setup does). When the key IS
 * "unknown", all such clients share a single per-route bucket — which is the
 * fail-safe direction (limits abuse) rather than letting unidentified traffic
 * bypass limiting entirely. Do NOT special-case "unknown" to skip the limit;
 * fix the proxy headers in the deployment instead.
 */
export function getClientKey(request: NextRequest): string {
  const realIp = request.headers.get("x-real-ip");
  if (realIp && realIp.trim()) {
    return realIp.trim();
  }
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) {
    const parts = fwd
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    // Rightmost = appended by the trusted edge proxy. Leftmost is spoofable.
    const trusted = parts.length ? parts[parts.length - 1] : "";
    if (trusted) return trusted;
  }
  return "unknown";
}

/** Default per-route limits. Image generation is costlier, so it is tighter. */
export const RATE_LIMITS = {
  chat: { max: 100, windowMs: 60_000 },
  image: { max: 20, windowMs: 60_000 },
} as const;
