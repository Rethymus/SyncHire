"use client";

import { useState, useCallback, memo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TrendingUp,
  Search,
  BarChart3,
  Clock,
  Star,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { searchHistoryAPI, type SearchAnalyticsSummary } from "@/lib/api/search-history";
import { logger, LogCategory } from "@/lib/logger";

interface SearchAnalyticsProps {
  className?: string;
  days?: number;
  onSearchSelect?: (query: string) => void;
}

export const SearchAnalytics = memo(function SearchAnalytics({
  className,
  days = 30,
  onSearchSelect,
}: SearchAnalyticsProps) {
  const [analytics, setAnalytics] = useState<SearchAnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDays, setSelectedDays] = useState(days);

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await searchHistoryAPI.getSearchAnalytics(selectedDays);
      setAnalytics(response || null);
    } catch (error) {
      logger.error(LogCategory.API, "Failed to load search analytics", error as Error);
      setError("Failed to load search analytics");
    } finally {
      setLoading(false);
    }
  }, [selectedDays]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const handleSearchClick = useCallback((query: string) => {
    onSearchSelect?.(query);
  }, [onSearchSelect]);

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-red-600">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!analytics) {
    return null;
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-6 w-6 text-gray-600" />
          <div>
            <h2 className="text-xl font-bold text-gray-900">Search Analytics</h2>
            <p className="text-sm text-gray-600">
              Insights from your search activity
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedDays.toString()} onValueChange={(value) => setSelectedDays(parseInt(value))}>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={loadAnalytics}
            disabled={loading}
            aria-label="Refresh analytics"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Searches</CardDescription>
            <CardTitle className="text-3xl">{analytics.total_searches}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-sm text-gray-600">
              <TrendingUp className="h-4 w-4 mr-1 text-green-600" />
              <span>Last {selectedDays} days</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Search Types</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(analytics.search_type_breakdown).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <span className="capitalize text-sm">{type}</span>
                <Badge variant="secondary">{count}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Top Searches</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analytics.most_common_terms.slice(0, 3).map((term, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm truncate">{term.search_term}</span>
                  <Badge variant="secondary">{term.search_count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Most Common Search Terms */}
      {analytics.most_common_terms.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Most Common Search Terms
            </CardTitle>
            <CardDescription>
              Your most frequently searched terms
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.most_common_terms.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => handleSearchClick(item.search_term)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{item.search_term}</span>
                      <Badge variant="outline" className="text-xs">
                        {item.search_type}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                      <span>{item.search_count} searches</span>
                      {item.avg_result_count && (
                        <span>Avg {item.avg_result_count} results</span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(item.last_searched_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      {analytics.recent_activity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Search Activity
            </CardTitle>
            <CardDescription>
              Your latest searches
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analytics.recent_activity.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => handleSearchClick(item.query)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{item.query}</span>
                      <Badge variant="outline" className="text-xs">
                        {item.search_type}
                      </Badge>
                      {item.result_count > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {item.result_count} results
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-sm text-gray-600">
                      <Clock className="h-3 w-3" />
                      {new Date(item.search_timestamp).toLocaleString()}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Saved Searches */}
      {analytics.top_saved_searches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Top Saved Searches
            </CardTitle>
            <CardDescription>
              Your most used saved searches
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.top_saved_searches.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => handleSearchClick(item.query)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{item.name}</span>
                      {item.is_favorite && (
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      )}
                      <Badge variant="outline" className="text-xs">
                        {item.search_type}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-700 mt-1">{item.query}</p>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                      <span>{item.usage_count} uses</span>
                      {item.last_used_at && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Last used {new Date(item.last_used_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
});