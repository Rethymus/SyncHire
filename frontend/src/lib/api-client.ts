/**
 * API Client Utilities
 *
 * Centralized API client with proper error handling, type safety, and testing support.
 */

import { getCSRFTokenHeader, addCSRFHeaders } from './csrf';
import { getAccessToken, refreshAccessToken, clearAuthData } from './auth';
import { logger, LogCategory } from './logger';

interface APIResponse<T> {
  data?: T;
  error?: string;
  status: number;
}

interface APIError {
  message: string;
  code?: string;
  details?: unknown;
}

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
        };
      }

      const data = await response.json();
      return {
        data,
        status: response.status,
      };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return {
            error: '请求超时，请稍后重试',
            status: 408,
          };
        }

        return {
          error: error.message,
          status: 500,
        };
      }

      return {
        error: '未知错误',
        status: 500,
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
};

/**
 * Resume API endpoints
 */
export const resumeAPI = {
  upload: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    return fetch('/api/resumes', {
      method: 'POST',
      body: formData,
    });
  },

  list: () => apiClient.get<Array<{ id: string; name: string; uploadedAt: string }>>('/resumes'),

  get: (id: string) => apiClient.get(`/resumes/${id}`),

  update: (id: string, data: unknown) => apiClient.put(`/resumes/${id}`, data),

  delete: (id: string) => apiClient.delete(`/resumes/${id}`),

  export: async (id: string, options: { template?: string; dpi?: number } = {}) => {
    const response = await fetch(`/api/resumes/${id}/export`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        template: options.template || 'minimal',
        dpi: options.dpi || 300,
      }),
    });

    if (!response.ok) {
      throw new Error(`PDF export failed: ${response.statusText}`);
    }

    return response.blob();
  },
};

/**
 * Job Description API endpoints
 */
export const jdAPI = {
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
};

/**
 * Application API endpoints
 */
export const applicationAPI = {
  create: (data: { resumeId: string; jdId: string }) =>
    apiClient.post<{ applicationId: string }>('/applications', data),

  list: () => apiClient.get('/applications'),

  update: (id: string, data: unknown) => apiClient.put(`/applications/${id}`, data),

  updateStatus: (id: string, status: string, notes?: string) =>
    apiClient.patch(`/applications/${id}/status`, { status, notes }),

  getStatusHistory: (id: string) => apiClient.get(`/applications/${id}/history`),

  delete: (id: string) => apiClient.delete(`/applications/${id}`),

  getInterviewPrep: (id: string) => apiClient.get(`/applications/${id}/interview-prep`),
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
