import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ThemeToggle } from '../theme-toggle'

// Controlled next-themes state: resolvedTheme drives which icon renders and
// setTheme records the requested flip.
const themeState = vi.hoisted(() => ({
  resolvedTheme: 'light' as string | undefined,
  setTheme: vi.fn(),
}))

vi.mock('next-themes', () => ({
  useTheme: () => ({
    resolvedTheme: themeState.resolvedTheme,
    setTheme: themeState.setTheme,
    themes: ['light', 'dark'],
  }),
}))

describe('ThemeToggle', () => {
  beforeEach(() => {
    themeState.resolvedTheme = 'light'
    themeState.setTheme.mockReset()
  })

  it('renders a disabled placeholder button for the server snapshot', () => {
    // useSyncExternalStore falls back to getServerSnapshot (false => !mounted)
    // during static rendering, which exercises the pre-hydration placeholder.
    const html = renderToStaticMarkup(<ThemeToggle className="mt-2" />)

    expect(html).toContain('aria-label="Toggle theme"')
    expect(html).toContain('disabled')
    expect(html).toContain('mt-2')
    expect(html).not.toContain('<svg')
  })

  it('renders an enabled moon button in light mode', () => {
    const { container } = render(<ThemeToggle />)

    const button = screen.getByRole('button', { name: 'Switch to dark mode' })
    expect(button).toBeEnabled()
    expect(button).toHaveAttribute('aria-pressed', 'false')
    expect(container.querySelector('svg.lucide-moon')).toBeInTheDocument()
    expect(container.querySelector('svg.lucide-sun')).not.toBeInTheDocument()
  })

  it('renders a sun button with aria-pressed in dark mode', () => {
    themeState.resolvedTheme = 'dark'
    const { container } = render(<ThemeToggle />)

    const button = screen.getByRole('button', { name: 'Switch to light mode' })
    expect(button).toHaveAttribute('aria-pressed', 'true')
    expect(container.querySelector('svg.lucide-sun')).toBeInTheDocument()
    expect(container.querySelector('svg.lucide-moon')).not.toBeInTheDocument()
  })

  it('calls setTheme("dark") when clicked while light', () => {
    render(<ThemeToggle />)

    fireEvent.click(screen.getByRole('button', { name: 'Switch to dark mode' }))
    expect(themeState.setTheme).toHaveBeenCalledTimes(1)
    expect(themeState.setTheme).toHaveBeenCalledWith('dark')
  })

  it('flips to setTheme("light") after the resolved theme changes to dark', () => {
    const { rerender } = render(<ThemeToggle />)

    themeState.resolvedTheme = 'dark'
    rerender(<ThemeToggle />)

    const button = screen.getByRole('button', { name: 'Switch to light mode' })
    expect(button).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(button)
    expect(themeState.setTheme).toHaveBeenCalledWith('light')
  })

  it('keeps the placeholder free of theme-dependent markup until mounted on the client', () => {
    // In the jsdom client environment the store attaches immediately, so the
    // first client render already shows a real icon and never the placeholder.
    const { container } = render(<ThemeToggle />)
    const button = screen.getByRole('button')

    expect(button).toBeEnabled()
    expect(container.querySelector('svg.lucide-moon')).toBeInTheDocument()
  })
})
