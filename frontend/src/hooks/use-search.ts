/**
 * Custom hook for search data fetching
 *
 * Separates search logic from presentation logic
 */

import { useState, useCallback, useEffect } from "react";
import { apiClient } from "@/lib/api-client-unified";
import { logger, LogCategory } from "@/lib/logger";

export interface SearchResult {
  id: string;
  type: "resume" | "jd" | "application";
  title: string;
  content?: string;
  company?: string;
  score?: number;
  highlight?: string;
}

export interface SearchOptions {
  query: string;
  type: "all" | "resume" | "jd" | "application";
  semanticMode: boolean;
  limit?: number;
  offset?: number;
}

export function useSearch() {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const performSearch = useCallback(async (options: SearchOptions) => {
    if (options.query.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const searchFn = options.semanticMode ? apiClient.search.semantic : apiClient.search.search;
      const data = await searchFn(options.query, options.type, options.limit ?? 20, options.offset ?? 0);

      // Transform results to unified format
      const transformedResults: SearchResult[] = [];

      if (data.resumes) {
        transformedResults.push(
          ...data.resumes.map((r: any) => ({
            id: r.id,
            type: "resume" as const,
            title: r.title,
            content: r.content?.substring(0, 200),
            score: r.score,
            highlight: r.highlight,
          }))
        );
      }

      if (data.jds) {
        transformedResults.push(
          ...data.jds.map((j: any) => ({
            id: j.id,
            type: "jd" as const,
            title: j.title,
            company: j.company,
            content: j.description?.substring(0, 200),
            score: j.score,
            highlight: j.highlight,
          }))
        );
      }

      if (data.applications) {
        transformedResults.push(
          ...data.applications.map((a: any) => ({
            id: a.id,
            type: "application" as const,
            title: a.position || "Application",
            score: a.score,
            highlight: a.highlight,
          }))
        );
      }

      // Sort by score if available
      transformedResults.sort((a, b) => (b.score || 0) - (a.score || 0));

      setResults(transformedResults);
      logger.info(LogCategory.API, `Search completed: ${transformedResults.length} results`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Search failed";
      setError(errorMessage);
      logger.error(LogCategory.API, "Search failed", err as Error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearResults = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  return {
    results,
    loading,
    error,
    performSearch,
    clearResults,
  };
}
