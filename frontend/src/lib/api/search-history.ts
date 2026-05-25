/**
 * Search History and Saved Searches API Client
 * Provides comprehensive search tracking, management, and analytics functionality
 */

import { apiClient } from '@/lib/api-client-consolidated';

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
    const response = await this.client.post<SearchHistoryItem>('/search/history', data);

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(typeof response.error === 'string' ? response.error : 'Failed to create search history');
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

    const response = await this.client.get<SearchHistoryResponse>(`/search/history?${queryParams.toString()}`);

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(typeof response.error === 'string' ? response.error : 'Failed to fetch search history');
  }

  /**
   * Delete a specific search history entry
   */
  async deleteSearchHistory(historyId: string): Promise<void> {
    const response = await this.client.delete<void>(`/search/history/${historyId}`);

    if (!response.success) {
      throw new Error(typeof response.error === 'string' ? response.error : 'Failed to delete search history');
    }
  }

  /**
   * Clear all search history (optionally filtered by type)
   */
  async clearSearchHistory(searchType?: 'resume' | 'jd' | 'application'): Promise<void> {
    const queryParams = searchType ? `?search_type=${searchType}` : '';

    const response = await this.client.delete<void>(`/search/history${queryParams}`);

    if (!response.success) {
      throw new Error(typeof response.error === 'string' ? response.error : 'Failed to clear search history');
    }
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
    const response = await this.client.post<SavedSearch>('/search/history/saved', data);

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(typeof response.error === 'string' ? response.error : 'Failed to create saved search');
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

    const response = await this.client.get<SavedSearchResponse>(`/search/history/saved?${queryParams.toString()}`);

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(typeof response.error === 'string' ? response.error : 'Failed to fetch saved searches');
  }

  /**
   * Get a specific saved search
   */
  async getSavedSearch(savedId: string): Promise<SavedSearch> {
    const response = await this.client.get<SavedSearch>(`/search/history/saved/${savedId}`);

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(typeof response.error === 'string' ? response.error : 'Failed to fetch saved search');
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
    const response = await this.client.put<SavedSearch>(`/search/history/saved/${savedId}`, data);

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(typeof response.error === 'string' ? response.error : 'Failed to update saved search');
  }

  /**
   * Delete a saved search
   */
  async deleteSavedSearch(savedId: string): Promise<void> {
    const response = await this.client.delete<void>(`/search/history/saved/${savedId}`);

    if (!response.success) {
      throw new Error(typeof response.error === 'string' ? response.error : 'Failed to delete saved search');
    }
  }

  /**
   * Re-run a saved search and track usage
   */
  async runSavedSearch(savedId: string): Promise<SearchHistoryItem> {
    const response = await this.client.post<SearchHistoryItem>(`/search/history/saved/${savedId}/run`, {});

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(typeof response.error === 'string' ? response.error : 'Failed to run saved search');
  }

  /**
   * Get comprehensive search analytics
   */
  async getSearchAnalytics(days: number = 30): Promise<SearchAnalyticsSummary> {
    const response = await this.client.get<SearchAnalyticsSummary>(`/search/history/analytics?days=${days}`);

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(typeof response.error === 'string' ? response.error : 'Failed to fetch search analytics');
  }

  /**
   * Get search suggestions for autocomplete
   */
  async getSearchSuggestions(query: string, limit: number = 10): Promise<SearchSuggestionsResponse> {
    const response = await this.client.get<SearchSuggestionsResponse>(`/search/history/suggestions?q=${encodeURIComponent(query)}&limit=${limit}`);

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(typeof response.error === 'string' ? response.error : 'Failed to fetch search suggestions');
  }

  /**
   * Export all saved searches
   */
  async exportSavedSearches(): Promise<SearchExport> {
    const response = await this.client.get<SearchExport>('/search/history/saved/export');

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(typeof response.error === 'string' ? response.error : 'Failed to export saved searches');
  }

  /**
   * Import saved searches from export
   */
  async importSavedSearches(
    data: {
      searches: Omit<SavedSearch, 'id' | 'created_at' | 'updated_at' | 'usage_count' | 'last_used_at'>[];
      merge_strategy: 'replace' | 'merge' | 'skip_existing';
    }
  ): Promise<SearchImportResult> {
    const response = await this.client.post<SearchImportResult>('/search/history/saved/import', data);

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(typeof response.error === 'string' ? response.error : 'Failed to import saved searches');
  }
}

// Export singleton instance
export const searchHistoryAPI = new SearchHistoryAPI();