/**
 * Workflow Notification Center Component
 * Comprehensive notification management and display system for workflow events
 */

"use client";

import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Bell,
  BellRing,
  Check,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  Trash2,
  Archive,
  Filter,
  Search,
  MoreVertical,
  Clock,
  Settings,
} from 'lucide-react';
import { useWorkflowNotifications } from '@/lib/use-workflow-automation';
import { NotificationMessage } from '@/lib/workflow-notifications';

interface WorkflowNotificationCenterProps {
  showHeader?: boolean;
  showFilters?: boolean;
  showStats?: boolean;
  maxNotifications?: number;
}

const notificationTypeConfig = {
  info: {
    icon: Info,
    label: '信息',
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    bgColor: 'bg-blue-50',
  },
  success: {
    icon: CheckCircle2,
    label: '成功',
    color: 'bg-green-100 text-green-800 border-green-300',
    bgColor: 'bg-green-50',
  },
  warning: {
    icon: AlertTriangle,
    label: '警告',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    bgColor: 'bg-yellow-50',
  },
  error: {
    icon: XCircle,
    label: '错误',
    color: 'bg-red-100 text-red-800 border-red-300',
    bgColor: 'bg-red-50',
  },
};

export function WorkflowNotificationCenter({
  showHeader = true,
  showFilters = true,
  showStats = true,
  maxNotifications,
}: WorkflowNotificationCenterProps) {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearNotifications,
  } = useWorkflowNotifications();

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [readFilter, setReadFilter] = useState<string>('all');
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());

  // Filter notifications
  const filteredNotifications = useMemo(() => {
    let filtered = [...notifications];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(n =>
        n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.message.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(n => n.type === typeFilter);
    }

    // Apply read status filter
    if (readFilter === 'unread') {
      filtered = filtered.filter(n => !n.read);
    } else if (readFilter === 'read') {
      filtered = filtered.filter(n => n.read);
    }

    // Limit notifications
    if (maxNotifications && filtered.length > maxNotifications) {
      filtered = filtered.slice(0, maxNotifications);
    }

    return filtered;
  }, [notifications, searchTerm, typeFilter, readFilter, maxNotifications]);

  // Calculate statistics
  const statistics = useMemo(() => {
    const byType = {
      info: notifications.filter(n => n.type === 'info').length,
      success: notifications.filter(n => n.type === 'success').length,
      warning: notifications.filter(n => n.type === 'warning').length,
      error: notifications.filter(n => n.type === 'error').length,
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayCount = notifications.filter(n => n.timestamp >= today).length;
    const thisWeek = notifications.filter(n => {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return n.timestamp >= weekAgo;
    }).length;

    return {
      total: notifications.length,
      unread: unreadCount,
      byType,
      today: todayCount,
      thisWeek,
    };
  }, [notifications, unreadCount]);

  const handleNotificationClick = (notification: NotificationMessage) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
  };

  const handleBulkAction = (action: 'read' | 'delete') => {
    for (const notificationId of selectedNotifications) {
      if (action === 'read') {
        markAsRead(notificationId);
      } else if (action === 'delete') {
        deleteNotification(notificationId);
      }
    }
    setSelectedNotifications(new Set());
  };

  const toggleNotificationSelection = (notificationId: string) => {
    setSelectedNotifications(prev => {
      const newSet = new Set(prev);
      if (newSet.has(notificationId)) {
        newSet.delete(notificationId);
      } else {
        newSet.add(notificationId);
      }
      return newSet;
    });
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return '刚刚';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} 分钟前`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} 小时前`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} 天前`;
    return date.toLocaleDateString('zh-CN');
  };

  if (notifications.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          暂无通知
        </h3>
        <p className="text-gray-600">
          当有重要事件发生时，通知将显示在这里
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      {showHeader && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Bell className="h-6 w-6 text-gray-700" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">工作流通知中心</h2>
              <p className="text-sm text-gray-600">
                {unreadCount > 0 ? `${unreadCount} 条未读通知` : '所有通知已读'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={markAllAsRead}>
              <Check className="h-4 w-4 mr-2" />
              全部已读
            </Button>
            <Button variant="outline" size="sm" onClick={clearNotifications}>
              <Trash2 className="h-4 w-4 mr-2" />
              清空通知
            </Button>
          </div>
        </div>
      )}

      {/* Statistics */}
      {showStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Bell className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">总通知</p>
                <p className="text-2xl font-bold text-gray-900">{statistics.total}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <BellRing className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">未读</p>
                <p className="text-2xl font-bold text-gray-900">{statistics.unread}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Clock className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">今日</p>
                <p className="text-2xl font-bold text-gray-900">{statistics.today}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Archive className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">本周</p>
                <p className="text-2xl font-bold text-gray-900">{statistics.thisWeek}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Type Statistics */}
      {showStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(Object.entries(notificationTypeConfig) as Array<[keyof typeof notificationTypeConfig, typeof notificationTypeConfig[keyof typeof notificationTypeConfig]]>).map(([type, config]) => (
            <div
              key={type}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center gap-2">
                <config.icon className={`h-4 w-4 ${config.color.split(' ')[1]}`} />
                <span className="text-sm text-gray-700">{config.label}</span>
              </div>
              <Badge variant="outline" className="text-xs">
                {statistics.byType[type]}
              </Badge>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <Card className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="搜索通知..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="所有类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有类型</SelectItem>
                {Object.entries(notificationTypeConfig).map(([type, config]) => (
                  <SelectItem key={type} value={type}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={readFilter} onValueChange={(value) => setReadFilter(value)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="全部" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="unread">未读</SelectItem>
                <SelectItem value="read">已读</SelectItem>
              </SelectContent>
            </Select>

            {selectedNotifications.size > 0 && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => handleBulkAction('read')}>
                  <Check className="h-4 w-4 mr-2" />
                  标记已读
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleBulkAction('delete')}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  删除
                </Button>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.map((notification) => {
          const config = notificationTypeConfig[notification.type as keyof typeof notificationTypeConfig];
          const Icon = config.icon;
          const isSelected = selectedNotifications.has(notification.id);

          return (
            <div
              key={notification.id}
              className={`relative p-4 rounded-lg border transition-all cursor-pointer ${
                notification.read
                  ? 'bg-white border-gray-200 hover:bg-gray-50'
                  : `bg-blue-50 border-blue-200 hover:bg-blue-100`
              }`}
            >
              {/* Selection checkbox */}
              <div
                className="absolute top-4 left-4"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleNotificationSelection(notification.id);
                }}
              >
                <div className={`w-4 h-4 rounded border-2 ${
                  isSelected
                    ? 'bg-blue-500 border-blue-500'
                    : 'border-gray-300 hover:border-blue-400'
                }`}>
                  {isSelected && <Check className="h-3 w-3 text-white" />}
                </div>
              </div>

              {/* Notification content */}
              <div
                className="ml-8"
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3 flex-1">
                    <div className={`p-2 rounded-lg ${config.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{notification.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xs text-gray-600">
                        {formatTimeAgo(notification.timestamp)}
                      </p>
                      {notification.applicationName && (
                        <p className="text-xs text-gray-500 mt-1">
                          {notification.applicationName}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e?.stopPropagation();
                        deleteNotification(notification.id);
                      }}
                      className="h-8 w-8 p-0"
                    >
                      <Trash2 className="h-4 w-4 text-gray-400" />
                    </Button>
                  </div>
                </div>

                {/* Action button */}
                {notification.actionUrl && (
                  <div className="ml-9">
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-sm"
                      onClick={(e) => {
                        e?.stopPropagation();
                        window.location.href = notification.actionUrl;
                      }}
                    >
                      {notification.actionLabel || '查看详情'}
                    </Button>
                  </div>
                )}
              </div>

              {/* Unread indicator */}
              {!notification.read && (
                <div className="absolute top-4 right-4 w-2 h-2 bg-blue-500 rounded-full" />
              )}
            </div>
          );
        })}
      </div>

      {/* No results */}
      {filteredNotifications.length === 0 && (
        <Card className="p-8 text-center">
          <Filter className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">没有找到匹配的通知</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => {
              setSearchTerm('');
              setTypeFilter('all');
              setReadFilter('all');
            }}
          >
            清除筛选条件
          </Button>
        </Card>
      )}
    </div>
  );
}

export default WorkflowNotificationCenter;
