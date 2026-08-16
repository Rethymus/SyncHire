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
  jobSource: jobSourceAPI,
  company: companyAPI,
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
