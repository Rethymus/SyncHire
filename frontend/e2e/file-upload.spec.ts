/**
 * E2E tests for the current local-first resume and job-description flows.
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
    await expect(page.getByRole('heading', { name: '简历编辑器' })).toBeVisible()
    await expect(page.getByText('- resume.txt')).toBeVisible()
    await expect(page.getByRole('textbox', { name: '简历内容编辑' })).toContainText(
      'React TypeScript Playwright'
    )

    await page.goto('/dashboard')
    await expect(page.getByRole('link', { name: /Resumes\s+1/i })).toBeVisible()

    await page.reload()
    await expect(page.getByRole('link', { name: /Resumes\s+1/i })).toBeVisible()
  })

  test('rejects unsupported file types', async ({ page }) => {
    await page.goto('/upload')

    await page.locator('input[type="file"]').setInputFiles({
      name: 'malicious.exe',
      mimeType: 'application/x-msdownload',
      buffer: Buffer.from('not a resume'),
    })

    await expect(page.getByText(/不支持的文件格式/)).toBeVisible()
    await expect(page).toHaveURL(/\/upload$/)
  })

  test('rejects files larger than 10MB', async ({ page }) => {
    await page.goto('/upload')

    await page.locator('input[type="file"]').setInputFiles({
      name: 'large-resume.txt',
      mimeType: 'text/plain',
      buffer: Buffer.alloc(10 * 1024 * 1024 + 1, 'a'),
    })

    await expect(page.getByText(/文件大小超过 10MB 限制/)).toBeVisible()
    await expect(page).toHaveURL(/\/upload$/)
  })
})

test.describe('Lite job description flow', () => {
  test.beforeEach(async ({ page }) => {
    await mockLiteApi(page)
  })

  test('creates a job description from manual input', async ({ page }) => {
    await page.goto('/jd-input')

    await page.getByLabel(/职位名称/).fill('高级前端工程师')
    await page.getByLabel(/公司名称/).fill('SyncHire')
    await page.getByLabel(/职位描述/).fill('负责构建稳定的招聘工作流和前端体验。')
    await page.getByRole('button', { name: /继续下一步/ }).click()

    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 5000 })
    await expect(page.getByRole('heading', { name: /Welcome to SyncHire Lite/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /Job Descriptions\s+1/i })).toBeVisible()

    await page.reload()
    await expect(page.getByRole('link', { name: /Job Descriptions\s+1/i })).toBeVisible()
  })

  test('keeps the job URL and explains when automatic import is unavailable', async ({ page }) => {
    await page.goto('/jd-input')

    const jobUrl = 'https://jobs.example.com/frontend-engineer-123'
    const urlInput = page.getByPlaceholder('https://www.example.com/job/123456')

    await urlInput.fill(jobUrl)
    await page.getByRole('button', { name: '导入' }).click()

    await expect(page.getByText(/暂不支持自动导入该链接/)).toBeVisible()
    await expect(urlInput).toHaveValue(jobUrl)
    await expect(page.getByLabel(/职位名称/)).toHaveValue('')
    await expect(page.getByLabel(/公司名称/)).toHaveValue('')
    await expect(page.getByLabel(/职位描述/)).toHaveValue('')
  })

  test('creates an application locally from an uploaded resume and saved job description', async ({ page }) => {
    await page.goto('/upload')

    await page.locator('input[type="file"]').setInputFiles({
      name: 'resume.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('Product Frontend Engineer\nReact TypeScript UX'),
    })
    await expect(page).toHaveURL(/\/editor$/, { timeout: 5000 })

    await page.goto('/jd-input')
    await page.getByLabel(/职位名称/).fill('产品前端工程师')
    await page.getByLabel(/公司名称/).fill('SyncHire')
    await page.getByLabel(/职位描述/).fill('负责端到端招聘产品体验、React 页面和数据流。')
    await page.getByRole('button', { name: /继续下一步/ }).click()

    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 5000 })
    await page.getByRole('button', { name: /New Application/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible()

    await page.getByRole('combobox').nth(0).click()
    await page.getByRole('option', { name: 'resume.txt' }).click()
    await page.getByRole('combobox').nth(1).click()
    await page.getByRole('option', { name: /产品前端工程师 - SyncHire/ }).click()
    await page.getByRole('button', { name: '继续' }).click()
    await expect(page.getByText('产品前端工程师')).toBeVisible()

    await page.getByRole('button', { name: /创建申请/ }).click()
    await expect(page.getByRole('dialog')).toBeHidden({ timeout: 5000 })
    await expect(page.getByRole('link', { name: /Applications\s+1/i })).toBeVisible()
    await expect(page.getByText('产品前端工程师', { exact: true })).toBeVisible()
    await expect(page.getByText(/SyncHire\s+•\s+resume\.txt/)).toBeVisible()

    await page.reload()
    await expect(page.getByRole('link', { name: /Applications\s+1/i })).toBeVisible()
    await expect(page.getByText('产品前端工程师', { exact: true })).toBeVisible()
  })
})
