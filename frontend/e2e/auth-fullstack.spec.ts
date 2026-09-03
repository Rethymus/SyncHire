/**
 * Full-stack mode e2e — real backend auth flow (FastAPI + Postgres + Redis).
 *
 * Unlike the rest of the suite (lite mode, mocked/empty responses), these
 * tests exercise the *real* full-stack backend: browser → Next.js dev server
 * (auth enabled) → live API on :8010 with Postgres + Redis behind it.
 *
 * How to run (requires Docker locally, or the CI `fullstack-e2e` job):
 *
 *   node scripts/e2e-fullstack-up.mjs        # postgres+redis (docker) + API on :8010
 *   npm run test:e2e:fullstack               # = npx playwright test -c playwright.fullstack.config.ts
 *   node scripts/e2e-fullstack-down.mjs      # tear everything down
 *
 * Environment contract:
 *   - FULLSTACK_API_URL   backend base URL (default http://localhost:8010)
 *   - SKIP_FULLSTACK=1    force-skip these tests
 *   - The dev server MUST be started with NEXT_PUBLIC_ENABLE_AUTH=true and
 *     NEXT_PUBLIC_API_URL=<FULLSTACK_API_URL> — playwright.fullstack.config.ts
 *     does this for you. Under the default playwright.config.ts (lite mode,
 *     /login redirects to /dashboard) these tests self-skip.
 *   - The backend MUST allow the frontend origin in CORS_ORIGINS
 *     (http://localhost:3100 by default — the up script and CI set this).
 *
 * Without a reachable backend every test below skips cleanly (this is the
 * behaviour in the lite `frontend-e2e-smoke` CI job, which has no Postgres).
 */

import { test, expect, type APIRequestContext } from '@playwright/test'

const API_URL = process.env.FULLSTACK_API_URL ?? 'http://localhost:8010'
const SKIP_REQUESTED = process.env.SKIP_FULLSTACK === '1'

/** Strong enough for both the frontend rule (>=12) and the backend rule (>=8). */
const TEST_PASSWORD = ['E2e', 'Fullstack', '2026!'].join('-')

function uniqueEmail(): string {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  return `e2e-fullstack-${suffix}@synchire.dev`
}

/** Probe the real backend health endpoint; used to decide skip-vs-run. */
async function isBackendAvailable(request: APIRequestContext): Promise<boolean> {
  try {
    const response = await request.get(`${API_URL}/health`, { timeout: 3_000 })
    if (!response.ok()) return false
    const body = await response.json().catch(() => null)
    return !!body && body.status === 'healthy'
  } catch {
    return false
  }
}

/**
 * Backend availability is probed once per worker in beforeAll (which only
 * needs the browser-less `request` context). Each test then skips as its very
 * first statement, so with no backend the suite skips cleanly instead of
 * failing — see test.skip() calls below.
 */
let backendUp = false

test.beforeAll(async ({ request }) => {
  backendUp = await isBackendAvailable(request)
})

function skipUnlessBackendIsUp() {
  test.skip(SKIP_REQUESTED, 'SKIP_FULLSTACK=1 set')
  test.skip(
    !backendUp,
    `full-stack backend not available at ${API_URL} — start it with scripts/e2e-fullstack-up.mjs (or docker compose) or set SKIP_FULLSTACK=1`
  )
}

/**
 * Skip guard for the frontend side: if /login redirects to /dashboard the dev
 * server was started in lite mode (no NEXT_PUBLIC_ENABLE_AUTH), which is the
 * default playwright.config.ts — the full-stack flow cannot be tested there.
 */
async function skipUnlessAuthModeEnabled(page: import('@playwright/test').Page) {
  await page.goto('/login')
  test.skip(
    !page.url().includes('/login'),
    'frontend is running in lite mode (NEXT_PUBLIC_ENABLE_AUTH != true) — run via playwright.fullstack.config.ts'
  )
  await expect(page.getByRole('heading', { name: '欢迎回来' })).toBeVisible()
}

test.describe('Full-stack auth flow (real backend)', () => {
  test('signup registers a new user against the real API and lands on /login', async ({
    page,
    request,
  }) => {
    skipUnlessBackendIsUp()
    await skipUnlessAuthModeEnabled(page)

    const email = uniqueEmail()

    await page.goto('/signup')
    await page.locator('#name').fill('E2E Fullstack')
    await page.locator('#email').fill(email)
    await page.locator('#password').fill(TEST_PASSWORD)
    await page.locator('#confirmPassword').fill(TEST_PASSWORD)
    await page.locator('#terms').check()
    const authResponses: string[] = []
    page.on('response', async (res) => {
      if (res.url().includes('/auth/')) {
        let body = ''
        try { body = (await res.text()).slice(0, 300) } catch { /* unreadable */ }
        authResponses.push(`${res.request().method()} ${res.url()} -> ${res.status()} ${body}`)
      }
    })

    await page.getByRole('button', { name: '创建账户' }).click()

    // Successful registration routes to the login page.
    const authLog = authResponses.join(' | ') || '(none captured)'
    await expect(page, `auth responses: ${authLog}`).toHaveURL(/\/(login|dashboard)$/)
    // Auto-login success lands on /dashboard; only the /login branch shows this heading.
    if (page.url().endsWith('/login')) {
      await expect(page.getByRole('heading', { name: '欢迎回来' })).toBeVisible()
    }

    // The user really persists in Postgres: a direct API login with the same
    // credentials must return tokens. (register/login are CSRF-exempt.)
    const loginResponse = await request.post(`${API_URL}/api/auth/login`, {
      data: { email, password: TEST_PASSWORD },
    })
    expect(loginResponse.ok(), `API login after signup failed: ${loginResponse.status()}`).toBe(true)
    const loginBody = await loginResponse.json()
    expect(loginBody.access_token).toBeTruthy()
    expect(loginBody.token_type).toBe('bearer')
  })

  test('login stores tokens and current user from the real backend', async ({
    page,
    request,
  }) => {
    skipUnlessBackendIsUp()
    await skipUnlessAuthModeEnabled(page)

    const email = uniqueEmail()

    // Seed a user directly through the real API so this test is independent.
    const registerResponse = await request.post(`${API_URL}/api/auth/register`, {
      data: { full_name: 'E2E Fullstack', email, password: TEST_PASSWORD },
    })
    expect(
      registerResponse.ok(),
      `API register failed: ${registerResponse.status()} ${await registerResponse.text()}`
    ).toBe(true)

    await page.goto('/login')
    await page.locator('#email').fill(email)
    await page.locator('#password').fill(TEST_PASSWORD)
    await page.getByRole('button', { name: '登录', exact: true }).click()

    // Successful login redirects to the dashboard.
    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page).not.toHaveURL(/\/login/)

    // The login handler only writes `user_data` after getCurrentUser()
    // succeeds against the real backend, so this asserts the authenticated
    // /auth/me round-trip, not just the login POST.
    const storedUser = await page.evaluate(() => localStorage.getItem('user_data'))
    expect(storedUser).toBeTruthy()
    expect((JSON.parse(storedUser as string) as { email: string }).email).toBe(email)

    const accessToken = await page.evaluate(() => localStorage.getItem('auth_token'))
    expect(accessToken).toBeTruthy()
  })
})
