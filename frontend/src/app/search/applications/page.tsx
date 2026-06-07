"use client";


import { useState, useCallback, useEffect } from "react";
// import { Navigation } from "@/components/navigation";
import { UniversalSearch } from "@/components/universal-search";
import { SearchResults } from "@/components/search-results";
import { SearchFilters as APISearchFilters } from "@/lib/api/search";
import { useAppStore } from "@/lib/store";
import { Briefcase } from "lucide-react";

const DEFAULT_APPLICATION_SEARCH_FILTERS: APISearchFilters = {
  page: 1,
  pageSize: 10,
  sortBy: "updated_at",
  sortOrder: "desc",
};

export default function ApplicationSearchPage() {
  const { applications, resumes, jobDescriptions } = useAppStore();
  const [results, setResults] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [currentQuery, setCurrentQuery] = useState("");
  const [currentFilters, setCurrentFilters] = useState<APISearchFilters>(
    DEFAULT_APPLICATION_SEARCH_FILTERS
  );

  const handleSearch = useCallback(async (query: string, filters: APISearchFilters) => {
    setLoading(true);
    setCurrentQuery(query);
    setCurrentFilters(filters);

    try {
      const normalizedQuery = query.trim().toLowerCase();
      const requestedPage = filters.page || 1;
      const requestedPageSize = filters.pageSize || 10;
      const filteredApplications = applications
        .filter((application) => {
          if (filters.status && application.status !== filters.status) {
            return false;
          }

          if (!normalizedQuery) {
            return true;
          }

          const resume = resumes.find((item) => item.id === application.resumeId);
          const jd = jobDescriptions.find((item) => item.id === application.jobId);
          const searchableText = [
            application.companyName,
            application.position,
            application.status,
            resume?.name,
            jd?.title,
            jd?.company,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return searchableText.includes(normalizedQuery);
        })
        .toSorted((a, b) => {
          const sortOrder = filters.sortOrder === "asc" ? 1 : -1;
          const aDate = new Date(a.updatedAt || a.createdAt).getTime();
          const bDate = new Date(b.updatedAt || b.createdAt).getTime();
          return (aDate - bDate) * sortOrder;
        });

      const pagedApplications = filteredApplications.slice(
        (requestedPage - 1) * requestedPageSize,
        requestedPage * requestedPageSize
      );

      setResults(
        pagedApplications.map((application) => {
          const resume = resumes.find((item) => item.id === application.resumeId);
          const jd = jobDescriptions.find((item) => item.id === application.jobId);

          return {
            id: application.id,
            title: application.position,
            content: `${application.companyName} ${application.position}`,
            type: "application",
            created_at: application.createdAt,
            updated_at: application.updatedAt,
            company_name: jd?.company || application.companyName,
            position: jd?.title || application.position,
            status: application.status,
            match_score: application.matchScore,
            resume_title: resume?.name || "Unknown Resume",
            jd_title: jd?.title || application.position,
            highlighted_content: jd?.description || application.position,
          };
        })
      );
      setTotal(filteredApplications.length);
      setPage(requestedPage);
    } catch (error) {
      console.error("Search failed:", error);
      setResults([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [applications, resumes, jobDescriptions]);

  const handlePageChange = useCallback(
    async (newPage: number) => {
      await handleSearch(currentQuery, {
        ...currentFilters,
        page: newPage,
      });
    },
    [currentQuery, currentFilters, handleSearch]
  );

  // Load initial results
  useEffect(() => {
    let cancelled = false;

    void Promise.resolve().then(() => {
      if (!cancelled) {
        void handleSearch("", DEFAULT_APPLICATION_SEARCH_FILTERS);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [handleSearch]);

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
                Search Applications
              </h1>
              <p className="text-sm text-gray-600">
                Find job applications by company, position, or status
              </p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-8">
          <UniversalSearch
            onSearch={handleSearch}
            placeholder="Search for applications by company name, position, or keywords..."
            searchType="application"
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
          searchType="application"
        />
      </main>
    </div>
  );
}
