import { test, expect, type Page } from '@playwright/test'

const now = new Date('2026-06-07T12:00:00.000Z').toISOString()

function buildSeedStorage() {
  return {
    version: 1,
    state: {
      resumes: [
        {
          id: 'resume-new-grad',
          name: 'chen-yu-frontend-resume.txt',
          content:
            'Chen Yu - Frontend Engineer\nReact TypeScript Next.js Playwright Accessibility\nBuilt local-first job application workflows and automated UI tests.',
          uploadedAt: now,
          skills: ['React', 'TypeScript', 'Next.js', 'Playwright', 'Accessibility'],
          experience: ['Built local-first job application workflows', 'Automated UI quality gates'],
        },
        {
          id: 'resume-ai-product',
          name: 'chen-yu-ai-product-resume.txt',
          content:
            'AI product intern resume focused on prompt evaluation, analytics dashboards, and data privacy.',
          uploadedAt: now,
          skills: ['Prompt evaluation', 'Analytics', 'Privacy'],
          experience: ['Created product QA dashboards'],
        },
      ],
      currentResume: null,
      jobDescriptions: [
        {
          id: 'jd-frontend',
          title: 'Graduate Frontend Engineer',
          company: 'Northstar Labs',
          description:
            'Build reliable applicant-facing workflows with React, TypeScript, accessibility, local-first data handling, and Playwright regression coverage.',
          requirements: ['React', 'TypeScript', 'Accessibility', 'Playwright', 'Local-first data'],
          skills: ['React', 'TypeScript', 'Playwright', 'Accessibility'],
          createdAt: now,
        },
        {
          id: 'jd-ai-product',
          title: 'AI Product Operations Associate',
          company: 'Helio Career',
          description:
            'Operate AI evaluation loops, analyze customer pain points, and improve candidate job-search experiences.',
          requirements: ['AI evaluation', 'User research', 'Product analytics'],
          skills: ['AI evaluation', 'Analytics', 'User research'],
          createdAt: now,
        },
      ],
      currentJD: null,
      applications: [
        {
          id: 'app-frontend',
          companyName: 'Northstar Labs',
          position: 'Graduate Frontend Engineer',
          status: 'optimized',
          jobId: 'jd-frontend',
          resumeId: 'resume-new-grad',
          matchScore: 86,
          createdAt: now,
          updatedAt: now,
          tags: ['new-grad', 'high-priority', 'resume-tailored'],
        },
        {
          id: 'app-product',
          companyName: 'Helio Career',
          position: 'AI Product Operations Associate',
          status: 'interview',
          jobId: 'jd-ai-product',
          resumeId: 'resume-ai-product',
          matchScore: 74,
          createdAt: now,
          updatedAt: now,
          tags: ['interview', 'product'],
        },
      ],
      candidateProfile: {
        fullName: 'Chen Yu',
        email: 'chenyu@example.com',
        phone: '+86 138 0000 0000',
        location: 'Shanghai, China',
        targetTitle: 'Graduate Frontend Engineer',
        education: 'B.S. Computer Science',
        school: 'East China University of Science and Technology',
        graduationYear: '2026',
        portfolioUrl: 'https://portfolio.example.com/chenyu',
        linkedinUrl: 'https://www.linkedin.com/in/chenyu',
        githubUrl: 'https://github.com/chenyu',
        workAuthorization: 'Authorized to work locally; open to remote roles',
        availability: 'Available within 2 weeks',
        salaryExpectation: 'Open to discuss based on role scope',
        personalSummary:
          'Fresh graduate frontend engineer focused on React, TypeScript, accessibility, and reliable user workflows.',
        skills: ['React', 'TypeScript', 'Next.js', 'Playwright', 'Accessibility'],
        projects: [
          'Built a local-first job application tracker with resume, JD, and pipeline management.',
          'Implemented automated UI regression tests with Playwright and Vitest.',
        ],
        updatedAt: now,
      },
      browserFillSessions: [],
      selectedTemplate: 'minimal',
      templateCustomization: {},
      onboarding: {
        isOnboarded: true,
        currentStep: 7,
        completedSteps: ['welcome', 'profile', 'resume-upload', 'first-jd', 'first-analysis'],
        skipped: false,
        startedAt: now,
        completedAt: now,
      },
    },
  }
}

async function seed(page: Page, locale: 'en-US' | 'zh-CN') {
  await page.addInitScript(
    ({ storage, localeValue }) => {
      window.localStorage.setItem('synchire-storage', JSON.stringify(storage))
      window.localStorage.setItem('synchire-lite-locale', localeValue)
      window.localStorage.setItem(
        'synchire-backups',
        JSON.stringify([
          {
            id: 'backup-readme',
            created_at: '2026-06-07T12:30:00.000Z',
            size: 8421,
            files_count: 6,
          },
        ])
      )
    },
    { storage: buildSeedStorage(), localeValue: locale }
  )
}

async function capture(page: Page, route: string, path: string) {
  await page.goto(route, { waitUntil: 'domcontentloaded' })
  await page.locator('body').waitFor({ state: 'visible', timeout: 15_000 })
  await page.getByRole('navigation').first().waitFor({ state: 'visible', timeout: 15_000 })
  await page.waitForTimeout(500)
  await page.screenshot({ path, fullPage: false })
}

async function prepareProfileAssistant(page: Page) {
  await page.goto('/profile', { waitUntil: 'domcontentloaded' })
  await page.locator('main').first().waitFor({ state: 'visible', timeout: 15_000 })
  const fillDemoButton = page.getByTestId('fill-demo-form')
  await expect(fillDemoButton).toBeEnabled({ timeout: 15_000 })
  await fillDemoButton.click()
  await expect(page.getByText(/Agent instruction|Agent 执行指令/).first()).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText(/Demo application form|演示申请表/).first()).toBeVisible({ timeout: 10_000 })
  const phoneField = page.locator('#review-phone')
  await expect(phoneField).toBeVisible({ timeout: 10_000 })
  await phoneField.fill('+86 139 1111 2222')
  await expect(page.getByText(/After user edit|用户修改后/).first()).toBeVisible({ timeout: 10_000 })
  await page.waitForTimeout(300)
}

test.describe('README screenshots', () => {
  test('capture English product workflow screenshots', async ({ page }) => {
    test.setTimeout(90_000)
    await seed(page, 'en-US')

    await capture(page, '/dashboard', '../docs/assets/readme/en-linux-dashboard.png')
    await capture(page, '/upload', '../docs/assets/readme/en-linux-resumes.png')
    await capture(page, '/jd-input', '../docs/assets/readme/en-linux-job-descriptions.png')
    await capture(page, '/applications', '../docs/assets/readme/en-linux-applications.png')
    await prepareProfileAssistant(page)
    await page.screenshot({ path: '../docs/assets/readme/en-linux-profile.png', fullPage: false })
    await capture(page, '/applications/match?id=app-frontend', '../docs/assets/readme/en-linux-match-analysis.png')
    await capture(page, '/search', '../docs/assets/readme/en-linux-search.png')
    await capture(page, '/data', '../docs/assets/readme/en-linux-data-management.png')
  })

  test('capture Chinese product workflow screenshots', async ({ page }) => {
    test.setTimeout(90_000)
    await seed(page, 'zh-CN')

    await capture(page, '/dashboard', '../docs/assets/readme/zh-linux-dashboard.png')
    await capture(page, '/upload', '../docs/assets/readme/zh-linux-resumes.png')
    await capture(page, '/jd-input', '../docs/assets/readme/zh-linux-job-descriptions.png')
    await capture(page, '/applications', '../docs/assets/readme/zh-linux-applications.png')
    await prepareProfileAssistant(page)
    await page.screenshot({ path: '../docs/assets/readme/zh-linux-profile.png', fullPage: false })
    await capture(page, '/applications/match?id=app-frontend', '../docs/assets/readme/zh-linux-match-analysis.png')
    await capture(page, '/search', '../docs/assets/readme/zh-linux-search.png')
    await capture(page, '/data', '../docs/assets/readme/zh-linux-data-management.png')
  })
})
