/**
 * Real-time Application Updates Hook
 *
 * Provides real-time updates for application status changes using WebSocket.
 */

'use client';

import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useWebSocketClient, useWebSocketSender } from '@/lib/websocket-client';
import {
  WebSocketMessage,
  MessageType,
  ApplicationStatusData,
  InterviewData,
} from '@/lib/websocket-types';
import { useToast } from './use-toast';
import { useAuthStore } from '@/lib/auth-store';

interface UseRealtimeApplicationsOptions {
  applicationId?: string;
  onApplicationStatusChange?: (data: ApplicationStatusData) => void;
  onInterviewScheduled?: (data: InterviewData) => void;
  onInterviewReminder?: (data: InterviewData) => void;
}

/**
 * Hook for real-time application updates
 */
export function useRealtimeApplications({
  applicationId,
  onApplicationStatusChange,
  onInterviewScheduled,
  onInterviewReminder,
}: UseRealtimeApplicationsOptions = {}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { token } = useAuthStore();
  const wsClient = useWebSocketClient({ token: token || '' });

  useEffect(() => {
    if (!wsClient) return;

    // Subscribe to application updates
    const unsubscribeStatus = wsClient.on(MessageType.APPLICATION_STATUS, (message: WebSocketMessage) => {
      const data = message.data as ApplicationStatusData;

      // Invalidate specific application query
      if (data.application_id) {
        queryClient.invalidateQueries({
          queryKey: ['application', data.application_id],
        });
      }

      // Invalidate applications list
      queryClient.invalidateQueries({
        queryKey: ['applications'],
      });

      // Invalidate analytics
      queryClient.invalidateQueries({
        queryKey: ['analytics'],
      });

      // Show toast notification
      toast({
        title: 'Application Status Updated',
        description: `${data.company} - ${data.position}: ${data.status_text}`,
      });

      // Call custom callback
      onApplicationStatusChange?.(data);
    });

    // Subscribe to new applications
    const unsubscribeNew = wsClient.on(MessageType.APPLICATION_NEW, (message: WebSocketMessage) => {
      // Invalidate applications list
      queryClient.invalidateQueries({
        queryKey: ['applications'],
      });

      toast({
        title: 'New Application Created',
        description: 'Your application list has been updated.',
      });
    });

    // Subscribe to interview scheduling
    const unsubscribeInterview = wsClient.on(MessageType.INTERVIEW_SCHEDULED, (message: WebSocketMessage) => {
      const data = message.data as InterviewData;

      // Invalidate interviews query
      queryClient.invalidateQueries({
        queryKey: ['interviews'],
      });

      // Update specific application
      if (data.application_id) {
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
      }

      // Show notification
      toast({
        title: 'Interview Scheduled',
        description: `Interview with ${data.company} for ${data.position} position`,
      });

      onInterviewScheduled?.(data);
    });

    // Subscribe to interview reminders
    const unsubscribeReminder = wsClient.on(MessageType.INTERVIEW_REMINDER, (message: WebSocketMessage) => {
      const reminderData = message.data as InterviewData;

      toast({
        title: 'Interview Reminder',
        description: `Upcoming interview with ${reminderData.company} at ${reminderData.interview_time}`,
      });

      onInterviewReminder?.(reminderData);
    });

    return () => {
      unsubscribeStatus();
      unsubscribeNew();
      unsubscribeInterview();
      unsubscribeReminder();
    };
  }, [wsClient, queryClient, toast, onApplicationStatusChange, onInterviewScheduled, onInterviewReminder]);

  // Subscribe to specific application if provided
  useEffect(() => {
    if (!wsClient || !applicationId) return;

    wsClient.subscribe(`application:${applicationId}`);

    return () => {
      wsClient?.unsubscribe(`application:${applicationId}`);
    };
  }, [wsClient, applicationId]);

  return { wsClient };
}

/**
 * Hook for real-time analytics updates
 */
export function useRealtimeAnalytics() {
  const queryClient = useQueryClient();
  const { token } = useAuthStore();
  const wsClient = useWebSocketClient({ token: token || '' });

  useEffect(() => {
    if (!wsClient) return;

    const unsubscribe = wsClient.on(MessageType.ANALYTICS_UPDATE, (message: WebSocketMessage) => {
      // Update analytics cache with new data
      queryClient.setQueryData(['analytics'], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          ...message.data,
        };
      });
    });

    // Subscribe to analytics updates
    wsClient.subscribe('analytics');

    return () => {
      unsubscribe();
      wsClient?.unsubscribe('analytics');
    };
  }, [wsClient, queryClient]);

  return { wsClient };
}

/**
 * Hook for real-time job alerts
 */
export function useRealtimeJobAlerts() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { token } = useAuthStore();
  const wsClient = useWebSocketClient({ token: token || '' });

  useEffect(() => {
    if (!wsClient) return;

    const unsubscribe = wsClient.on(MessageType.JOB_ALERT, (message: WebSocketMessage) => {
      const data = message.data;

      // Invalidate jobs/search queries
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['search'] });

      // Show urgent job alerts as toast
      if (data.urgency === 'high') {
        toast({
          title: '🔥 Urgent Job Alert',
          description: `${data.company} is looking for a ${data.position}`,
        });
      }
    });

    // Subscribe to job alerts
    wsClient.subscribe('jobs');

    return () => {
      unsubscribe();
      wsClient?.unsubscribe('jobs');
    };
  }, [wsClient, queryClient, toast]);

  return { wsClient };
}

/**
 * Hook for real-time notifications
 */
export function useRealtimeNotifications() {
  const queryClient = useQueryClient();
  const { token } = useAuthStore();
  const wsClient = useWebSocketClient({ token: token || '' });

  useEffect(() => {
    if (!wsClient) return;

    const unsubscribe = wsClient.on(MessageType.NOTIFICATION_NEW, (message: WebSocketMessage) => {
      // Invalidate notifications query
      queryClient.invalidateQueries({ queryKey: ['notifications'] });

      // Request browser notification permission if not granted
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }

      // Show browser notification if permission granted
      if ('Notification' in window && Notification.permission === 'granted') {
        const data = message.data;
        new Notification(data.title || 'New Notification', {
          body: data.message,
          icon: '/favicon.ico',
          tag: data.notification_id,
        });
      }
    });

    // Subscribe to notifications
    wsClient.subscribe('notifications');

    return () => {
      unsubscribe();
      wsClient?.unsubscribe('notifications');
    };
  }, [wsClient, queryClient]);

  return { wsClient };
}