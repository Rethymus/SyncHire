/**
 * Smoke tests: every public route renders, keeps the global navigation,
 * and produces no unexpected console/page errors.
 *
 * Known dev-mode noise that is filtered (documented in
 * docs/UX_AUDIT_2026-08-16.md):
 *  - React 19.2 "Encountered a script tag" from next-themes' bootstrap
 *    script under Turbopack dev (production builds are clean)
 *  - "Hydration failed" recovery messages observed on dev fast-refresh
 *  - Network-layer failures to the API host when the lite backend is not
 *    running next to the dev server (pages degrade to empty states)
 */

import { test, expect, Page } from '@playwright/test'

const ROUTES = [
  '/dashboard',
  '/progress',
  '/transparency',
  '/upload',
  '/jd-input',
  '/applications',
  '/job-feed',
  '/job-sources',
  '/company-board',
  '/profile',
  '/analytics',
  '/interviews',
  '/interviews/new',
  '/search',
  '/saved-searches',
  '/data',
  '/settings',
  '/resume-builder',
]

const KNOWN_NOISE = [
  /Encountered a script tag/i,
  /Hydration failed/i,
  /server rendered text didn't match the client/i,
  /Failed to fetch/i,
  /net::ERR_/i,
  /API Request Failed/i,
]

function isKnownNoise(text: string): boolean {
  return KNOWN_NOISE.some((re) => re.test(text))
}

function attachErrorCollector(page: Page): string[] {
  const errors: string[] = []
  page.on('pageerror', (err) => {
    if (!isKnownNoise(err.message)) errors.push(`pageerror: ${err.message}`)
  })
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !isKnownNoise(msg.text())) {
      errors.push(`console: ${msg.text()}`)
    }
  })
  return errors
}

for (const route of ROUTES) {
  test(`smoke ${route}`, async ({ page }) => {
    const errors = attachErrorCollector(page)

    const response = await page.goto(route, {
      waitUntil: 'domcontentloaded',
    })
    expect(response?.status(), `HTTP status for ${route}`).toBeLessThan(400)

    await expect(
      page.getByRole('navigation').first(),
      'global navigation stays mounted'
    ).toBeVisible({ timeout: 10_000 })

    expect(errors, `unexpected console errors on ${route}`).toEqual([])
  })
}

test('saved-searches is reachable from the search page', async ({ page }) => {
  await page.goto('/search', { waitUntil: 'domcontentloaded' })
  const link = page.getByRole('link', { name: /保存的搜索|Saved Searches/ })
  await expect(link).toBeVisible()
  await link.click()
  await page.waitForURL('**/saved-searches**')
})
