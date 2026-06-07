"use client";


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
import { useLiteCopy, type LiteLocale } from "@/lib/lite-i18n";

const LOCAL_SAVED_SEARCHES_KEY = "synchire-saved-searches";

const SAVED_SEARCHES_COPY = {
  "en-US": {
    title: "Saved Searches",
    subtitle: "Manage your saved searches and set up notifications for new matches",
    deletedTitle: "Search deleted",
    deletedDescription: "Your saved search has been deleted.",
    updatedTitle: "Search updated",
    updatedDescription: "Your saved search has been updated.",
    never: "Never",
    filtersApplied: "Filters Applied",
    active: "active",
    more: "more",
    notifications: "Notifications",
    disabled: "Disabled",
    enable: "Enable",
    disable: "Disable",
    alerts: (frequency: string) => `${frequency} alerts`,
    lastNotified: (date: string) => `Last notified: ${date}`,
    runSearch: "Run Search",
    deleteTitle: "Delete Saved Search?",
    deleteDescription: (name: string) =>
      `Are you sure you want to delete "${name}"? This action cannot be undone.`,
    cancel: "Cancel",
    delete: "Delete",
    created: (date: string) => `Created ${date}`,
    updated: (date: string) => `Updated ${date}`,
    emptyTitle: "No Saved Searches Yet",
    emptyDescription:
      "Save your frequent searches to quickly access them later and get notified about new matches.",
    createFirst: "Create Your First Saved Search",
    frequency: {
      daily: "daily",
      weekly: "weekly",
      instant: "instant",
      monthly: "monthly",
    },
    filterLabels: {
      type: "type",
      location: "location",
      status: "status",
    },
  },
  "zh-CN": {
    title: "收藏搜索",
    subtitle: "管理常用搜索条件，并为新的匹配机会设置本地通知",
    deletedTitle: "搜索已删除",
    deletedDescription: "这条收藏搜索已删除。",
    updatedTitle: "搜索已更新",
    updatedDescription: "这条收藏搜索已更新。",
    never: "从未",
    filtersApplied: "已应用筛选",
    active: "项生效",
    more: "项更多",
    notifications: "通知",
    disabled: "已关闭",
    enable: "开启",
    disable: "关闭",
    alerts: (frequency: string) => `${frequency}提醒`,
    lastNotified: (date: string) => `上次通知：${date}`,
    runSearch: "运行搜索",
    deleteTitle: "删除收藏搜索？",
    deleteDescription: (name: string) =>
      `确定要删除“${name}”吗？此操作无法撤销。`,
    cancel: "取消",
    delete: "删除",
    created: (date: string) => `创建于 ${date}`,
    updated: (date: string) => `更新于 ${date}`,
    emptyTitle: "还没有收藏搜索",
    emptyDescription:
      "保存常用搜索后，可以快速回到目标机会，并在出现新匹配时收到提醒。",
    createFirst: "创建第一条收藏搜索",
    frequency: {
      daily: "每日",
      weekly: "每周",
      instant: "即时",
      monthly: "每月",
    },
    filterLabels: {
      type: "类型",
      location: "地点",
      status: "状态",
    },
  },
} as const;

function formatFrequency(frequency: string, locale: LiteLocale) {
  const copy = SAVED_SEARCHES_COPY[locale].frequency;
  return copy[frequency as keyof typeof copy] ?? frequency;
}

function formatFilterLabel(filter: string, locale: LiteLocale) {
  const copy = SAVED_SEARCHES_COPY[locale].filterLabels;
  return copy[filter as keyof typeof copy] ?? filter;
}

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

function readLocalSavedSearches() {
  if (typeof window === "undefined") {
    return [] as SavedSearch[];
  }

  try {
    const stored = window.localStorage.getItem(LOCAL_SAVED_SEARCHES_KEY);
    const parsed = stored ? JSON.parse(stored) : [];

    return Array.isArray(parsed)
      ? parsed.filter((item): item is SavedSearch =>
          typeof item?.id === "string" &&
          typeof item?.name === "string" &&
          typeof item?.search_query === "string" &&
          typeof item?.created_at === "string" &&
          typeof item?.updated_at === "string"
        )
      : [];
  } catch {
    return [];
  }
}

function writeLocalSavedSearches(searches: SavedSearch[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(LOCAL_SAVED_SEARCHES_KEY, JSON.stringify(searches));
}

export default function SavedSearchesPage() {
  const isClient = useClientOnly();

  // All hooks must be called before any conditional returns
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { locale } = useLiteCopy();
  const copy = SAVED_SEARCHES_COPY[locale];
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editFrequency, setEditFrequency] = useState("");

  // Fetch saved searches
  const { data: savedSearches, isLoading } = useQuery({
    queryKey: ["saved-searches"],
    queryFn: async () => {
      return readLocalSavedSearches();
    },
    enabled: isClient, // Only fetch on client side
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      writeLocalSavedSearches(readLocalSavedSearches().filter((search) => search.id !== id));
      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-searches"] });
      toast({
        title: copy.deletedTitle,
        description: copy.deletedDescription,
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      name,
      frequency,
      notifyMatches,
    }: {
      id: string;
      name: string;
      frequency: string;
      notifyMatches?: boolean;
    }) => {
      writeLocalSavedSearches(
        readLocalSavedSearches().map((search) =>
          search.id === id
            ? {
                ...search,
                name,
                notification_frequency: frequency,
                notify_matches: notifyMatches ?? search.notify_matches,
                updated_at: new Date().toISOString(),
              }
            : search
        )
      );
      return { id, name, notification_frequency: frequency };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-searches"] });
      toast({
        title: copy.updatedTitle,
        description: copy.updatedDescription,
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
      notifyMatches: !search.notify_matches,
    });
  };

  const getFilterCount = (filters: Record<string, any>) => {
    return Object.keys(filters).filter(
      (key) => filters[key] !== undefined && filters[key] !== null && filters[key] !== ""
    ).length;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return copy.never;
    return new Date(dateString).toLocaleDateString(locale);
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
        <h1 className="text-3xl font-bold mb-2">{copy.title}</h1>
        <p className="text-muted-foreground">
          {copy.subtitle}
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
                      <Label className="text-sm">{copy.filtersApplied}</Label>
                      <Badge variant="secondary" className="text-xs">
                        {getFilterCount(search.filters)} {copy.active}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(search.filters)
                        .filter(([_, value]) => value !== undefined && value !== null && value !== "")
                        .slice(0, 3)
                        .map(([key, _]) => (
                          <Badge key={key} variant="outline" className="text-xs">
                            {formatFilterLabel(key, locale)}
                          </Badge>
                        ))}
                      {getFilterCount(search.filters) > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{getFilterCount(search.filters) - 3} {copy.more}
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
                      <p className="font-medium">{copy.notifications}</p>
                      <p className="text-muted-foreground text-xs">
                        {search.notify_matches
                          ? copy.alerts(formatFrequency(search.notification_frequency, locale))
                          : copy.disabled}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleNotifications(search)}
                  >
                    {search.notify_matches ? copy.disable : copy.enable}
                  </Button>
                </div>

                {/* Last Notified */}
                {search.notify_matches && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{copy.lastNotified(formatDate(search.last_notified_at))}</span>
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
                    {copy.runSearch}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{copy.deleteTitle}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {copy.deleteDescription(search.name)}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{copy.cancel}</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(search.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {copy.delete}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>

                {/* Metadata */}
                <div className="text-xs text-muted-foreground pt-2 border-t">
                  <div>{copy.created(new Date(search.created_at).toLocaleDateString(locale))}</div>
                  <div>{copy.updated(new Date(search.updated_at).toLocaleDateString(locale))}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">{copy.emptyTitle}</h3>
            <p className="text-muted-foreground mb-4">
              {copy.emptyDescription}
            </p>
            <Button onClick={() => window.location.href = "/search"}>
              {copy.createFirst}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
