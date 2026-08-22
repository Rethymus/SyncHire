import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import RouteError from '../error'

// Silence the route-error logging effect while keeping its call assertions.
const loggerErrorMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/logger', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/logger')>()
  return {
    ...actual,
    logger: { ...actual.logger, error: loggerErrorMock },
  }
})

// Reuse the real LITE_COPY tables but control the locale, so both languages
// can be asserted without depending on localStorage or navigator.language.
const i18nMock = vi.hoisted(() => ({ locale: 'en-US' as 'en-US' | 'zh-CN' }))

vi.mock('@/lib/lite-i18n', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/lite-i18n')>()
  return {
    ...actual,
    useLiteCopy: () => ({
      locale: i18nMock.locale,
      setLocale: vi.fn(),
      t: actual.LITE_COPY[i18nMock.locale],
    }),
  }
})

function makeError(digest?: string) {
  const error = new Error('Something exploded')
  if (digest) {
    ;(error as Error & { digest?: string }).digest = digest
  }
  return error
}

describe('RouteError (app/error.tsx)', () => {
  beforeEach(() => {
    loggerErrorMock.mockClear()
    i18nMock.locale = 'en-US'
  })

  it('renders the English title, description and actions', () => {
    render(<RouteError error={makeError()} reset={vi.fn()} />)

    expect(screen.getByRole('heading', { name: 'Something went wrong' })).toBeInTheDocument()
    expect(
      screen.getByText(/An unexpected error interrupted this page/)
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Try again/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Back to dashboard/i })).toBeInTheDocument()
    expect(screen.getByText('SyncHire Lite · en-US')).toBeInTheDocument()
  })

  it('renders the Chinese title, description and actions for zh-CN', () => {
    i18nMock.locale = 'zh-CN'
    render(<RouteError error={makeError()} reset={vi.fn()} />)

    expect(screen.getByRole('heading', { name: '页面出了点问题' })).toBeInTheDocument()
    expect(screen.getByText(/本页发生了意外错误/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '重试' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '返回仪表盘' })).toBeInTheDocument()
    expect(screen.getByText('SyncHire Lite · zh-CN')).toBeInTheDocument()
  })

  it('links back to the dashboard', () => {
    render(<RouteError error={makeError()} reset={vi.fn()} />)

    expect(screen.getByRole('link', { name: /Back to dashboard/i })).toHaveAttribute(
      'href',
      '/dashboard'
    )
  })

  it('invokes reset when the retry button is clicked', () => {
    const reset = vi.fn()
    render(<RouteError error={makeError()} reset={reset} />)

    fireEvent.click(screen.getByRole('button', { name: /Try again/i }))
    expect(reset).toHaveBeenCalledTimes(1)
  })

  it('shows the error digest when present and hides it otherwise', () => {
    const { unmount } = render(<RouteError error={makeError('digest-abc-123')} reset={vi.fn()} />)
    expect(screen.getByText('digest-abc-123')).toBeInTheDocument()
    unmount()

    render(<RouteError error={makeError()} reset={vi.fn()} />)
    expect(screen.queryByText(/digest-/)).not.toBeInTheDocument()
  })

  it('logs the error once via logger.error', () => {
    const error = makeError('digest-xyz')
    render(<RouteError error={error} reset={vi.fn()} />)

    expect(loggerErrorMock).toHaveBeenCalledTimes(1)
    expect(loggerErrorMock).toHaveBeenCalledWith('UI', 'Route render error', error)
  })
})
