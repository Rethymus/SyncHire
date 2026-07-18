import { AI_RUNTIME_SETTINGS_STORAGE_KEY } from "./ai-runtime-settings";
import { isGithubPagesDeployment } from "./deployment-mode";
import { IMAGE_PROVIDER_SETTINGS_STORAGE_KEY } from "./image-provider-settings";

/**
 * Browser keys that describe local work or local-only preferences. This list is
 * deliberately explicit: exports and erase actions must never sweep in tokens,
 * provider keys, or unrelated data owned by the same origin.
 */
export const NON_SECRET_WORKSPACE_KEYS = [
  "synchire-storage",
  "synchire-resume-builder",
  "saved_resume_templates",
  "synchire_search_history",
  "synchire-local-notifications",
  "synchire-notification-preferences",
  "synchire-interviews",
  "synchire-saved-searches",
  "synchire-backups",
  "synchire-lite-locale",
  "preferred-language",
  "onboarding_state",
  "last_login",
  "has_seen_product_tour",
  "workflow-notifications",
  "workflow-history",
  "notification-config",
  "selectedTemplate",
  "templateCustomization",
] as const;

const PAGE_SESSION_CREDENTIAL_KEYS = [
  AI_RUNTIME_SETTINGS_STORAGE_KEY,
  IMAGE_PROVIDER_SETTINGS_STORAGE_KEY,
  "synchire-pages-direct-provider-consent",
] as const;

const LEGACY_CREDENTIAL_KEYS = [
  AI_RUNTIME_SETTINGS_STORAGE_KEY,
  IMAGE_PROVIDER_SETTINGS_STORAGE_KEY,
  "synchire-github-token",
] as const;

export interface NonSecretWorkspaceExport {
  format: "synchire-non-secret-workspace";
  version: 1;
  exportedAt: string;
  values: Partial<Record<(typeof NON_SECRET_WORKSPACE_KEYS)[number], string>>;
}

function browserStorage(): Storage | null {
  return typeof window === "undefined" ? null : window.localStorage;
}

/** Create a portable workspace snapshot without reading credential storage. */
export function exportNonSecretWorkspace(storage = browserStorage()): NonSecretWorkspaceExport {
  const values: NonSecretWorkspaceExport["values"] = {};
  if (storage) {
    for (const key of NON_SECRET_WORKSPACE_KEYS) {
      const value = storage.getItem(key);
      if (value !== null) values[key] = value;
    }
  }

  return {
    format: "synchire-non-secret-workspace",
    version: 1,
    exportedAt: new Date().toISOString(),
    values,
  };
}

/** Remove only SyncHire workspace data; never call localStorage.clear(). */
export function clearNonSecretWorkspace(storage = browserStorage()): void {
  if (!storage) return;
  for (const key of NON_SECRET_WORKSPACE_KEYS) storage.removeItem(key);
}

/** Restore only keys from an exported, non-secret workspace snapshot. */
export function restoreNonSecretWorkspace(
  snapshot: unknown,
  storage = browserStorage(),
): boolean {
  if (!storage || !snapshot || typeof snapshot !== "object") return false;
  const candidate = snapshot as Partial<NonSecretWorkspaceExport>;
  if (candidate.format !== "synchire-non-secret-workspace" || !candidate.values) return false;

  for (const key of NON_SECRET_WORKSPACE_KEYS) {
    const value = candidate.values[key];
    if (typeof value === "string") storage.setItem(key, value);
  }
  return true;
}

/**
 * Empty the credentials this static Pages mode can create. Provider settings
 * were stored in localStorage by older builds, so remove only those known
 * legacy credential records as a defence-in-depth migration cleanup.
 */
export function clearPagesSessionCredentials(): void {
  if (typeof window === "undefined" || !isGithubPagesDeployment()) return;

  for (const key of PAGE_SESSION_CREDENTIAL_KEYS) window.sessionStorage.removeItem(key);
  for (const key of LEGACY_CREDENTIAL_KEYS) window.localStorage.removeItem(key);
}
