/**
 * E2E tests for authentication flow
 */

import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
  })

  test('should display login form', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /login/i })).toBeVisible()
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/password/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /login/i })).toBeVisible()
  })

  test('should show validation errors for empty fields', async ({ page }) => {
    await page.click('button[type="submit"]')

    await expect(page.getByText(/email is required/i)).toBeVisible()
    await expect(page.getByText(/password is required/i)).toBeVisible()
  })

  test('should show error for invalid credentials', async ({ page }) => {
    await page.fill('input[name="email"]', 'invalid@example.com')
    await page.fill('input[name="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')

    await expect(page.getByText(/invalid email or password/i)).toBeVisible()
  })

  test('should successfully login and redirect to dashboard', async ({ page }) => {
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'testpass123')
    await page.click('button[type="submit"]')

    await expect(page).toHaveURL('/dashboard')
    await expect(page.getByText(/welcome/i)).toBeVisible()
  })

  test('should navigate to signup page', async ({ page }) => {
    await page.click('text=Sign up')

    await expect(page).toHaveURL('/signup')
    await expect(page.getByRole('heading', { name: /create account/i })).toBeVisible()
  })

  test('should navigate to forgot password page', async ({ page }) => {
    await page.click('text=Forgot password')

    await expect(page).toHaveURL('/forgot-password')
    await expect(page.getByRole('heading', { name: /reset password/i })).toBeVisible()
  })
})

test.describe('Signup Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/signup')
  })

  test('should display signup form', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /create account/i })).toBeVisible()
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/username/i)).toBeVisible()
    await expect(page.getByLabel(/password/i)).toBeVisible()
    await expect(page.getByLabel(/full name/i)).toBeVisible()
  })

  test('should show password strength indicator', async ({ page }) => {
    await page.fill('input[name="password"]', 'weak')

    await expect(page.getByText(/weak password/i)).toBeVisible()

    await page.fill('input[name="password"]', 'StrongPass123!')

    await expect(page.getByText(/strong password/i)).toBeVisible()
  })

  test('should successfully create account', async ({ page }) => {
    await page.fill('input[name="email"]', 'newuser@example.com')
    await page.fill('input[name="username"]', 'newuser')
    await page.fill('input[name="password"]', 'StrongPass123!')
    await page.fill('input[name="full_name"]', 'New User')
    await page.click('button[type="submit"]')

    await expect(page).toHaveURL('/dashboard')
    await expect(page.getByText(/account created successfully/i)).toBeVisible()
  })

  test('should show error for duplicate email', async ({ page }) => {
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="username"]', 'testuser')
    await page.fill('input[name="password"]', 'StrongPass123!')
    await page.fill('input[name="full_name"]', 'Test User')
    await page.click('button[type="submit"]')

    await expect(page.getByText(/user already exists/i)).toBeVisible()
  })
})

test.describe('Password Reset Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/forgot-password')
  })

  test('should send reset email', async ({ page }) => {
    await page.fill('input[name="email"]', 'test@example.com')
    await page.click('button[type="submit"]')

    await expect(page.getByText(/reset email sent/i)).toBeVisible()
  })

  test('should show error for non-existent email', async ({ page }) => {
    await page.fill('input[name="email"]', 'nonexistent@example.com')
    await page.click('button[type="submit"]')

    // Should still show success message for security
    await expect(page.getByText(/if an account exists/i)).toBeVisible()
  })
})

test.describe('Two-Factor Authentication', () => {
  test('should setup 2FA', async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'testpass123')
    await page.click('button[type="submit"]')

    // Navigate to settings
    await page.goto('/settings')
    await page.click('text=Enable 2FA')

    // Should show QR code
    await expect(page.getByRole('img', { name: /qr code/i })).toBeVisible()
    await expect(page.getByText(/backup codes/i)).toBeVisible()
  })

  test('should verify 2FA code during login', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[name="email"]', '2fa@example.com')
    await page.fill('input[name="password"]', 'testpass123')
    await page.click('button[type="submit"]')

    // Should show 2FA input
    await expect(page.getByLabel(/verification code/i)).toBeVisible()

    // Enter valid code
    await page.fill('input[name="code"]', '123456')
    await page.click('button[type="submit"]')

    await expect(page).toHaveURL('/dashboard')
  })
})

test.describe('OAuth Integration', () => {
  test('should initiate Google OAuth flow', async ({ page }) => {
    await page.goto('/login')
    await page.click('text=Continue with Google')

    // Should redirect to Google OAuth
    await expect(page).toHaveURL(/accounts\.google\.com/)
  })

  test('should initiate GitHub OAuth flow', async ({ page }) => {
    await page.goto('/login')
    await page.click('text=Continue with GitHub')

    // Should redirect to GitHub OAuth
    await expect(page).toHaveURL(/github\.com\/login\/oauth/)
  })
})
