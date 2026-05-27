/**
 * WebSocket Usage Examples
 *
 * This file demonstrates how to use the WebSocket client
 * for real-time features in SyncHire.
 */

'use client';

import React, { useState } from 'react';
import { useRealtimeApplications, useRealtimeAnalytics, useRealtimeJobAlerts, useRealtimeNotifications } from '@/hooks/use-realtime-applications';
import { WebSocketStatus, WebSocketStatusControl } from '@/components/websocket-status';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Example 1: Basic WebSocket Connection
 */
export function BasicWebSocketExample() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>WebSocket Connection Status</CardTitle>
        <CardDescription>Real-time connection indicator</CardDescription>
      </CardHeader>
      <CardContent>
        <WebSocketStatus />
      </CardContent>
    </Card>
  );
}

/**
 * Example 2: Real-time Application Updates
 */
export function RealtimeApplicationsExample() {
  const [statusUpdate, setStatusUpdate] = useState<any>(null);
  const [interviewUpdate, setInterviewUpdate] = useState<any>(null);

  useRealtimeApplications({
    onApplicationStatusChange: (data) => {
      console.log('Application status changed:', data);
      setStatusUpdate(data);
    },
    onInterviewScheduled: (data) => {
      console.log('Interview scheduled:', data);
      setInterviewUpdate(data);
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Real-time Application Updates</CardTitle>
        <CardDescription>Live updates for application status and interviews</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <WebSocketStatus />
        </div>

        {statusUpdate && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h4 className="font-semibold">Application Status Update</h4>
            <p className="text-sm text-muted-foreground">
              {statusUpdate.company} - {statusUpdate.position}
            </p>
            <p className="text-sm font-medium">{statusUpdate.status_text}</p>
          </div>
        )}

        {interviewUpdate && (
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <h4 className="font-semibold">Interview Scheduled</h4>
            <p className="text-sm text-muted-foreground">
              {interviewUpdate.company} - {interviewUpdate.position}
            </p>
            <p className="text-sm font-medium">
              {interviewUpdate.interview_date} at {interviewUpdate.interview_time}
            </p>
          </div>
        )}

        {!statusUpdate && !interviewUpdate && (
          <p className="text-sm text-muted-foreground">
            Waiting for real-time updates...
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Example 3: Real-time Analytics Dashboard
 */
export function RealtimeAnalyticsExample() {
  const { wsClient } = useRealtimeAnalytics();

  const [analytics, setAnalytics] = useState({
    profile_views: 0,
    applications_submitted: 0,
    interviews_scheduled: 0,
    response_rate: 0,
  });

  // In a real app, you would use React Query to fetch and manage analytics
  // The WebSocket would automatically update the cache

  return (
    <Card>
      <CardHeader>
        <CardTitle>Real-time Analytics</CardTitle>
        <CardDescription>Live statistics and metrics</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-sm text-muted-foreground">Profile Views</p>
            <p className="text-2xl font-bold">{analytics.profile_views}</p>
          </div>
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <p className="text-sm text-muted-foreground">Applications</p>
            <p className="text-2xl font-bold">{analytics.applications_submitted}</p>
          </div>
          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <p className="text-sm text-muted-foreground">Interviews</p>
            <p className="text-2xl font-bold">{analytics.interviews_scheduled}</p>
          </div>
          <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <p className="text-sm text-muted-foreground">Response Rate</p>
            <p className="text-2xl font-bold">{analytics.response_rate}%</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          Stats update automatically via WebSocket
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * Example 4: Real-time Job Alerts
 */
export function RealtimeJobAlertsExample() {
  const [jobAlerts, setJobAlerts] = useState<any[]>([]);

  useRealtimeJobAlerts();

  // In a real app, job alerts would be managed by React Query
  // and automatically updated by WebSocket messages

  return (
    <Card>
      <CardHeader>
        <CardTitle>Real-time Job Alerts</CardTitle>
        <CardDescription>Instant notifications for matching jobs</CardDescription>
      </CardHeader>
      <CardContent>
        {jobAlerts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No new job alerts yet. When new jobs match your profile,
            you&apos;ll be notified instantly.
          </p>
        ) : (
          <div className="space-y-2">
            {jobAlerts.map((alert, index) => (
              <div
                key={index}
                className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg"
              >
                <h4 className="font-semibold">{alert.position}</h4>
                <p className="text-sm text-muted-foreground">{alert.company}</p>
                <p className="text-sm font-medium">Match: {alert.match_score}%</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Example 5: Complete WebSocket Integration
 */
export function CompleteWebSocketExample() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Real-time Features Demo</h2>
        <WebSocketStatusControl />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <BasicWebSocketExample />
        <RealtimeApplicationsExample />
        <RealtimeAnalyticsExample />
        <RealtimeJobAlertsExample />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
          <CardDescription>WebSocket integration explained</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><strong>1. Connection:</strong> WebSocket connects automatically when you log in</p>
          <p><strong>2. Subscriptions:</strong> You&apos;re automatically subscribed to relevant channels</p>
          <p><strong>3. Real-time Updates:</strong> Server pushes updates instantly when events occur</p>
          <p><strong>4. React Query:</strong> Cache is automatically invalidated and updated</p>
          <p><strong>5. Notifications:</strong> Browser notifications for important events</p>
        </CardContent>
      </Card>
    </div>
  );
}