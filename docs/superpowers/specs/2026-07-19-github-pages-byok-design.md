# GitHub Pages BYOK Lite Design

## Purpose

Publish a static, no-account SyncHire Lite experience to GitHub Pages without
deploying a SyncHire API or paying for any model usage. A visitor brings a
provider key and the browser talks directly to the chosen provider.

## Non-goals

- Do not expose, commit, proxy, log, or persist a visitor's provider key.
- Do not make the existing FastAPI, Next route handlers, authentication,
  WebSocket, MCP, storage, or cloud-AI features work on GitHub Pages.
- Do not represent browser storage as an operating-system credential vault.
- Do not make arbitrary provider URLs work: browser CORS and provider protocol
  support remain provider-controlled.

## Audiences and user journeys

1. **Public evaluator** opens the Pages site, enters a provider configuration,
   explicitly confirms the provider destination, creates a local job-search
   workspace, uses the one supported direct-BYOK feature, and can export their
   data. SyncHire infrastructure receives no key or application data.
2. **Privacy-sensitive visitor** uses the site in a browser session. Their
   provider key is retained only in `sessionStorage` and is cleared when the
   tab/window closes.
3. **Returning visitor** can keep non-secret job-search data in their browser
   by default, but sees an explicit local-storage and export reminder. Export
   bundles never include keys or tokens, and a clear-workspace action is always
   available.
4. **Unsupported-flow visitor** sees an explicit Pages-mode limitation notice
   instead of an implication that server-only features are present.

## Architecture

```text
GitHub Pages (static Next export)
  |-- local app state -> browser persistent storage (user-controlled)
  |-- API keys/tokens -> sessionStorage only
  |-- direct client adapter -> provider HTTPS API (CORS/protocol permitting)
  |-- local JSON/CSV export -> user download
  `-- no SyncHire application server, model proxy, or billing account
```

`NEXT_PUBLIC_DEPLOYMENT_TARGET=github-pages` activates Pages behavior. A
dedicated `build:pages` command is distinct from the native-shell static build.
The GitHub workflow supplies the repository path as the build-time `basePath`
(default `/SyncHire`) and supports an explicit empty override for a custom
domain/root Pages site. Other development, Docker, desktop, and Android builds
retain their existing behavior.

### Pages capability matrix

| Capability | Pages behavior |
| --- | --- |
| Resume, JD, role card, applications, local search, local PDF/print, data export/import | Local-only; no SyncHire API request |
| Interview review | Direct BYOK after explicit consent; OpenAI-compatible, Anthropic, and Gemini protocol adapters only |
| Image provider, portrait studio, GitHub project analysis/token, account/OAuth, notifications, backend search/upload, WebSocket and MCP | Unavailable in Pages mode; controls are hidden/disabled with an explanation and no request is sent |
| Custom provider endpoint | Advanced opt-in only: HTTPS URL validation plus a confirmation that the named host receives the key and prompt. It is never silently selected. |

## Components

### Static deployment

- Add a GitHub Actions workflow that installs dependencies, exports
  `frontend/out`, uploads it with `actions/upload-pages-artifact`, and deploys
  it with `actions/deploy-pages`.
- Configure Next's `basePath` only for the GitHub Pages build.
- Keep route handlers out of static output; do not make a request to a
  SyncHire `/api/*` route in a Pages-specific direct-BYOK flow.

### Secret session policy

- Provider runtime settings, image-provider settings, and GitHub token use
  `sessionStorage` in Pages mode. They are cleared by the browser when the
  tab/window closes. Browser session restoration, an opener-created tab,
  extensions, XSS, and a compromised device are explicitly outside this
  guarantee.
- In a normal web, desktop, or Android build, existing storage behavior is not
  changed by this feature.
- A common deployment-mode helper prevents inconsistent environment checks.
- Legacy credentials found in the Pages origin's `localStorage` are removed,
  never migrated. Pages mode has no remote logger.

### Workspace persistence, export, and deletion

- Non-secret job-search state remains browser-persistent by default. It is a
  convenience cache, not a backup, and may be cleared or evicted by the
  browser. The persistent Pages banner and Data page make this explicit.
- The versioned client-side workspace export includes declared non-secret app
  state: resumes, JDs, applications, role card/profile, browser-fill sessions,
  template selections/customisation, and onboarding metadata. Runtime
  providers, image providers, GitHub tokens, JWTs, OAuth tokens, and all other
  credential-shaped data are excluded by construction and test.
- Data Management offers **Export workspace**, **Clear session keys**, and
  **Clear local workspace**. The latter names the affected SyncHire keys and
  state, asks for confirmation, and never calls `localStorage.clear()` because
  project Pages can share an origin with other sites.

### Direct provider adapter

- Implement a browser-only typed adapter for OpenAI-compatible, Anthropic, and
  Gemini text requests. Provider protocol is an explicit capability field, not
  inferred only from a display name or base URL.
- Map each protocol to a native path, headers, body, response extraction,
  timeout and abort strategy: bearer auth for OpenAI-compatible, `x-api-key`
  plus `anthropic-version` for Anthropic, and a header-based Gemini key. A key
  is never sent in a query string.
- Reject Pages-mode non-HTTPS URLs, URL userinfo, query strings and fragments.
  A blocked/failed browser fetch reports a generic key-free "blocked or
  unreachable (possibly CORS)" message; it never falls back to SyncHire.
- Use the adapter in Pages mode for the interview-review flow. Existing server
  proxy use is retained outside Pages mode.
- Do not include key values in thrown errors, telemetry, exports, or UI.

### User-facing transparency

- Add a persistent Pages-mode notice: no SyncHire backend is running; the
  selected provider receives prompts, attachments, and the key for direct
  inference; browser data is local, not a backup; export important data.
- Before first inference, and again after a provider/base-URL change, require
  consent naming the destination hostname, model/protocol, and data categories
  leaving the browser. Inputs remain untouched if consent is declined.
- Add a Pages-mode storage reminder near data management without an unreliable
  "clear on exit" promise. A custom domain/subdomain is recommended when
  stronger origin separation is required.

### Brand and README

- Generate a project-bound, transparent logo asset with a human, restrained,
  career-navigation visual metaphor; no text, no watermark, no generic robot,
  sparkles, or gradient orb.
- Simplify the README header to License, CI, and `AI Provider: BYOK`; remove
  vanity and technology-stack badges. Add the logo as the product mark.

## Error handling and security

- CORS and unsupported-provider failures state that a direct browser request
  was blocked; no unsafe proxy fallback is attempted.
- All direct request URLs must be HTTPS except documented local development.
- Key inputs use `autocomplete="off"`, are masked after entry where possible,
  and have no logging path. Pages mode disables remote logging and redacts
  credential-shaped fields before console/error serialisation.
- Export filters exclude runtime provider keys, image keys, GitHub tokens,
  JWTs, and any future credentials.
- The app cannot guarantee secrecy against malicious browser extensions,
  compromised devices, XSS, another same-origin application, or the chosen
  provider. Documentation must state this boundary. The content-editable resume
  path receives a Pages-focused paste sanitisation/XSS regression test before
  credentials are enabled.
- Static exports do not receive the Next server headers. Pages includes a
  compatible static CSP meta policy and documents that a dynamic custom endpoint
  limits `connect-src` to a broad HTTPS allowance.

## Validation

1. `npm run build:pages` completes, emits base-path-correct assets, and its
   static artifact is smoke-tested at `/<repository>/`.
2. Unit tests cover Pages-mode session credentials, legacy key removal, clear
   scopes, export credential exclusion, direct OpenAI-compatible/Anthropic/
   Gemini request formation, HTTPS validation, consent denial, timeout and
   redacted errors.
3. A Pages browser/network test asserts supported paths make no same-origin
   `/api/*` request and unavailable controls show their explanation.
4. Existing lint, type-check, and relevant tests remain green.
5. The deployed workflow succeeds and the GitHub Pages source reads
   **GitHub Actions**.
6. A clean browser session shows no persisted provider key after closing and
   reopening the tab; non-secret local data follows the declared persistence
   policy.
