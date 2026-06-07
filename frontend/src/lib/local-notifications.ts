export type LocalNotificationType = "success" | "info" | "warning" | "error";

export interface LocalNotification {
  id: string;
  type: LocalNotificationType;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  action_url?: string;
  metadata?: Record<string, unknown>;
}

export const LOCAL_NOTIFICATIONS_STORAGE_KEY = "synchire-local-notifications";

function isLocalNotification(value: unknown): value is LocalNotification {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const item = value as Partial<LocalNotification>;
  return (
    typeof item.id === "string" &&
    typeof item.title === "string" &&
    typeof item.message === "string" &&
    typeof item.created_at === "string" &&
    (item.type === "success" || item.type === "info" || item.type === "warning" || item.type === "error")
  );
}

export function readLocalNotifications(): LocalNotification[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const stored = window.localStorage.getItem(LOCAL_NOTIFICATIONS_STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];

    return Array.isArray(parsed)
      ? parsed.filter(isLocalNotification).map((item) => ({
          ...item,
          read: Boolean(item.read),
        }))
      : [];
  } catch {
    return [];
  }
}

export function writeLocalNotifications(notifications: LocalNotification[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    LOCAL_NOTIFICATIONS_STORAGE_KEY,
    JSON.stringify(notifications.slice(0, 100))
  );
}

export function addLocalNotification(
  notification: Omit<LocalNotification, "id" | "created_at" | "read"> & {
    id?: string;
    created_at?: string;
    read?: boolean;
  }
) {
  const nextNotification: LocalNotification = {
    id: notification.id ?? `local-notification-${Date.now()}`,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    read: notification.read ?? false,
    created_at: notification.created_at ?? new Date().toISOString(),
    action_url: notification.action_url,
    metadata: notification.metadata,
  };

  writeLocalNotifications([nextNotification, ...readLocalNotifications()]);
  return nextNotification;
}
