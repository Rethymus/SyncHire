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

export function collectConsoleErrors(page: Page) {
  const errors: string[] = []

  page.on('console', message => {
    if (message.type() === 'error') {
      errors.push(message.text())
    }
  })

  return errors
}
