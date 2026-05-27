/**
 * E2E tests for file upload flow
 */

import { test, expect } from '@playwright/test'
import path from 'path'

test.describe('File Upload Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login')
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'testpass123')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/dashboard')
  })

  test('should upload resume via drag and drop', async ({ page }) => {
    await page.goto('/upload')

    // Get file input
    const fileInput = await page.locator('input[type="file"]')

    // Upload file
    const filePath = path.join(__dirname, 'fixtures', 'resume.pdf')
    await fileInput.setInputFiles(filePath)

    // Should show upload progress
    await expect(page.getByText(/uploading/i)).toBeVisible()

    // Should show success message
    await expect(page.getByText(/upload successful/i)).toBeVisible()
  })

  test('should upload resume via file picker', async ({ page }) => {
    await page.goto('/upload')

    // Click upload button
    await page.click('text=Choose File')

    // Get file input (hidden)
    const fileInput = await page.locator('input[type="file"]')

    // Upload file
    const filePath = path.join(__dirname, 'fixtures', 'resume.pdf')
    await fileInput.setInputFiles(filePath)

    // Should show success
    await expect(page.getByText(/resume uploaded/i)).toBeVisible()
  })

  test('should reject files larger than 5MB', async ({ page }) => {
    await page.goto('/upload')

    const fileInput = await page.locator('input[type="file"]')

    // Create large file
    const largeFilePath = path.join(__dirname, 'fixtures', 'large-resume.pdf')
    await fileInput.setInputFiles(largeFilePath)

    // Should show error
    await expect(page.getByText(/file too large/i)).toBeVisible()
  })

  test('should reject unsupported file types', async ({ page }) => {
    await page.goto('/upload')

    const fileInput = await page.locator('input[type="file"]')

    // Upload executable file
    const filePath = path.join(__dirname, 'fixtures', 'malicious.exe')
    await fileInput.setInputFiles(filePath)

    // Should show error
    await expect(page.getByText(/invalid file type/i)).toBeVisible()
  })

  test('should parse uploaded resume automatically', async ({ page }) => {
    await page.goto('/upload')

    const fileInput = await page.locator('input[type="file"]')
    const filePath = path.join(__dirname, 'fixtures', 'resume.pdf')
    await fileInput.setInputFiles(filePath)

    // Wait for parsing to complete
    await expect(page.getByText(/parsing resume/i)).toBeVisible()
    await expect(page.getByText(/parsing complete/i)).toBeVisible()

    // Should show parsed data
    await expect(page.getByText(/contact information/i)).toBeVisible()
    await expect(page.getByText(/experience/i)).toBeVisible()
    await expect(page.getByText(/education/i)).toBeVisible()
    await expect(page.getByText(/skills/i)).toBeVisible()

    // Should show ATS score
    await expect(page.getByText(/ats score/i)).toBeVisible()
  })

  test('should upload job description', async ({ page }) => {
    await page.goto('/jd-input')

    // Upload JD file
    const fileInput = await page.locator('input[type="file"]')
    const filePath = path.join(__dirname, 'fixtures', 'job-description.pdf')
    await fileInput.setInputFiles(filePath)

    // Should show success
    await expect(page.getByText(/job description uploaded/i)).toBeVisible()

    // Should parse automatically
    await expect(page.getByText(/requirements extracted/i)).toBeVisible()
  })

  test('should handle multiple file uploads', async ({ page }) => {
    await page.goto('/upload')

    const fileInput = await page.locator('input[type="file"][multiple]')

    // Upload multiple files
    const files = [
      path.join(__dirname, 'fixtures', 'resume1.pdf'),
      path.join(__dirname, 'fixtures', 'resume2.pdf'),
      path.join(__dirname, 'fixtures', 'resume3.pdf'),
    ]

    await fileInput.setInputFiles(files)

    // Should show progress for all files
    await expect(page.getByText(/uploading 3 files/i)).toBeVisible()

    // Should complete all uploads
    await expect(page.getByText(/3 files uploaded successfully/i)).toBeVisible()
  })

  test('should show upload progress percentage', async ({ page }) => {
    await page.goto('/upload')

    const fileInput = await page.locator('input[type="file"]')
    const filePath = path.join(__dirname, 'fixtures', 'large-resume.pdf')
    await fileInput.setInputFiles(filePath)

    // Should show progress indicators
    await expect(page.getByText(/0%/)).toBeVisible()
    await expect(page.getByText(/25%/)).toBeVisible()
    await expect(page.getByText(/50%/)).toBeVisible()
    await expect(page.getByText(/75%/)).toBeVisible()
    await expect(page.getByText(/100%/)).toBeVisible()
  })

  test('should cancel file upload', async ({ page }) => {
    await page.goto('/upload')

    const fileInput = await page.locator('input[type="file"]')
    const filePath = path.join(__dirname, 'fixtures', 'large-resume.pdf')
    await fileInput.setInputFiles(filePath)

    // Click cancel button
    await page.click('button:has-text("Cancel")')

    // Should show cancelled message
    await expect(page.getByText(/upload cancelled/i)).toBeVisible()

    // File should not appear in list
    await expect(page.getByText('resume.pdf')).not.toBeVisible()
  })

  test('should retry failed upload', async ({ page }) => {
    await page.goto('/upload')

    // Mock network error
    await page.route('**/api/resumes/upload', route => route.abort('failed'))

    const fileInput = await page.locator('input[type="file"]')
    const filePath = path.join(__dirname, 'fixtures', 'resume.pdf')
    await fileInput.setInputFiles(filePath)

    // Should show error
    await expect(page.getByText(/upload failed/i)).toBeVisible()

    // Remove mock
    await page.unroute('**/api/resumes/upload')

    // Click retry button
    await page.click('button:has-text("Retry")')

    // Should succeed
    await expect(page.getByText(/upload successful/i)).toBeVisible()
  })

  test('should delete uploaded file', async ({ page }) => {
    await page.goto('/upload')

    // Upload file
    const fileInput = await page.locator('input[type="file"]')
    const filePath = path.join(__dirname, 'fixtures', 'resume.pdf')
    await fileInput.setInputFiles(filePath)

    // Wait for upload to complete
    await expect(page.getByText(/upload successful/i)).toBeVisible()

    // Click delete button
    await page.click('button[aria-label="Delete file"]')

    // Confirm deletion
    await page.click('button:has-text("Delete")')

    // File should be removed
    await expect(page.getByText('resume.pdf')).not.toBeVisible()
    await expect(page.getByText(/file deleted/i)).toBeVisible()
  })

  test('should preview uploaded resume', async ({ page }) => {
    await page.goto('/upload')

    // Upload file
    const fileInput = await page.locator('input[type="file"]')
    const filePath = path.join(__dirname, 'fixtures', 'resume.pdf')
    await fileInput.setInputFiles(filePath)

    // Wait for upload
    await expect(page.getByText(/upload successful/i)).toBeVisible()

    // Click preview button
    await page.click('button[aria-label="Preview file"]')

    // Should show preview modal
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('img', { name: /resume preview/i })).toBeVisible()

    // Close preview
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })
})
