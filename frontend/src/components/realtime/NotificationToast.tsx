/**
 * Real-time Notification Toast Component
 *
 * Displays real-time notifications as toast messages.
 */

'use client';

import React, { useEffect } from 'react';
import {
  useActivityFeed,
  useRealtimeNotifications,
} from '../../hooks/use-websocket';
import { useAuthStore } from '../../lib/auth-store';
import { toast } from 'sonner';

interface NotificationToastProps {
  enableBrowserNotifications?: boolean;
}

export function NotificationToast({
  enableBrowserNotifications = true,
}: NotificationToastProps) {
  const token = useAuthStore((state) => state.token);
  const { notifications } = useRealtimeNotifications(token);

  // Request notification permission on mount
  useEffect(() => {
    if (
      enableBrowserNotifications &&
      'Notification' in window &&
      Notification.permission === 'default'
    ) {
      Notification.requestPermission();
    }
  }, [enableBrowserNotifications]);

  // Show toast for new notifications
  useEffect(() => {
    if (notifications.length > 0) {
      const latestNotification = notifications[0];

      // Only show toast if not already read
      if (!latestNotification.read) {
        toast.success(latestNotification.title, {
          description: latestNotification.message,
          action: latestNotification.action_url
            ? {
                label: 'View',
                onClick: () => {
                  window.location.href = latestNotification.action_url;
                },
              }
            : undefined,
        });
      }
    }
  }, [notifications]);

  return null; // This component doesn't render anything
}

/**
 * Connection Status Indicator Component
 */
export function ConnectionStatusIndicator() {
  const { isConnected } = useWebSocketContext();

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800">
      <div
        className={`w-2 h-2 rounded-full ${
          isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
        }`}
      />
      <span className="text-gray-700 dark:text-gray-300">
        {isConnected ? 'Live' : 'Offline'}
      </span>
    </div>
  );
}

/**
 * Real-time Activity Feed Component
 */
export function ActivityFeed() {
  const token = useAuthStore((state) => state.token);
  const { activities } = useActivityFeed(token);

  if (activities.length === 0) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-400 py-8">
        No recent activity
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activities.slice(0, 10).map((activity: any) => (
        <div
          key={activity.activity_id}
          className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
        >
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {activity.description}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {new Date(activity.created_at).toLocaleString()}
          </p>
        </div>
      ))}
    </div>
  );
}

import { useWebSocketContext } from './WebSocketProvider';
