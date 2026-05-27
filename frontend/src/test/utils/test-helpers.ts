/**
 * Test helper utilities
 * Provides common helper functions for tests
 */

import { vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

/**
 * Wait for loading state to complete
 */
export async function waitForLoadingToFinish() {
  return waitFor(
    () => {
      const loaders = screen.queryAllByRole('progressbar')
      expect(loaders).toHaveLength(0)
    },
    { timeout: 5000 }
  )
}

/**
 * Wait for element to be visible
 */
export async function waitForElementToBeVisible(
  getByText: (text: string) => HTMLElement,
  text: string
) {
  return waitFor(() => {
    const element = getByText(text)
    expect(element).toBeVisible()
    return element
  })
}

/**
 * Fill form with data
 */
export async function fillForm(
  formData: Record<string, string | number | boolean>
) {
  const user = userEvent.setup()

  for (const [name, value] of Object.entries(formData)) {
    const input = screen.getByLabelText(/name/i) || screen.getByRole('textbox', { name: new RegExp(name, 'i') })

    if (typeof value === 'boolean') {
      await user.click(input)
    } else {
      await user.clear(input)
      await user.type(input, String(value))
    }
  }
}

/**
 * Submit form
 */
export async function submitForm(submitButtonSelector = /submit|save|create/i) {
  const user = userEvent.setup()
  const submitButton = screen.getByRole('button', { name: submitButtonSelector })
  await user.click(submitButton)
}

/**
 * Assert error message is shown
 */
export async function assertErrorMessage(message: string) {
  await waitFor(() => {
    const error = screen.getByText(message)
    expect(error).toBeVisible()
    expect(error).toHaveClass(/error|danger/)
  })
}

/**
 * Assert success message is shown
 */
export async function assertSuccessMessage(message: string) {
  await waitFor(() => {
    const success = screen.getByText(message)
    expect(success).toBeVisible()
    expect(success).toHaveClass(/success|success/)
  })
}

/**
 * Navigate to route
 */
export async function navigateTo(route: string) {
  window.history.pushState({}, '', route)
  await waitFor(() => {
    expect(window.location.pathname).toBe(route)
  })
}

/**
 * Mock window.matchMedia for responsive tests
 */
export function mockMatchMedia(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

/**
 * Mock intersection observer for lazy loading tests
 */
export function mockIntersectionObserver() {
  const mockIntersectionObserver = vi.fn()
  mockIntersectionObserver.mockReturnValue({
    observe: () => null,
    unobserve: () => null,
    disconnect: () => null,
  })
  window.IntersectionObserver = mockIntersectionObserver
}

/**
 * Mock file upload
 */
export function createMockFile(name: string, size: number, type: string) {
  const file = new File([''], name, { type })
  Object.defineProperty(file, 'size', {
    get: () => size,
  })
  return file
}

/**
 * Mock drag and drop
 */
export async function mockDragAndDrop(
  dropZone: HTMLElement,
  file: File
) {
  const user = userEvent.setup()

  // Create drag events
  const dragEnterEvent = new Event('dragenter', { bubbles: true })
  const dragOverEvent = new Event('dragover', { bubbles: true })
  const dropEvent = new Event('drop', { bubbles: true })

  // Mock dataTransfer
  Object.defineProperty(dropEvent, 'dataTransfer', {
    value: {
      files: [file],
      items: [{ kind: 'file', type: file.type, getAsFile: () => file }],
    },
  })

  // Dispatch events
  dropZone.dispatchEvent(dragEnterEvent)
  dropZone.dispatchEvent(dragOverEvent)
  await user.upload(dropZone, file)
}

/**
 * Assert element has correct ARIA attributes
 */
export function assertAriaAttributes(
  element: HTMLElement,
  attributes: Record<string, string>
) {
  for (const [key, value] of Object.entries(attributes)) {
    expect(element).toHaveAttribute(`aria-${key}`, value)
  }
}

/**
 * Assert element is accessible
 */
export function assertAccessibility(element: HTMLElement) {
  // Check for role
  expect(element).toHaveAttribute('role')

  // Check for aria-label or aria-labelledby if no visible text
  const hasVisibleText = element.textContent?.trim().length > 0
  if (!hasVisibleText) {
    const hasAriaLabel =
      element.hasAttribute('aria-label') ||
      element.hasAttribute('aria-labelledby')
    expect(hasAriaLabel).toBe(true)
  }

  // Check for aria-describedby if it's an input
  if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
    const hasAriaDescribedby = element.hasAttribute('aria-describedby')
    if (!hasAriaDescribedby) {
      // Input should have label or aria-label
      const hasLabel =
        element.labels !== null && element.labels.length > 0
      expect(hasLabel || element.hasAttribute('aria-label')).toBe(true)
    }
  }
}

/**
 * Assert form validation
 */
export async function assertFormValidation(
  input: HTMLElement,
  expectedError: string
) {
  // Try to submit invalid form
  const form = input.closest('form')
  if (form) {
    const submitButton = form.querySelector('button[type="submit"]')
    if (submitButton) {
      await userEvent.click(submitButton)
    }
  }

  // Assert error is shown
  await waitFor(() => {
    const error = screen.getByText(expectedError)
    expect(error).toBeVisible()
  })
}

/**
 * Mock console methods to suppress output in tests
 */
export function mockConsole() {
  const originalConsole = {
    error: console.error,
    warn: console.warn,
    log: console.log,
  }

  beforeEach(() => {
    console.error = vi.fn()
    console.warn = vi.fn()
    console.log = vi.fn()
  })

  afterEach(() => {
    console.error = originalConsole.error
    console.warn = originalConsole.warn
    console.log = originalConsole.log
  })
}

/**
 * Assert no console errors were logged
 */
export function assertNoConsoleErrors() {
  expect(console.error).not.toHaveBeenCalled()
}

/**
 * Assert no console warnings were logged
 */
export function assertNoConsoleWarnings() {
  expect(console.warn).not.toHaveBeenCalled()
}

/**
 * Create a mock ref
 */
export function createMockRef<T>(current: T | null = null) {
  return {
    current,
  }
}

/**
 * Wait for animation to complete
 */
export async function waitForAnimation(element: HTMLElement) {
  return waitFor(() => {
    const styles = window.getComputedStyle(element)
    expect(styles.animationName).toBe('none')
  })
}

/**
 * Mock scroll behavior
 */
export function mockScroll() {
  const originalScrollTo = window.scrollTo
  const originalScrollBy = window.scrollBy
  const originalScrollIntoView = Element.prototype.scrollIntoView

  beforeEach(() => {
    window.scrollTo = vi.fn()
    window.scrollBy = vi.fn()
    Element.prototype.scrollIntoView = vi.fn()
  })

  afterEach(() => {
    window.scrollTo = originalScrollTo
    window.scrollBy = originalScrollBy
    Element.prototype.scrollIntoView = originalScrollIntoView
  })
}

/**
 * Assert element is in viewport
 */
export function assertInViewport(element: HTMLElement) {
  const rect = element.getBoundingClientRect()
  expect(rect.top).toBeGreaterThanOrEqual(0)
  expect(rect.left).toBeGreaterThanOrEqual(0)
  expect(rect.bottom).toBeLessThanOrEqual(window.innerHeight)
  expect(rect.right).toBeLessThanOrEqual(window.innerWidth)
}

/**
 * Assert element is not in viewport
 */
export function assertNotInViewport(element: HTMLElement) {
  const rect = element.getBoundingClientRect()
  const isInViewport =
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= window.innerHeight &&
    rect.right <= window.innerWidth
  expect(isInViewport).toBe(false)
}
