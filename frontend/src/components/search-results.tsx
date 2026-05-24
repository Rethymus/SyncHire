"use client";

import { memo, useMemo } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Briefcase,
  Building2,
  MapPin,
  Calendar,
  TrendingUp,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchResultItem {
  id: string;
  title: string;
  content: string;
  similarity?: number;
  type: "resume" | "jd" | "application";
  created_at: Date;
  highlighted_content?: string;
  company_name?: string;
  position?: string;
  status?: string;
  match_score?: number;
  resume_title?: string;
  jd_title?: string;
  updated_at?: Date;
}

interface SearchResultsProps {
  results: SearchResultItem[];
  total: number;
  page: number;
  pageSize: number;
  query: string;
  onPageChange: (page: number) => void;
  loading?: boolean;
  searchType: "resume" | "jd" | "application";
}

const statusConfig = {
  draft: { label: "Draft", color: "bg-gray-100 text-gray-800" },
  applied: { label: "Applied", color: "bg-blue-100 text-blue-800" },
  interview: { label: "Interview", color: "bg-purple-100 text-purple-800" },
  offer: { label: "Offer", color: "bg-green-100 text-green-800" },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-800" },
  pending: { label: "Pending", color: "bg-yellow-100 text-yellow-800" },
};

export const SearchResults = memo(function SearchResults({
  results,
  total,
  page,
  pageSize,
  query,
  onPageChange,
  loading = false,
  searchType,
}: SearchResultsProps) {
  const totalPages = Math.ceil(total / pageSize);

  const highlightText = useMemo(() => {
    return (text: string) => {
      if (!query || !text) return text;

      const terms = query.toLowerCase().split(/\s+/);
      let highlighted = text;

      terms.forEach((term) => {
        if (term.length < 2) return;

        const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        highlighted = highlighted.replace(regex, '<mark class="bg-yellow-200 rounded px-0.5">$1</mark>');
      });

      return highlighted;
    };
  }, [query]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse"
          >
            <div className="h-6 bg-gray-200 rounded w-3/4 mb-3" />
            <div className="h-4 bg-gray-200 rounded w-full mb-2" />
            <div className="h-4 bg-gray-200 rounded w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        {searchType === "resume" && <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />}
        {searchType === "jd" && <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />}
        {searchType === "application" && <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />}

        <h3 className="text-lg font-semibold text-gray-900 mb-2">No results found</h3>
        <p className="text-sm text-gray-600 mb-6">
          {query
            ? `No results match &quot;${query}&quot;. Try different keywords or filters.`
            : "Enter a search query to find results."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Found <span className="font-semibold text-gray-900">{total}</span>{" "}
          {total === 1 ? "result" : "results"}
          {query && (
            <span>
              {" "}for &apos;<span className="font-medium">{query}</span>&apos;
            </span>
          )}
        </p>
      </div>

      {/* Results List */}
      <div className="space-y-4">
        {results.map((result) => (
          <div
            key={result.id}
            className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                {/* Title and Type */}
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {searchType === "application" ? result.position : result.title}
                  </h3>
                  {result.similarity !== undefined && (
                    <Badge
                      variant={result.similarity > 0.7 ? "default" : "secondary"}
                      className="flex items-center gap-1"
                    >
                      <TrendingUp className="h-3 w-3" />
                      {Math.round(result.similarity * 100)}%
                    </Badge>
                  )}
                  {result.status && (
                    <Badge className={statusConfig[result.status as keyof typeof statusConfig]?.color}>
                      {statusConfig[result.status as keyof typeof statusConfig]?.label || result.status}
                    </Badge>
                  )}
                </div>

                {/* Additional Info */}
                {searchType === "application" && result.company_name && (
                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                    <div className="flex items-center gap-1">
                      <Building2 className="h-4 w-4" />
                      {result.company_name}
                    </div>
                    {result.match_score !== undefined && (
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-4 w-4 text-blue-600" />
                        <span className="text-gray-700">
                          Match: <span className="font-semibold">{result.match_score}%</span>
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Highlighted Content Preview */}
                {result.highlighted_content && (
                  <div
                    className="text-sm text-gray-700 mb-3"
                    style={{
                      display: "-webkit-box",
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                    dangerouslySetInnerHTML={{ __html: highlightText(result.highlighted_content) }}
                  />
                )}

                {/* Metadata */}
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(result.created_at).toLocaleDateString()}
                  </div>
                  {searchType === "application" && result.resume_title && (
                    <div className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      Resume: {result.resume_title}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {searchType === "resume" && (
                  <Link href={`/editor?resumeId=${result.id}`}>
                    <Button variant="outline" size="sm">
                      <FileText className="h-4 w-4 mr-2" />
                      View
                    </Button>
                  </Link>
                )}
                {searchType === "jd" && (
                  <Link href={`/dashboard?jdId=${result.id}`}>
                    <Button variant="outline" size="sm">
                      <Briefcase className="h-4 w-4 mr-2" />
                      View
                    </Button>
                  </Link>
                )}
                {searchType === "application" && (
                  <>
                    <Link href={`/applications/${result.id}`}>
                      <Button variant="outline" size="sm">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Details
                      </Button>
                    </Link>
                    <Link href={`/interview-prep?applicationId=${result.id}`}>
                      <Button size="sm">
                        <TrendingUp className="h-4 w-4 mr-2" />
                        Prep
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            aria-label="Previous page"
          >
            Previous
          </Button>

          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(
                (p) =>
                  p === 1 ||
                  p === totalPages ||
                  (p >= page - 1 && p <= page + 1)
              )
              .map((p, i, arr) => {
                const prevPage = arr[i - 1];
                const showEllipsis = prevPage && p - prevPage > 1;

                return (
                  <div key={p} className="flex items-center">
                    {showEllipsis && (
                      <span className="px-2 text-gray-400">...</span>
                    )}
                    <Button
                      variant={p === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => onPageChange(p)}
                      className="min-w-[40px]"
                      aria-label={`Page ${p}`}
                      aria-current={p === page ? "page" : undefined}
                    >
                      {p}
                    </Button>
                  </div>
                );
              })}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages}
            aria-label="Next page"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
});
