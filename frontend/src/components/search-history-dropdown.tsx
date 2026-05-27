"use client";

import { useState, useCallback, memo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Clock,
  Trash2,
  Search as SearchIcon,
  FileText,
  Briefcase,
  Building2,
  Star,
  History,
  X,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { searchHistoryAPI, type SearchHistoryItem, type SearchSuggestion } from "@/lib/api/search-history";
import { logger, LogCategory } from "@/lib/logger";

interface SearchHistoryDropdownProps {
  className?: string;
  onSearchSelect?: (query: string, filters?: Record<string, any>) => void;
  searchType?: 'resume' | 'jd' | 'application';
  placeholder?: string;
  disabled?: boolean;
}

export const SearchHistoryDropdown = memo(function SearchHistoryDropdown({
  className,
  onSearchSelect,
  searchType = 'resume',
  placeholder = "Search...",
  disabled = false,
}: SearchHistoryDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSearchHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await searchHistoryAPI.getSearchHistory({
        search_type: searchType,
        page_size: 10,
      });
      setHistory(response.items || []);
    } catch (error) {
      logger.error(LogCategory.API, "Failed to load search history", error as Error);
      setError("Failed to load search history");
    } finally {
      setLoading(false);
    }
  }, [searchType]);

  // Load search history on mount and when menu opens
  useEffect(() => {
    if (isOpen) {
      loadSearchHistory();
    }
  }, [isOpen, loadSearchHistory]);

  const loadSuggestions = useCallback(async () => {
    try {
      const response = await searchHistoryAPI.getSearchSuggestions(query, 5);
      setSuggestions(response.suggestions || []);
    } catch (error) {
      logger.error(LogCategory.API, "Failed to load search suggestions", error as Error);
    }
  }, [query]);

  // Load search suggestions when query changes
  useEffect(() => {
    if (query.length >= 2) {
      loadSuggestions();
    } else {
      setSuggestions([]);
    }
  }, [query, loadSuggestions]);

  const handleSearch = useCallback(async (searchQuery: string = query) => {
    if (!searchQuery.trim()) return;

    try {
      // Track search in history
      await searchHistoryAPI.createSearchHistory({
        query: searchQuery,
        search_type: searchType,
        result_count: 0, // Will be updated with actual results
        is_sensitive: false,
      });

      // Call the search handler
      onSearchSelect?.(searchQuery);
      setQuery("");
      setIsOpen(false);
    } catch (error) {
      logger.error(LogCategory.API, "Failed to track search", error as Error);
    }
  }, [query, searchType, onSearchSelect]);

  const handleHistorySelect = useCallback((item: SearchHistoryItem) => {
    setQuery(item.query);
    handleSearch(item.query);
  }, [handleSearch]);

  const handleSuggestionSelect = useCallback((suggestion: SearchSuggestion) => {
    setQuery(suggestion.term);
    handleSearch(suggestion.term);
  }, [handleSearch]);

  const handleClearHistory = useCallback(async () => {
    try {
      await searchHistoryAPI.clearSearchHistory(searchType);
      setHistory([]);
    } catch (error) {
      logger.error(LogCategory.API, "Failed to clear search history", error as Error);
    }
  }, [searchType]);

  const handleRemoveItem = useCallback(async (itemId: string, event?: React.MouseEvent) => {
    event?.stopPropagation();
    try {
      await searchHistoryAPI.deleteSearchHistory(itemId);
      setHistory(prev => prev.filter(item => item.id !== itemId));
    } catch (error) {
      logger.error(LogCategory.API, "Failed to remove search history item", error as Error);
    }
  }, []);

  const getTypeIcon = useCallback((type: string) => {
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
  }, []);

  const getTypeColor = useCallback((type: string) => {
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
  }, []);

  const getSuggestionTypeColor = useCallback((type: string) => {
    switch (type) {
      case "history":
        return "bg-blue-100 text-blue-800";
      case "saved":
        return "bg-yellow-100 text-yellow-800";
      case "analytic":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  }, []);

  return (
    <div className={cn("relative", className)}>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <div className="relative flex items-center gap-2">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSearch();
                }
              }}
              placeholder={placeholder}
              disabled={disabled}
              className="pl-10 pr-10"
              aria-label="Search"
              aria-expanded={isOpen}
              aria-controls="search-menu"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              disabled={disabled}
              aria-label="Search history"
              aria-expanded={isOpen}
            >
              <History className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
        </div>

        <DropdownMenuContent
          id="search-menu"
          className="w-80 max-h-96 overflow-y-auto"
          align="start"
        >
          <DropdownMenuLabel className="flex items-center justify-between">
            <span>Search History</span>
            {history.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearHistory}
                className="text-xs text-gray-600 hover:text-red-600"
              >
                Clear All
              </Button>
            )}
          </DropdownMenuLabel>

          {error && (
            <div className="px-2 py-3 text-sm text-red-600 text-center">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : suggestions.length > 0 ? (
            <>
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-xs text-gray-500">
                  Suggestions
                </DropdownMenuLabel>
                {suggestions.map((suggestion, index) => (
                  <DropdownMenuItem
                    key={`${suggestion.type}-${index}`}
                    onClick={() => handleSuggestionSelect(suggestion)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center gap-2 flex-1">
                      {suggestion.type === 'saved' && <Star className="h-3 w-3 text-yellow-600" />}
                      {suggestion.type === 'history' && <Clock className="h-3 w-3 text-blue-600" />}
                      {suggestion.type === 'analytic' && <SearchIcon className="h-3 w-3 text-green-600" />}
                      <span className="flex-1 truncate">{suggestion.term}</span>
                      {suggestion.frequency && (
                        <Badge variant="secondary" className="text-xs">
                          {suggestion.frequency}
                        </Badge>
                      )}
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
            </>
          ) : null}

          {history.length > 0 ? (
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs text-gray-500">
                Recent Searches
              </DropdownMenuLabel>
              {history.slice(0, 8).map((item) => (
                <DropdownMenuItem
                  key={item.id}
                  onClick={() => handleHistorySelect(item)}
                  className="cursor-pointer group"
                >
                  <div className="flex items-center gap-2 flex-1">
                    <Clock className="h-3 w-3 text-gray-400" />
                    <span className="flex-1 truncate">{item.query}</span>
                    <Badge className={cn("text-xs", getTypeColor(item.search_type))}>
                      <div className="flex items-center gap-1">
                        {getTypeIcon(item.search_type)}
                        {item.search_type}
                      </div>
                    </Badge>
                    <DropdownMenuShortcut>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleRemoveItem(item.id, e)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label={`Remove "${item.query}" from history`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </DropdownMenuShortcut>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          ) : (
            <div className="px-2 py-8 text-center text-gray-500">
              <Clock className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm">No search history yet</p>
              <p className="text-xs mt-1">Your recent searches will appear here</p>
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
});