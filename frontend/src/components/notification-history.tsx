"use client";

/**
 * Notification History Component
 *
 * Displays a comprehensive list of all user notifications with filtering and management options
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Check,
  CheckCheck,
  Trash2,
  Filter,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { Notification, NotificationType } from "./notification-center";

type FilterType = "all" | "unread" | "success" | "info" | "warning" | "error";

const FILTER_LABELS: Record<FilterType, string> = {
  all: "All",
  unread: "Unread",
  success: "Success",
  info: "Info",
  warning: "Warning",
  error: "Error",
};

const NOTIFICATION_COLORS: Record<NotificationType, string> = {
  success: "bg-green-50 border-green-200 text-green-900",
  info: "bg-blue-50 border-blue-200 text-blue-900",
  warning: "bg-yellow-50 border-yellow-200 text-yellow-900",
  error: "bg-red-50 border-red-200 text-red-900",
};

interface NotificationHistoryProps {
  className?: string;
}

export function NotificationHistory({ className }: NotificationHistoryProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const limit = 20;

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setNotifications([]);
      setTotal(0);
      setUnreadCount(0);
    } catch (err) {
      setError("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, []);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      setError("Failed to mark notification as read");
    }
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      setNotifications(prev =>
        prev.map(n => ({ ...n, read: true }))
      );
      setUnreadCount(0);
    } catch (err) {
      setError("Failed to mark all as read");
    }
  }, []);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      setNotifications(prev => {
        const filtered = prev.filter(n => n.id !== notificationId);
        setUnreadCount(filtered.filter(n => !n.read).length);
        setTotal(prev => prev - 1);
        return filtered;
      });
    } catch (err) {
      setError("Failed to delete notification");
    }
  }, []);

  // Clear all notifications
  const clearAll = useCallback(async () => {
    if (!confirm("Are you sure you want to delete all notifications?")) {
      return;
    }

    try {
      setNotifications([]);
      setUnreadCount(0);
      setTotal(0);
    } catch (err) {
      setError("Failed to clear notifications");
    }
  }, []);

  // Filter notifications by type (client-side for non-unread filters)
  const filteredNotifications = useMemo(() => {
    if (filter === "all" || filter === "unread") {
      return notifications;
    }
    return notifications.filter(n => n.type === filter);
  }, [notifications, filter]);

  // Fetch notifications on mount and when filter/page changes
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      if (isMounted) {
        await fetchNotifications();
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [fetchNotifications]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Notifications</h2>
          <p className="text-gray-600 mt-1">
            {unreadCount > 0 ? `${unreadCount} unread notifications` : `${total} total notifications`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchNotifications}
            disabled={loading}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Refresh
          </Button>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={markAllAsRead}
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              Mark all read
            </Button>
          )}
          {total > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearAll}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear all
            </Button>
          )}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="h-4 w-4 text-gray-500" />
        {(Object.keys(FILTER_LABELS) as FilterType[]).map((filterType) => (
          <Button
            key={filterType}
            variant={filter === filterType ? "default" : "ghost"}
            size="sm"
            onClick={() => {
              setFilter(filterType);
              setPage(1);
            }}
          >
            {FILTER_LABELS[filterType]}
          </Button>
        ))}
      </div>

      {/* Notifications List */}
      {loading && notifications.length === 0 ? (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600">No notifications found</p>
          <p className="text-sm text-gray-500 mt-1">
            {filter === "unread" ? "You're all caught up!" : "Notifications will appear here"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notification) => {
            const colors = NOTIFICATION_COLORS[notification.type];

            return (
              <div
                key={notification.id}
                className={cn(
                  "border rounded-lg p-4 transition-colors",
                  !notification.read && "bg-blue-50/50 border-blue-200",
                  notification.read && "bg-white border-gray-200 hover:bg-gray-50"
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className={cn(
                      "inline-block px-2 py-1 text-xs font-medium rounded-full mb-2",
                      colors
                    )}>
                      {notification.type.toUpperCase()}
                    </div>
                    <h3 className={cn(
                      "text-lg font-medium",
                      notification.read ? "text-gray-700" : "text-gray-900"
                    )}>
                      {notification.title}
                    </h3>
                    <p className="text-gray-600 mt-1">
                      {notification.message}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <span>
                        {formatDistanceToNow(new Date(notification.created_at), {
                          addSuffix: true,
                        })}
                      </span>
                      {notification.action_url && (
                        <a
                          href={notification.action_url}
                          className="text-primary hover:underline"
                        >
                          View →
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {!notification.read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markAsRead(notification.id)}
                        aria-label="Mark as read"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteNotification(notification.id)}
                      className="text-red-600 hover:text-red-700"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} notifications
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <span className="text-sm text-gray-600">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
