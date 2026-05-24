"use client";

import { apiClient } from "../api-client";

export interface SearchFilters {
  page?: number;
  pageSize?: number;
  threshold?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  minMatchScore?: number;
  maxMatchScore?: number;
}

export interface SearchResult {
  id: string;
  title: string;
  content: string;
  similarity: number;
  type: "resume" | "jd";
  created_at: string;
  highlighted_content?: string;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  query: string;
  page: number;
  pageSize: number;
}

export interface ApplicationSearchResult {
  id: string;
  company_name: string;
  position: string;
  status: string;
  match_score: number | null;
  created_at: string;
  updated_at: string;
  resume_title: string;
  jd_title: string;
}

export interface ApplicationSearchResponse {
  results: ApplicationSearchResult[];
  total: number;
  page: number;
  pageSize: number;
  filters_applied: Record<string, any>;
}

export interface SearchSuggestion {
  companies: string[];
  positions: string[];
  resume_titles: string[];
  query: string;
}

export const searchApi = {
  /**
   * Search resumes with semantic similarity and filtering
   */
  async searchResumes(
    query: string,
    filters: SearchFilters = {}
  ): Promise<SearchResponse> {
    const params = new URLSearchParams();
    params.append("q", query);

    if (filters.page) params.append("page", filters.page.toString());
    if (filters.pageSize) params.append("page_size", filters.pageSize.toString());
    if (filters.threshold) params.append("threshold", filters.threshold.toString());
    if (filters.sortBy) params.append("sort_by", filters.sortBy);
    if (filters.sortOrder) params.append("sort_order", filters.sortOrder);
    if (filters.dateFrom) params.append("date_from", filters.dateFrom);
    if (filters.dateTo) params.append("date_to", filters.dateTo);

    const response = await apiClient.get<SearchResponse>(
      `/api/search/resumes?${params.toString()}`
    );
    return response.data as SearchResponse;
  },

  /**
   * Search job descriptions with semantic similarity and filtering
   */
  async searchJDs(
    query: string,
    filters: SearchFilters = {}
  ): Promise<SearchResponse> {
    const params = new URLSearchParams();
    params.append("q", query);

    if (filters.page) params.append("page", filters.page.toString());
    if (filters.pageSize) params.append("page_size", filters.pageSize.toString());
    if (filters.threshold) params.append("threshold", filters.threshold.toString());
    if (filters.sortBy) params.append("sort_by", filters.sortBy);
    if (filters.sortOrder) params.append("sort_order", filters.sortOrder);
    if (filters.dateFrom) params.append("date_from", filters.dateFrom);
    if (filters.dateTo) params.append("date_to", filters.dateTo);

    const response = await apiClient.get<SearchResponse>(
      `/api/search/jds?${params.toString()}`
    );
    return response.data as SearchResponse;
  },

  /**
   * Search applications with advanced filtering
   */
  async searchApplications(
    query: string,
    filters: SearchFilters = {}
  ): Promise<ApplicationSearchResponse> {
    const params = new URLSearchParams();

    if (query) params.append("q", query);
    if (filters.page) params.append("page", filters.page.toString());
    if (filters.pageSize) params.append("page_size", filters.pageSize.toString());
    if (filters.status) params.append("status", filters.status);
    if (filters.sortBy) params.append("sort_by", filters.sortBy);
    if (filters.sortOrder) params.append("sort_order", filters.sortOrder);
    if (filters.dateFrom) params.append("date_from", filters.dateFrom);
    if (filters.dateTo) params.append("date_to", filters.dateTo);
    if (filters.minMatchScore !== undefined)
      params.append("min_match_score", filters.minMatchScore.toString());
    if (filters.maxMatchScore !== undefined)
      params.append("max_match_score", filters.maxMatchScore.toString());

    const response = await apiClient.get<ApplicationSearchResponse>(
      `/api/search/applications?${params.toString()}`
    );
    return response.data as ApplicationSearchResponse;
  },

  /**
   * Get search suggestions based on partial query
   */
  async getSearchSuggestions(query: string): Promise<SearchSuggestion> {
    const response = await apiClient.get<SearchSuggestion>(
      `/api/search/suggestions?q=${encodeURIComponent(query)}`
    );
    return response.data as SearchSuggestion;
  },

  /**
   * Get match score between resume and JD
   */
  async getMatchScore(resumeId: string, jdId: string): Promise<{
    resume_id: string;
    jd_id: string;
    similarity_score: number;
    match_percentage: number;
  }> {
    const response = await apiClient.get(
      `/api/search/match/${resumeId}/${jdId}`
    );
    return response.data as {
      resume_id: string;
      jd_id: string;
      similarity_score: number;
      match_percentage: number;
    };
  },
};
