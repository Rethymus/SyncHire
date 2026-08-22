import { render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ServiceWorkerRegister } from '../sw-register'

// jsdom has no service worker implementation; install a controllable stub.
const registerMock = vi.fn()

describe('ServiceWorkerRegister', () => {
  const originalLocation = Object.getOwnPropertyDescriptor(window, 'location')

  beforeEach(() => {
    registerMock.mockReset()
    // navigator.serviceWorker.register returns a Promise; the component
    // chains .catch on the result.
    registerMock.mockResolvedValue(undefined)
    Object.defineProperty(window.navigator, 'serviceWorker', {
      value: { register: registerMock },
      configurable: true,
    })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    delete (window.navigator as Partial<Navigator>).serviceWorker
    if (originalLocation) {
      Object.defineProperty(window, 'location', originalLocation)
    }
  })

  it('registers "/sw.js" in production over http once the document is loaded', () => {
    // jsdom reports readyState "complete" in tests, so registration happens
    // synchronously inside the effect (no window load listener needed).
    vi.stubEnv('NODE_ENV', 'production')

    render(<ServiceWorkerRegister />)

    expect(registerMock).toHaveBeenCalledTimes(1)
    expect(registerMock).toHaveBeenCalledWith('/sw.js')
  })

  it('does not register outside production (dev server)', () => {
    // Vitest runs with NODE_ENV=test, which is non-production like dev.
    render(<ServiceWorkerRegister />)

    expect(registerMock).not.toHaveBeenCalled()
  })

  it('does not register on non-http origins (e.g. Electron file:// shells)', () => {
    vi.stubEnv('NODE_ENV', 'production')
    Object.defineProperty(window, 'location', {
      value: { protocol: 'file:', href: 'file:///C:/app/index.html' },
      configurable: true,
      writable: true,
    })

    render(<ServiceWorkerRegister />)

    expect(registerMock).not.toHaveBeenCalled()
  })

  it('does not register when the browser has no serviceWorker support', () => {
    vi.stubEnv('NODE_ENV', 'production')
    delete (window.navigator as Partial<Navigator>).serviceWorker

    render(<ServiceWorkerRegister />)

    expect(registerMock).not.toHaveBeenCalled()
  })

  it('prefixes the registration path with NEXT_PUBLIC_BASE_PATH when set', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_BASE_PATH', '/sync-hire')

    render(<ServiceWorkerRegister />)

    expect(registerMock).toHaveBeenCalledWith('/sync-hire/sw.js')
  })

  it('defers registration to the window load event while the document is still loading', () => {
    vi.stubEnv('NODE_ENV', 'production')
    const readyStateDescriptor = Object.getOwnPropertyDescriptor(document, 'readyState')
    Object.defineProperty(document, 'readyState', {
      configurable: true,
      get: () => 'loading',
    })

    try {
      const { unmount } = render(<ServiceWorkerRegister />)
      expect(registerMock).not.toHaveBeenCalled()

      window.dispatchEvent(new Event('load'))
      expect(registerMock).toHaveBeenCalledWith('/sw.js')

      // Cleanup removes the listener, so a second load event is a no-op.
      registerMock.mockClear()
      unmount()
      window.dispatchEvent(new Event('load'))
      expect(registerMock).not.toHaveBeenCalled()
    } finally {
      if (readyStateDescriptor) {
        Object.defineProperty(document, 'readyState', readyStateDescriptor)
      }
    }
  })
})
