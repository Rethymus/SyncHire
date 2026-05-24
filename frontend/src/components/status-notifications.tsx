"use client";

import { memo } from "react";
import {
  CheckCircle,
  AlertCircle,
  Info,
  XCircle,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/lib/status-notifications";
import { cn } from "@/lib/utils";

const NOTIFICATION_ICONS = {
  success: CheckCircle,
  info: Info,
  warning: AlertCircle,
  error: XCircle,
};

const NOTIFICATION_STYLES = {
  success: "bg-green-50 border-green-200 text-green-900",
  info: "bg-blue-50 border-blue-200 text-blue-900",
  warning: "bg-yellow-50 border-yellow-200 text-yellow-900",
  error: "bg-red-50 border-red-200 text-red-900",
};

export const StatusNotifications = memo(function StatusNotifications() {
  const {
    notifications,
    removeNotification,
    clearNotifications,
  } = useNotifications();

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-900">
          通知 ({notifications.length})
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearNotifications}
          className="h-6 text-xs"
        >
          清除全部
        </Button>
      </div>

      {notifications.slice(0, 5).map((notification) => {
        const Icon = NOTIFICATION_ICONS[notification.type];
        const style = NOTIFICATION_STYLES[notification.type];

        return (
          <div
            key={notification.id}
            className={cn(
              "border rounded-lg shadow-sm p-3 flex items-start gap-3 animate-in slide-in-from-right",
              style
            )}
          >
            <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{notification.message}</p>
              <p className="text-xs mt-1 opacity-75">
                {notification.timestamp.toLocaleString("zh-CN")}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeNotification(notification.id)}
              className="h-6 w-6 p-0 flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        );
      })}

      {notifications.length > 5 && (
        <div className="text-xs text-gray-600 text-center pt-2">
          还有 {notifications.length - 5} 条通知...
        </div>
      )}
    </div>
  );
});
