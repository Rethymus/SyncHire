"use client";

import { createContext, useContext, useCallback, useState, useEffect, useRef, ReactNode } from "react";

interface SearchHistoryItem {
  query: string;
  timestamp: Date;
  type: "resume" | "jd" | "application";
  resultCount: number;
}

interface SearchContextType {
  searchHistory: SearchHistoryItem[];
  recentSearches: string[];
  addToHistory: (item: SearchHistoryItem) => void;
  clearHistory: () => void;
  removeFromHistory: (query: string) => void;
  getRecentSearches: (limit?: number) => string[];
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

const STORAGE_KEY = "synchire_search_history";
const MAX_HISTORY_ITEMS = 20;

export function SearchProvider({ children }: { children: ReactNode }) {
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  // SSR renders an empty list; hydrate from localStorage after mount so the
  // server and client markup match (a typeof-window initializer caused a
  // hydration mismatch that surfaced as a script-tag warning on /data).
  const hydratedRef = useRef(false);

  useEffect(() => {
    // One-shot hydration from localStorage after mount; reading it in the
    // state initializer would branch on typeof window and break SSR hydration.
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // eslint-disable-next-line react-hooks/set-state-in-effect -- single sync from an external store on mount
        setSearchHistory(
          parsed.map((item: SearchHistoryItem) => ({
            ...item,
            timestamp: new Date(item.timestamp),
          }))
        );
      }
    } catch (error) {
      console.error("Failed to load search history:", error);
    }
    hydratedRef.current = true;
  }, []);

  // Save search history to localStorage whenever it changes
  useEffect(() => {
    if (!hydratedRef.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(searchHistory));
    } catch (error) {
      console.error("Failed to save search history:", error);
    }
  }, [searchHistory]);

  const addToHistory = useCallback((item: SearchHistoryItem) => {
    setSearchHistory((prev) => {
      // Remove existing entry with same query and type
      const filtered = prev.filter(
        (h) => !(h.query === item.query && h.type === item.type)
      );

      // Add new item at the beginning
      const updated = [{ ...item, timestamp: new Date() }, ...filtered];

      // Keep only the most recent items
      return updated.slice(0, MAX_HISTORY_ITEMS);
    });
  }, []);

  const clearHistory = useCallback(() => {
    setSearchHistory([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error("Failed to clear search history:", error);
    }
  }, []);

  const removeFromHistory = useCallback((query: string) => {
    setSearchHistory((prev) => prev.filter((h) => h.query !== query));
  }, []);

  const getRecentSearches = useCallback(
    (limit: number = 5) => {
      // Get unique queries from history, most recent first
      const uniqueQueries = Array.from(
        new Map(searchHistory.map((item) => [item.query, item])).values()
      );

      return uniqueQueries
        .slice(0, limit)
        .map((item) => item.query);
    },
    [searchHistory]
  );

  const recentSearches = getRecentSearches();

  const value: SearchContextType = {
    searchHistory,
    recentSearches,
    addToHistory,
    clearHistory,
    removeFromHistory,
    getRecentSearches,
  };

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}

export function useSearchContext() {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error("useSearchContext must be used within a SearchProvider");
  }
  return context;
}
