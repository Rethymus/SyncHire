/**
 * 求职进度 (Progress) page — functional coverage of the evidence-informed
 * feature introduced with docs/DESIGN_ETHICS.md.
 *
 * The page reads the lite store only (no backend), so the spec seeds
 * localStorage directly and runs identically in dev and production builds.
 * Assertions follow the design rules: controllable-process hero metric,
 * raw x/y rates (never 0%), recovery card dismiss that persists.
 */

import { test, expect, type Page } from '@playwright/test'

const now = Date.now()
const daysAgo = (n: number) => new Date(now - n * 86400000).toISOString()

/** One applied-this-week app, one rejected, one saved — minimal but covering. */
const SEED_APPLICATIONS = [
  {
    id: 'progress-spec-applied',
    companyName: '北极星实验室',
    position: '应届前端工程师',
    status: 'applied',
    jobId: 'jd-1',
    resumeId: 'resume-1',
    matchScore: 86,
    createdAt: daysAgo(2),
    updatedAt: daysAgo(1),
    appliedAt: daysAgo(1),
  },
  {
    id: 'progress-spec-rejected',
    companyName: '轨道工场',
    position: '初级平台 UI 工程师',
    status: 'rejected',
    jobId: 'jd-2',
    resumeId: 'resume-1',
    matchScore: 61,
    createdAt: daysAgo(9),
    updatedAt: daysAgo(8),
    appliedAt: daysAgo(9),
  },
  {
    id: 'progress-spec-saved',
    companyName: '青柠科技',
    position: 'Web 前端（React）',
    status: 'saved',
    jobId: 'jd-3',
    resumeId: 'resume-1',
    createdAt: daysAgo(0),
    updatedAt: daysAgo(0),
  },
]

async function seedProgressStore(page: Page) {
  await page.addInitScript((applications) => {
    // Idempotent: addInitScript reruns on every navigation (reload!), which
    // would otherwise wipe in-test mutations like a card dismissal.
    if (window.localStorage.getItem('synchire-progress-seeded')) return
    window.localStorage.setItem('synchire-progress-seeded', '1')
    window.localStorage.setItem('synchire-lite-locale', 'zh-CN')
    window.localStorage.setItem(
      'synchire-storage',
      JSON.stringify({
        version: 1,
        state: {
          applications,
          onboarding: { isOnboarded: true, skipped: false },
        },
      }),
    )
  }, SEED_APPLICATIONS)
}

test.describe('progress page', () => {
  test('renders the weekly hero, neutral rates, and recovery card from store data', async ({ page }) => {
    await seedProgressStore(page)
    const consoleErrors: string[] = []
    page.on('pageerror', (error) => consoleErrors.push(error.message))

    await page.goto('/progress', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1500)

    // Hero metric: applied + created this week (2 actions), never an outcome.
    await expect(page.getByRole('heading', { name: '本周行动' })).toBeVisible()
    const heroCard = page.locator('main section, main div').filter({ hasText: '本周行动' }).first()
    await expect(heroCard).toBeVisible()

    // Neutral rates render as raw counts with a denominator (not 0%).
    await expect(page.getByText(/面试转化/)).toContainText('/')
    await expect(page.getByText(/有回应/)).toContainText('/')

    // The rejected application opens a recovery card, with the autonomy-
    // supportive choice set (暂停休息 included; no shaming copy).
    const recovery = page.locator('section').filter({ hasText: '刚结束的几条申请' })
    await expect(recovery).toBeVisible()
    await expect(recovery.getByText('暂停休息')).toBeVisible()
    await expect(recovery.getByText('已拒绝')).toBeVisible()

    expect(consoleErrors).toEqual([])
  })

  test('dismissal of a recovery card persists across reloads', async ({ page }) => {
    await seedProgressStore(page)
    await page.goto('/progress', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1500)

    const recovery = page.locator('section').filter({ hasText: '刚结束的几条申请' })
    await expect(recovery).toBeVisible()

    // Collapse the first card (aria-labelled dismiss button).
    await page.getByRole('button', { name: /收起/ }).first().click()
    await expect(recovery.getByText('轨道工场')).toBeHidden()

    // Reload — the dismissal is persisted in the store slice.
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1500)
    await expect(recovery.getByText('轨道工场')).toBeHidden()
  })

  test('empty store shows the concrete-start empty state, no guilt copy', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('synchire-lite-locale', 'zh-CN')
      window.localStorage.setItem(
        'synchire-storage',
        JSON.stringify({
          version: 1,
          state: { applications: [], onboarding: { isOnboarded: true, skipped: false } },
        }),
      )
    })
    await page.goto('/progress', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1200)

    await expect(page.getByText('还没有申请记录')).toBeVisible()
    await expect(page.getByText('去创建申请')).toBeVisible()
    // Data-honesty rules forbid shaming copy.
    const body = await page.locator('main').innerText()
    expect(body).not.toContain('落后')
    expect(body).not.toContain('拖延')
  })
})
