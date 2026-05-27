"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  MapPin,
  DollarSign,
  Building,
  Calendar,
  TrendingUp,
  Star,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface SearchResult {
  id: string;
  title: string;
  content?: string;
  company?: string;
  position?: string;
  salary?: {
    min: number | null;
    max: number | null;
    currency: string;
    period: string;
  };
  location?: {
    city: string | null;
    state: string | null;
    country: string;
    remote: boolean;
    hybrid: boolean;
    onsite: boolean;
  };
  experience_level?: string;
  employment_type?: string;
  industry?: string;
  company_size?: string;
  posted_date?: string | null;
  application_deadline?: string | null;
  relevance_score: number;
  type: string;
  created_at: string;
  status?: string;
  match_score?: number | null;
}

interface SearchResultsProps {
  results: SearchResult[];
  total: number;
  page: number;
  page_size: number;
  query: string;
  filters_applied: Record<string, any>;
  search_duration_ms: number;
  onPageChange: (page: number) => void;
  onSortChange: (sortBy: string, sortOrder: string) => void;
  onResultClick?: (resultId: string, resultType: string) => void;
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  total,
  page,
  page_size,
  query,
  filters_applied,
  search_duration_ms,
  onPageChange,
  onSortChange,
  onResultClick,
}) => {
  const [sortBy, setSortBy] = useState("relevance");
  const [sortOrder, setSortOrder] = useState("desc");

  const handleSortChange = (newSortBy: string) => {
    setSortBy(newSortBy);
    onSortChange(newSortBy, sortOrder);
  };

  const handleSortOrderToggle = () => {
    const newOrder = sortOrder === "desc" ? "asc" : "desc";
    setSortOrder(newOrder);
    onSortChange(sortBy, newOrder);
  };

  const totalPages = Math.ceil(total / page_size);

  const formatSalary = (salary: SearchResult["salary"]) => {
    if (!salary) return "Not specified";

    const formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: salary.currency,
      maximumFractionDigits: 0,
    });

    if (salary.min && salary.max) {
      return `${formatter.format(salary.min)} - ${formatter.format(salary.max)}/${salary.period}`;
    } else if (salary.min) {
      return `${formatter.format(salary.min)}+/${salary.period}`;
    } else if (salary.max) {
      return `Up to ${formatter.format(salary.max)}/${salary.period}`;
    }

    return "Not specified";
  };

  const formatLocation = (location: SearchResult["location"]) => {
    if (!location) return "Not specified";

    const parts = [];
    if (location.remote) parts.push("Remote");
    if (location.hybrid) parts.push("Hybrid");
    if (location.onsite && location.city) {
      parts.push(`${location.city}${location.state ? `, ${location.state}` : ""}`);
    }

    return parts.length > 0 ? parts.join(" • ") : "Not specified";
  };

  const getExperienceLevelColor = (level: string) => {
    switch (level) {
      case "entry":
        return "bg-green-100 text-green-800";
      case "mid":
        return "bg-blue-100 text-blue-800";
      case "senior":
        return "bg-purple-100 text-purple-800";
      case "lead":
        return "bg-orange-100 text-orange-800";
      case "executive":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-gray-100 text-gray-800";
      case "optimized":
        return "bg-blue-100 text-blue-800";
      case "applied":
        return "bg-green-100 text-green-800";
      case "interview":
        return "bg-purple-100 text-purple-800";
      case "offer":
        return "bg-yellow-100 text-yellow-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleResultClick = (result: SearchResult) => {
    if (onResultClick) {
      onResultClick(result.id, result.type);
    }
  };

  return (
    <div className="space-y-4">
      {/* Results Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Search Results</CardTitle>
              <CardDescription>
                Found {total.toLocaleString()} results for &ldquo;{query}&rdquo;
                {search_duration_ms && ` in ${search_duration_ms}ms`}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="sort-by">Sort by:</Label>
              <Select value={sortBy} onValueChange={(value) => handleSortChange(value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">Relevance</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="title">Title</SelectItem>
                  <SelectItem value="salary">Salary</SelectItem>
                  <SelectItem value="posted_date">Posted Date</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={handleSortOrderToggle}
                aria-label={`Sort ${sortOrder === "desc" ? "ascending" : "descending"}`}
              >
                {sortOrder === "desc" ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Active Filters */}
          {Object.keys(filters_applied).length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {Object.entries(filters_applied).map(([key, value]) => {
                if (value && key !== "query") {
                  return (
                    <Badge key={key} variant="secondary" className="text-xs">
                      {key}: {String(value).substring(0, 20)}
                      {String(value).length > 20 && "..."}
                    </Badge>
                  );
                }
                return null;
              })}
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Results List */}
      {results.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <p className="text-lg">No results found</p>
            <p className="text-sm mt-2">
              Try adjusting your search query or filters to find what you&apos;re looking for.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {results.map((result) => (
            <Card
              key={result.id}
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => handleResultClick(result)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Title and Company */}
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold hover:text-blue-600 transition-colors">
                          {result.title}
                        </h3>
                        {result.company && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <Building className="h-4 w-4" />
                            {result.company}
                          </div>
                        )}
                        {result.position && (
                          <p className="text-sm text-muted-foreground">
                            {result.position}
                          </p>
                        )}
                      </div>

                      {/* Relevance Score */}
                      {result.relevance_score > 0 && (
                        <div className="flex flex-col items-center">
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                            <span className="text-sm font-medium">
                              {(result.relevance_score * 100).toFixed(0)}%
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            Match
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Key Details */}
                    <div className="flex flex-wrap gap-4 mt-4 text-sm">
                      {/* Location */}
                      {result.location && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span>{formatLocation(result.location)}</span>
                        </div>
                      )}

                      {/* Salary */}
                      {result.salary && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <DollarSign className="h-4 w-4" />
                          <span>{formatSalary(result.salary)}</span>
                        </div>
                      )}

                      {/* Experience Level */}
                      {result.experience_level && (
                        <Badge className={getExperienceLevelColor(result.experience_level)}>
                          {result.experience_level.charAt(0).toUpperCase() +
                            result.experience_level.slice(1)} Level
                        </Badge>
                      )}

                      {/* Employment Type */}
                      {result.employment_type && (
                        <Badge variant="outline">
                          {result.employment_type.charAt(0).toUpperCase() +
                            result.employment_type.slice(1)}
                        </Badge>
                      )}

                      {/* Application Status */}
                      {result.status && (
                        <Badge className={getStatusColor(result.status)}>
                          {result.status.charAt(0).toUpperCase() +
                            result.status.slice(1)}
                        </Badge>
                      )}

                      {/* Match Score */}
                      {result.match_score !== null && result.match_score !== undefined && (
                        <div className="flex items-center gap-1 text-green-600">
                          <TrendingUp className="h-4 w-4" />
                          <span className="font-medium">
                            {result.match_score.toFixed(0)}% match
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Content Preview */}
                    {result.content && (
                      <p className="mt-4 text-sm text-muted-foreground line-clamp-3">
                        {result.content}
                      </p>
                    )}

                    {/* Posted Date */}
                    <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                      {result.posted_date && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>
                            Posted {formatDistanceToNow(new Date(result.posted_date), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                      )}
                      <div>
                        Added {formatDistanceToNow(new Date(result.created_at), {
                          addSuffix: true,
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {((page - 1) * page_size) + 1} to {Math.min(page * page_size, total)} of {total} results
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => onPageChange(page - 1)}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }

                  return (
                    <Button
                      key={pageNum}
                      variant={page === pageNum ? "default" : "outline"}
                      size="icon"
                      className="w-8 h-8"
                      onClick={() => onPageChange(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={() => onPageChange(page + 1)}
                disabled={page === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      )}
    </div>
  );
};