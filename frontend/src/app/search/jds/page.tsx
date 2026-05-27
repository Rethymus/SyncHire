"use client";

import { useState, useCallback } from "react";
// import { Navigation } from "@/components/navigation";
import { UniversalSearch } from "@/components/universal-search";
import { SearchResults } from "@/components/search-results";
import { searchApi, SearchFilters as APISearchFilters } from "@/lib/api/search";
import { Briefcase } from "lucide-react";

export default function JDSearchPage() {
  const [results, setResults] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [currentQuery, setCurrentQuery] = useState("");
  const [currentFilters, setCurrentFilters] = useState<APISearchFilters>({
    page: 1,
    pageSize: 10,
    sortBy: "similarity",
    sortOrder: "desc",
  });

  const handleSearch = useCallback(async (query: string, filters: APISearchFilters) => {
    if (query.trim().length < 1) {
      setResults([]);
      setTotal(0);
      return;
    }

    setLoading(true);
    setCurrentQuery(query);
    setCurrentFilters(filters);

    try {
      const response = await searchApi.searchJDs(query, {
        ...filters,
        page: filters.page || 1,
        pageSize: filters.pageSize || 10,
      });

      setResults(response.results);
      setTotal(response.total);
      setPage(response.page);
    } catch (error) {
      console.error("Search failed:", error);
      setResults([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  const handlePageChange = useCallback(
    async (newPage: number) => {
      await handleSearch(currentQuery, {
        ...currentFilters,
        page: newPage,
      });
    },
    [currentQuery, currentFilters, handleSearch]
  );

  return (
    <div className="min-h-screen bg-gray-50">
      

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Briefcase className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Search Job Descriptions
              </h1>
              <p className="text-sm text-gray-600">
                Find job descriptions by semantic similarity or keywords
              </p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-8">
          <UniversalSearch
            onSearch={handleSearch}
            placeholder="Search for job descriptions by skills, requirements, or keywords..."
            searchType="jd"
            showFilters={true}
          />
        </div>

        {/* Results */}
        <SearchResults
          results={results}
          total={total}
          page={page}
          pageSize={currentFilters.pageSize || 10}
          query={currentQuery}
          onPageChange={handlePageChange}
          loading={loading}
          searchType="jd"
        />
      </main>
    </div>
  );
}
