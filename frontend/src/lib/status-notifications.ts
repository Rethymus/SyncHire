/**
 * Status Change Notification System
 *
 * Provides notification utilities for application status changes
 */

import { logger, LogCategory } from "./logger";

export type ApplicationStatus =
  | "pending"
  | "optimized"
  | "applied"
  | "interview"
  | "offer"
  | "rejected";

export interface StatusNotification {
  id: string;
  applicationId: string;
  oldStatus: ApplicationStatus | null;
  newStatus: ApplicationStatus;
  timestamp: Date;
  message: string;
  type: "success" | "info" | "warning" | "error";
}

const STATUS_MESSAGES: Record<
  ApplicationStatus,
  { title: string; description: string; type: StatusNotification["type"] }
> = {
  pending: {
    title: "申请已创建",
    description: "您的申请已成功创建，可以开始优化简历",
    type: "info",
  },
  optimized: {
    title: "简历已优化",
    description: "您的简历已根据职位要求进行优化",
    type: "success",
  },
  applied: {
    title: "申请已提交",
    description: "您的申请已成功提交给招聘方",
    type: "success",
  },
  interview: {
    title: "进入面试阶段",
    description: "恭喜！您的申请已进入面试阶段",
    type: "success",
  },
  offer: {
    title: "收到录用通知",
    description: "恭喜！您已收到录用通知",
    type: "success",
  },
  rejected: {
    title: "申请未通过",
    description: "很遗憾，您的申请未通过筛选",
    type: "error",
  },
};

/**
 * Generate a notification for status change
 */
export function generateStatusNotification(
  applicationId: string,
  oldStatus: ApplicationStatus | null,
  newStatus: ApplicationStatus,
  companyName?: string
): StatusNotification {
  const notification = STATUS_MESSAGES[newStatus];

  let message = notification.title;
  if (companyName) {
    message = `${companyName}: ${notification.title}`;
  }

  return {
    id: `${applicationId}-${Date.now()}`,
    applicationId,
    oldStatus,
    newStatus,
    timestamp: new Date(),
    message,
    type: notification.type,
  };
}

/**
 * Notification store for managing active notifications
 */
class NotificationStore {
  private notifications: StatusNotification[] = [];
  private listeners: Set<(notifications: StatusNotification[]) => void> =
    new Set();

  subscribe(listener: (notifications: StatusNotification[]) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => listener([...this.notifications]));
  }

  add(notification: StatusNotification) {
    this.notifications.unshift(notification);
    // Keep only last 50 notifications
    if (this.notifications.length > 50) {
      this.notifications = this.notifications.slice(0, 50);
    }
    this.notify();

    // Log the notification
    logger.info(
      LogCategory.API,
      `Status change notification: ${notification.message}`,
      {
        applicationId: notification.applicationId,
        oldStatus: notification.oldStatus,
        newStatus: notification.newStatus,
      }
    );
  }

  remove(id: string) {
    this.notifications = this.notifications.filter((n) => n.id !== id);
    this.notify();
  }

  clear() {
    this.notifications = [];
    this.notify();
  }

  getAll(): StatusNotification[] {
    return [...this.notifications];
  }

  getByApplicationId(applicationId: string): StatusNotification[] {
    return this.notifications.filter((n) => n.applicationId === applicationId);
  }
}

// Singleton instance
export const notificationStore = new NotificationStore();

/**
 * Hook for accessing notifications in React components
 */
export function useNotifications() {
  const [notifications, setNotifications] = React.useState<StatusNotification[]>(
    []
  );

  React.useEffect(() => {
    return notificationStore.subscribe(setNotifications);
  }, []);

  return {
    notifications,
    addNotification: (notification: StatusNotification) =>
      notificationStore.add(notification),
    removeNotification: (id: string) => notificationStore.remove(id),
    clearNotifications: () => notificationStore.clear(),
    getApplicationNotifications: (applicationId: string) =>
      notificationStore.getByApplicationId(applicationId),
  };
}

// Import React for the hook
import React from "react";
