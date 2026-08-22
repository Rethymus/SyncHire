/**
 * Playwright config for FULL-STACK mode e2e (real FastAPI + Postgres + Redis).
 *
 * Differences from the default playwright.config.ts (lite mode):
 *  - Only runs e2e/auth-fullstack.spec.ts.
 *  - Dev server on :3100 (never touches the shared :3000) and is started with
 *    NEXT_PUBLIC_ENABLE_AUTH=true so /login and /signup render instead of
 *    redirecting to /dashboard, plus NEXT_PUBLIC_API_URL pointing at the real
 *    backend (default http://localhost:8010, also never the shared :8000).
 *
 * Start the backend first (requires Docker):
 *   node scripts/e2e-fullstack-up.mjs
 * Then:
 *   npm run test:e2e:fullstack        (in frontend/)
 *   node scripts/e2e-fullstack-down.mjs
 *
 * Without a backend the spec skips cleanly, so this config is safe to run
 * anywhere — CI runs it in the `fullstack-e2e` job.
 */

import { defineConfig, devices } from '@playwright/test'

const port = process.env.FULLSTACK_FRONTEND_PORT ?? '3100'
const baseURL = `http://localhost:${port}`
const apiUrl = process.env.FULLSTACK_API_URL ?? 'http://localhost:8010'

export default defineConfig({
  testDir: './e2e',
  testMatch: /auth-fullstack\.spec\.ts/,
  // Keep artifacts isolated from the lite suite (which may run concurrently).
  outputDir: 'test-results/fullstack',
  // Real backend + first dev-server compilation of the auth pages — allow
  // more headroom than the lite suite.
  timeout: 90 * 1000,
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ['html', { outputFolder: 'playwright-report/fullstack' }],
    ['json', { outputFile: 'playwright-report/fullstack-results.json' }],
    ['junit', { outputFile: 'playwright-report/fullstack-results.xml' }],
  ],

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    // NEXT_PUBLIC_* vars are inlined when the dev server compiles, so they
    // must be set on the server process itself.
    env: {
      ...process.env,
      PORT: port,
      NEXT_PUBLIC_ENABLE_AUTH: 'true',
      NEXT_PUBLIC_API_URL: apiUrl,
    },
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180 * 1000,
  },
})
