/**
 * Unified API Client - Supports both authenticated and lite modes
 *
 * This client automatically detects whether authentication is enabled
 * and adjusts behavior accordingly.
 */

import { logger, LogCategory } from './logger';

interface APIResponse<T> {
  data?: T;
  error?: string;
  status: number;
  success?: boolean;
}

interface APIError {
  message: string;
  code?: string;
  details?: unknown;
}

interface ApiClientConfig {
  baseURL: string;
  timeout: number;
  retryCount: number;
  enableAuth: boolean;
}

// Feature flag for lite mode (can be overridden by env var)
const ENABLE_AUTH = process.env.NEXT_PUBLIC_ENABLE_AUTH === 'true';

class UnifiedAPIClient {
  private baseURL: string;
  private timeout: number;
  private retryCount: number;
  private enableAuth: boolean;

  constructor(config?: Partial<ApiClientConfig>) {
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

// Create singleton instance
export const apiClient = new UnifiedAPIClient();

// Export individual APIs for convenience
export const resumeAPI = apiClient.resume;
export const jdAPI = apiClient.jd;
export const applicationAPI = apiClient.application;
export const searchAPI = apiClient.search;
export const portabilityAPI = apiClient.portability;
export const profileAPI = apiClient.profile;
export const healthAPI = apiClient.health;
