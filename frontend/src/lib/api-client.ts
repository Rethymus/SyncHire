/**
 * API Client — single consolidated client.
 *
 * Two request cores live here on purpose; consumers depend on both semantics:
 *
 * 1. Envelope core (`APIClient` / `apiClient` singleton, `authAPI`,
 *    `interviewAPI`, `resumeAPI`, `jdAPI`, `applicationAPI`): returns
 *    `{ data, error, status }` and never throws. Merged from the former
 *    api-client.ts and api-client-consolidated.ts.
 * 2. Direct-return core (`unifiedClient`, `jobSourceAPI`, `companyAPI`,
 *    `signalFeedAPI`): returns parsed JSON and throws on HTTP errors.
 *    Merged from the former api-client-unified.ts and api-client-lite.ts.
 *
 * Do not add a third variant — extend one of these two.
 */

import { getCSRFTokenHeader, addCSRFHeaders } from './csrf';
import { getAccessToken, refreshAccessToken, clearAuthData } from './auth';
import { logger, LogCategory } from './logger';

interface APIResponse<T> {
  data?: T;
  error?: string | APIError;
  status: number;
  /** Present when the request completed (kept for callers migrated from api-client-consolidated). */
  success?: boolean;
}

interface APIError {
  message: string;
  code?: string;
  details?: unknown;
}

// ---------------------------------------------------------------------------
// Core 1: envelope-style client (never throws)
// ---------------------------------------------------------------------------

class APIClient {
  private baseURL: string;
  private timeout: number;
  private retryCount: number;

  constructor(
    baseURL: string = process.env.NEXT_PUBLIC_API_URL || '/api',
    timeout: number = 30000,
    retryCount: number = 3
  ) {
    this.baseURL = baseURL;
    this.timeout = timeout;
    this.retryCount = retryCount;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<APIResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      // Add auth token if available
      const token = getAccessToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> || {}),
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      let response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers,
      });

      clearTimeout(timeoutId);

      // Handle 401 - try to refresh token
      if (response.status === 401 && token) {
        const newToken = await refreshAccessToken();
        if (newToken) {
          headers.Authorization = `Bearer ${newToken}`;
          response = await fetch(url, {
            ...options,
            signal: controller.signal,
            headers,
          });
        } else {
          // Token refresh failed, clear auth data
          clearAuthData();
          return {
            error: 'Authentication failed. Please login again.',
            status: 401,
            success: false,
          };
        }
      }

      if (!response.ok) {
        const error: APIError = await response.json().catch(() => ({
          message: `HTTP error! status: ${response.status}`,
        }));

        return {
          error: error.message,
          status: response.status,
          success: false,
        };
      }

      const data = await response.json();
      return {
        data,
        status: response.status,
        success: true,
      };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return {
            error: '请求超时，请稍后重试',
            status: 408,
            success: false,
          };
        }

        return {
          error: error.message,
          status: 500,
          success: false,
        };
      }

      return {
        error: '未知错误',
        status: 500,
        success: false,
      };
    }
  }

  async get<T>(endpoint: string, headers?: HeadersInit): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'GET',
      headers,
    });
  }

  async post<T>(
    endpoint: string,
    data: unknown,
    headers?: HeadersInit
  ): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      headers: addCSRFHeaders(headers),
      body: JSON.stringify(data),
    });
  }

  async put<T>(
    endpoint: string,
    data: unknown,
    headers?: HeadersInit
  ): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      headers: addCSRFHeaders(headers),
      body: JSON.stringify(data),
    });
  }

  async patch<T>(
    endpoint: string,
    data: unknown,
    headers?: HeadersInit
  ): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      headers: addCSRFHeaders(headers),
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string, headers?: HeadersInit): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
      headers: addCSRFHeaders(headers),
    });
  }
}

// Export singleton instance
export const apiClient = new APIClient();

// Export class for testing
export { APIClient };

/**
 * Auth API endpoints
 */
export const authAPI = {
  register: (data: { full_name: string; email: string; password: string }) =>
    apiClient.post<{ id: string; email: string; full_name: string; is_active: boolean }>('/auth/register', data),

  login: (data: { email: string; password: string }) =>
    apiClient.post<{ access_token: string; refresh_token: string; token_type: string }>('/auth/login', data),

  logout: () => apiClient.post<void>('/auth/logout', {}),

  verifyEmail: (token: string) =>
    apiClient.post<void>('/auth/verify-email', { token }),

  getCurrentUser: () => apiClient.get<{ id: string; email: string; full_name: string; is_active: boolean }>('/auth/me'),

  // OAuth endpoints
  getOAuthProviders: () => apiClient.get<{
    providers: {
      google: { available: boolean; display_name: string };
      github: { available: boolean; display_name: string };
    }
  }>('/oauth/providers'),

  getOAuthAuthorizationURL: (provider: 'google' | 'github') =>
    apiClient.get<{ authorization_url: string; provider: string }>(`/oauth/authorize/${provider}`),

  oauthCallback: (data: { code: string; redirect_uri: string; provider: 'google' | 'github' }) =>
    apiClient.post<{
      access_token: string;
      refresh_token: string;
      token_type: string;
      user_info: {
        id: string;
        email: string;
        full_name: string;
        is_active: boolean;
        provider: string;
      };
    }>('/oauth/callback', data),
};

// ---------------------------------------------------------------------------
// Envelope-core entity types
//
// Mirrored from the lite backend OpenAPI schema (GET http://localhost:8000/openapi.json):
//   - LiteResume       ← ResumeResponse         (/api/resumes)
//   - LiteJd           ← JobDescriptionResponse (/api/jds)
//   - LiteApplication  ← ApplicationResponse    (/api/applications)
// Field names stay snake_case because they match the backend JSON verbatim.
//
// The remaining interfaces (BulkOperationResult, ApplicationStatusHistory,
// MatchDetails, etc.) document the legacy frontend contracts for endpoints
// the lite backend does not (yet) expose in its OpenAPI schema.
// ---------------------------------------------------------------------------

/** Application status values (openapi: ApplicationStatus enum). */
export type ApplicationStatus =
  | 'saved'
  | 'targeted'
  | 'materials_ready'
  | 'submitted'
  | 'applied'
  | 'screening'
  | 'interview'
  | 'technical'
  | 'offer'
  | 'hired'
  | 'rejected'
  | 'withdrawn';

/** Resume as returned by the lite backend (openapi: ResumeResponse). */
export interface LiteResume {
  id: string;
  title: string;
  content: string;
  file_name?: string | null;
  created_at: string;
  updated_at: string;
}

/** Job description as returned by the lite backend (openapi: JobDescriptionResponse). */
export interface LiteJd {
  id: string;
  company: string;
  title: string;
  description: string;
  url?: string | null;
  /** Backend default: "manual". */
  platform?: string;
  source_url?: string | null;
  raw_text?: string | null;
  source?: string | null;
  external_id?: string | null;
  location?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  currency?: string;
  employment_type?: string | null;
  /** Backend default: "onsite". */
  remote?: string;
  parsed_json?: Record<string, unknown> | null;
  match_score?: number | null;
  match_detail?: Record<string, unknown> | null;
  /** Backend default: "auto". */
  language?: string;
  deadline?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

/** Application as returned by the lite backend (openapi: ApplicationResponse). */
export interface LiteApplication {
  id: string;
  resume_id: string;
  jd_id: string;
  status: ApplicationStatus;
  resume_variant_id?: string | null;
  materials_id?: string | null;
  /** Backend default: "manual". */
  platform?: string;
  source_url?: string | null;
  notes?: string | null;
  match_score?: number | null;
  applied_date?: string | null;
  submitted_manually_at?: string | null;
  next_action?: string | null;
  next_action_at?: string | null;
  contact_name?: string | null;
  contact_channel?: string | null;
  timeline?: Array<Record<string, unknown>> | null;
  last_updated?: string | null;
  created_at: string;
  updated_at: string;
}

/** Result shape of the bulk delete/update endpoints (legacy frontend contract). */
export interface BulkOperationResult {
  success_count: number;
  failed_count: number;
  errors: Array<{ id: string; error: string }>;
}

/** One entry of an application's status history (legacy frontend contract). */
export interface ApplicationStatusHistory {
  id: string;
  old_status: string | null;
  new_status: string;
  notes: string | null;
  changed_at: string;
}

/** Structured match breakdown (legacy frontend contract). */
export interface MatchDetails {
  skills_match: number;
  experience_match: number;
  education_match: number;
  missing_skills: string[];
  recommendations: string[];
}

/** Payload returned by the match-score endpoint (legacy frontend contract). */
export interface MatchScoreResult {
  match_score: number;
  match_details: MatchDetails;
}

/** Fields shared by the AI optimize results (legacy frontend contract). */
interface OptimizationResultFields {
  changes_made: string[];
  keywords_added: string[];
  sections_improved: string[];
}

/** Result of resume optimization (legacy frontend contract). */
export interface ResumeOptimizationResult extends OptimizationResultFields {
  optimized_content: string;
}

/** Result of application-level resume optimization (legacy frontend contract). */
export interface ApplicationOptimizationResult extends OptimizationResultFields {
  optimized_resume: string;
}

/** Result of JD analysis (legacy frontend contract; camelCase field kept for compatibility). */
export interface JdAnalysisResult {
  score: number;
  skills: string[];
  missingSkills: string[];
  recommendations: string[];
}

/** Result of JD text parsing (legacy frontend contract). */
export interface JdParseResult {
  title: string;
  company: string;
  description: string;
  requirements: string[];
}

/**
 * Resume API endpoints (envelope core)
 */
export const resumeAPI = {
  list: () => apiClient.get<LiteResume[]>('/resumes'),

  get: (id: string) => apiClient.get<LiteResume>(`/resumes/${id}`),

  getById: (id: string) => apiClient.get<LiteResume>(`/resumes/${id}`),

  create: (data: { title: string; content: string }) =>
    apiClient.post<LiteResume>('/resumes', data),

  update: (id: string, data: unknown) => apiClient.put<LiteResume>(`/resumes/${id}`, data),

  delete: (id: string) => apiClient.delete<void>(`/resumes/${id}`),

  export: (id: string, template: string = 'minimal', dpi?: number) =>
    apiClient.get<{ url: string }>(`/resumes/${id}/export?template=${template}${dpi ? `&dpi=${dpi}` : ''}`),

  upload: (file: File, title?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title || file.name.replace(/\.[^/.]+$/, ''));

    return fetch('/api/resumes', {
      method: 'POST',
      body: formData,
    });
  },

  optimize: (id: string, jdContent: string) =>
    apiClient.post<ResumeOptimizationResult>(`/resumes/${id}/optimize`, { jd_content: jdContent }),

  bulkDelete: (ids: string[]) =>
    apiClient.post<BulkOperationResult>('/resumes/bulk-delete', { ids }),
};

/**
 * Job Description API endpoints (envelope core)
 */
export const jdAPI = {
  list: () => apiClient.get<LiteJd[]>('/jds/'),

  getById: (id: string) => apiClient.get<LiteJd>(`/jds/${id}`),

  analyze: (data: { description: string; requirements?: string[] }) =>
    apiClient.post<JdAnalysisResult>('/jd/analyze', data),

  parse: (text: string) =>
    apiClient.post<JdParseResult>('/jd/parse', { text }),

  upload: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    return fetch('/api/jds/upload', {
      method: 'POST',
      headers: {
        ...addCSRFHeaders({}),
      },
      body: formData,
    });
  },

  delete: (id: string) => apiClient.delete<void>(`/jds/${id}`),

  bulkDelete: (ids: string[]) =>
    apiClient.post<BulkOperationResult>('/jds/bulk-delete', { ids }),
};

/**
 * Application API endpoints (envelope core)
 */
export const applicationAPI = {
  create: (data: { resume_id: string; jd_id: string; notes?: string }) =>
    apiClient.post<LiteApplication>('/applications/', data),

  list: () => apiClient.get<LiteApplication[]>('/applications/'),

  getById: (id: string) => apiClient.get<LiteApplication>(`/applications/${id}`),

  update: (id: string, data: { notes?: string; status?: string }) =>
    apiClient.put<LiteApplication>(`/applications/${id}`, data),

  // Accepts both historical signatures: (id, status, notes?) from the old
  // api-client and (id, { status, notes }) from api-client-consolidated.
  updateStatus: (
    id: string,
    statusOrData: string | { status: string; notes?: string },
    notes?: string
  ) => {
    const payload = typeof statusOrData === 'string'
      ? { status: statusOrData, notes }
      : { status: statusOrData.status, notes: statusOrData.notes };

    return apiClient.patch<LiteApplication>(`/applications/${id}/status`, payload);
  },

  delete: (id: string) => apiClient.delete<void>(`/applications/${id}`),

  bulkDelete: (ids: string[]) =>
    apiClient.post<BulkOperationResult>('/applications/bulk-delete', { ids }),

  bulkUpdate: (updates: Array<{ id: string; status?: string; notes?: string }>) =>
    apiClient.post<BulkOperationResult>('/applications/bulk-update', { updates }),

  bulkStatusUpdate: (ids: string[], status: string, notes?: string) =>
    apiClient.post<BulkOperationResult>('/applications/bulk-status-update', { ids, status, notes }),

  bulkNotesUpdate: (ids: string[], notes: string, append: boolean = true) =>
    apiClient.post<BulkOperationResult>('/applications/bulk-notes-update', { ids, notes, append }),

  getMatchScore: (id: string) =>
    apiClient.get<MatchScoreResult>(`/applications/${id}/match`),

  optimizeResume: (id: string) =>
    apiClient.post<ApplicationOptimizationResult>(`/applications/${id}/optimize`, {}),

  getInterviewPrep: (id: string) =>
    apiClient.get<any>(`/applications/${id}/interview-prep`),

  getStatusHistory: (id: string) =>
    apiClient.get<ApplicationStatusHistory[]>(`/applications/${id}/history`),
};

/**
 * Interview API endpoints (envelope core)
 */
export const interviewAPI = {
  create: (data: {
    application_id: string;
    title: string;
    description?: string;
    interview_type: string;
    scheduled_date: string;
    duration_minutes: number;
    timezone?: string;
    location_type: string;
    location_url?: string;
    location_address?: string;
    meeting_platform?: string;
    meeting_id?: string;
    meeting_password?: string;
    interviewers?: Array<{ name: string; role?: string; email?: string }>;
    preparation_notes?: string;
    reminder_enabled?: boolean;
    reminder_timings?: number[];
  }) => apiClient.post('/interviews', data),

  list: (params?: {
    page?: number;
    page_size?: number;
    status?: string;
    interview_type?: string;
    from_date?: string;
    to_date?: string;
  }) => {
    const queryString = new URLSearchParams(params as any).toString();
    return apiClient.get(`/interviews${queryString ? `?${queryString}` : ''}`);
  },

  getCalendar: (year: number, month: number) =>
    apiClient.get(`/interviews/calendar?year=${year}&month=${month}`),

  getStats: () => apiClient.get('/interviews/stats'),

  get: (id: string) => apiClient.get(`/interviews/${id}`),

  update: (id: string, data: any) => apiClient.put(`/interviews/${id}`, data),

  delete: (id: string) => apiClient.delete(`/interviews/${id}`),

  submitFeedback: (id: string, data: {
    feedback: string;
    rating?: number;
    next_steps?: string;
  }) => apiClient.post(`/interviews/${id}/feedback`, data),
};

/**
 * Mock API for development/testing
 */
export const mockAPI = {
  // Mock auth endpoints
  mockRegister: async (data: { name: string; email: string; password: string }) => {
    await new Promise(resolve => setTimeout(resolve, 1500));
    return {
      data: {
        userId: 'mock-user-123',
        token: 'mock-jwt-token',
      },
      status: 200,
    };
  },

  mockLogin: async (data: { email: string; password: string }) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return {
      data: {
        userId: 'mock-user-123',
        token: 'mock-jwt-token',
      },
      status: 200,
    };
  },

  // Mock JD analysis
  mockAnalyzeJD: async (data: { description: string; requirements?: string[] }) => {
    await new Promise(resolve => setTimeout(resolve, 2000));
    return {
      data: {
        score: 75,
        skills: ['JavaScript', 'React', 'TypeScript'],
        missingSkills: ['GraphQL', 'AWS'],
        recommendations: [
          '添加更多项目经验',
          '强调技术栈深度',
          '补充量化成果',
        ],
      },
      status: 200,
    };
  },

  // Mock file upload
  mockUpload: async (file: File) => {
    await new Promise(resolve => setTimeout(resolve, 3000));

    return {
      data: {
        id: `resume-${Date.now()}`,
        name: file.name,
        uploadedAt: new Date().toISOString(),
      },
      status: 200,
    };
  },

  // Mock PDF generation
  mockGeneratePDF: async (html: string) => {
    await new Promise(resolve => setTimeout(resolve, 2000));

    return {
      data: {
        url: `/temp/resume-${Date.now()}.pdf`,
      },
      status: 200,
    };
  },
};

// Export types for use in components
export type { APIResponse, APIError };

/**
 * Normalize an APIResponse error (string or APIError) to a message string.
 */
export function apiErrorMessage(
  error: string | APIError | undefined,
  fallback = 'Request failed'
): string {
  if (!error) return fallback;
  return typeof error === 'string' ? error : error.message || fallback;
}

// ---------------------------------------------------------------------------
// Core 2: direct-return client (throws on HTTP errors)
// ---------------------------------------------------------------------------

// Feature flag for auth mode (can be overridden by env var)
const ENABLE_AUTH = process.env.NEXT_PUBLIC_ENABLE_AUTH === 'true';

/**
 * Unified API Client - Supports both authenticated and lite modes.
 * Returns parsed JSON directly and throws on errors.
 */
class UnifiedAPIClient {
  private baseURL: string;
  private timeout: number;
  private retryCount: number;
  private enableAuth: boolean;

  constructor(config?: Partial<{
    baseURL: string;
    timeout: number;
    retryCount: number;
    enableAuth: boolean;
  }>) {
    this.baseURL = config?.baseURL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    this.timeout = config?.timeout ?? 30000;
    this.retryCount = config?.retryCount ?? 3;
    this.enableAuth = config?.enableAuth ?? ENABLE_AUTH;
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    if (!this.enableAuth) {
      return {};
    }

    try {
      // Dynamic import to avoid requiring auth module in lite mode
      const { getAccessToken } = await import('./auth');
      const token = getAccessToken();
      if (token) {
        return { Authorization: `Bearer ${token}` };
      }
    } catch (error) {
      logger.warn(LogCategory.API, 'Auth module not available, running in lite mode');
    }

    return {};
  }

  private async getCSRFHeaders(): Promise<Record<string, string>> {
    if (!this.enableAuth) {
      return {};
    }

    try {
      const { getCSRFTokenHeader } = await import('./csrf');
      const token = getCSRFTokenHeader();
      return token ? { 'X-CSRF-Token': token } : {};
    } catch (error) {
      logger.warn(LogCategory.API, 'CSRF module not available');
    }

    return {};
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      // Build headers
      const authHeaders = await this.getAuthHeaders();
      const csrfHeaders = await this.getCSRFHeaders();

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...csrfHeaders,
        ...(options.headers as Record<string, string> || {}),
      };

      logger.info(LogCategory.API, `API Request: ${options.method || 'GET'} ${url}`);

      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.text().catch(() => 'Unknown error');
        logger.error(LogCategory.API, `API Error: ${response.status} ${error}`);

        // Try to refresh token if unauthorized and auth is enabled
        if (response.status === 401 && this.enableAuth) {
          try {
            const { refreshAccessToken } = await import('./auth');
            const refreshed = await refreshAccessToken();
            if (refreshed) {
              // Retry request with new token
              return this.request<T>(endpoint, options);
            }
          } catch (refreshError) {
            logger.error(LogCategory.API, 'Token refresh failed', refreshError as Error);
          }
        }

        throw new Error(error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      logger.info(LogCategory.API, `API Success: ${url}`);
      return data as T;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        logger.error(LogCategory.API, `Request timeout: ${url}`);
        throw new Error('Request timeout');
      }

      logger.error(LogCategory.API, `API Request Failed: ${url}`, error as Error);
      throw error;
    }
  }

  // Resumes API
  resume = {
    list: () => this.request<any[]>('/api/resumes'),
    get: (id: string) => this.request<any>(`/api/resumes/${id}`),
    create: (data: any) => this.request<any>('/api/resumes', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id: string, data: any) => this.request<any>(`/api/resumes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    delete: (id: string) => this.request<void>(`/api/resumes/${id}`, {
      method: 'DELETE',
    }),
    optimize: (id: string) => this.request<any>(`/api/resumes/${id}/optimize`, {
      method: 'POST',
    }),
    upload: async (id: string, file: File) => {
      const formData = new FormData();
      formData.append('file', file);

      const authHeaders = await this.getAuthHeaders();

      return this.request<any>(`/api/resumes`, {
        method: 'POST',
        headers: {
          ...authHeaders,
          // Let browser set Content-Type for FormData
        },
        body: formData as any,
      });
    },
  };

  // Job Descriptions API
  jd = {
    list: () => this.request<any[]>('/api/jds'),
    get: (id: string) => this.request<any>(`/api/jds/${id}`),
    create: (data: any) => this.request<any>('/api/jds', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id: string, data: any) => this.request<any>(`/api/jds/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    delete: (id: string) => this.request<void>(`/api/jds/${id}`, {
      method: 'DELETE',
    }),
    parse: (content: string, url?: string) => this.request<any>('/api/jds/parse', {
      method: 'POST',
      body: JSON.stringify({ content, url }),
    }),
    import: (url: string) => this.request<any>('/api/jds/import', {
      method: 'POST',
      body: JSON.stringify({ url }),
    }),
  };

  // Applications API
  application = {
    list: (statusFilter?: string) => this.request<any[]>(
      `/api/applications${statusFilter ? `?status_filter=${statusFilter}` : ''}`
    ),
    get: (id: string) => this.request<any>(`/api/applications/${id}`),
    create: (data: any) => this.request<any>('/api/applications', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id: string, data: any) => this.request<any>(`/api/applications/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    delete: (id: string) => this.request<void>(`/api/applications/${id}`, {
      method: 'DELETE',
    }),
    calculateMatch: (id: string) => this.request<any>(`/api/applications/${id}/match`, {
      method: 'POST',
    }),
    batchUpdate: (ids: string[], status?: string) => this.request<any>('/api/applications/batch-update', {
      method: 'POST',
      body: JSON.stringify({
        application_ids: ids,
        status,
      }),
    }),
  };

  // Search API
  search = {
    search: (query: string, type: string = 'all', limit: number = 20, offset: number = 0) =>
      this.request<any>('/api/search', {
        method: 'POST',
        body: JSON.stringify({ query, type, limit, offset }),
      }),
    semantic: (query: string, type: string = 'all', limit: number = 20) =>
      this.request<any>('/api/search/semantic', {
        method: 'POST',
        body: JSON.stringify({ query, type, limit }),
      }),
    match: (resumeId: string, jdId: string) =>
      this.request<any>('/api/search/match', {
        method: 'POST',
        body: JSON.stringify({
          resume_id: resumeId,
          jd_id: jdId,
        }),
      }),
    suggestions: (query: string, limit: number = 5) =>
      this.request<any>(`/api/search/suggestions?query=${encodeURIComponent(query)}&limit=${limit}`),
    statistics: () => this.request<any>('/api/search/statistics'),
  };

  // Generic HTTP methods for advanced use cases (like search history)
  post<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'GET',
    });
  }

  put<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }

  // Data Portability API
  portability = {
    exportJSON: () => this.request<any>('/api/portability/export/json'),
    exportCSV: () => this.request<any>('/api/portability/export/csv'),
    import: (file: File, overwrite: boolean = false) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('overwrite', String(overwrite));

      return this.request<any>('/api/portability/import', {
        method: 'POST',
        headers: {},
        body: formData as any,
      });
    },
    createBackup: () => this.request<any>('/api/portability/backup', {
      method: 'POST',
    }),
    listBackups: () => this.request<any>('/api/portability/backups'),
    restoreBackup: (backupId: string) => this.request<any>(
      `/api/portability/backups/${encodeURIComponent(backupId)}/restore`,
      {
        method: 'POST',
      }
    ),
    deleteBackup: (backupId: string) => this.request<any>(
      `/api/portability/backups/${encodeURIComponent(backupId)}`,
      {
        method: 'DELETE',
      }
    ),
    getStatus: () => this.request<any>('/api/portability/status'),
  };

  // Profile API (only works in authenticated mode)
  profile = {
    get: () => this.request<any>('/api/profile'),
    update: (data: any) => this.request<any>('/api/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  };

  // Health check
  health = {
    check: () => this.request<any>('/health'),
  };
}

// Singleton for the direct-return core
export const unifiedClient = new UnifiedAPIClient();

// ---------------------------------------------------------------------------
// Job Sources / Company Radar / Signal Feeds (direct-return core, from the
// former api-client-lite.ts; behavior preserved verbatim)
// ---------------------------------------------------------------------------

// API base URL for the lite-style groups
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Request headers (no authentication)
const getLiteHeaders = () => ({
  'Content-Type': 'application/json',
});

/**
 * Generic API request handler (direct-return, throws on error)
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  logger.info(LogCategory.API, `API Request: ${options.method || 'GET'} ${url}`);

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...getLiteHeaders(),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text().catch(() => 'Unknown error');
      logger.error(LogCategory.API, `API Error: ${response.status} ${error}`);
      throw new Error(error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    logger.info(LogCategory.API, `API Success: ${url}`);
    return data as T;
  } catch (error) {
    logger.error(LogCategory.API, `API Request Failed: ${url}`, error as Error);
    throw error;
  }
}

/**
 * Job Sources API (ATS job board subscriptions)
 */
export interface JobSource {
  id: string;
  name: string;
  ats_type: string;
  org_key: string;
  portal_url: string | null;
  enabled: boolean;
  last_synced_at: string | null;
  last_sync_status: string | null;
  last_sync_message: string | null;
  last_new_count: number;
  last_total_count: number;
  created_at: string;
  updated_at: string;
}

export interface JobSourceFeedItem {
  id: string;
  company: string;
  title: string;
  description: string;
  url: string | null;
  source_url: string | null;
  platform: string;
  source: string | null;
  external_id: string | null;
  location: string | null;
  employment_type: string | null;
  remote: string;
  match_score: number | null;
  match_detail: { matched?: string[]; missing?: string[]; method?: string } | null;
  created_at: string;
  updated_at: string;
}

export const jobSourceAPI = {
  list: () => apiRequest<JobSource[]>('/api/job-sources'),

  detect: (url: string) =>
    apiRequest<{ ats_type: string; org_key: string; suggested_name: string; portal_url: string }>(
      '/api/job-sources/detect',
      { method: 'POST', body: JSON.stringify({ url }) }
    ),

  create: (data: { url?: string; ats_type?: string; org_key?: string; name?: string }) =>
    apiRequest<JobSource>('/api/job-sources', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  seedDefaults: () => apiRequest<JobSource[]>('/api/job-sources/seed-defaults', { method: 'POST' }),

  searchCatalog: (query: string, limit = 20) =>
    apiRequest<{
      total: number;
      truncated: boolean;
      results: Array<{ ats_type: string; org_key: string }>;
    }>('/api/job-sources/search-catalog', {
      method: 'POST',
      body: JSON.stringify({ query, limit }),
    }),

  importBoards: (atsType: string, orgKeys: string[], enabled = true) =>
    apiRequest<{ created: number; skipped: number }>('/api/job-sources/import', {
      method: 'POST',
      body: JSON.stringify({ ats_type: atsType, org_keys: orgKeys, enabled }),
    }),

  update: (id: string, data: { name?: string; enabled?: boolean }) =>
    apiRequest<JobSource>(`/api/job-sources/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  remove: (id: string) => apiRequest<void>(`/api/job-sources/${id}`, { method: 'DELETE' }),

  sync: (id: string) =>
    apiRequest<{ source_id: string; source_name: string; status: string; new_count: number; updated_count: number; total_count: number; message: string | null }>(
      `/api/job-sources/${id}/sync`,
      { method: 'POST' }
    ),

  syncAll: () =>
    apiRequest<
      Array<{
        source_id: string;
        source_name: string;
        status: string;
        new_count: number;
        updated_count: number;
        total_count: number;
        message: string | null;
      }>
    >('/api/job-sources/sync-all', { method: 'POST' }),

  feed: (params?: {
    keyword?: string;
    source?: string;
    company?: string;
    remote?: string;
    sort?: 'newest' | 'match';
    skip?: number;
    limit?: number;
  }) => {
    const queryString = new URLSearchParams();
    if (params?.keyword) queryString.append('keyword', params.keyword);
    if (params?.source) queryString.append('source', params.source);
    if (params?.company) queryString.append('company', params.company);
    if (params?.remote) queryString.append('remote', params.remote);
    if (params?.sort) queryString.append('sort', params.sort);
    if (params?.skip) queryString.append('skip', String(params.skip));
    if (params?.limit) queryString.append('limit', String(params.limit));

    return apiRequest<JobSourceFeedItem[]>(
      `/api/job-sources/feed${queryString.toString() ? `?${queryString.toString()}` : ''}`
    );
  },

  score: (params?: { limit?: number; rescore?: boolean }) => {
    const queryString = new URLSearchParams();
    if (params?.limit) queryString.append('limit', String(params.limit));
    if (params?.rescore) queryString.append('rescore', 'true');

    return apiRequest<{ scored_count: number; resume_title: string | null }>(
      `/api/job-sources/score${queryString.toString() ? `?${queryString.toString()}` : ''}`,
      { method: 'POST' }
    );
  },

  logApplication: (data: { url: string; title?: string; company?: string }) =>
    apiRequest<{
      application_id: string;
      jd_id: string;
      jd_created: boolean;
      status: string;
      applied_at: string;
    }>('/api/job-sources/log-application', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  scoreWithLlm: (jdId: string, resumeId?: string) => {
    const queryString = new URLSearchParams();
    if (resumeId) queryString.append('resume_id', resumeId);

    return apiRequest<JobSourceFeedItem>(
      `/api/job-sources/${jdId}/score-llm${queryString.toString() ? `?${queryString.toString()}` : ''}`,
      { method: 'POST' }
    );
  },
};

/**
 * Company Directory API (recruiting site radar)
 */
export interface CompanyEntry {
  id: string;
  name: string;
  aliases: string[] | null;
  career_url: string | null;
  career_type: string;
  industry: string | null;
  verified: boolean;
  signal_batch: string | null;
  signal_title: string | null;
  signal_url: string | null;
  signal_detected_at: string | null;
  created_at: string;
  updated_at: string;
}

export const companyAPI = {
  list: (params?: { keyword?: string; has_signal?: boolean; industry?: string }) => {
    const queryString = new URLSearchParams();
    if (params?.keyword) queryString.append('keyword', params.keyword);
    if (params?.has_signal !== undefined)
      queryString.append('has_signal', String(params.has_signal));
    if (params?.industry) queryString.append('industry', params.industry);

    return apiRequest<CompanyEntry[]>(
      `/api/companies${queryString.toString() ? `?${queryString.toString()}` : ''}`
    );
  },

  create: (data: { name: string; career_url?: string; aliases?: string[] }) =>
    apiRequest<CompanyEntry>('/api/companies', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  remove: (id: string) => apiRequest<void>(`/api/companies/${id}`, { method: 'DELETE' }),

  seedDefaults: () => apiRequest<CompanyEntry[]>('/api/companies/seed-defaults', { method: 'POST' }),

  detectSignal: (data: { title?: string; url?: string }) =>
    apiRequest<{ matched: CompanyEntry[]; used_title: string | null }>(
      '/api/companies/detect-signal',
      { method: 'POST', body: JSON.stringify(data) }
    ),

  setSignal: (id: string, data: { batch: string; title?: string; url?: string }) =>
    apiRequest<CompanyEntry>(`/api/companies/${id}/signal`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  clearSignal: (id: string) =>
    apiRequest<CompanyEntry>(`/api/companies/${id}/signal`, { method: 'DELETE' }),
};

/**
 * Signal Feeds API (RSS → automatic radar signals)
 */
export interface SignalFeed {
  id: string;
  name: string;
  rss_url: string;
  enabled: boolean;
  last_fetched_at: string | null;
  last_status: string | null;
  last_new_signals: number;
  last_message: string | null;
  created_at: string;
  updated_at: string;
}

export const signalFeedAPI = {
  list: () => apiRequest<SignalFeed[]>('/api/signal-feeds'),

  create: (rssUrl: string, name?: string) =>
    apiRequest<SignalFeed>('/api/signal-feeds', {
      method: 'POST',
      body: JSON.stringify({ rss_url: rssUrl, name }),
    }),

  update: (id: string, data: { name?: string; enabled?: boolean }) =>
    apiRequest<SignalFeed>(`/api/signal-feeds/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  remove: (id: string) => apiRequest<void>(`/api/signal-feeds/${id}`, { method: 'DELETE' }),

  sync: (id: string) =>
    apiRequest<{
      feed_id: string;
      feed_name: string;
      status: string;
      items_seen: number;
      signals: string[];
      message: string | null;
    }>(`/api/signal-feeds/${id}/sync`, { method: 'POST' }),

  syncAll: () =>
    apiRequest<
      Array<{
        feed_id: string;
        feed_name: string;
        status: string;
        items_seen: number;
        signals: string[];
        message: string | null;
      }>
    >('/api/signal-feeds/sync-all', { method: 'POST' }),
};
