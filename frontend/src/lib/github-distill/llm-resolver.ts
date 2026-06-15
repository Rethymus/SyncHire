/**
 * Client-side resolution of the active text-LLM provider from the persisted
 * {@link AIRuntimeSettings}, into the concrete `{ baseUrl, apiKey, model }`
 * triple the /api/github-analyze route expects.
 *
 * Model resolution order: explicit `customModelId` → selected model (when not
 * "auto") → a sane per-provider default. Pure given the settings; unit-testable.
 */

import type { AIProviderConfig, AIRuntimeSettings, AIProviderId } from "../ai-runtime-settings";

/** Sensible fallback model ids per provider for "auto" selection. */
export const PROVIDER_DEFAULT_MODEL: Record<AIProviderId, string> = {
  openai: "gpt-4o-mini",
  anthropic: "claude-3-5-sonnet-20241022",
  moonshot: "moonshot-v1-8k",
  deepseek: "deepseek-chat",
  gemini: "gemini-1.5-flash",
  local: "llama3.1",
};

export interface ResolvedTextProvider {
  providerId: AIProviderId;
  baseUrl: string;
  apiKey: string;
  model: string;
  /** Whether the provider has enough config to attempt a call. */
  configured: boolean;
}

function resolveModel(provider: AIProviderConfig): string {
  const custom = provider.customModelId.trim();
  if (custom) return custom;
  if (provider.selectedModel && provider.selectedModel !== "auto") {
    return provider.selectedModel;
  }
  return PROVIDER_DEFAULT_MODEL[provider.id] ?? "auto";
}

export function resolveActiveTextProvider(settings: AIRuntimeSettings): ResolvedTextProvider {
  const enabled = settings.providers
    .filter((p) => p.enabled)
    .sort((a, b) => a.priority - b.priority);
  const provider =
    enabled.find((p) => p.id === settings.activeProviderId) ?? enabled[0];

  if (!provider) {
    return { providerId: "openai", baseUrl: "", apiKey: "", model: "", configured: false };
  }

  const baseUrl = provider.baseUrl.trim();
  const apiKey = provider.apiKey.trim();
  const model = resolveModel(provider);
  const configured = Boolean(baseUrl && model);

  return { providerId: provider.id, baseUrl, apiKey, model, configured };
}
