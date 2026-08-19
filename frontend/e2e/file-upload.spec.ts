/**
 * E2E tests for the current local-first resume and job-description flows.
 *
 * The default UI locale depends on the browser (zh-CN or en-US), so text
 * assertions use bilingual regexes (zh | en) unless the string under test is
 * locale-independent user data.
 */

import { test, expect } from '@playwright/test'
import { mockLiteApi } from './helpers'

test.describe('Lite resume upload flow', () => {
  test('accepts a text resume and opens the editor', async ({ page }) => {
    await page.goto('/upload')

    await page.locator('input[type="file"]').setInputFiles({
      name: 'resume.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('Frontend Engineer\nReact TypeScript Playwright'),
    })

    await expect(page).toHaveURL(/\/editor$/, { timeout: 5000 })
    await expect(page.getByRole('heading', { name: /简历编辑器|Resume Editor/ })).toBeVisible()
    await expect(page.getByText('- resume.txt')).toBeVisible()
    await expect(page.getByRole('textbox', { name: /简历内容编辑|Resume content editor/ })).toContainText(
      'React TypeScript Playwright'
    )

    // The app persists to localStorage through an async platform-storage
    // layer; wait until the write has landed before a full page navigation,
    // otherwise the navigation can cancel a pending write and the next page
    // rehydrates without the uploaded resume.
    await expect
      .poll(async () =>
        page.evaluate(() => {
          const raw = window.localStorage.getItem('synchire-storage')
          return raw ? (JSON.parse(raw).state?.resumes?.length ?? 0) : 0
        })
      )
      .toBeGreaterThan(0)

    await page.goto('/dashboard')
    await expect(page.getByRole('link', { name: /简历\s+1|Resumes\s+1/ })).toBeVisible()

    await page.reload()
    await expect(page.getByRole('link', { name: /简历\s+1|Resumes\s+1/ })).toBeVisible()
  })

  test('rejects unsupported file types', async ({ page }) => {
    await page.goto('/upload')

    await page.locator('input[type="file"]').setInputFiles({
      name: 'malicious.exe',
      mimeType: 'application/x-msdownload',
      buffer: Buffer.from('not a resume'),
    })

    await expect(page.getByText(/不支持的文件格式|Unsupported file format/)).toBeVisible()
    await expect(page).toHaveURL(/\/upload$/)
  })

  test('rejects files larger than 10MB', async ({ page }) => {
    await page.goto('/upload')

    await page.locator('input[type="file"]').setInputFiles({
      name: 'large-resume.txt',
      mimeType: 'text/plain',
      buffer: Buffer.alloc(10 * 1024 * 1024 + 1, 'a'),
    })

    await expect(page.getByText(/文件大小超过 10MB 限制|File size exceeds the 10MB limit/)).toBeVisible()
    await expect(page).toHaveURL(/\/upload$/)
  })
})

test.describe('Lite job description flow', () => {
  test.beforeEach(async ({ page }) => {
    await mockLiteApi(page)
  })

  test('creates a job description from manual input', async ({ page }) => {
    await page.goto('/jd-input')

    await page.getByLabel(/职位名称|Job Title/).fill('高级前端工程师')
    await page.getByLabel(/公司名称|Company/).fill('SyncHire')
    await page.getByLabel(/职位描述|Job Description/).fill('负责构建稳定的招聘工作流和前端体验。')
    await page.getByRole('button', { name: /继续下一步|Continue/ }).click()

    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 5000 })
    await expect(page.getByRole('heading', { name: /欢迎使用 SyncHire Lite|Welcome to SyncHire Lite/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /职位描述\s+1|Job Descriptions\s+1/ })).toBeVisible()

    await page.reload()
    await expect(page.getByRole('link', { name: /职位描述\s+1|Job Descriptions\s+1/ })).toBeVisible()
  })

  test('keeps the job URL and explains when the import endpoint fails', async ({ page }) => {
    await page.goto('/jd-input')

    // Registered after mockLiteApi, so this handler wins for the import endpoint.
    await page.route('**/api/jds/import', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: '{"detail": "automatic import unavailable"}',
      })
    )

    const jobUrl = 'https://jobs.example.com/frontend-engineer-123'
    const urlInput = page.getByPlaceholder('https://www.example.com/job/123456')

    await urlInput.fill(jobUrl)
    await page.getByRole('button', { name: /导入|Import/ }).click()

    await expect(page.getByText(/导入失败|Import failed/)).toBeVisible()
    await expect(urlInput).toHaveValue(jobUrl)
    await expect(page).toHaveURL(/\/jd-input$/)
    await expect(page.getByLabel(/职位名称|Job Title/)).toHaveValue('')
    await expect(page.getByLabel(/公司名称|Company/)).toHaveValue('')
    await expect(page.getByLabel(/职位描述|Job Description/)).toHaveValue('')
  })

  test('creates an application locally from an uploaded resume and saved job description', async ({ page }) => {
    await page.goto('/upload')

    await page.locator('input[type="file"]').setInputFiles({
      name: 'resume.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('Product Frontend Engineer\nReact TypeScript UX'),
    })
    await expect(page).toHaveURL(/\/editor$/, { timeout: 5000 })

    // Same async-persistence guard as above: make sure the uploaded resume
    // reached localStorage before navigating to the JD form.
    await expect
      .poll(async () =>
        page.evaluate(() => {
          const raw = window.localStorage.getItem('synchire-storage')
          return raw ? (JSON.parse(raw).state?.resumes?.length ?? 0) : 0
        })
      )
      .toBeGreaterThan(0)

    await page.goto('/jd-input')
    await page.getByLabel(/职位名称|Job Title/).fill('产品前端工程师')
    await page.getByLabel(/公司名称|Company/).fill('SyncHire')
    await page.getByLabel(/职位描述|Job Description/).fill('负责端到端招聘产品体验、React 页面和数据流。')
    await page.getByRole('button', { name: /继续下一步|Continue/ }).click()

    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 5000 })
    await page.getByRole('button', { name: /新建申请|New Application/ }).click()
    await expect(page.getByRole('dialog')).toBeVisible()

    await page.getByRole('combobox').nth(0).click()
    await page.getByRole('option', { name: 'resume.txt' }).click()
    await page.getByRole('combobox').nth(1).click()
    await page.getByRole('option', { name: /产品前端工程师 - SyncHire/ }).click()
    await page.getByRole('button', { name: /^继续$|^Continue$/ }).click()
    await expect(page.getByText('产品前端工程师')).toBeVisible()

    await page.getByRole('button', { name: /创建申请|Create Application/ }).click()
    await expect(page.getByRole('dialog')).toBeHidden({ timeout: 5000 })
    await expect(page.getByRole('link', { name: /申请\s+1|Applications\s+1/ })).toBeVisible()
    await expect(page.getByText('产品前端工程师', { exact: true })).toBeVisible()
    await expect(page.getByText(/SyncHire\s+•\s+resume\.txt/)).toBeVisible()

    await page.reload()
    await expect(page.getByRole('link', { name: /申请\s+1|Applications\s+1/ })).toBeVisible()
    await expect(page.getByText('产品前端工程师', { exact: true })).toBeVisible()
  })
})
