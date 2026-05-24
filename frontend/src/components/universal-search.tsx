"use client";

import { useState, useCallback, memo, useEffect, useRef, useMemo } from "react";
import { useDebounce } from "@/lib/hooks/use-debounce";
import { useSearchContext } from "@/contexts/search-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  X,
  Clock,
  ChevronDown,
  SlidersHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchFilters {
  status?: string;
  dateFrom?: Date;
  dateTo?: Date;
  minMatchScore?: number;
  maxMatchScore?: number;
  sortBy: string;
  sortOrder: "asc" | "desc";
}

// Convert filters to API format
function convertFiltersToAPI(filters: SearchFilters) {
  return {
    ...filters,
    dateFrom: filters.dateFrom?.toISOString(),
    dateTo: filters.dateTo?.toISOString(),
  };
}

interface UniversalSearchProps {
  onSearch: (query: string, filters: any) => void;
  placeholder?: string;
  searchType: "resume" | "jd" | "application";
  className?: string;
  showFilters?: boolean;
}

export const UniversalSearch = memo(function UniversalSearch({
  onSearch,
  placeholder = "Search...",
  searchType,
  className,
  showFilters = true,
}: UniversalSearchProps) {
  const [query, setQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    sortBy: "updated_at",
    sortOrder: "desc",
  });

  const { recentSearches, addToHistory, getRecentSearches } = useSearchContext();
  const debouncedQuery = useDebounce(query, 300);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get recent searches
  const recentSearchesList = useMemo(() => getRecentSearches(5), [getRecentSearches]);

  // Handle search with debouncing
  useEffect(() => {
    if (debouncedQuery.trim().length >= 2) {
      onSearch(debouncedQuery, convertFiltersToAPI(filters));

      // Add to search history after a delay
      const timeoutId = setTimeout(() => {
        addToHistory({
          query: debouncedQuery,
          timestamp: new Date(),
          type: searchType,
          resultCount: 0, // Will be updated by parent
        });
      }, 2000);

      return () => clearTimeout(timeoutId);
    }
  }, [debouncedQuery, filters, onSearch, searchType, addToHistory]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setQuery(e.target.value);
      setShowSuggestions(e.target.value.length > 0);
    },
    []
  );

  const handleClearSearch = useCallback(() => {
    setQuery("");
    setFilters({
      sortBy: "updated_at",
      sortOrder: "desc",
    });
    onSearch("", convertFiltersToAPI({
      sortBy: "updated_at",
      sortOrder: "desc",
    }));
    inputRef.current?.focus();
  }, [onSearch]);

  const handleSelectRecentSearch = useCallback(
    (recentQuery: string) => {
      setQuery(recentQuery);
      setShowSuggestions(false);
      onSearch(recentQuery, convertFiltersToAPI(filters));
    },
    [filters, onSearch]
  );

  const handleFilterChange = useCallback(
    (key: keyof SearchFilters, value: any) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const hasActiveFilters = useMemo(() => {
    return (
      filters.status !== undefined ||
      filters.minMatchScore !== undefined ||
      filters.maxMatchScore !== undefined ||
      filters.dateFrom !== undefined ||
      filters.dateTo !== undefined
    );
  }, [filters]);

  const clearFilters = useCallback(() => {
    setFilters({
      sortBy: "updated_at",
      sortOrder: "desc",
    });
  }, []);

  return (
    <div className={cn("relative", className)} ref={searchRef}>
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" aria-hidden="true" />
        </div>
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setShowSuggestions(query.length > 0)}
          placeholder={placeholder}
          className="pl-10 pr-10 min-h-[44px] text-base"
          aria-label="Search"
          aria-expanded={showSuggestions}
          aria-controls="search-suggestions"
          aria-autocomplete="list"
          role="combobox"
        />
        {query && (
          <button
            onClick={handleClearSearch}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Clear search"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Search Suggestions */}
      {showSuggestions && (
        <div
          id="search-suggestions"
          className="absolute z-50 w-full mt-2 bg-white rounded-lg shadow-lg border border-gray-200 py-2"
          role="listbox"
        >
          {recentSearchesList.length > 0 && (
            <div className="px-3 py-2">
              <div className="flex items-center gap-2 text-xs font-medium text-gray-500 mb-2">
                <Clock className="h-3 w-3" />
                Recent searches
              </div>
              <div className="space-y-1">
                {recentSearchesList.map((recentQuery) => (
                  <button
                    key={recentQuery}
                    onClick={() => handleSelectRecentSearch(recentQuery)}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                    role="option"
                    aria-selected="false"
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3 text-gray-400" />
                      {recentQuery}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filter Controls */}
      {showFilters && (
        <div className="mt-3 space-y-3">
          {/* Quick Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="gap-2"
              aria-expanded={showAdvancedFilters}
              aria-controls="advanced-filters"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-1">
                  Active
                </Badge>
              )}
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform",
                  showAdvancedFilters && "transform rotate-180"
                )}
              />
            </Button>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            )}

            {/* Sort Options */}
            <div className="flex items-center gap-2">
              <label htmlFor="sort-by" className="text-sm text-gray-600">
                Sort by:
              </label>
              <select
                id="sort-by"
                value={filters.sortBy}
                onChange={(e) => handleFilterChange("sortBy", e.target.value)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="updated_at">Recent</option>
                <option value="created_at">Created</option>
                {searchType === "application" && (
                  <option value="match_score">Match Score</option>
                )}
                {searchType === "resume" && (
                  <option value="title">Title</option>
                )}
                {searchType === "jd" && (
                  <option value="title">Title</option>
                )}
              </select>

              <select
                value={filters.sortOrder}
                onChange={(e) => handleFilterChange("sortOrder", e.target.value)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
          </div>

          {/* Advanced Filters */}
          {showAdvancedFilters && (
            <div
              id="advanced-filters"
              className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200"
            >
              {/* Status Filter (for applications) */}
              {searchType === "application" && (
                <div>
                  <label
                    htmlFor="status-filter"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Status
                  </label>
                  <select
                    id="status-filter"
                    value={filters.status || "all"}
                    onChange={(e) =>
                      handleFilterChange(
                        "status",
                        e.target.value === "all" ? undefined : e.target.value
                      )
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All statuses</option>
                    <option value="draft">Draft</option>
                    <option value="applied">Applied</option>
                    <option value="interview">Interview</option>
                    <option value="offer">Offer</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              )}

              {/* Match Score Filter (for applications) */}
              {searchType === "application" && (
                <div>
                  <label
                    htmlFor="match-score-filter"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Match Score
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="match-score-filter"
                      type="number"
                      min="0"
                      max="100"
                      placeholder="Min %"
                      value={filters.minMatchScore || ""}
                      onChange={(e) =>
                        handleFilterChange(
                          "minMatchScore",
                          e.target.value ? parseFloat(e.target.value) : undefined
                        )
                      }
                      className="flex-1 h-9"
                    />
                    <span className="text-gray-500">-</span>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      placeholder="Max %"
                      value={filters.maxMatchScore || ""}
                      onChange={(e) =>
                        handleFilterChange(
                          "maxMatchScore",
                          e.target.value ? parseFloat(e.target.value) : undefined
                        )
                      }
                      className="flex-1 h-9"
                    />
                  </div>
                </div>
              )}

              {/* Date Range Filter */}
              <div>
                <label
                  htmlFor="date-from-filter"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Date Range
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    id="date-from-filter"
                    type="date"
                    value={
                      filters.dateFrom
                        ? filters.dateFrom.toISOString().split("T")[0]
                        : ""
                    }
                    onChange={(e) =>
                      handleFilterChange(
                        "dateFrom",
                        e.target.value ? new Date(e.target.value) : undefined
                      )
                    }
                    className="flex-1 h-9"
                  />
                  <span className="text-gray-500">to</span>
                  <Input
                    type="date"
                    value={
                      filters.dateTo
                        ? filters.dateTo.toISOString().split("T")[0]
                        : ""
                    }
                    onChange={(e) =>
                      handleFilterChange(
                        "dateTo",
                        e.target.value ? new Date(e.target.value) : undefined
                      )
                    }
                    className="flex-1 h-9"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});
