import type { Page } from '@playwright/test'

const emptyListEndpoints = new Set([
  '/api/resumes',
  '/api/jds',
  '/api/applications',
])

export async function mockLiteApi(page: Page) {
  await page.context().route('**/*', async route => {
    const request = route.request()
    const url = new URL(request.url())

    if (!url.pathname.startsWith('/api/')) {
      await route.fallback()
      return
    }

    if (request.method() === 'GET' && emptyListEndpoints.has(url.pathname)) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '[]',
      })
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '{}',
    })
  })
}

/**
 * Known dev-mode noise that is filtered (documented in
 * docs/UX_AUDIT_2026-08-16.md) — mirrors the list in smoke.spec.ts:
 *  - React 19.2 "Encountered a script tag" from next-themes' bootstrap
 *    script under Turbopack dev (production builds are clean)
 *  - "Hydration failed" recovery messages observed on dev fast-refresh
 *  - Network-layer failures to the API host when the lite backend is not
 *    running next to the dev server (pages degrade to empty states)
 */
export const KNOWN_NOISE = [
  /Encountered a script tag/i,
  /Hydration failed/i,
  /server rendered text didn't match the client/i,
  /Failed to fetch/i,
  /net::ERR_/i,
  /API Request Failed/i,
]

export function isKnownNoise(text: string): boolean {
  return KNOWN_NOISE.some((re) => re.test(text))
}

export function collectConsoleErrors(page: Page) {
  const errors: string[] = []

  page.on('console', message => {
    if (message.type() === 'error' && !isKnownNoise(message.text())) {
      errors.push(message.text())
    }
  })

  page.on('pageerror', (error) => {
    if (!isKnownNoise(error.message)) {
      errors.push(`pageerror: ${error.message}`)
    }
  })

  return errors
}

export function collectConsoleSignals(page: Page) {
  const signals: string[] = []

  page.on('console', message => {
    if ((message.type() === 'error' || message.type() === 'warning') && !isKnownNoise(message.text())) {
      signals.push(`${message.type()}: ${message.text()}`)
    }
  })

  page.on('pageerror', (error) => {
    if (!isKnownNoise(error.message)) {
      signals.push(`pageerror: ${error.message}`)
    }
  })

  return signals
}
