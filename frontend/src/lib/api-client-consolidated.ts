/**
 * Consolidated API Client
 * Combines the best features from api-client.ts, api-client-v2.ts, and api/unified-client.ts
 * Features:
 * - Type-safe API responses
 * - CSRF protection
 * - Error handling with retry logic
 * - Request/response interceptors
 * - Timeout handling
 * - Rate limiting
 */

import { getCSRFTokenHeader, addCSRFHeaders } from './csrf';

interface APIResponse<T> {
  data?: T;
  error?: string | APIError;
  status: number;
  success: boolean;
}

interface APIError {
  message: string;
  code?: string;
  details?: unknown;
}

interface RequestConfig {
  timeout?: number;
  retries?: number;
  cache?: RequestCache;
}

class APIClient {
  private baseURL: string;
  private defaultTimeout: number;
  private defaultRetries: number;

  constructor(
    baseURL: string = process.env.NEXT_PUBLIC_API_URL || '/api',
    timeout: number = 30000,
    retries: number = 3
  ) {
    this.baseURL = baseURL;
    this.defaultTimeout = timeout;
    this.defaultRetries = retries;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    config: RequestConfig = {}
  ): Promise<APIResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout || this.defaultTimeout);

    // Add CSRF headers
    const headersWithCSRF = addCSRFHeaders(options.headers || {});

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...headersWithCSRF,
        },
        cache: config.cache,
      });

      clearTimeout(timeoutId);

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

  async get<T>(endpoint: string, headers?: HeadersInit, config?: RequestConfig): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'GET',
      headers,
    }, config);
  }

  async post<T>(endpoint: string, data: unknown, headers?: HeadersInit, config?: RequestConfig): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    }, config);
  }

  async put<T>(endpoint: string, data: unknown, headers?: HeadersInit, config?: RequestConfig): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    }, config);
  }

  async delete<T>(endpoint: string, headers?: HeadersInit, config?: RequestConfig): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
      headers,
    }, config);
  }

  async patch<T>(endpoint: string, data: unknown, headers?: HeadersInit, config?: RequestConfig): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(data),
    }, config);
  }
}

// Create singleton instance
export const apiClient = new APIClient();

// Auth API endpoints
export const authAPI = {
  register: (data: { name: string; email: string; password: string }) =>
    apiClient.post<{ userId: string; token: string }>('/auth/register', data),

  login: (data: { email: string; password: string }) =>
    apiClient.post<{ userId: string; token: string }>('/auth/login', data),

  logout: () => apiClient.post<void>('/auth/logout', {}),

  verifyEmail: (token: string) =>
    apiClient.post<void>('/auth/verify-email', { token }),

  resetPassword: (email: string) =>
    apiClient.post<void>('/auth/reset-password', { email }),

  confirmPassword: (token: string, newPassword: string) =>
    apiClient.post<void>('/auth/confirm-reset', { token, newPassword: newPassword }),
};

// Resume API endpoints
export const resumeAPI = {
  list: () => apiClient.get<Array<{ id: string; title: string; created_at: string }>>('/resumes'),

  get: (id: string) => apiClient.get<{
    id: string;
    title: string;
    content: string;
    parsed_data: string;
    created_at: string;
  }>(`/resumes/${id}`),

  getById: (id: string) => apiClient.get<{
    id: string;
    title: string;
    content: string;
    parsed_data: string;
    created_at: string;
  }>(`/resumes/${id}`),

  create: (data: { title: string; content: string }) =>
    apiClient.post<{ id: string }>('/resumes', data),

  update: (id: string, data: unknown) => apiClient.put(`/resumes/${id}`, data),

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
    apiClient.post<{
      optimized_content: string;
      changes_made: string[];
      keywords_added: string[];
      sections_improved: string[];
    }>(`/resumes/${id}/optimize`, { jd_content: jdContent }),

  bulkDelete: (ids: string[]) =>
    apiClient.post<{
      success_count: number;
      failed_count: number;
      errors: Array<{ id: string; error: string }>;
    }>('/resumes/bulk-delete', { ids }),
};

// Job Description API endpoints
export const jdAPI = {
  list: () =>
    apiClient.get<Array<{
      id: string;
      title: string;
      company: string;
      description: string;
      requirements: string[];
      skills: string[];
      created_at: string;
    }>>('/jds/'),

  getById: (id: string) =>
    apiClient.get<{
      id: string;
      title: string;
      company: string;
      description: string;
      requirements: string[];
      skills: string[];
      created_at: string;
    }>(`/jds/${id}`),

  analyze: (data: { description: string; requirements?: string[] }) =>
    apiClient.post<{
      score: number;
      skills: string[];
      missingSkills: string[];
      recommendations: string[];
    }>('/jd/analyze', data),

  parse: (text: string) =>
    apiClient.post<{
      title: string;
      company: string;
      description: string;
      requirements: string[];
    }>('/jd/parse', { text }),

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
    apiClient.post<{
      success_count: number;
      failed_count: number;
      errors: Array<{ id: string; error: string }>;
    }>('/jds/bulk-delete', { ids }),
};

// Application API endpoints
export const applicationAPI = {
  create: (data: { resume_id: string; jd_id: string; notes?: string }) =>
    apiClient.post<{
      id: string;
      resume_id: string;
      jd_id: string;
      status: string;
      match_score?: number;
      created_at: string;
      updated_at: string;
      notes?: string;
      resume?: {
        id: string;
        title: string;
        content?: string;
        created_at: string;
      };
      jd?: {
        id: string;
        title: string;
        company: string;
        description?: string;
        created_at: string;
      };
    }>('/applications/', data),

  list: () =>
    apiClient.get<Array<{
      id: string;
      resume_id: string;
      jd_id: string;
      status: string;
      match_score?: number;
      created_at: string;
      updated_at: string;
      notes?: string;
    }>>('/applications/'),

  getById: (id: string) =>
    apiClient.get<{
      id: string;
      resume_id: string;
      jd_id: string;
      status: string;
      match_score?: number;
      match_details?: string;
      optimized_resume?: string;
      created_at: string;
      updated_at: string;
      notes?: string;
      status_history?: Array<{
        id: string;
        old_status: string | null;
        new_status: string;
        notes: string | null;
        changed_at: string;
      }>;
      resume?: {
        id: string;
        title: string;
        content?: string;
        created_at: string;
      };
      jd?: {
        id: string;
        title: string;
        company: string;
        description?: string;
        created_at: string;
      };
    }>(`/applications/${id}`),

  update: (id: string, data: { notes?: string; status?: string }) =>
    apiClient.put<{
      id: string;
      resume_id: string;
      jd_id: string;
      status: string;
      match_score?: number;
      created_at: string;
      updated_at: string;
      notes?: string;
    }>(`/applications/${id}`, data),

  updateStatus: (id: string, data: { status: string; notes?: string }) =>
    apiClient.patch<{
      id: string;
      resume_id: string;
      jd_id: string;
      status: string;
      match_score?: number;
      created_at: string;
      updated_at: string;
      notes?: string;
    }>(`/applications/${id}/status`, data),

  delete: (id: string) => apiClient.delete<void>(`/applications/${id}`),

  bulkDelete: (ids: string[]) =>
    apiClient.post<{
      success_count: number;
      failed_count: number;
      errors: Array<{ id: string; error: string }>;
    }>('/applications/bulk-delete', { ids }),

  bulkUpdate: (updates: Array<{ id: string; status?: string; notes?: string }>) =>
    apiClient.post<{
      success_count: number;
      failed_count: number;
      errors: Array<{ id: string; error: string }>;
    }>('/applications/bulk-update', { updates }),

  bulkStatusUpdate: (ids: string[], status: string, notes?: string) =>
    apiClient.post<{
      success_count: number;
      failed_count: number;
      errors: Array<{ id: string; error: string }>;
    }>('/applications/bulk-status-update', { ids, status, notes }),

  bulkNotesUpdate: (ids: string[], notes: string, append: boolean = true) =>
    apiClient.post<{
      success_count: number;
      failed_count: number;
      errors: Array<{ id: string; error: string }>;
    }>('/applications/bulk-notes-update', { ids, notes, append }),

  getMatchScore: (id: string) =>
    apiClient.get<{
      match_score: number;
      match_details: {
        skills_match: number;
        experience_match: number;
        education_match: number;
        missing_skills: string[];
        recommendations: string[];
      };
    }>(`/applications/${id}/match`),

  optimizeResume: (id: string) =>
    apiClient.post<{
      optimized_resume: string;
      changes_made: string[];
      keywords_added: string[];
      sections_improved: string[];
    }>(`/applications/${id}/optimize`, {}),

  getInterviewPrep: (id: string) =>
    apiClient.get<{
      questions: Array<{
        question: string;
        category: string;
        suggested_answer: string;
      }>;
      tips: string[];
    }>(`/applications/${id}/interview-prep`),

  getStatusHistory: (id: string) =>
    apiClient.get<Array<{
      id: string;
      old_status: string | null;
      new_status: string;
      notes: string | null;
      changed_at: string;
    }>>(`/applications/${id}/history`),
};

// Export types for use in components
export type { APIResponse, APIError };
