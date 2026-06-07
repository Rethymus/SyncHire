/**
 * Custom hook for search data fetching
 *
 * Separates search logic from presentation logic
 */

import { useState, useCallback, useEffect } from "react";
import { apiClient } from "@/lib/api-client-unified";
import { logger, LogCategory } from "@/lib/logger";
import { useAppStore } from "@/lib/store";

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

function includesQuery(value: string | undefined, normalizedQuery: string) {
  return value?.toLowerCase().includes(normalizedQuery) ?? false;
}

function buildLocalSearchResults(options: SearchOptions): SearchResult[] {
  const { resumes, jobDescriptions, applications } = useAppStore.getState();
  const normalizedQuery = options.query.trim().toLowerCase();
  const results: SearchResult[] = [];

  if (options.type === "all" || options.type === "resume") {
    results.push(
      ...resumes
        .filter((resume) =>
          includesQuery(resume.name, normalizedQuery) ||
          includesQuery(resume.content, normalizedQuery) ||
          resume.skills?.some((skill) => includesQuery(skill, normalizedQuery))
        )
        .map((resume) => ({
          id: resume.id,
          type: "resume" as const,
          title: resume.name,
          content: resume.content.substring(0, 200),
          score: 1,
        }))
    );
  }

  if (options.type === "all" || options.type === "jd") {
    results.push(
      ...jobDescriptions
        .filter((jd) =>
          includesQuery(jd.title, normalizedQuery) ||
          includesQuery(jd.company, normalizedQuery) ||
          includesQuery(jd.description, normalizedQuery) ||
          jd.requirements.some((requirement) => includesQuery(requirement, normalizedQuery)) ||
          jd.skills.some((skill) => includesQuery(skill, normalizedQuery))
        )
        .map((jd) => ({
          id: jd.id,
          type: "jd" as const,
          title: jd.title,
          company: jd.company,
          content: jd.description.substring(0, 200),
          score: 0.95,
        }))
    );
  }

  if (options.type === "all" || options.type === "application") {
    results.push(
      ...applications
        .filter((application) =>
          includesQuery(application.position, normalizedQuery) ||
          includesQuery(application.companyName, normalizedQuery) ||
          includesQuery(application.status, normalizedQuery) ||
          application.tags?.some((tag) => includesQuery(tag, normalizedQuery))
        )
        .map((application) => ({
          id: application.id,
          type: "application" as const,
          title: application.position,
          company: application.companyName,
          content: `${application.status} application`,
          score: application.matchScore ? application.matchScore / 100 : 0.85,
        }))
    );
  }

  return results
    .toSorted((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(options.offset ?? 0, (options.offset ?? 0) + (options.limit ?? 20));
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
      const state = useAppStore.getState();

      if (!state.isAuthenticated) {
        const localResults = buildLocalSearchResults(options);
        setResults(localResults);
        logger.info(
          LogCategory.API,
          `Lite local search completed: ${localResults.length} results`
        );
        return;
      }

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
      const localResults = buildLocalSearchResults(options);
      setResults(localResults);
      setError(null);
      logger.info(
        LogCategory.API,
        `Lite local search fallback completed: ${localResults.length} results`
      );
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
