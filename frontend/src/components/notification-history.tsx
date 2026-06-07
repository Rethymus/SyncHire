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
import { enUS, zhCN } from "date-fns/locale";
import { Notification, NotificationType } from "./notification-center";
import {
  type LocalNotification,
  readLocalNotifications,
  writeLocalNotifications,
} from "@/lib/local-notifications";
import { useLiteCopy, type LiteLocale } from "@/lib/lite-i18n";

type FilterType = "all" | "unread" | "success" | "info" | "warning" | "error";

const NOTIFICATION_COLORS: Record<NotificationType, string> = {
  success: "bg-green-50 border-green-200 text-green-900",
  info: "bg-blue-50 border-blue-200 text-blue-900",
  warning: "bg-yellow-50 border-yellow-200 text-yellow-900",
  error: "bg-red-50 border-red-200 text-red-900",
};

const HISTORY_COPY = {
  "en-US": {
    title: "Notifications",
    unreadCount: (count: number) => `${count} unread notifications`,
    totalCount: (count: number) => `${count} total notifications`,
    refresh: "Refresh",
    markAllRead: "Mark all read",
    clearAll: "Clear all",
    confirmClear: "Are you sure you want to delete all notifications?",
    loadFailed: "Failed to load notifications",
    markReadFailed: "Failed to mark notification as read",
    markAllReadFailed: "Failed to mark all as read",
    deleteFailed: "Failed to delete notification",
    clearFailed: "Failed to clear notifications",
    emptyTitle: "No notifications found",
    emptyUnread: "You're all caught up!",
    emptyDefault: "Notifications will appear here",
    view: "View ->",
    markAsRead: "Mark as read",
    delete: "Delete",
    showing: (start: number, end: number, total: number) =>
      `Showing ${start} to ${end} of ${total} notifications`,
    previous: "Previous",
    next: "Next",
    page: (page: number, totalPages: number) => `Page ${page} of ${totalPages}`,
    filters: {
      all: "All",
      unread: "Unread",
      success: "Success",
      info: "Info",
      warning: "Warning",
      error: "Error",
    },
    types: {
      success: "SUCCESS",
      info: "INFO",
      warning: "WARNING",
      error: "ERROR",
    },
  },
  "zh-CN": {
    title: "通知历史",
    unreadCount: (count: number) => `${count} 条未读通知`,
    totalCount: (count: number) => `共 ${count} 条通知`,
    refresh: "刷新",
    markAllRead: "全部标为已读",
    clearAll: "清空全部",
    confirmClear: "确定要删除所有通知吗？",
    loadFailed: "加载通知失败",
    markReadFailed: "标记已读失败",
    markAllReadFailed: "全部标为已读失败",
    deleteFailed: "删除通知失败",
    clearFailed: "清空通知失败",
    emptyTitle: "暂无通知",
    emptyUnread: "你已经处理完所有未读通知。",
    emptyDefault: "新的通知会出现在这里",
    view: "查看 ->",
    markAsRead: "标为已读",
    delete: "删除",
    showing: (start: number, end: number, total: number) =>
      `显示第 ${start} 到 ${end} 条，共 ${total} 条通知`,
    previous: "上一页",
    next: "下一页",
    page: (page: number, totalPages: number) => `第 ${page} 页，共 ${totalPages} 页`,
    filters: {
      all: "全部",
      unread: "未读",
      success: "成功",
      info: "信息",
      warning: "警告",
      error: "错误",
    },
    types: {
      success: "成功",
      info: "信息",
      warning: "警告",
      error: "错误",
    },
  },
} as const;

interface NotificationHistoryProps {
  className?: string;
}

export function NotificationHistory({ className }: NotificationHistoryProps) {
  const { locale } = useLiteCopy();
  const copy = HISTORY_COPY[locale];
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
      const localNotifications = readLocalNotifications();
      setNotifications(localNotifications);
      setTotal(localNotifications.length);
      setUnreadCount(localNotifications.filter((notification) => !notification.read).length);
    } catch (err) {
      setError(copy.loadFailed);
    } finally {
      setLoading(false);
    }
  }, [copy.loadFailed]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      setNotifications(prev => {
        const next = prev.map(n =>
          n.id === notificationId ? { ...n, read: true } : n
        );
        writeLocalNotifications(next as LocalNotification[]);
        setUnreadCount(next.filter(n => !n.read).length);
        return next;
      });
    } catch (err) {
      setError(copy.markReadFailed);
    }
  }, [copy.markReadFailed]);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      setNotifications(prev => {
        const next = prev.map(n => ({ ...n, read: true }));
        writeLocalNotifications(next as LocalNotification[]);
        return next;
      });
      setUnreadCount(0);
    } catch (err) {
      setError(copy.markAllReadFailed);
    }
  }, [copy.markAllReadFailed]);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      setNotifications(prev => {
        const filtered = prev.filter(n => n.id !== notificationId);
        writeLocalNotifications(filtered as LocalNotification[]);
        setUnreadCount(filtered.filter(n => !n.read).length);
        setTotal(prev => prev - 1);
        return filtered;
      });
    } catch (err) {
      setError(copy.deleteFailed);
    }
  }, [copy.deleteFailed]);

  // Clear all notifications
  const clearAll = useCallback(async () => {
    if (!confirm(copy.confirmClear)) {
      return;
    }

    try {
      setNotifications([]);
      setUnreadCount(0);
      setTotal(0);
      writeLocalNotifications([]);
    } catch (err) {
      setError(copy.clearFailed);
    }
  }, [copy.clearFailed, copy.confirmClear]);

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
  const dateLocale = locale === "zh-CN" ? zhCN : enUS;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{copy.title}</h2>
          <p className="text-gray-600 mt-1">
            {unreadCount > 0 ? copy.unreadCount(unreadCount) : copy.totalCount(total)}
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
            {copy.refresh}
          </Button>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={markAllAsRead}
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              {copy.markAllRead}
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
              {copy.clearAll}
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
        {(Object.keys(copy.filters) as FilterType[]).map((filterType) => (
          <Button
            key={filterType}
            variant={filter === filterType ? "default" : "ghost"}
            size="sm"
            onClick={() => {
              setFilter(filterType);
              setPage(1);
            }}
          >
            {copy.filters[filterType]}
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
          <p className="text-gray-600">{copy.emptyTitle}</p>
          <p className="text-sm text-gray-500 mt-1">
            {filter === "unread" ? copy.emptyUnread : copy.emptyDefault}
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
                      {copy.types[notification.type]}
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
                          locale: dateLocale,
                        })}
                      </span>
                      {notification.action_url && (
                        <a
                          href={notification.action_url}
                          className="text-primary hover:underline"
                        >
                          {copy.view}
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
                        aria-label={copy.markAsRead}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteNotification(notification.id)}
                      className="text-red-600 hover:text-red-700"
                      aria-label={copy.delete}
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
            {copy.showing(((page - 1) * limit) + 1, Math.min(page * limit, total), total)}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              {copy.previous}
            </Button>
            <span className="text-sm text-gray-600">
              {copy.page(page, totalPages)}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              {copy.next}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
