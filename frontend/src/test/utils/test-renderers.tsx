/**
 * Custom render utilities for Testing Library
 * Provides consistent wrappers with providers for all tests
 */

import { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { I18nextProvider } from 'react-i18next'
import { vi } from 'vitest'

// Mock i18n instance
const i18n: any = {
  language: 'en',
  languages: ['en'],
  options: { react: { useSuspense: false } },
  init: vi.fn(),
  t: vi.fn((key) => key),
  changeLanguage: vi.fn(),
}

// Mock providers
interface TestProvidersProps {
  children: React.ReactNode
  queryClient?: QueryClient
  router?: any
}

/**
 * Create test QueryClient with default configuration
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
    logger: {
      log: console.log,
      warn: console.warn,
      error: () => {}, // Suppress errors in tests
    },
  })
}

/**
 * Wrapper component with all required providers
 */
function TestProviders({ children, queryClient, router }: TestProvidersProps) {
  const qc = queryClient || createTestQueryClient()

  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

/**
 * Custom render function with providers
 */
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient
  router?: any
}

export function renderWithProviders(
  ui: ReactElement,
  options?: CustomRenderOptions
) {
  const { queryClient, router, ...renderOptions } = options || {}

  return {
    ...render(<TestProviders queryClient={queryClient} router={router}>{ui}</TestProviders>, {
      ...renderOptions,
    }),
    queryClient: queryClient || createTestQueryClient(),
  }
}

/**
 * Render with authentication context
 */
export function renderWithAuth(
  ui: ReactElement,
  user: { id: string; email: string; username: string },
  options?: CustomRenderOptions
) {
  // Mock authenticated state
  const mockUseAuth = vi.fn(() => ({
    user,
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
  }))

  vi.mock('@/hooks/use-auth', () => ({
    useAuth: mockUseAuth,
  }))

  return renderWithProviders(ui, options)
}

/**
 * Render with mock router
 */
export function renderWithRouter(
  ui: ReactElement,
  routerOptions?: {
    pathname?: string
    query?: Record<string, string>
    push?: ReturnType<typeof vi.fn>
  }
) {
  const mockRouter = {
    pathname: routerOptions?.pathname || '/',
    query: routerOptions?.query || {},
    push: routerOptions?.push || vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }

  vi.mock('next/navigation', () => ({
    useRouter: () => mockRouter,
    usePathname: () => mockRouter.pathname,
    useSearchParams: () => new URLSearchParams(routerOptions?.query),
  }))

  return renderWithProviders(ui, { router: mockRouter as any })
}

// Re-export everything from testing-library
export * from '@testing-library/react'
export { default as userEvent } from '@testing-library/user-event'
