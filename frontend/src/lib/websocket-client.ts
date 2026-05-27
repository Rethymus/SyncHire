/**
 * Enhanced WebSocket Client with React Query Integration
 *
 * Real-time updates with automatic cache invalidation and optimistic updates.
 */

'use client';

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createWebSocketClient, WebSocketClient } from './websocket';
import {
  WebSocketMessage,
  MessageType,
  NotificationData,
  ApplicationStatusData,
  JobAlertData,
  InterviewData,
  AnalyticsUpdateData,
  ConnectionState,
} from './websocket-types';

export interface WebSocketClientConfig {
  token: string;
  url?: string;
}

/**
 * Hook to manage WebSocket connection with React Query integration
 */
export function useWebSocketClient(config: WebSocketClientConfig) {
  const [wsClient, setWsClient] = React.useState<WebSocketClient | null>(null);
  const queryClient = useQueryClient();

  // Initialize WebSocket connection
  useEffect(() => {
    if (!config.token) {
      return;
    }

    const wsUrl = config.url || `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000'}/api/ws`;

    const client = createWebSocketClient({
      url: wsUrl,
      token: config.token,
      reconnect: true,
      reconnectInterval: 3000,
      maxReconnectAttempts: 10,
      heartbeatInterval: 30000,
    });

    // Connect to WebSocket server
    client.connect();

    // Subscribe to default channels
    client.subscribe('notifications');
    client.subscribe('updates');

    // Setup message handlers
    const unsubscribeHandlers = setupMessageHandlers(client, queryClient);

    // Set the client in state using setTimeout to avoid synchronous setState
    const timeoutId = setTimeout(() => {
      setWsClient(client);
    }, 0);

    // Cleanup on unmount
    return () => {
      clearTimeout(timeoutId);
      unsubscribeHandlers.forEach((unsub) => unsub());
      client.disconnect();
    };
  }, [config.token, config.url, queryClient]);

  return wsClient;
}

/**
 * Setup message handlers with React Query cache integration
 */
function setupMessageHandlers(
  wsClient: WebSocketClient,
  queryClient: ReturnType<typeof useQueryClient>
) {
  const unsubscribers: Array<() => void> = [];

  // Handle new notifications
  const handleNotification = (message: WebSocketMessage) => {
    const data = message.data as NotificationData;

    // Invalidate notifications query
    queryClient.invalidateQueries({ queryKey: ['notifications'] });

    // Show toast notification (integrate with your toast system)
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(data.title, {
        body: data.message,
        icon: '/favicon.ico',
        tag: data.notification_id,
      });
    }
  };

  // Handle application status updates
  const handleApplicationStatus = (message: WebSocketMessage) => {
    const data = message.data as ApplicationStatusData;

    // Update specific application in cache
    queryClient.setQueryData(
      ['application', data.application_id],
      (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          status: data.status,
          status_text: data.status_text,
          updated_at: data.updated_at,
        };
      }
    );

    // Invalidate applications list
    queryClient.invalidateQueries({ queryKey: ['applications'] });

    // Invalidate analytics
    queryClient.invalidateQueries({ queryKey: ['analytics'] });
  };

  // Handle new applications
  const handleApplicationNew = (message: WebSocketMessage) => {
    // Invalidate applications list
    queryClient.invalidateQueries({ queryKey: ['applications'] });

    // Invalidate analytics
    queryClient.invalidateQueries({ queryKey: ['analytics'] });
  };

  // Handle job alerts
  const handleJobAlert = (message: WebSocketMessage) => {
    const data = message.data as JobAlertData;

    // Invalidate jobs/search queries
    queryClient.invalidateQueries({ queryKey: ['jobs'] });
    queryClient.invalidateQueries({ queryKey: ['search'] });

    // Show notification for high urgency jobs
    if (data.urgency === 'high' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification('Urgent Job Alert', {
        body: `${data.company} is looking for a ${data.position}`,
        icon: '/favicon.ico',
        tag: data.job_id,
      });
    }
  };

  // Handle interview scheduled
  const handleInterviewScheduled = (message: WebSocketMessage) => {
    const data = message.data as InterviewData;

    // Invalidate interviews query
    queryClient.invalidateQueries({ queryKey: ['interviews'] });

    // Update application in cache
    queryClient.setQueryData(
      ['application', data.application_id],
      (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          has_interview: true,
        };
      }
    );

    // Invalidate applications list
    queryClient.invalidateQueries({ queryKey: ['applications'] });

    // Show notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Interview Scheduled', {
        body: `Interview with ${data.company} for ${data.position} position`,
        icon: '/favicon.ico',
        tag: data.interview_id,
      });
    }
  };

  // Handle interview reminders
  const handleInterviewReminder = (message: WebSocketMessage) => {
    const data = message.data as InterviewData;

    // Show notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Interview Reminder', {
        body: `Upcoming interview with ${data.company} at ${data.interview_time}`,
        icon: '/favicon.ico',
        tag: data.interview_id,
      });
    }
  };

  // Handle analytics updates
  const handleAnalyticsUpdate = (message: WebSocketMessage) => {
    const data = message.data as AnalyticsUpdateData;

    // Update analytics cache
    queryClient.setQueryData(
      ['analytics'],
      (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          ...data,
        };
      }
    );
  };

  // Handle activity updates
  const handleActivityNew = (message: WebSocketMessage) => {
    // Invalidate activity feed
    queryClient.invalidateQueries({ queryKey: ['activity'] });
  };

  // Register handlers
  unsubscribers.push(wsClient.on(MessageType.NOTIFICATION_NEW, handleNotification));
  unsubscribers.push(wsClient.on(MessageType.APPLICATION_STATUS, handleApplicationStatus));
  unsubscribers.push(wsClient.on(MessageType.APPLICATION_NEW, handleApplicationNew));
  unsubscribers.push(wsClient.on(MessageType.JOB_ALERT, handleJobAlert));
  unsubscribers.push(wsClient.on(MessageType.INTERVIEW_SCHEDULED, handleInterviewScheduled));
  unsubscribers.push(wsClient.on(MessageType.INTERVIEW_REMINDER, handleInterviewReminder));
  unsubscribers.push(wsClient.on(MessageType.ANALYTICS_UPDATE, handleAnalyticsUpdate));
  unsubscribers.push(wsClient.on(MessageType.ACTIVITY_NEW, handleActivityNew));

  return unsubscribers;
}

/**
 * Hook to send WebSocket messages
 */
export function useWebSocketSender() {
  const wsClient = useRef<WebSocketClient | null>(null);

  const send = useCallback((message: Partial<WebSocketMessage>) => {
    wsClient.current?.send(message);
  }, []);

  const subscribe = useCallback((subscription: string) => {
    wsClient.current?.subscribe(subscription);
  }, []);

  const unsubscribe = useCallback((subscription: string) => {
    wsClient.current?.unsubscribe(subscription);
  }, []);

  return { send, subscribe, unsubscribe };
}

/**
 * Hook to get WebSocket connection state
 */
export function useWebSocketState() {
  const [state, setState] = React.useState<ConnectionState>('disconnected');
  const wsClient = useRef<WebSocketClient | null>(null);

  useEffect(() => {
    if (!wsClient.current) return;

    // Subscribe to connection state changes
    const unsubscribe = wsClient.current.onConnectionChange((newState) => {
      setState(newState);
    });

    // Get initial state
    setState(wsClient.current.getConnectionState());

    return unsubscribe;
  }, []);

  return state;
}

/**
 * Higher-order component to provide WebSocket context
 */
export function WebSocketProvider({ children, config }: { children: React.ReactNode; config: WebSocketClientConfig }) {
  useWebSocketClient(config);
  return React.createElement(React.Fragment, null, children);
}