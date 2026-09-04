/**
 * Resume print-document quality — the "last inch" of the core workflow.
 *
 * printResumeToPdf opens a standalone A4 document and hands it to the
 * browser print dialog; that document IS the user's deliverable, yet
 * nothing tested it. This spec captures the exact HTML the export click
 * produces (window.open is stubbed headless-safe) and asserts the
 * qualities a resume PDF must keep:
 *
 * - the A4 page shell exists and the content fits ONE page
 * - `icon:` markers render as masked icons (not literal text, not dropped)
 * - contact links stay unbroken (a wrapped email address is a broken resume)
 */

import { test, expect, type Page } from '@playwright/test'

const RESUME_MARKDOWN = [
  '# 陈宇',
  '前端工程师 · 上海',
  '',
  '::: left',
  'icon:info 男 / 24 岁',
  'icon:school 华东理工大学 / 计算机科学与技术 / 本科',
  ':::',
  '',
  '::: right',
  'icon:email chenyu@example.com',
  'icon:phone 138-0000-0000',
  'icon:blog github.com/chenyu',
  ':::',
  '',
  '## 个人优势',
  '- 5 年前端开发经验，擅长 React、TypeScript 与工程化体系',
  '',
  '## 工作经历',
  '### 北极星实验室 · 高级前端工程师',
  '2022.07 - 至今',
  '',
  '- 负责创作者后台重构，将首屏加载时间从 3.2s 优化到 1.1s',
  '',
  '## 教育背景',
  '### 华东理工大学 · 计算机科学与技术 · 本科',
  '2018.09 - 2022.06',
].join('\n')

async function capturePrintDocument(page: Page): Promise<string> {
  await page.getByRole('button', { name: '导出' }).click()
  await page.getByRole('menuitem', { name: '导出 PDF' }).click()
  await page.waitForTimeout(1000)
  const html = await page.evaluate(() =>
    (window as unknown as { __printDoc: string | null }).__printDoc,
  )
  expect(html, 'the export click must produce the print document').toBeTruthy()
  return html as string
}

test.describe('resume print document', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((resume) => {
      window.localStorage.setItem('theme', 'light')
      window.localStorage.setItem('synchire-lite-locale', 'zh-CN')
      window.localStorage.setItem(
        'synchire-storage',
        JSON.stringify({
          version: 1,
          state: {
            resumes: [
              {
                id: 'print-spec-resume',
                name: '陈宇-前端工程师简历',
                content: resume,
                uploadedAt: '2026-09-01T10:00:00',
              },
            ],
            jobDescriptions: [],
            candidateProfile: {
              fullName: '陈宇',
              skills: [],
              projects: [],
              updatedAt: '2026-09-01T10:00:00',
            },
            applications: [],
            currentResume: null,
            onboarding: { isOnboarded: true, skipped: false },
          },
        }),
      )
      // Headless popups are blocked; capture what the print window would
      // receive instead of actually opening it.
      window.open = function () {
        return {
          document: {
            open() {},
            write(html: string) {
              ;(window as unknown as { __printDoc: string | null }).__printDoc = html
            },
            close() {},
          },
          focus() {},
          print() {},
          close() {},
        }
      } as unknown as typeof window.open
    }, RESUME_MARKDOWN)

    await page.goto('/resume-builder?resumeId=print-spec-resume', {
      waitUntil: 'domcontentloaded',
    })
    await page.waitForTimeout(2000)
  })

  test('exports a single A4 page with icons and unbroken contact links', async ({ page }) => {
    const html = await capturePrintDocument(page)

    // The A4 shell and its size.
    const docPage = await page.context().newPage()
    await docPage.setContent(html, { waitUntil: 'domcontentloaded' })
    await docPage.emulateMedia({ media: 'print' })
    await docPage.waitForTimeout(600)

    const metrics = await docPage.evaluate(() => {
      const shell = document.querySelector('.synchire-resume-page')
      if (!shell) return null
      const icons = Array.from(shell.querySelectorAll('.ri'))
      const email = shell.querySelector('a[href^="mailto:"]')
      return {
        widthPx: shell.getBoundingClientRect().width,
        heightPx: shell.scrollHeight,
        iconCount: icons.length,
        // A wrapped token produces >1 client rect.
        emailRects: email ? email.getClientRects().length : 0,
        // icon: markers must never leak as literal text.
        literalIconLeak: Array.from(shell.querySelectorAll('*'))
          .filter((el) => el.children.length === 0 && /icon:/.test(el.textContent || ''))
          .length,
      }
    })

    expect(metrics).not.toBeNull()
    // A4 at 96dpi = 794 × 1123 (print uses 210×297mm; allow a hair of AA).
    expect(metrics!.widthPx).toBeGreaterThan(780)
    expect(metrics!.widthPx).toBeLessThan(810)
    expect(metrics!.heightPx).toBeLessThanOrEqual(1124)
    // Three explicit icon markers + none leaked as text.
    expect(metrics!.iconCount).toBeGreaterThanOrEqual(3)
    expect(metrics!.literalIconLeak).toBe(0)
    // The email address must not wrap mid-token.
    expect(metrics!.emailRects).toBe(1)

    await docPage.close()
  })
})
