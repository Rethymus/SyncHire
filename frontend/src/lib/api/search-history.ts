/**
 * Search History and Saved Searches API Client
 * Provides comprehensive search tracking, management, and analytics functionality
 */

import { apiClient } from '@/lib/api-client-unified';

// Types
export interface SearchHistoryItem {
  id: string;
  query: string;
  search_type: 'resume' | 'jd' | 'application';
  filters?: Record<string, any>;
  result_count: number;
  search_timestamp: string;
  is_sensitive: boolean;
}

export interface SearchHistoryResponse {
  items: SearchHistoryItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface SavedSearch {
  id: string;
  name: string;
  description?: string;
  query: string;
  search_type: 'resume' | 'jd' | 'application';
  filters?: Record<string, any>;
  usage_count: number;
  last_used_at?: string;
  tags?: string[];
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface SavedSearchResponse {
  items: SavedSearch[];
  total: number;
  page: number;
  page_size: number;
}

// API Response wrapper types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface SavedSearchAPIResponse extends ApiResponse<SavedSearch> {}
export interface SavedSearchesAPIResponse extends ApiResponse<SavedSearchResponse> {}
export interface SearchHistoryAPIResponse extends ApiResponse<SearchHistoryResponse> {}
export interface SearchAnalyticsAPIResponse extends ApiResponse<SearchAnalyticsSummary> {}
export interface SearchSuggestionsAPIResponse extends ApiResponse<SearchSuggestionsResponse> {}
export interface SearchExportAPIResponse extends ApiResponse<SearchExport> {}
export interface SearchImportAPIResponse extends ApiResponse<{ imported: number; failed: number; errors: string[] }> {}

export interface SearchAnalytics {
  search_term: string;
  search_type: string;
  search_count: number;
  last_searched_at: string;
  avg_result_count?: number;
  avg_search_duration?: number;
}

export interface SearchAnalyticsSummary {
  total_searches: number;
  most_common_terms: SearchAnalytics[];
  search_type_breakdown: Record<string, number>;
  recent_activity: SearchHistoryItem[];
  top_saved_searches: SavedSearch[];
}

export interface SearchSuggestion {
  term: string;
  type: 'history' | 'saved' | 'analytic';
  frequency?: number;
  filters?: Record<string, any>;
  last_used?: string;
}

export interface SearchSuggestionsResponse {
  suggestions: SearchSuggestion[];
  query: string;
}

export interface SearchExport {
  searches: SavedSearch[];
  exported_at: string;
  version: string;
}

export interface SearchImportResult {
  imported: number;
  skipped: number;
  failed: number;
}

// API Client Class
export class SearchHistoryAPI {
  private client = apiClient;

  /**
   * Create a new search history entry
   */
  async createSearchHistory(data: {
    query: string;
    search_type: 'resume' | 'jd' | 'application';
    filters?: Record<string, any>;
    result_count: number;
    is_sensitive?: boolean;
  }): Promise<SearchHistoryItem> {
    return await this.client.post<SearchHistoryItem>('/search/history', data);
  }

  /**
   * Get search history with pagination and filtering
   */
  async getSearchHistory(params: {
    search_type?: 'resume' | 'jd' | 'application';
    page?: number;
    page_size?: number;
  } = {}): Promise<SearchHistoryResponse> {
    const queryParams = new URLSearchParams();
    if (params.search_type) queryParams.append('search_type', params.search_type);
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.page_size) queryParams.append('page_size', params.page_size.toString());

    return await this.client.get<SearchHistoryResponse>(`/search/history?${queryParams.toString()}`);
  }

  /**
   * Delete a specific search history entry
   */
  async deleteSearchHistory(historyId: string): Promise<void> {
    await this.client.delete<void>(`/search/history/${historyId}`);
  }

  /**
   * Clear all search history (optionally filtered by type)
   */
  async clearSearchHistory(searchType?: 'resume' | 'jd' | 'application'): Promise<void> {
    const queryParams = searchType ? `?search_type=${searchType}` : '';
    await this.client.delete<void>(`/search/history${queryParams}`);
  }

  /**
   * Create a new saved search
   */
  async createSavedSearch(data: {
    name: string;
    description?: string;
    query: string;
    search_type: 'resume' | 'jd' | 'application';
    filters?: Record<string, any>;
    tags?: string[];
    is_favorite?: boolean;
  }): Promise<SavedSearch> {
    return await this.client.post<SavedSearch>('/search/history/saved', data);
  }

  /**
   * Get saved searches with filtering and sorting
   */
  async getSavedSearches(params: {
    search_type?: 'resume' | 'jd' | 'application';
    favorite_only?: boolean;
    tag?: string;
    sort_by?: 'created_at' | 'usage_count' | 'name' | 'last_used_at';
    page?: number;
    page_size?: number;
  } = {}): Promise<SavedSearchResponse> {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });

    return await this.client.get<SavedSearchResponse>(`/search/history/saved?${queryParams.toString()}`);
  }

  /**
   * Get a specific saved search
   */
  async getSavedSearch(savedId: string): Promise<SavedSearch> {
    return await this.client.get<SavedSearch>(`/search/history/saved/${savedId}`);
  }

  /**
   * Update a saved search
   */
  async updateSavedSearch(
    savedId: string,
    data: {
      name?: string;
      description?: string;
      query?: string;
      filters?: Record<string, any>;
      tags?: string[];
      is_favorite?: boolean;
    }
  ): Promise<SavedSearch> {
    return await this.client.put<SavedSearch>(`/search/history/saved/${savedId}`, data);
  }

  /**
   * Delete a saved search
   */
  async deleteSavedSearch(savedId: string): Promise<void> {
    await this.client.delete<void>(`/search/history/saved/${savedId}`);
  }

  /**
   * Re-run a saved search and track usage
   */
  async runSavedSearch(savedId: string): Promise<SearchHistoryItem> {
    return await this.client.post<SearchHistoryItem>(`/search/history/saved/${savedId}/run`, {});
  }

  /**
   * Get comprehensive search analytics
   */
  async getSearchAnalytics(days: number = 30): Promise<SearchAnalyticsSummary> {
    return await this.client.get<SearchAnalyticsSummary>(`/search/history/analytics?days=${days}`);
  }

  /**
   * Get search suggestions for autocomplete
   */
  async getSearchSuggestions(query: string, limit: number = 10): Promise<SearchSuggestionsResponse> {
    return await this.client.get<SearchSuggestionsResponse>(`/search/history/suggestions?q=${encodeURIComponent(query)}&limit=${limit}`);
  }

  /**
   * Export all saved searches
   */
  async exportSavedSearches(): Promise<SearchExport> {
    return await this.client.get<SearchExport>('/search/history/saved/export');
  }

  /**
   * Import saved searches from export
   */
  async importSavedSearches(
    data: {
      searches: Omit<SavedSearch, 'id' | 'created_at' | 'updated_at' | 'usage_count' | 'last_used_at'>[];
      merge_strategy: 'replace' | 'merge' | 'skip_existing';
    }
  ): Promise<{ imported: number; failed: number; errors: string[] }> {
    return await this.client.post<{ imported: number; failed: number; errors: string[] }>('/search/history/saved/import', data);
  }
}

// Export singleton instance
export const searchHistoryAPI = new SearchHistoryAPI();