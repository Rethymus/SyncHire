"use client";

import { useState, useCallback, memo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Star,
  Trash2,
  Edit,
  Play,
  MoreVertical,
  Search,
  Filter,
  Download,
  Upload,
  Plus,
  Loader2,
  X,
  Tag,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { searchHistoryAPI, type SavedSearch } from "@/lib/api/search-history";
import { logger, LogCategory } from "@/lib/logger";

interface SavedSearchesManagerProps {
  className?: string;
  onSearchRun?: (query: string, filters?: Record<string, any>) => void;
  searchType?: 'resume' | 'jd' | 'application';
}

export const SavedSearchesManager = memo(function SavedSearchesManager({
  className,
  onSearchRun,
  searchType,
}: SavedSearchesManagerProps) {
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'favorite' | 'tags'>('all');
  const [sortBy, setSortBy] = useState<'created_at' | 'usage_count' | 'name'>('created_at');
  const [searchQuery, setSearchQuery] = useState("");

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingSearch, setEditingSearch] = useState<SavedSearch | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    query: "",
    tags: [] as string[],
    is_favorite: false,
  });

  const loadSavedSearches = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await searchHistoryAPI.getSavedSearches({
        search_type: searchType,
        favorite_only: filter === 'favorite',
        sort_by: sortBy,
        page_size: 50,
      });
      setSavedSearches(response.items || []);
    } catch (error) {
      logger.error(LogCategory.API, "Failed to load saved searches", error as Error);
      setError("Failed to load saved searches");
    } finally {
      setLoading(false);
    }
  }, [searchType, filter, sortBy]);

  // Load saved searches on mount
  useEffect(() => {
    loadSavedSearches();
  }, [loadSavedSearches]);

  const handleCreateSavedSearch = useCallback(async () => {
    if (!formData.query.trim()) {
      setError("Search query is required");
      return;
    }

    try {
      await searchHistoryAPI.createSavedSearch({
        name: formData.name || formData.query,
        description: formData.description,
        query: formData.query,
        search_type: searchType || 'resume',
        tags: formData.tags,
        is_favorite: formData.is_favorite,
      });

      setCreateDialogOpen(false);
      setFormData({ name: "", description: "", query: "", tags: [], is_favorite: false });
      loadSavedSearches();
    } catch (error) {
      logger.error(LogCategory.API, "Failed to create saved search", error as Error);
      setError("Failed to create saved search");
    }
  }, [formData, searchType, loadSavedSearches]);

  const handleUpdateSavedSearch = useCallback(async () => {
    if (!editingSearch) return;

    try {
      await searchHistoryAPI.updateSavedSearch(editingSearch.id, {
        name: formData.name,
        description: formData.description,
        query: formData.query,
        tags: formData.tags,
        is_favorite: formData.is_favorite,
      });

      setEditDialogOpen(false);
      setEditingSearch(null);
      setFormData({ name: "", description: "", query: "", tags: [], is_favorite: false });
      loadSavedSearches();
    } catch (error) {
      logger.error(LogCategory.API, "Failed to update saved search", error as Error);
      setError("Failed to update saved search");
    }
  }, [editingSearch, formData, loadSavedSearches]);

  const handleDeleteSavedSearch = useCallback(async (savedId: string) => {
    try {
      await searchHistoryAPI.deleteSavedSearch(savedId);
      setSavedSearches(prev => prev.filter(search => search.id !== savedId));
    } catch (error) {
      logger.error(LogCategory.API, "Failed to delete saved search", error as Error);
    }
  }, []);

  const handleRunSavedSearch = useCallback(async (savedId: string) => {
    try {
      const result = await searchHistoryAPI.runSavedSearch(savedId);
      onSearchRun?.(result.query, result.filters);
    } catch (error) {
      logger.error(LogCategory.API, "Failed to run saved search", error as Error);
    }
  }, [onSearchRun]);

  const handleToggleFavorite = useCallback(async (savedSearch: SavedSearch) => {
    try {
      await searchHistoryAPI.updateSavedSearch(savedSearch.id, {
        is_favorite: !savedSearch.is_favorite,
      });
      setSavedSearches(prev =>
        prev.map(search =>
          search.id === savedSearch.id
            ? { ...search, is_favorite: !search.is_favorite }
            : search
        )
      );
    } catch (error) {
      logger.error(LogCategory.API, "Failed to toggle favorite", error as Error);
    }
  }, []);

  const handleEditSavedSearch = useCallback((savedSearch: SavedSearch) => {
    setEditingSearch(savedSearch);
    setFormData({
      name: savedSearch.name,
      description: savedSearch.description || "",
      query: savedSearch.query,
      tags: savedSearch.tags || [],
      is_favorite: savedSearch.is_favorite,
    });
    setEditDialogOpen(true);
  }, []);

  const handleExportSearches = useCallback(async () => {
    try {
      const data = await searchHistoryAPI.exportSavedSearches();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `saved-searches-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      logger.error(LogCategory.API, "Failed to export searches", error as Error);
    }
  }, []);

  const handleImportSearches = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (data.searches && Array.isArray(data.searches)) {
        const result = await searchHistoryAPI.importSavedSearches({
          searches: data.searches.map((search: SavedSearch) => ({
            name: search.name,
            description: search.description,
            query: search.query,
            search_type: search.search_type,
            filters: search.filters,
            tags: search.tags,
            is_favorite: search.is_favorite,
          })),
          merge_strategy: 'skip_existing',
        });

        logger.info(LogCategory.API, `Imported ${result.imported || 0} searches`, result);
        loadSavedSearches();
      }
    } catch (error) {
      logger.error(LogCategory.API, "Failed to import searches", error as Error);
    }
  }, [loadSavedSearches]);

  const filteredSearches = savedSearches.filter(search =>
    search.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    search.query.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (search.description && search.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading && savedSearches.length === 0) {
    return (
      <div className={cn("bg-white rounded-lg border border-gray-200 p-6", className)}>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("bg-white rounded-lg border border-gray-200 p-6", className)}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Star className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Saved Searches</h2>
          <Badge variant="secondary">{savedSearches.length}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setFilter('all')}>
                All Searches
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter('favorite')}>
                <Star className="h-4 w-4 mr-2" />
                Favorites Only
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Sort
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setSortBy('created_at')}>
                Recently Created
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('usage_count')}>
                Most Used
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('name')}>
                Alphabetical
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" size="sm" onClick={handleExportSearches}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>

          <Button variant="outline" size="sm" onClick={() => document.getElementById('import-searches')?.click()}>
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <input
            id="import-searches"
            type="file"
            accept=".json"
            className="hidden"
            onChange={(e) => handleImportSearches(e)}
          />

          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Save Search
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Save Current Search</DialogTitle>
                <DialogDescription>
                  Save your current search criteria for quick access later.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <label className="text-sm font-medium">Search Query</label>
                  <Input
                    value={formData.query}
                    onChange={(e) => setFormData(prev => ({ ...prev, query: e.target.value }))}
                    placeholder="Enter search query..."
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Name</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Optional custom name..."
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Optional description..."
                    className="mt-1"
                    rows={3}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="favorite"
                    checked={formData.is_favorite}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_favorite: e.target.checked }))}
                    className="rounded"
                  />
                  <label htmlFor="favorite" className="text-sm font-medium">
                    Mark as favorite
                  </label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateSavedSearch}>
                  Save Search
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search saved searches..."
            className="pl-10"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {filteredSearches.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Star className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="text-lg font-medium">No saved searches yet</p>
          <p className="text-sm mt-1">
            Save your frequently used searches for quick access
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSearches.map((savedSearch) => (
            <div
              key={savedSearch.id}
              className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-gray-900">{savedSearch.name}</h3>
                    {savedSearch.is_favorite && (
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    )}
                    <Badge variant="outline" className="text-xs">
                      {savedSearch.search_type}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-700 mb-2">{savedSearch.query}</p>
                  {savedSearch.description && (
                    <p className="text-xs text-gray-600 mb-2">{savedSearch.description}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {savedSearch.usage_count} uses
                    </span>
                    {savedSearch.last_used_at && (
                      <span>
                        Last used: {new Date(savedSearch.last_used_at).toLocaleDateString()}
                      </span>
                    )}
                    {savedSearch.tags && savedSearch.tags.length > 0 && (
                      <div className="flex items-center gap-1">
                        <Tag className="h-3 w-3" />
                        {savedSearch.tags.map(tag => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRunSavedSearch(savedSearch.id)}
                    aria-label="Run this search"
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleFavorite(savedSearch)}
                    aria-label={savedSearch.is_favorite ? "Remove from favorites" : "Add to favorites"}
                  >
                    <Star className={`h-4 w-4 ${savedSearch.is_favorite ? "fill-yellow-500 text-yellow-500" : ""}`} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditSavedSearch(savedSearch)}
                    aria-label="Edit this search"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => handleRunSavedSearch(savedSearch.id)}>
                        <Play className="h-4 w-4 mr-2" />
                        Run Search
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEditSavedSearch(savedSearch)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDeleteSavedSearch(savedSearch.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Saved Search</DialogTitle>
            <DialogDescription>
              Update your saved search criteria.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Search Query</label>
              <Input
                value={formData.query}
                onChange={(e) => setFormData(prev => ({ ...prev, query: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="mt-1"
                rows={3}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="edit-favorite"
                checked={formData.is_favorite}
                onChange={(e) => setFormData(prev => ({ ...prev, is_favorite: e.target.checked }))}
                className="rounded"
              />
              <label htmlFor="edit-favorite" className="text-sm font-medium">
                Mark as favorite
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateSavedSearch}>
              Update Search
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
});