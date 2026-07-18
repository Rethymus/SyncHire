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
   creates a local job-search workspace, uses supported direct-BYOK features,
   and can export their data. SyncHire infrastructure receives no key or
   application data.
2. **Privacy-sensitive visitor** uses the site in a browser session. Their
   provider key is retained only in `sessionStorage` and is cleared when the
   tab/window closes.
3. **Returning visitor** can keep non-secret job-search data in their browser,
   but sees an explicit local-storage and export reminder. Export bundles never
   include keys or tokens.
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

`NEXT_PUBLIC_DEPLOYMENT_TARGET=github-pages` activates Pages behavior.
`NEXT_PUBLIC_BASE_PATH=/SyncHire` makes a project Pages deployment resolve
routes and assets correctly. Other development, Docker, desktop, and Android
builds retain their existing behavior.

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
  tab/window closes.
- In a normal web, desktop, or Android build, existing storage behavior is not
  changed by this feature.
- A common deployment-mode helper prevents inconsistent environment checks.

### Direct provider adapter

- Implement a browser-only typed adapter for OpenAI-compatible, Anthropic, and
  Gemini text requests.
- Map the configured provider to its native request path/authentication shape;
  fail with a safe, actionable CORS/provider message.
- Use the adapter in Pages mode for the interview-review flow. Existing server
  proxy use is retained outside Pages mode.
- Do not include key values in thrown errors, telemetry, exports, or UI.

### User-facing transparency

- Add a Pages-mode notice: no SyncHire backend is running; the provider
  receives prompts and the key for direct inference; browser data is local,
  not a backup; export important data.
- Add a Pages-mode storage reminder near data management without an unreliable
  "clear on exit" promise.

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
  and have no logging path.
- Export filters exclude runtime provider keys, image keys, GitHub tokens,
  JWTs, and any future credentials.
- The app cannot guarantee secrecy against malicious browser extensions,
  compromised devices, XSS, or the chosen provider. Documentation must state
  this boundary.

## Validation

1. Static `npm run build:static` completes and produces a Pages artifact.
2. Unit tests cover Pages-mode session storage and direct-provider request
   formation without exposing a key.
3. Existing lint, type-check, and relevant tests remain green.
4. The deployed workflow succeeds and the GitHub Pages source reads
   **GitHub Actions**.
5. A clean browser session shows no persisted provider key after closing and
   reopening the tab; non-secret local data follows the declared persistence
   policy.
