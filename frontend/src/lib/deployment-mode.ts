/** Build-time deployment mode helpers shared by static Pages-only code. */

export const DEPLOYMENT_TARGET = process.env.NEXT_PUBLIC_DEPLOYMENT_TARGET ?? "standard";

export function isGithubPagesDeployment(): boolean {
  return DEPLOYMENT_TARGET === "github-pages";
}

/** GitHub Pages must be HTTPS before a user may enter or use a provider key. */
export function canUseDirectByokInThisRuntime(): boolean {
  if (!isGithubPagesDeployment() || typeof window === "undefined") return false;
  if (window.isSecureContext && window.location.protocol === "https:") return true;

  // This exception is intentionally unavailable in a Pages artifact.
  return process.env.NODE_ENV !== "production" && window.location.hostname === "localhost";
}

export function getCredentialStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  return isGithubPagesDeployment() ? window.sessionStorage : window.localStorage;
}
