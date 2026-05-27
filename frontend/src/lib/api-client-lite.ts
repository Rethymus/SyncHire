/**
 * API Client - Lightweight Version
 *
 * Simplified API client without authentication for local-first operation.
 */

import { logger, LogCategory } from './logger';

// API base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Request headers (no authentication)
const getHeaders = () => ({
  'Content-Type': 'application/json',
});

/**
 * Generic API request handler
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
        ...getHeaders(),
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
 * Resumes API
 */
export const resumeAPI = {
  list: () => apiRequest<any[]>('/api/resumes'),

  get: (id: string) => apiRequest<any>(`/api/resumes/${id}`),

  create: (data: any) => apiRequest<any>('/api/resumes', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  update: (id: string, data: any) => apiRequest<any>(`/api/resumes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  delete: (id: string) => apiRequest<void>(`/api/resumes/${id}`, {
    method: 'DELETE',
  }),

  optimize: (id: string) => apiRequest<any>(`/api/resumes/${id}/optimize`, {
    method: 'POST',
  }),

  upload: async (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    return apiRequest<any>(`/api/resumes`, {
      method: 'POST',
      headers: {}, // Let browser set Content-Type for FormData
      body: formData,
    });
  },
};

/**
 * Job Descriptions API
 */
export const jdAPI = {
  list: () => apiRequest<any[]>('/api/jds'),

  get: (id: string) => apiRequest<any>(`/api/jds/${id}`),

  create: (data: any) => apiRequest<any>('/api/jds', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  update: (id: string, data: any) => apiRequest<any>(`/api/jds/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  delete: (id: string) => apiRequest<void>(`/api/jds/${id}`, {
    method: 'DELETE',
  }),

  parse: (content: string, url?: string) => apiRequest<any>('/api/jds/parse', {
    method: 'POST',
    body: JSON.stringify({ content, url }),
  }),

  import: (url: string) => apiRequest<any>('/api/jds/import', {
    method: 'POST',
    body: JSON.stringify({ url }),
  }),
};

/**
 * Applications API
 */
export const applicationAPI = {
  list: (statusFilter?: string) => apiRequest<any[]>(
    `/api/applications${statusFilter ? `?status_filter=${statusFilter}` : ''}`
  ),

  get: (id: string) => apiRequest<any>(`/api/applications/${id}`),

  create: (data: any) => apiRequest<any>('/api/applications', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  update: (id: string, data: any) => apiRequest<any>(`/api/applications/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  delete: (id: string) => apiRequest<void>(`/api/applications/${id}`, {
    method: 'DELETE',
  }),

  calculateMatch: (id: string) => apiRequest<any>(`/api/applications/${id}/match`, {
    method: 'POST',
  }),

  batchUpdate: (ids: string[], status?: string) => apiRequest<any>('/api/applications/batch-update', {
    method: 'POST',
    body: JSON.stringify({
      application_ids: ids,
      status,
    }),
  }),
};

/**
 * Search API
 */
export const searchAPI = {
  search: (query: string, type: string = 'all', limit: number = 20, offset: number = 0) =>
    apiRequest<any>('/api/search', {
      method: 'POST',
      body: JSON.stringify({ query, type, limit, offset }),
    }),

  semantic: (query: string, type: string = 'all', limit: number = 20) =>
    apiRequest<any>('/api/search/semantic', {
      method: 'POST',
      body: JSON.stringify({ query, type, limit }),
    }),

  match: (resumeId: string, jdId: string) =>
    apiRequest<any>('/api/search/match', {
      method: 'POST',
      body: JSON.stringify({
        resume_id: resumeId,
        jd_id: jdId,
      }),
    }),

  suggestions: (query: string, limit: number = 5) =>
    apiRequest<any>(`/api/search/suggestions?query=${encodeURIComponent(query)}&limit=${limit}`),

  statistics: () => apiRequest<any>('/api/search/statistics'),
};

/**
 * Data Portability API
 */
export const portabilityAPI = {
  exportJSON: () => apiRequest<any>('/api/portability/export/json'),

  exportCSV: (params?: {
    data_types?: string[];
    from_date?: string;
    to_date?: string;
    status?: string[];
  }) => {
    const queryString = new URLSearchParams();
    if (params?.data_types?.length) {
      queryString.append('data_types', params.data_types.join(','));
    }
    if (params?.from_date) {
      queryString.append('from_date', params.from_date);
    }
    if (params?.to_date) {
      queryString.append('to_date', params.to_date);
    }
    if (params?.status?.length) {
      queryString.append('status', params.status.join(','));
    }

    return apiRequest<any>(
      `/api/portability/export/csv${queryString.toString() ? `?${queryString}` : ''}`
    );
  },

  import: (file: File, options: {
    mode?: 'merge' | 'replace';
    conflict_resolution?: 'skip' | 'overwrite' | 'rename';
  } = {}) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mode', options.mode || 'merge');
    formData.append('conflict_resolution', options.conflict_resolution || 'skip');

    return apiRequest<any>('/api/portability/import', {
      method: 'POST',
      headers: {},
      body: formData,
    });
  },

  importPreview: async (file: File): Promise<{
    total_records: number;
    resumes: number;
    jds: number;
    applications: number;
    conflicts: Array<{
      type: string;
      id: string;
      existing: any;
      incoming: any;
    }>;
    validation_errors: Array<{
      record: number;
      field: string;
      message: string;
    }>;
  }> => {
    const formData = new FormData();
    formData.append('file', file);

    return apiRequest<any>('/api/portability/import/preview', {
      method: 'POST',
      headers: {},
      body: formData,
    });
  },

  createBackup: () => apiRequest<any>('/api/portability/backup', {
    method: 'POST',
  }),

  listBackups: () => apiRequest<any>('/api/portability/backups'),

  getStatus: () => apiRequest<any>('/api/portability/status'),

  restoreBackup: (backupId: string) => apiRequest<any>(`/api/portability/backups/${backupId}/restore`, {
    method: 'POST',
  }),

  deleteBackup: (backupId: string) => apiRequest<any>(`/api/portability/backups/${backupId}`, {
    method: 'DELETE',
  }),
};

/**
 * Local Profile API (for preferences)
 */
export const profileAPI = {
  get: () => apiRequest<any>('/api/profile'),

  update: (data: any) => apiRequest<any>('/api/profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
};

/**
 * Health check API
 */
export const healthAPI = {
  check: () => apiRequest<any>('/health'),
};

// Export all APIs
export const apiClient = {
  resume: resumeAPI,
  jd: jdAPI,
  application: applicationAPI,
  search: searchAPI,
  portability: portabilityAPI,
  profile: profileAPI,
  health: healthAPI,
};
