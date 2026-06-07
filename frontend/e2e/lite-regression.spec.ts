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
  '/applications/app-seed-1',
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

      const response = await page.goto(route)
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(200)

      expect(response?.status(), `${route} should return a non-error status`).toBeLessThan(400)
      await expect(page.getByText(/页面未找到|404|Page not found/i)).toHaveCount(0)
      expect(signals, `${route} should not emit console errors or warnings`).toEqual([])
    }
  })
})
