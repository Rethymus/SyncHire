"use client";

export const dynamic = 'force-dynamic';

import { useState, useCallback } from "react";
// import { Navigation } from "@/components/navigation";
import { UniversalSearch } from "@/components/universal-search";
import { SearchResults } from "@/components/search-results";
import { searchApi, SearchFilters as APISearchFilters, SearchResult } from "@/lib/api/search";
import { FileText } from "lucide-react";

export default function ResumeSearchPage() {
  const [results, setResults] = useState<SearchResult[]>([]);
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
      const response = await searchApi.searchResumes(query, {
        ...filters,
        page: filters.page || 1,
        pageSize: filters.pageSize || 10,
      });

      setResults(response.results as SearchResult[]);
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
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Search Resumes
              </h1>
              <p className="text-sm text-gray-600">
                Find resumes by semantic similarity or keywords
              </p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-8">
          <UniversalSearch
            onSearch={handleSearch}
            placeholder="Search for resumes by skills, experience, or keywords..."
            searchType="resume"
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
          searchType="resume"
        />
      </main>
    </div>
  );
}
