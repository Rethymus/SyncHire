"use client";

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from "react";

// Client-side only check to prevent SSR issues
const useClientOnly = () => {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsClient(true);
  }, []);
  return isClient;
};
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Bell,
  BellOff,
  Search,
  Trash2,
  Play,
  Clock,
  Edit,
  Check,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SavedSearch {
  id: string;
  name: string;
  search_query: string;
  filters: Record<string, any>;
  notify_matches: boolean;
  notification_frequency: string;
  last_notified_at: string | null;
  created_at: string;
  updated_at: string;
}

export default function SavedSearchesPage() {
  const isClient = useClientOnly();

  // All hooks must be called before any conditional returns
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editFrequency, setEditFrequency] = useState("");

  // Fetch saved searches
  const { data: savedSearches, isLoading } = useQuery({
    queryKey: ["saved-searches"],
    queryFn: async () => {
      return [] as SavedSearch[];
    },
    enabled: isClient, // Only fetch on client side
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-searches"] });
      toast({
        title: "Search deleted",
        description: "Your saved search has been deleted.",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, name, frequency }: { id: string; name: string; frequency: string }) => {
      return { id, name, notification_frequency: frequency };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-searches"] });
      toast({
        title: "Search updated",
        description: "Your saved search has been updated.",
      });
      setEditingId(null);
    },
  });

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const handleRunSearch = (search: SavedSearch) => {
    // Redirect to search page with pre-filled query and filters
    const params = new URLSearchParams({
      q: search.search_query,
      filters: JSON.stringify(search.filters),
    });
    window.location.href = `/search?${params.toString()}`;
  };

  const startEdit = (search: SavedSearch) => {
    setEditingId(search.id);
    setEditName(search.name);
    setEditFrequency(search.notification_frequency);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditFrequency("");
  };

  const saveEdit = (id: string) => {
    updateMutation.mutate({
      id,
      name: editName,
      frequency: editFrequency,
    });
  };

  const toggleNotifications = (search: SavedSearch) => {
    updateMutation.mutate({
      id: search.id,
      name: search.name,
      frequency: search.notification_frequency,
    });
  };

  const getFilterCount = (filters: Record<string, any>) => {
    return Object.keys(filters).filter(
      (key) => filters[key] !== undefined && filters[key] !== null && filters[key] !== ""
    ).length;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString();
  };

  // Show loading state while checking for client or loading data
  if (!isClient || isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Saved Searches</h1>
        <p className="text-muted-foreground">
          Manage your saved searches and set up notifications for new matches
        </p>
      </div>

      {savedSearches && savedSearches.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {savedSearches.map((search) => (
            <Card key={search.id} className="relative">
              <CardHeader>
                {editingId === search.id ? (
                  <div className="space-y-2">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="font-semibold"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => saveEdit(search.id)}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={cancelEdit}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{search.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {search.search_query}
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => startEdit(search)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Search Query */}
                <div className="bg-muted p-3 rounded-md">
                  <div className="flex items-center gap-2 text-sm">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{search.search_query}</span>
                  </div>
                </div>

                {/* Filters */}
                {getFilterCount(search.filters) > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm">Filters Applied</Label>
                      <Badge variant="secondary" className="text-xs">
                        {getFilterCount(search.filters)} active
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(search.filters)
                        .filter(([_, value]) => value !== undefined && value !== null && value !== "")
                        .slice(0, 3)
                        .map(([key, _]) => (
                          <Badge key={key} variant="outline" className="text-xs">
                            {key}
                          </Badge>
                        ))}
                      {getFilterCount(search.filters) > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{getFilterCount(search.filters) - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Notification Settings */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center gap-2">
                    {search.notify_matches ? (
                      <Bell className="h-4 w-4 text-green-600" />
                    ) : (
                      <BellOff className="h-4 w-4 text-muted-foreground" />
                    )}
                    <div className="text-sm">
                      <p className="font-medium">Notifications</p>
                      <p className="text-muted-foreground text-xs">
                        {search.notify_matches
                          ? `${search.notification_frequency} alerts`
                          : "Disabled"}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleNotifications(search)}
                  >
                    {search.notify_matches ? "Disable" : "Enable"}
                  </Button>
                </div>

                {/* Last Notified */}
                {search.notify_matches && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>Last notified: {formatDate(search.last_notified_at)}</span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    variant="default"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleRunSearch(search)}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Run Search
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Saved Search?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete &ldquo;{search.name}&rdquo;? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(search.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>

                {/* Metadata */}
                <div className="text-xs text-muted-foreground pt-2 border-t">
                  <div>Created {new Date(search.created_at).toLocaleDateString()}</div>
                  <div>Updated {new Date(search.updated_at).toLocaleDateString()}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Saved Searches Yet</h3>
            <p className="text-muted-foreground mb-4">
              Save your frequent searches to quickly access them later and get notified about new matches.
            </p>
            <Button onClick={() => window.location.href = "/search"}>
              Create Your First Saved Search
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
