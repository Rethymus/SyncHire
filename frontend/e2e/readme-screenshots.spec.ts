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
          createdAt: '2026-06-01T10:00:00.000Z',
          updatedAt: '2026-06-07T12:00:00.000Z',
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
          createdAt: '2026-06-03T09:00:00.000Z',
          updatedAt: '2026-06-06T10:30:00.000Z',
          tags: ['interview', 'product'],
        },
        {
          id: 'app-platform',
          companyName: 'Orbit Works',
          position: 'Junior Platform UI Engineer',
          status: 'applied',
          jobId: 'jd-frontend',
          resumeId: 'resume-new-grad',
          matchScore: 68,
          createdAt: '2026-06-05T08:30:00.000Z',
          updatedAt: '2026-06-05T18:00:00.000Z',
          tags: ['follow-up', 'frontend'],
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
      if (!window.localStorage.getItem('synchire-readme-seeded')) {
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
        window.localStorage.setItem('synchire-readme-seeded', 'true')
      }
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
  await page.locator('#agentReport').fill(JSON.stringify({
    fields: [
      {
        fieldId: 'phone',
        inputName: 'phone',
        fieldLabel: 'Phone',
        value: '+86 139 1111 2222',
      },
    ],
  }))
  await page.getByRole('button', { name: /Apply browser report|应用浏览器回传/ }).click()
  await expect(page.getByText(/After user edit|用户修改后/).first()).toBeVisible({ timeout: 10_000 })
  await page.waitForTimeout(300)
}

async function prepareApplicationDetail(page: Page, path: string) {
  await page.goto('/applications/detail?id=app-frontend', { waitUntil: 'domcontentloaded' })
  await page.locator('main, body').first().waitFor({ state: 'visible', timeout: 15_000 })
  await page.getByRole('tab', { name: /优化建议/ }).click()
  await page.getByRole('button', { name: /优化简历/ }).click()
  await expect(page.getByText(/岗位化简历|优化完成/).first()).toBeVisible({ timeout: 10_000 })
  await page.waitForTimeout(300)
  await page.screenshot({ path, fullPage: false })
}

async function prepareResumeEditor(page: Page, path: string) {
  await page.goto('/applications/detail?id=app-frontend', { waitUntil: 'domcontentloaded' })
  await page.getByRole('tab', { name: /优化建议/ }).click()
  await page.getByRole('button', { name: /优化简历/ }).click()
  await expect(page.getByText(/岗位化简历|优化完成/).first()).toBeVisible({ timeout: 10_000 })
  const pdfResponse = await page.request.post('/api/generate-pdf', {
    data: {
      filename: 'readme-tailored-resume',
      html: '<main><h1>Chen Yu</h1><p>Graduate Frontend Engineer</p></main>',
    },
  })
  expect(pdfResponse.ok()).toBeTruthy()
  expect(pdfResponse.headers()['content-type']).toContain('application/pdf')
  await page.goto('/editor?applicationId=app-frontend', { waitUntil: 'domcontentloaded' })
  await expect(page.getByText(/Target Role|目标岗位|Graduate Frontend Engineer/).first()).toBeVisible({ timeout: 15_000 })
  const previewButton = page.getByRole('button', { name: /Preview|预览/ })
  await expect(previewButton).toBeEnabled({ timeout: 10_000 })
  await previewButton.click()
  await expect(page.getByText(/Role Fit Highlights|岗位匹配亮点|Professional Summary/).first()).toBeVisible({ timeout: 10_000 })
  await page.waitForTimeout(500)
  await page.screenshot({ path, fullPage: false })
}

async function prepareInterviewPrep(page: Page, path: string) {
  await page.goto('/interview-prep?applicationId=app-frontend', { waitUntil: 'domcontentloaded' })
  const generateButton = page.getByRole('button', { name: /Generate Interview Prep|生成面试准备/ })
  await expect(generateButton).toBeEnabled({ timeout: 15_000 })
  await generateButton.click()
  await expect(page.getByText(/Self-Introduction Template|自我介绍模板/).first()).toBeVisible({ timeout: 10_000 })
  await page.waitForTimeout(300)
  await page.screenshot({ path, fullPage: false })
}

async function prepareSearch(page: Page, route: string, query: string, path: string) {
  await page.goto(route, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(500)
  const searchInput = page.getByRole('combobox', { name: /Search|搜索/ })
  await expect(searchInput).toBeEditable({ timeout: 10_000 })
  await searchInput.fill(query)
  await expect(searchInput).toHaveValue(query, { timeout: 10_000 })
  await expect(page.getByText(/Found|找到|Northstar|chen-yu|Graduate Frontend Engineer/).first()).toBeVisible({ timeout: 10_000 })
  await page.waitForTimeout(300)
  await page.screenshot({ path, fullPage: false })
}

async function prepareGlobalSearch(page: Page, path: string) {
  await page.goto('/search', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(500)
  const searchInput = page.getByLabel(/Search query|搜索关键词/)
  await expect(searchInput).toBeEditable({ timeout: 10_000 })
  await searchInput.fill('React')
  await expect(searchInput).toHaveValue('React', { timeout: 10_000 })
  await expect(page.getByText(/Found|找到|chen-yu|Graduate Frontend Engineer|Northstar/).first()).toBeVisible({ timeout: 10_000 })
  await page.waitForTimeout(300)
  await page.screenshot({ path, fullPage: false })
}

test.describe('README screenshots', () => {
  test('capture English product workflow screenshots', async ({ page }) => {
    test.setTimeout(90_000)
    await seed(page, 'en-US')

    await capture(page, '/dashboard', '../docs/assets/readme/en-linux-dashboard.png')
    await capture(page, '/upload', '../docs/assets/readme/en-linux-resumes.png')
    await capture(page, '/jd-input', '../docs/assets/readme/en-linux-job-descriptions.png')
    await capture(page, '/applications', '../docs/assets/readme/en-linux-applications.png')
    await prepareApplicationDetail(page, '../docs/assets/readme/en-linux-application-detail.png')
    await prepareResumeEditor(page, '../docs/assets/readme/en-linux-tailored-resume-pdf.png')
    await prepareProfileAssistant(page)
    await page.screenshot({ path: '../docs/assets/readme/en-linux-profile.png', fullPage: false })
    await capture(page, '/applications/match?id=app-frontend', '../docs/assets/readme/en-linux-match-analysis.png')
    await prepareInterviewPrep(page, '../docs/assets/readme/en-linux-interview-prep.png')
    await capture(page, '/analytics', '../docs/assets/readme/en-linux-analytics.png')
    await prepareGlobalSearch(page, '../docs/assets/readme/en-linux-search.png')
    await prepareSearch(page, '/search/resumes', 'React', '../docs/assets/readme/en-linux-search-resumes.png')
    await prepareSearch(page, '/search/jds', 'React', '../docs/assets/readme/en-linux-search-jds.png')
    await prepareSearch(page, '/search/applications', 'Northstar', '../docs/assets/readme/en-linux-search-applications.png')
    await capture(page, '/data', '../docs/assets/readme/en-linux-data-management.png')
    await capture(page, '/settings', '../docs/assets/readme/en-linux-settings.png')
  })

  test('capture Chinese product workflow screenshots', async ({ page }) => {
    test.setTimeout(90_000)
    await seed(page, 'zh-CN')

    await capture(page, '/dashboard', '../docs/assets/readme/zh-linux-dashboard.png')
    await capture(page, '/upload', '../docs/assets/readme/zh-linux-resumes.png')
    await capture(page, '/jd-input', '../docs/assets/readme/zh-linux-job-descriptions.png')
    await capture(page, '/applications', '../docs/assets/readme/zh-linux-applications.png')
    await prepareApplicationDetail(page, '../docs/assets/readme/zh-linux-application-detail.png')
    await prepareResumeEditor(page, '../docs/assets/readme/zh-linux-tailored-resume-pdf.png')
    await prepareProfileAssistant(page)
    await page.screenshot({ path: '../docs/assets/readme/zh-linux-profile.png', fullPage: false })
    await capture(page, '/applications/match?id=app-frontend', '../docs/assets/readme/zh-linux-match-analysis.png')
    await prepareInterviewPrep(page, '../docs/assets/readme/zh-linux-interview-prep.png')
    await capture(page, '/analytics', '../docs/assets/readme/zh-linux-analytics.png')
    await prepareGlobalSearch(page, '../docs/assets/readme/zh-linux-search.png')
    await prepareSearch(page, '/search/resumes', 'React', '../docs/assets/readme/zh-linux-search-resumes.png')
    await prepareSearch(page, '/search/jds', 'React', '../docs/assets/readme/zh-linux-search-jds.png')
    await prepareSearch(page, '/search/applications', 'Northstar', '../docs/assets/readme/zh-linux-search-applications.png')
    await capture(page, '/data', '../docs/assets/readme/zh-linux-data-management.png')
    await capture(page, '/settings', '../docs/assets/readme/zh-linux-settings.png')
  })
})
