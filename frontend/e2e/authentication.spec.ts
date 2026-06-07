/**
 * E2E coverage for the default SyncHire Lite routing contract.
 *
 * Auth pages still exist for auth-enabled deployments, but the default local
 * app runs without authentication and redirects auth-only routes to dashboard.
 */

import { test, expect } from '@playwright/test'
import { collectConsoleErrors, mockLiteApi } from './helpers'

test.describe('Lite mode routing', () => {
  test.beforeEach(async ({ page }) => {
    await mockLiteApi(page)
  })

  test('redirects auth-only routes to the local dashboard', async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page)

    for (const path of ['/login', '/signup', '/forgot-password', '/reset-password']) {
      await page.goto(path)
      await expect(page).toHaveURL(/\/dashboard$/)
      await expect(page.getByRole('heading', { name: /Welcome to SyncHire Lite/i })).toBeVisible()
    }

    expect(consoleErrors).toEqual([])
  })

  test('redirects the root route to dashboard', async ({ page }) => {
    await page.goto('/')

    await expect(page).toHaveURL(/\/dashboard$/)
    await expect(page.getByRole('heading', { name: /Welcome to SyncHire Lite/i })).toBeVisible()
  })

  test('renders dashboard stats without requiring authentication', async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page)

    await page.goto('/dashboard')

    await expect(page.getByRole('heading', { name: /Welcome to SyncHire Lite/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /Resumes\s+0/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /Job Descriptions\s+0/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /Applications\s+0/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /Interviews\s+0/i })).toBeVisible()
    expect(consoleErrors).toEqual([])
  })

  test('dashboard onboarding links open live workflows', async ({ page }) => {
    await page.goto('/dashboard')

    await page.getByRole('link', { name: /Resumes\s+0/i }).click()
    await expect(page).toHaveURL(/\/upload$/)
    await expect(page.getByRole('heading', { name: '上传您的简历' })).toBeVisible()

    await page.goto('/dashboard')
    await page.getByRole('link', { name: /Job Descriptions\s+0/i }).click()
    await expect(page).toHaveURL(/\/jd-input$/)
    await expect(page.getByRole('heading', { name: '输入职位描述' })).toBeVisible()

    await page.goto('/resumes')
    await expect(page).toHaveURL(/\/upload$/)

    await page.goto('/job-descriptions')
    await expect(page).toHaveURL(/\/jd-input$/)
  })

  test('new application button opens the create flow', async ({ page }) => {
    await page.goto('/dashboard')

    await page.getByRole('button', { name: /New Application/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('heading', { name: '创建职位申请' })).toBeVisible()
  })
})

test.describe('Lite mode offline fallback', () => {
  test('dashboard renders without backend console errors', async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page)

    await page.goto('/dashboard')
    await expect(page.getByRole('heading', { name: /Welcome to SyncHire Lite/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /Resumes\s+0/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /Job Descriptions\s+0/i })).toBeVisible()

    expect(consoleErrors).toEqual([])
  })
})
