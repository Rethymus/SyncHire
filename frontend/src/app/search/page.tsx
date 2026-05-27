/**
 * Search Page - Refactored with custom hook for separation of concerns
 *
 * Handles full-text and semantic search for resumes, JDs, and applications.
 */

"use client";

export const dynamic = 'force-dynamic';

import { useState, useCallback, memo, useEffect } from "react";
// import { Navigation } from "@/components/navigation-unified";
import { Button } from "@/components/ui/button";
import { useSearch, type SearchResult } from "@/hooks/use-search";
import { sanitizeHighlight } from "@/lib/sanitize";
import {
  Search as SearchIcon,
  FileText,
  Briefcase,
  BarChart3,
  Sparkles,
  XCircle,
} from "lucide-react";

function SearchPage() {
  const [query, setQuery] = useState("");
  const [searchType, setSearchType] = useState<"all" | "resume" | "jd" | "application">("all");
  const [semanticMode, setSemanticMode] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const { results, loading, error, performSearch, clearResults } = useSearch();

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Perform search when debounced query changes
  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      performSearch({
        query: debouncedQuery,
        type: searchType,
        semanticMode,
        limit: 20,
        offset: 0,
      });
    } else if (debouncedQuery.length === 0) {
      clearResults();
    }
  }, [debouncedQuery, searchType, semanticMode, performSearch, clearResults]);

  const getIconForType = (type: string) => {
    switch (type) {
      case "resume":
        return FileText;
      case "jd":
        return Briefcase;
      case "application":
        return BarChart3;
      default:
        return FileText;
    }
  };

  const getColorForType = (type: string) => {
    switch (type) {
      case "resume":
        return "text-blue-600 bg-blue-50";
      case "jd":
        return "text-green-600 bg-green-50";
      case "application":
        return "text-purple-600 bg-purple-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const getHrefForResult = (result: SearchResult) => {
    switch (result.type) {
      case "resume":
        return `/resumes/${result.id}`;
      case "jd":
        return `/job-descriptions/${result.id}`;
      case "application":
        return `/applications/${result.id}`;
      default:
        return "#";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Search
          </h1>
          <p className="mt-2 text-gray-600">
            Search your resumes, job descriptions, and applications
          </p>
        </div>

        {/* Search Input */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex gap-4 mb-4">
            <div className="flex-1 relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for anything..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                aria-label="Search query"
              />
            </div>
            <Button
              onClick={() => {
                setQuery("");
                clearResults();
              }}
              variant="outline"
              disabled={!query}
            >
              <XCircle className="h-4 w-4" />
            </Button>
          </div>

          {/* Search Options */}
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex gap-2">
              <Button
                variant={searchType === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setSearchType("all")}
              >
                All
              </Button>
              <Button
                variant={searchType === "resume" ? "default" : "outline"}
                size="sm"
                onClick={() => setSearchType("resume")}
              >
                Resumes
              </Button>
              <Button
                variant={searchType === "jd" ? "default" : "outline"}
                size="sm"
                onClick={() => setSearchType("jd")}
              >
                Job Descriptions
              </Button>
              <Button
                variant={searchType === "application" ? "default" : "outline"}
                size="sm"
                onClick={() => setSearchType("application")}
              >
                Applications
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={semanticMode ? "default" : "outline"}
                size="sm"
                onClick={() => setSemanticMode(!semanticMode)}
                className="flex items-center gap-2"
              >
                <Sparkles className="h-4 w-4" />
                {semanticMode ? "Semantic" : "Full-Text"}
              </Button>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-lg shadow p-8 mb-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Searching...</span>
            </div>
          </div>
        )}

        {/* Results */}
        {!loading && results.length > 0 && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Found {results.length} result{results.length !== 1 ? "s" : ""}
            </p>
            {results.map((result) => {
              const Icon = getIconForType(result.type);
              const colorClass = getColorForType(result.type);
              const href = getHrefForResult(result);

              return (
                <a
                  key={`${result.type}-${result.id}`}
                  href={href}
                  className="block bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${colorClass} flex-shrink-0`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-medium text-gray-900">
                            {result.title}
                          </h3>
                          {result.company && (
                            <p className="text-sm text-gray-600">{result.company}</p>
                          )}
                          {result.highlight ? (
                            <p
                              className="text-sm text-gray-700 mt-2"
                              dangerouslySetInnerHTML={{ __html: sanitizeHighlight(result.highlight) }}
                            />
                          ) : result.content ? (
                            <p className="text-sm text-gray-600 mt-2">
                              {result.content}
                              {result.content.length >= 200 && "..."}
                            </p>
                          ) : null}
                        </div>
                        {result.score !== undefined && (
                          <div className="flex-shrink-0">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {Math.round(result.score * 100)}% match
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        )}

        {/* No Results */}
        {!loading && query.length >= 2 && results.length === 0 && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <SearchIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No results found
            </h3>
            <p className="text-gray-600">
              Try adjusting your search query or filters
            </p>
          </div>
        )}

        {/* Initial State */}
        {!loading && query.length < 2 && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <SearchIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Start searching
            </h3>
            <p className="text-gray-600">
              Enter at least 2 characters to search your data
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default memo(SearchPage);
