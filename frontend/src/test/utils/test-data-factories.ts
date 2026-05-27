/**
 * Test data factories for generating consistent test data
 * Uses factory pattern for creating mock objects
 */

import { faker } from '@faker-js/faker'

// User factories
export function createMockUser(overrides = {}) {
  return {
    id: faker.string.uuid(),
    email: faker.internet.email(),
    username: faker.internet.userName(),
    full_name: faker.person.fullName(),
    avatar_url: faker.image.avatar(),
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    ...overrides,
  }
}

// Resume factories
export function createMockResume(overrides = {}) {
  return {
    id: faker.string.uuid(),
    user_id: faker.string.uuid(),
    title: faker.person.jobTitle(),
    content: faker.lorem.paragraphs(3),
    file_url: faker.internet.url(),
    file_name: faker.system.fileName({ extensionCount: 1 }),
    ats_score: faker.number.int({ min: 60, max: 100 }),
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    ...overrides,
  }
}

// Job Description factories
export function createMockJD(overrides = {}) {
  return {
    id: faker.string.uuid(),
    user_id: faker.string.uuid(),
    title: faker.person.jobTitle(),
    company_name: faker.company.name(),
    content: faker.lorem.paragraphs(3),
    location: faker.location.city(),
    salary_min: faker.number.int({ min: 50000, max: 100000 }),
    salary_max: faker.number.int({ min: 100000, max: 200000 }),
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    ...overrides,
  }
}

// Application factories
export function createMockApplication(overrides = {}) {
  return {
    id: faker.string.uuid(),
    user_id: faker.string.uuid(),
    resume_id: faker.string.uuid(),
    jd_id: faker.string.uuid(),
    status: faker.helpers.arrayElement([
      'draft',
      'applied',
      'under_review',
      'interview_scheduled',
      'offer_received',
      'rejected',
      'withdrawn',
    ]),
    match_score: faker.number.float({ min: 0, max: 1, precision: 0.01 }),
    notes: faker.lorem.paragraph(),
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    ...overrides,
  }
}

// Interview factories
export function createMockInterview(overrides = {}) {
  return {
    id: faker.string.uuid(),
    application_id: faker.string.uuid(),
    scheduled_at: faker.date.future().toISOString(),
    interview_type: faker.helpers.arrayElement([
      'phone_screen',
      'technical',
      'behavioral',
      'onsite',
      'panel',
    ]),
    status: faker.helpers.arrayElement([
      'scheduled',
      'completed',
      'cancelled',
      'no_show',
    ]),
    notes: faker.lorem.paragraph(),
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    ...overrides,
  }
}

// Template factories
export function createMockTemplate(overrides = {}) {
  return {
    id: faker.string.uuid(),
    user_id: faker.string.uuid(),
    name: faker.lorem.words(3),
    type: faker.helpers.arrayElement(['resume', 'cover_letter', 'email']),
    content: faker.lorem.paragraphs(5),
    tags: [faker.lorem.word(), faker.lorem.word()],
    is_public: faker.datatype.boolean(),
    usage_count: faker.number.int({ min: 0, max: 100 }),
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    ...overrides,
  }
}

// Search result factories
export function createMockSearchResults(overrides = {}) {
  const count = overrides.count || faker.number.int({ min: 1, max: 10 })
  return {
    results: Array.from({ length: count }, () => createMockApplication()),
    total: count,
    page: 1,
    per_page: 10,
    ...overrides,
  }
}

// Error response factories
export function createMockErrorResponse(overrides = {}) {
  return {
    success: false,
    error: {
      code: faker.helpers.arrayElement([
        'VALIDATION_ERROR',
        'NOT_FOUND',
        'UNAUTHORIZED',
        'SERVER_ERROR',
      ]),
      message: faker.lorem.sentence(),
      details: faker.lorem.paragraph(),
      ...overrides,
    },
  }
}

// API response factories
export function createMockApiResponse<T>(data: T, overrides = {}) {
  return {
    success: true,
    data,
    message: faker.lorem.sentence(),
    timestamp: faker.date.recent().toISOString(),
    ...overrides,
  }
}

// Pagination factories
export function createMockPagination<T>(items: T[], overrides = {}) {
  return {
    items,
    total: items.length,
    page: 1,
    per_page: 10,
    total_pages: Math.ceil(items.length / 10),
    has_next: false,
    has_prev: false,
    ...overrides,
  }
}

// Form data factories
export function createMockLoginForm(overrides = {}) {
  return {
    email: faker.internet.email(),
    password: faker.string.alphanumeric(12),
    ...overrides,
  }
}

export function createMockSignupForm(overrides = {}) {
  return {
    email: faker.internet.email(),
    username: faker.internet.userName(),
    password: faker.string.alphanumeric(12),
    full_name: faker.person.fullName(),
    ...overrides,
  }
}

export function createMockResumeUpload(overrides = {}) {
  return {
    title: faker.person.jobTitle(),
    file: new File([''], faker.system.fileName({ extensionCount: 1 }), {
      type: 'application/pdf',
    }),
    ...overrides,
  }
}

export function createMockJDInput(overrides = {}) {
  return {
    title: faker.person.jobTitle(),
    company_name: faker.company.name(),
    content: faker.lorem.paragraphs(3),
    location: faker.location.city(),
    salary_min: faker.number.int({ min: 50000, max: 100000 }),
    salary_max: faker.number.int({ min: 100000, max: 200000 }),
    ...overrides,
  }
}

// Mock session data
export function createMockSession(overrides = {}) {
  return {
    user: createMockUser(),
    access_token: faker.string.uuid(),
    refresh_token: faker.string.uuid(),
    expires_at: faker.date.future().toISOString(),
    ...overrides,
  }
}

// Mock OAuth data
export function createMockOAuthData(overrides = {}) {
  return {
    provider: faker.helpers.arrayElement(['google', 'github']),
    code: faker.string.uuid(),
    state: faker.string.uuid(),
    redirect_uri: faker.internet.url(),
    ...overrides,
  }
}
