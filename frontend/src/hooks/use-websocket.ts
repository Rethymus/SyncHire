/**
 * React Hook for WebSocket Integration
 *
 * Provides a React hook for managing WebSocket connections and handling real-time updates.
 */

'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import {
  WebSocketClient,
  createWebSocketClient,
  MessageHandler,
} from '../lib/websocket';
import { WebSocketMessage, MessageType, ConnectionState } from '../lib/websocket-types';

export interface UseWebSocketOptions {
  enabled?: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
}

export interface UseWebSocketReturn {
  client: WebSocketClient | null;
  connectionState: ConnectionState;
  isConnected: boolean;
  connectionId: string | null;
  sendMessage: (message: Partial<WebSocketMessage>) => void;
  subscribe: (subscription: string) => void;
  unsubscribe: (subscription: string) => void;
  on: (messageType: MessageType, handler: MessageHandler) => () => void;
}

export function useWebSocket(
  token: string | null,
  options: UseWebSocketOptions = {}
): UseWebSocketReturn {
  const { enabled = true, onConnect, onDisconnect, onError } = options;

  const clientRef = useRef<WebSocketClient | null>(null);
  const [client, setClient] = useState<WebSocketClient | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [connectionId, setConnectionId] = useState<string | null>(null);

  // Store callbacks in refs to avoid re-creating effect
  const onConnectRef = useRef(onConnect);
  const onDisconnectRef = useRef(onDisconnect);
  const onErrorRef = useRef(onError);

  // Sync callback refs after render
  useEffect(() => {
    onConnectRef.current = onConnect;
    onDisconnectRef.current = onDisconnect;
    onErrorRef.current = onError;
  });

  // Create and connect WebSocket client
  useEffect(() => {
    if (!enabled || !token) {
      return;
    }

    // Determine WebSocket URL
    const wsUrl = getWebSocketUrl();

    // Create client
    const wsClient = createWebSocketClient({
      url: wsUrl,
      token,
      reconnect: true,
      reconnectInterval: 3000,
      maxReconnectAttempts: 10,
    });

    clientRef.current = wsClient;

    // Set up connection state handler
    const unsubscribeConnection = wsClient.onConnectionChange((state) => {
      setConnectionState(state);

      switch (state) {
        case 'connected':
          setClient(wsClient);
          setConnectionId(wsClient.getConnectionId());
          onConnectRef.current?.();
          break;
        case 'disconnected':
          setClient(null);
          setConnectionId(null);
          onDisconnectRef.current?.();
          break;
        case 'error':
          onErrorRef.current?.(new Event('WebSocket error'));
          break;
      }
    });

    // Connect
    wsClient.connect();

    // Cleanup on unmount
    return () => {
      unsubscribeConnection();
      wsClient.disconnect();
      clientRef.current = null;
    };
  }, [enabled, token]);

  // Send message function
  const sendMessage = useCallback(
    (message: Partial<WebSocketMessage>) => {
      clientRef.current?.send(message);
    },
    []
  );

  // Subscribe function
  const subscribe = useCallback(
    (subscription: string) => {
      clientRef.current?.subscribe(subscription);
    },
    []
  );

  // Unsubscribe function
  const unsubscribe = useCallback(
    (subscription: string) => {
      clientRef.current?.unsubscribe(subscription);
    },
    []
  );

  // Register message handler
  const on = useCallback(
    (messageType: MessageType, handler: MessageHandler) => {
      return clientRef.current?.on(messageType, handler) || (() => {});
    },
    []
  );

  return {
    client,
    connectionState,
    isConnected: connectionState === 'connected',
    connectionId,
    sendMessage,
    subscribe,
    unsubscribe,
    on,
  };
}

/**
 * Get WebSocket URL based on current environment
 */
function getWebSocketUrl(): string {
  if (typeof window === 'undefined') {
    return '';
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = process.env.NEXT_PUBLIC_WS_URL || window.location.host;
  const path = '/api/ws';

  return `${protocol}//${host}${path}`;
}

/**
 * Hook for listening to specific WebSocket message types
 */
export function useWebSocketMessage(
  messageType: MessageType,
  handler: MessageHandler,
  token: string | null,
  enabled = true
) {
  const { on } = useWebSocket(token, { enabled });

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const unsubscribe = on(messageType, handler);

    return unsubscribe;
  }, [messageType, handler, on, enabled]);
}

/**
 * Hook for real-time notifications
 */
export function useRealtimeNotifications(token: string | null) {
  const [notifications, setNotifications] = useState<Array<any>>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useWebSocketMessage(
    MessageType.NOTIFICATION_NEW,
    (message) => {
      const notification = message.data;
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);

      // Show browser notification if permitted
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/favicon.ico',
          tag: notification.notification_id,
        });
      }
    },
    token
  );

  useWebSocketMessage(
    MessageType.NOTIFICATION_READ,
    (message) => {
      const { notification_id } = message.data;
      setNotifications((prev) =>
        prev.map((n) =>
          n.notification_id === notification_id ? { ...n, read: true } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    },
    token
  );

  return {
    notifications,
    unreadCount,
    markAsRead: (id: string) => {
      setNotifications((prev) =>
        prev.map((n) => (n.notification_id === id ? { ...n, read: true } : n)
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    },
    clearAll: () => {
      setNotifications([]);
      setUnreadCount(0);
    },
  };
}

/**
 * Hook for application status updates
 */
export function useApplicationUpdates(token: string | null) {
  const [updates, setUpdates] = useState<Array<any>>([]);

  useWebSocketMessage(
    MessageType.APPLICATION_STATUS,
    (message) => {
      setUpdates((prev) => [message.data, ...prev]);
    },
    token
  );

  return {
    updates,
    clearUpdates: () => setUpdates([]),
  };
}

/**
 * Hook for job alerts
 */
export function useJobAlerts(token: string | null) {
  const [alerts, setAlerts] = useState<Array<any>>([]);

  useWebSocketMessage(
    MessageType.JOB_ALERT,
    (message) => {
      setAlerts((prev) => [message.data, ...prev]);

      // Show browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        const alert = message.data;
        new Notification(`New Job Match: ${alert.position}`, {
          body: `${alert.company} - ${alert.location}\nMatch Score: ${alert.match_score}%`,
          icon: '/favicon.ico',
          tag: alert.job_id,
        });
      }
    },
    token
  );

  return {
    alerts,
    clearAlerts: () => setAlerts([]),
  };
}

/**
 * Hook for interview reminders
 */
export function useInterviewReminders(token: string | null) {
  const [reminders, setReminders] = useState<Array<any>>([]);

  useWebSocketMessage(
    MessageType.INTERVIEW_REMINDER,
    (message) => {
      setReminders((prev) => [message.data, ...prev]);

      // Show browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        const interview = message.data;
        new Notification(`Interview Reminder: ${interview.company}`, {
          body: `${interview.position} - ${interview.interview_type}\n${interview.interview_date} at ${interview.interview_time}`,
          icon: '/favicon.ico',
          tag: interview.interview_id,
        });
      }
    },
    token
  );

  useWebSocketMessage(
    MessageType.INTERVIEW_SCHEDULED,
    (message) => {
      setReminders((prev) => [message.data, ...prev]);

      // Show browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        const interview = message.data;
        new Notification(`Interview Scheduled: ${interview.company}`, {
          body: `${interview.position} - ${interview.interview_type}\n${interview.interview_date} at ${interview.interview_time}`,
          icon: '/favicon.ico',
          tag: interview.interview_id,
        });
      }
    },
    token
  );

  return {
    reminders,
    clearReminders: () => setReminders([]),
  };
}

/**
 * Hook for activity feed
 */
export function useActivityFeed(token: string | null) {
  const [activities, setActivities] = useState<Array<any>>([]);

  useWebSocketMessage(
    MessageType.ACTIVITY_NEW,
    (message) => {
      setActivities((prev) => [message.data, ...prev]);
    },
    token
  );

  return {
    activities,
    clearActivities: () => setActivities([]),
  };
}
