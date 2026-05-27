/**
 * Mock API handlers for MSW (Mock Service Worker)
 * Provides consistent API mocking for tests
 */

import { http, HttpResponse } from 'msw'
import { faker } from '@faker-js/faker'
import {
  createMockUser,
  createMockResume,
  createMockJD,
  createMockApplication,
  createMockInterview,
  createMockTemplate,
  createMockSearchResults,
  createMockSession,
  createMockErrorResponse,
  createMockPagination,
  createMockApiResponse,
} from './test-data-factories'

// Base URL for API
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'

// Auth handlers
export const authHandlers = [
  // Login
  http.post(`${BASE_URL}/auth/login`, async ({ request }) => {
    const body = await request.json(); if (!body || typeof body !== "object") { return HttpResponse.json({ error: "Invalid request" }, { status: 400 }); }
    if (!body || typeof body !== 'object') {
      return HttpResponse.json({ error: 'Invalid request' }, { status: 400 })
    }
    if ('email' in body && body.email === 'error@example.com') {
      return HttpResponse.json(
        createMockErrorResponse({
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        }),
        { status: 401 }
      )
    }
    return HttpResponse.json(
      createMockApiResponse({
        user: createMockUser({ email: 'email' in body ? body.email : undefined }),
        session: createMockSession(),
      })
    )
  }),

  // Signup
  http.post(`${BASE_URL}/auth/signup`, async ({ request }) => {
    const body = await request.json(); if (!body || typeof body !== "object") { return HttpResponse.json({ error: "Invalid request" }, { status: 400 }); }
    if (body.email === 'existing@example.com') {
      return HttpResponse.json(
        createMockErrorResponse({
          code: 'USER_EXISTS',
          message: 'User already exists',
        }),
        { status: 409 }
      )
    }
    return HttpResponse.json(
      createMockApiResponse({
        user: createMockUser({ email: body.email }),
        session: createMockSession(),
      })
    )
  }),

  // Logout
  http.post(`${BASE_URL}/auth/logout`, () => {
    return HttpResponse.json(createMockApiResponse({ success: true }))
  }),

  // Get current user
  http.get(`${BASE_URL}/auth/me`, () => {
    return HttpResponse.json(createMockApiResponse(createMockUser()))
  }),

  // Refresh token
  http.post(`${BASE_URL}/auth/refresh`, () => {
    return HttpResponse.json(
      createMockApiResponse({
        session: createMockSession(),
      })
    )
  }),

  // Forgot password
  http.post(`${BASE_URL}/auth/forgot-password`, async ({ request }) => {
    const body = await request.json(); if (!body || typeof body !== "object") { return HttpResponse.json({ error: "Invalid request" }, { status: 400 }); }
    return HttpResponse.json(
      createMockApiResponse({
        message: 'Password reset email sent',
        email: body.email,
      })
    )
  }),

  // Reset password
  http.post(`${BASE_URL}/auth/reset-password`, async ({ request }) => {
    const body = await request.json(); if (!body || typeof body !== "object") { return HttpResponse.json({ error: "Invalid request" }, { status: 400 }); }
    if (body.token === 'invalid-token') {
      return HttpResponse.json(
        createMockErrorResponse({
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired reset token',
        }),
        { status: 400 }
      )
    }
    return HttpResponse.json(
      createMockApiResponse({
        message: 'Password reset successful',
      })
    )
  }),

  // OAuth handlers
  http.get(`${BASE_URL}/auth/oauth/:provider/callback`, () => {
    return HttpResponse.json(
      createMockApiResponse({
        user: createMockUser(),
        session: createMockSession(),
      })
    )
  }),
]

// 2FA handlers
export const twoFactorHandlers = [
  // Setup 2FA
  http.post(`${BASE_URL}/auth/2fa/setup`, () => {
    return HttpResponse.json(
      createMockApiResponse({
        qr_code: faker.image.url(),
        backup_codes: Array.from({ length: 10 }, () => faker.string.alphanumeric(8)),
      })
    )
  }),

  // Verify 2FA
  http.post(`${BASE_URL}/auth/2fa/verify`, async ({ request }) => {
    const body = await request.json(); if (!body || typeof body !== "object") { return HttpResponse.json({ error: "Invalid request" }, { status: 400 }); }
    if (body.code === '123456') {
      return HttpResponse.json(
        createMockApiResponse({
          verified: true,
        })
      )
    }
    return HttpResponse.json(
      createMockErrorResponse({
        code: 'INVALID_CODE',
        message: 'Invalid verification code',
      }),
      { status: 400 }
    )
  }),

  // Disable 2FA
  http.post(`${BASE_URL}/auth/2fa/disable`, () => {
    return HttpResponse.json(
      createMockApiResponse({
        message: '2FA disabled successfully',
      })
    )
  }),
]

// Resume handlers
export const resumeHandlers = [
  // List resumes
  http.get(`${BASE_URL}/resumes`, () => {
    const resumes = Array.from({ length: 5 }, () => createMockResume())
    return HttpResponse.json(
      createMockApiResponse(createMockPagination(resumes))
    )
  }),

  // Get resume by ID
  http.get(`${BASE_URL}/resumes/:id`, ({ params }) => {
    if (params.id === 'not-found') {
      return HttpResponse.json(
        createMockErrorResponse({
          code: 'NOT_FOUND',
          message: 'Resume not found',
        }),
        { status: 404 }
      )
    }
    return HttpResponse.json(
      createMockApiResponse(createMockResume({ id: params.id }))
    )
  }),

  // Create resume
  http.post(`${BASE_URL}/resumes`, async ({ request }) => {
    const body = await request.json(); if (!body || typeof body !== "object") { return HttpResponse.json({ error: "Invalid request" }, { status: 400 }); }
    return HttpResponse.json(
      createMockApiResponse(
        createMockResume({
          title: body.title,
          content: body.content,
        })
      )
    )
  }),

  // Update resume
  http.put(`${BASE_URL}/resumes/:id`, async ({ params, request }) => {
    const body = await request.json(); if (!body || typeof body !== "object") { return HttpResponse.json({ error: "Invalid request" }, { status: 400 }); }
    return HttpResponse.json(
      createMockApiResponse(
        createMockResume({
          id: params.id,
          title: body.title,
          content: body.content,
        })
      )
    )
  }),

  // Delete resume
  http.delete(`${BASE_URL}/resumes/:id`, () => {
    return HttpResponse.json(
      createMockApiResponse({
        message: 'Resume deleted successfully',
      })
    )
  }),

  // Upload resume file
  http.post(`${BASE_URL}/resumes/upload`, () => {
    return HttpResponse.json(
      createMockApiResponse(
        createMockResume({
          file_url: faker.internet.url(),
          file_name: faker.system.fileName({ extensionCount: 1 }),
        })
      )
    )
  }),

  // Parse resume
  http.post(`${BASE_URL}/resumes/:id/parse`, () => {
    return HttpResponse.json(
      createMockApiResponse({
        parsed_data: {
          contact: {
            name: faker.person.fullName(),
            email: faker.internet.email(),
            phone: faker.phone.number(),
          },
          experience: [
            {
              title: faker.person.jobTitle(),
              company: faker.company.name(),
              duration: '2 years',
              description: faker.lorem.paragraph(),
            },
          ],
          education: [
            {
              degree: faker.lorem.sentence(),
              school: faker.company.name(),
              year: faker.date.past().getFullYear().toString(),
            },
          ],
          skills: [faker.lorem.word(), faker.lorem.word(), faker.lorem.word()],
        },
        ats_score: faker.number.int({ min: 70, max: 95 }),
      })
    )
  }),
]

// Job Description handlers
export const jdHandlers = [
  // List JDs
  http.get(`${BASE_URL}/jds`, () => {
    const jds = Array.from({ length: 5 }, () => createMockJD())
    return HttpResponse.json(createMockApiResponse(createMockPagination(jds)))
  }),

  // Get JD by ID
  http.get(`${BASE_URL}/jds/:id`, ({ params }) => {
    if (params.id === 'not-found') {
      return HttpResponse.json(
        createMockErrorResponse({
          code: 'NOT_FOUND',
          message: 'Job description not found',
        }),
        { status: 404 }
      )
    }
    return HttpResponse.json(
      createMockApiResponse(createMockJD({ id: params.id }))
    )
  }),

  // Create JD
  http.post(`${BASE_URL}/jds`, async ({ request }) => {
    const body = await request.json(); if (!body || typeof body !== "object") { return HttpResponse.json({ error: "Invalid request" }, { status: 400 }); }
    return HttpResponse.json(
      createMockApiResponse(
        createMockJD({
          title: body.title,
          company_name: body.company_name,
          content: body.content,
        })
      )
    )
  }),

  // Update JD
  http.put(`${BASE_URL}/jds/:id`, async ({ params, request }) => {
    const body = await request.json(); if (!body || typeof body !== "object") { return HttpResponse.json({ error: "Invalid request" }, { status: 400 }); }
    return HttpResponse.json(
      createMockApiResponse(
        createMockJD({
          id: params.id,
          title: body.title,
          company_name: body.company_name,
          content: body.content,
        })
      )
    )
  }),

  // Delete JD
  http.delete(`${BASE_URL}/jds/:id`, () => {
    return HttpResponse.json(
      createMockApiResponse({
        message: 'Job description deleted successfully',
      })
    )
  }),

  // Parse JD
  http.post(`${BASE_URL}/jds/:id/parse`, () => {
    return HttpResponse.json(
      createMockApiResponse({
        parsed_data: {
          title: faker.person.jobTitle(),
          company: faker.company.name(),
          requirements: [faker.lorem.word(), faker.lorem.word(), faker.lorem.word()],
          nice_to_have: [faker.lorem.word(), faker.lorem.word()],
          location: faker.location.city(),
          salary: {
            min: faker.number.int({ min: 80000, max: 120000 }),
            max: faker.number.int({ min: 120000, max: 180000 }),
          },
        },
        confidence_score: faker.number.float({ min: 0.8, max: 0.95, precision: 0.01 }),
      })
    )
  }),
]

// Application handlers
export const applicationHandlers = [
  // List applications
  http.get(`${BASE_URL}/applications`, () => {
    const applications = Array.from({ length: 5 }, () => createMockApplication())
    return HttpResponse.json(
      createMockApiResponse(createMockPagination(applications))
    )
  }),

  // Get application by ID
  http.get(`${BASE_URL}/applications/:id`, ({ params }) => {
    if (params.id === 'not-found') {
      return HttpResponse.json(
        createMockErrorResponse({
          code: 'NOT_FOUND',
          message: 'Application not found',
        }),
        { status: 404 }
      )
    }
    return HttpResponse.json(
      createMockApiResponse(createMockApplication({ id: params.id }))
    )
  }),

  // Create application
  http.post(`${BASE_URL}/applications`, async ({ request }) => {
    const body = await request.json(); if (!body || typeof body !== "object") { return HttpResponse.json({ error: "Invalid request" }, { status: 400 }); }
    return HttpResponse.json(
      createMockApiResponse(
        createMockApplication({
          resume_id: body.resume_id,
          jd_id: body.jd_id,
        })
      )
    )
  }),

  // Update application status
  http.patch(`${BASE_URL}/applications/:id/status`, async ({ request }) => {
    const body = await request.json(); if (!body || typeof body !== "object") { return HttpResponse.json({ error: "Invalid request" }, { status: 400 }); }
    return HttpResponse.json(
      createMockApiResponse(
        createMockApplication({
          id: body.id,
          status: body.status,
        })
      )
    )
  }),

  // Update application notes
  http.patch(`${BASE_URL}/applications/:id/notes`, async ({ request }) => {
    const body = await request.json(); if (!body || typeof body !== "object") { return HttpResponse.json({ error: "Invalid request" }, { status: 400 }); }
    return HttpResponse.json(
      createMockApiResponse(
        createMockApplication({
          id: body.id,
          notes: body.notes,
        })
      )
    )
  }),

  // Delete application
  http.delete(`${BASE_URL}/applications/:id`, () => {
    return HttpResponse.json(
      createMockApiResponse({
        message: 'Application deleted successfully',
      })
    )
  }),
]

// Interview handlers
export const interviewHandlers = [
  // List interviews for application
  http.get(`${BASE_URL}/applications/:id/interviews`, () => {
    const interviews = Array.from({ length: 3 }, () => createMockInterview())
    return HttpResponse.json(
      createMockApiResponse(createMockPagination(interviews))
    )
  }),

  // Create interview
  http.post(`${BASE_URL}/applications/:id/interviews`, async ({ request }) => {
    const body = await request.json(); if (!body || typeof body !== "object") { return HttpResponse.json({ error: "Invalid request" }, { status: 400 }); }
    return HttpResponse.json(
      createMockApiResponse(
        createMockInterview({
          application_id: body.application_id,
          scheduled_at: body.scheduled_at,
          interview_type: body.interview_type,
        })
      )
    )
  }),

  // Update interview
  http.put(`${BASE_URL}/interviews/:id`, async ({ params, request }) => {
    const body = await request.json(); if (!body || typeof body !== "object") { return HttpResponse.json({ error: "Invalid request" }, { status: 400 }); }
    return HttpResponse.json(
      createMockApiResponse(
        createMockInterview({
          id: params.id,
          scheduled_at: body.scheduled_at,
          interview_type: body.interview_type,
          status: body.status,
          notes: body.notes,
        })
      )
    )
  }),

  // Delete interview
  http.delete(`${BASE_URL}/interviews/:id`, () => {
    return HttpResponse.json(
      createMockApiResponse({
        message: 'Interview deleted successfully',
      })
    )
  }),
]

// Template handlers
export const templateHandlers = [
  // List templates
  http.get(`${BASE_URL}/templates`, () => {
    const templates = Array.from({ length: 5 }, () => createMockTemplate())
    return HttpResponse.json(
      createMockApiResponse(createMockPagination(templates))
    )
  }),

  // Get template by ID
  http.get(`${BASE_URL}/templates/:id`, ({ params }) => {
    if (params.id === 'not-found') {
      return HttpResponse.json(
        createMockErrorResponse({
          code: 'NOT_FOUND',
          message: 'Template not found',
        }),
        { status: 404 }
      )
    }
    return HttpResponse.json(
      createMockApiResponse(createMockTemplate({ id: params.id }))
    )
  }),

  // Create template
  http.post(`${BASE_URL}/templates`, async ({ request }) => {
    const body = await request.json(); if (!body || typeof body !== "object") { return HttpResponse.json({ error: "Invalid request" }, { status: 400 }); }
    return HttpResponse.json(
      createMockApiResponse(
        createMockTemplate({
          name: body.name,
          type: body.type,
          content: body.content,
        })
      )
    )
  }),

  // Update template
  http.put(`${BASE_URL}/templates/:id`, async ({ params, request }) => {
    const body = await request.json(); if (!body || typeof body !== "object") { return HttpResponse.json({ error: "Invalid request" }, { status: 400 }); }
    return HttpResponse.json(
      createMockApiResponse(
        createMockTemplate({
          id: params.id,
          name: body.name,
          type: body.type,
          content: body.content,
        })
      )
    )
  }),

  // Delete template
  http.delete(`${BASE_URL}/templates/:id`, () => {
    return HttpResponse.json(
      createMockApiResponse({
        message: 'Template deleted successfully',
      })
    )
  }),
]

// Search handlers
export const searchHandlers = [
  // Search resumes
  http.get(`${BASE_URL}/search/resumes`, () => {
    const resumes = Array.from({ length: 5 }, () => createMockResume())
    return HttpResponse.json(
      createMockApiResponse({
        results: resumes,
        total: resumes.length,
      })
    )
  }),

  // Search JDs
  http.get(`${BASE_URL}/search/jds`, () => {
    const jds = Array.from({ length: 5 }, () => createMockJD())
    return HttpResponse.json(
      createMockApiResponse({
        results: jds,
        total: jds.length,
      })
    )
  }),

  // Search applications
  http.get(`${BASE_URL}/search/applications`, () => {
    const applications = Array.from({ length: 5 }, () => createMockApplication())
    return HttpResponse.json(
      createMockApiResponse({
        results: applications,
        total: applications.length,
      })
    )
  }),
]

// Analytics handlers
export const analyticsHandlers = [
  // Get application analytics
  http.get(`${BASE_URL}/analytics/applications`, () => {
    return HttpResponse.json(
      createMockApiResponse({
        total_applications: faker.number.int({ min: 10, max: 100 }),
        active_applications: faker.number.int({ min: 5, max: 50 }),
        interviews_scheduled: faker.number.int({ min: 1, max: 20 }),
        offers_received: faker.number.int({ min: 0, max: 10 }),
        status_breakdown: {
          draft: faker.number.int({ min: 1, max: 10 }),
          applied: faker.number.int({ min: 5, max: 30 }),
          under_review: faker.number.int({ min: 2, max: 15 }),
          interview_scheduled: faker.number.int({ min: 1, max: 10 }),
          offer_received: faker.number.int({ min: 0, max: 5 }),
          rejected: faker.number.int({ min: 1, max: 10 }),
          withdrawn: faker.number.int({ min: 0, max: 5 }),
        },
      })
    )
  }),

  // Get resume analytics
  http.get(`${BASE_URL}/analytics/resumes`, () => {
    return HttpResponse.json(
      createMockApiResponse({
        total_resumes: faker.number.int({ min: 1, max: 10 }),
        avg_ats_score: faker.number.float({ min: 70, max: 95, precision: 0.1 }),
        top_skills: [faker.lorem.word(), faker.lorem.word(), faker.lorem.word()],
      })
    )
  }),
]

// Export all handlers
export const allHandlers = [
  ...authHandlers,
  ...twoFactorHandlers,
  ...resumeHandlers,
  ...jdHandlers,
  ...applicationHandlers,
  ...interviewHandlers,
  ...templateHandlers,
  ...searchHandlers,
  ...analyticsHandlers,
]
