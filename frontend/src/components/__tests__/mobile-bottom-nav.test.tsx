import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MobileBottomNav } from '../mobile-bottom-nav'

// Controllable pathname so each test can choose the "current" route.
const pathnameMock = vi.hoisted(() => ({ value: '/' }))

vi.mock('next/navigation', () => ({
  usePathname: () => pathnameMock.value,
}))

// Reuse the real LITE_COPY tables but control which locale is returned, so
// both en-US and zh-CN rendering can be asserted without touching storage.
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

describe('MobileBottomNav', () => {
  beforeEach(() => {
    pathnameMock.value = '/'
    i18nMock.locale = 'en-US'
  })

  it('renders the four destination links with correct hrefs', () => {
    render(<MobileBottomNav onOpenMenu={vi.fn()} />)

    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(4)
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/dashboard',
      '/upload',
      '/job-feed',
      '/applications',
    ])
  })

  it('renders the More button alongside the four links (5 items total)', () => {
    render(<MobileBottomNav onOpenMenu={vi.fn()} />)

    const nav = screen.getByRole('navigation')
    const moreButton = within(nav).getByRole('button', { name: 'More' })
    expect(moreButton).toBeInTheDocument()
    expect(moreButton).toHaveAttribute('aria-haspopup', 'dialog')
    expect(within(nav).getAllByRole('link')).toHaveLength(4)
    expect(nav.querySelectorAll('a, button')).toHaveLength(5)
  })

  it('marks only the link matching the current pathname with aria-current="page"', () => {
    pathnameMock.value = '/applications/abc/edit'
    render(<MobileBottomNav onOpenMenu={vi.fn()} />)

    const active = screen.getByRole('link', { name: 'Applications' })
    expect(active).toHaveAttribute('aria-current', 'page')

    for (const name of ['Dashboard', 'Resumes', 'Job Feed']) {
      expect(screen.getByRole('link', { name })).not.toHaveAttribute('aria-current')
    }
  })

  it('treats nested resume routes (/resumes/*) as current for the resumes entry', () => {
    pathnameMock.value = '/resumes/123'
    render(<MobileBottomNav onOpenMenu={vi.fn()} />)

    expect(screen.getByRole('link', { name: 'Resumes' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute('aria-current')
  })

  it('is hidden at the md breakpoint and fixed to the bottom on mobile', () => {
    const { container } = render(<MobileBottomNav onOpenMenu={vi.fn()} />)

    const nav = container.querySelector('nav')
    expect(nav).not.toBeNull()
    expect(nav?.className).toContain('md:hidden')
    expect(nav?.className).toContain('bottom-0')
  })

  it('applies the active highlight classes to the current route only', () => {
    pathnameMock.value = '/dashboard'
    render(<MobileBottomNav onOpenMenu={vi.fn()} />)

    expect(screen.getByRole('link', { name: 'Dashboard' }).className).toContain('text-blue-700')
    expect(screen.getByRole('link', { name: 'Resumes' }).className).toContain('text-muted-foreground')
  })

  it('invokes onOpenMenu when the More button is clicked', () => {
    const onOpenMenu = vi.fn()
    render(<MobileBottomNav onOpenMenu={onOpenMenu} />)

    fireEvent.click(screen.getByRole('button', { name: 'More' }))
    expect(onOpenMenu).toHaveBeenCalledTimes(1)
  })

  it('renders Chinese copy for the zh-CN locale', () => {
    i18nMock.locale = 'zh-CN'
    render(<MobileBottomNav onOpenMenu={vi.fn()} />)

    expect(screen.getByRole('navigation', { name: '菜单' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '仪表盘' })).toHaveAttribute('href', '/dashboard')
    expect(screen.getByRole('link', { name: '简历' })).toHaveAttribute('href', '/upload')
    expect(screen.getByRole('link', { name: '岗位信息流' })).toHaveAttribute('href', '/job-feed')
    expect(screen.getByRole('link', { name: '申请' })).toHaveAttribute('href', '/applications')
    expect(screen.getByRole('button', { name: '更多' })).toBeInTheDocument()
  })
})
