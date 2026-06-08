import { test, expect } from '@playwright/test'

function buildSeedStorage() {
  const now = new Date().toISOString()

  return {
    version: 1,
    state: {
      resumes: [{
        id: 'resume-seed-1',
        name: 'seed-resume.txt',
        content: 'Frontend Engineer\nReact TypeScript Playwright accessibility',
        uploadedAt: now,
        skills: ['React', 'TypeScript', 'Playwright'],
        experience: ['Built hiring workflows'],
      }],
      currentResume: null,
      jobDescriptions: [{
        id: 'jd-seed-1',
        title: 'Frontend Engineer',
        company: 'Acme Hiring',
        description: 'Build reliable job application tooling with React and TypeScript.',
        requirements: ['React', 'TypeScript', 'Testing'],
        skills: ['React', 'TypeScript'],
        createdAt: now,
      }],
      currentJD: null,
      candidateProfile: {
        fullName: 'Chen Yu',
        email: 'chenyu@example.com',
        phone: '+86 138 0000 0000',
        location: 'Shanghai, China',
        targetTitle: 'Frontend Engineer',
        education: 'B.S. Computer Science',
        school: 'East China University of Science and Technology',
        graduationYear: '2026',
        portfolioUrl: 'https://portfolio.example.com/chenyu',
        linkedinUrl: 'https://www.linkedin.com/in/chenyu',
        githubUrl: 'https://github.com/chenyu',
        workAuthorization: 'Authorized to work locally',
        availability: 'Available within 2 weeks',
        salaryExpectation: 'Open to discuss',
        personalSummary: 'Fresh graduate frontend engineer focused on React and TypeScript.',
        skills: ['React', 'TypeScript', 'Playwright'],
        projects: ['Built hiring workflows'],
        updatedAt: now,
      },
      browserFillSessions: [],
      applications: [{
        id: 'app-seed-1',
        companyName: 'Acme Hiring',
        position: 'Frontend Engineer',
        status: 'draft',
        jobId: 'jd-seed-1',
        resumeId: 'resume-seed-1',
        createdAt: now,
        updatedAt: now,
      }],
      selectedTemplate: 'minimal',
      templateCustomization: {},
      onboarding: {
        isOnboarded: false,
        currentStep: 0,
        completedSteps: [],
        skipped: false,
      },
    },
  }
}

const routes = [
  '/dashboard',
  '/applications',
  '/profile',
  '/applications/detail?id=app-seed-1',
  '/applications/match?id=app-seed-1',
  '/search',
  '/search/applications',
  '/search/resumes',
  '/search/jds',
  '/data',
  '/settings',
  '/interviews',
  '/interview-prep',
  '/saved-searches',
  '/analytics',
]

test.describe('Lite route regression coverage', () => {
  test('key pages load with seeded local data and no console errors', async ({ page }) => {
    test.setTimeout(routes.length * 10_000)

    await page.addInitScript((storage) => {
      window.localStorage.setItem('synchire-storage', JSON.stringify(storage))
    }, buildSeedStorage())

    const signals: string[] = []
    page.on('console', (message) => {
      if (message.type() === 'error' || message.type() === 'warning') {
        signals.push(`${message.type()}: ${message.text()}`)
      }
    })
    page.on('pageerror', (error) => {
      signals.push(`pageerror: ${error.message}`)
    })

    for (const route of routes) {
      signals.length = 0

      const response = await page.goto(route, { waitUntil: 'domcontentloaded' })
      await page.locator('body').waitFor({ state: 'visible', timeout: 10_000 })
      await page.getByRole('navigation').first().waitFor({ state: 'visible', timeout: 10_000 })
      await page.waitForTimeout(200)

      expect(response?.status(), `${route} should return a non-error status`).toBeLessThan(400)
      await expect(page.getByText(/页面未找到|404|Page not found/i)).toHaveCount(0)
      expect(signals, `${route} should not emit console errors or warnings`).toEqual([])
    }
  })

  test('local role-card resume tailoring and PDF export API work without a cloud backend', async ({ page, request }) => {
    await page.addInitScript((storage) => {
      window.localStorage.setItem('synchire-storage', JSON.stringify(storage))
    }, buildSeedStorage())

    await page.goto('/applications/detail?id=app-seed-1', { waitUntil: 'domcontentloaded' })
    await page.locator('body').waitFor({ state: 'visible', timeout: 10_000 })
    await page.getByRole('navigation').first().waitFor({ state: 'visible', timeout: 10_000 })
    await page.getByRole('tab', { name: /优化建议|Optimization/i }).click()
    await page.getByRole('button', { name: /优化简历/ }).click()

    await expect(page.getByText(/岗位化简历|优化完成/).first()).toBeVisible({ timeout: 10_000 })

    const stored = await page.evaluate(() => window.localStorage.getItem('synchire-storage'))
    expect(stored).toContain('求职意向')
    expect(stored).toContain('Acme Hiring')
    expect(stored).toContain('React')

    const response = await request.post('/api/generate-pdf', {
      data: {
        filename: 'synchire-local-tailored-resume',
        html: '<main><h1>Chen Yu</h1><p>Frontend Engineer</p></main>',
      },
    })
    expect(response.ok()).toBeTruthy()
    expect(response.headers()['content-type']).toContain('application/pdf')
    const body = await response.body()
    expect(body.subarray(0, 8).toString()).toBe('%PDF-1.4')
  })

  test('AI runtime settings support providers, skills, MCPs, discovery, and local persistence', async ({ page }) => {
    const signals: string[] = []
    page.on('console', (message) => {
      if (message.type() === 'error' || message.type() === 'warning') {
        signals.push(`${message.type()}: ${message.text()}`)
      }
    })
    page.on('pageerror', (error) => {
      signals.push(`pageerror: ${error.message}`)
    })

    await page.goto('/settings?locale=en-US', { waitUntil: 'domcontentloaded' })
    await page.locator('body').waitFor({ state: 'visible', timeout: 10_000 })

    await expect(page.getByRole('heading', { name: 'AI Runtime Settings' })).toBeVisible()
    await page.getByTestId('openai-api-key').fill('sk-test-local-runtime-key')
    await page.getByRole('button', { name: 'Save AI settings' }).first().click()
    await expect(page.getByText('AI runtime settings saved locally.')).toBeVisible()

    await page.getByRole('tab', { name: /Skills/ }).click()
    await expect(page.getByRole('heading', { name: 'Skill switchboard' })).toBeVisible()
    await page.getByLabel('Search skills and MCPs').fill('recruiter')
    await page.getByRole('button', { name: 'Add' }).click()
    await expect(page.getByText('Installed').first()).toBeVisible()

    await page.getByRole('tab', { name: /^MCP$/ }).click()
    await expect(page.getByRole('heading', { name: 'MCP switchboard' })).toBeVisible()
    await expect(page.getByText('Review-Only WebBridge')).toBeVisible()

    await page.getByRole('tab', { name: /Discover/ }).click()
    await page.getByRole('button', { name: 'Refresh metadata' }).first().click()
    await expect(page.getByText('Catalog metadata refreshed locally.')).toBeVisible()
    await page.getByLabel('Repository name').fill('Private Job Search Catalog')
    await page.getByLabel('Repository URL').fill('https://example.com/synchire/catalog.json')
    await page.getByRole('button', { name: 'Add source' }).click()
    await expect(page.getByText('Private Job Search Catalog')).toBeVisible()

    const runtimeSettings = await page.evaluate(() =>
      window.localStorage.getItem('synchire-ai-runtime-settings')
    )
    expect(runtimeSettings).toContain('sk-test-local-runtime-key')
    expect(runtimeSettings).toContain('recruiter-message-writer')
    expect(runtimeSettings).toContain('Private Job Search Catalog')
    expect(signals).toEqual([])
  })
})
