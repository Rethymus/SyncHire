import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock Next.js modules
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}))

vi.mock('next/headers', () => ({
  cookies: () => ({
    get: () => undefined,
    getAll: () => [],
    set: vi.fn(),
  }),
  headers: () => ({
    get: () => undefined,
    has: () => false,
  }),
}))

vi.mock('next/image', () => ({
  default: (props: any) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={props.src}
      alt={props.alt}
      width={props.width}
      height={props.height}
      style={props.style}
    />
  ),
}))

// Mock external APIs
vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

// Mock AI services
vi.mock('@/lib/ai', () => ({
  generateResumeOptimization: vi.fn(),
  analyzeJobDescription: vi.fn(),
  matchSkills: vi.fn(),
}))
