"use client";

import { memo } from "react";
import { useSearchContext } from "@/contexts/search-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  Trash2,
  Search as SearchIcon,
  FileText,
  Briefcase,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchHistoryProps {
  className?: string;
  onSearchSelect?: (query: string) => void;
  limit?: number;
}

export const SearchHistory = memo(function SearchHistory({
  className,
  onSearchSelect,
  limit = 10,
}: SearchHistoryProps) {
  const { searchHistory, clearHistory, removeFromHistory } = useSearchContext();

  const limitedHistory = searchHistory.slice(0, limit);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "resume":
        return <FileText className="h-3 w-3" />;
      case "jd":
        return <Briefcase className="h-3 w-3" />;
      case "application":
        return <Building2 className="h-3 w-3" />;
      default:
        return <SearchIcon className="h-3 w-3" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "resume":
        return "bg-blue-100 text-blue-800";
      case "jd":
        return "bg-green-100 text-green-800";
      case "application":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (limitedHistory.length === 0) {
    return (
      <div className={cn("bg-white rounded-lg border border-gray-200 p-6", className)}>
        <div className="text-center text-gray-500">
          <Clock className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm">No search history yet</p>
          <p className="text-xs mt-1">Your recent searches will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("bg-white rounded-lg border border-gray-200 p-4", className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-gray-600" />
          <h3 className="text-sm font-semibold text-gray-900">Recent Searches</h3>
          <Badge variant="secondary" className="text-xs">
            {searchHistory.length}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearHistory}
          className="text-gray-600 hover:text-red-600"
          aria-label="Clear search history"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-2">
        {limitedHistory.map((item) => (
          <div
            key={`${item.query}-${item.type}-${item.timestamp.getTime()}`}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
          >
            <button
              onClick={() => onSearchSelect?.(item.query)}
              className="flex-1 text-left"
              aria-label={`Search for "${item.query}"`}
            >
              <div className="flex items-center gap-2">
                <Clock className="h-3 w-3 text-gray-400 flex-shrink-0" />
                <span className="text-sm font-medium text-gray-900 truncate">
                  {item.query}
                </span>
                <Badge className={cn("text-xs", getTypeColor(item.type))}>
                  <div className="flex items-center gap-1">
                    {getTypeIcon(item.type)}
                    {item.type}
                  </div>
                </Badge>
              </div>
              <div className="flex items-center gap-2 mt-1 ml-5">
                <span className="text-xs text-gray-500">
                  {new Date(item.timestamp).toLocaleDateString()}{" "}
                  {new Date(item.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                {item.resultCount > 0 && (
                  <span className="text-xs text-gray-600">
                    {item.resultCount} {item.resultCount === 1 ? "result" : "results"}
                  </span>
                )}
              </div>
            </button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeFromHistory(item.query)}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label={`Remove "${item.query}" from history`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
});
