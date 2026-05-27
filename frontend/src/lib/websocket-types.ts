/**
 * WebSocket Type Definitions
 *
 * TypeScript types for WebSocket messages and data structures.
 */

export enum MessageType {
  // Connection management
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  HEARTBEAT = 'heartbeat',
  ERROR = 'error',

  // Notifications
  NOTIFICATION_NEW = 'notification_new',
  NOTIFICATION_READ = 'notification_read',
  NOTIFICATION_DELETED = 'notification_deleted',

  // Application updates
  APPLICATION_STATUS = 'application_status',
  APPLICATION_NEW = 'application_new',
  APPLICATION_UPDATED = 'application_updated',

  // Job alerts
  JOB_ALERT = 'job_alert',
  JOB_MATCH_UPDATE = 'job_match_update',

  // Interview updates
  INTERVIEW_SCHEDULED = 'interview_scheduled',
  INTERVIEW_REMINDER = 'interview_reminder',
  INTERVIEW_CANCELLED = 'interview_cancelled',

  // System notifications
  SYSTEM_MESSAGE = 'system_message',
  SYSTEM_UPDATE = 'system_update',

  // Activity feed
  ACTIVITY_NEW = 'activity_new',
  ACTIVITY_UPDATE = 'activity_update',

  // Search suggestions
  SEARCH_SUGGESTION = 'search_suggestion',
  SEARCH_RESULT = 'search_result',

  // Analytics
  ANALYTICS_UPDATE = 'analytics_update',
  PROFILE_VIEW = 'profile_view',
}

export type ConnectionState =
  | 'connected'
  | 'connecting'
  | 'disconnected'
  | 'disconnecting'
  | 'error'
  | 'failed';

export interface WebSocketMessage {
  type: MessageType;
  data: Record<string, any>;
  timestamp: string;
  id: string;
}

// Notification Data Types
export interface NotificationData {
  notification_id: string;
  type: string;
  title: string;
  message: string;
  action_url?: string;
  metadata?: Record<string, any>;
}

export interface ApplicationStatusData {
  application_id: string;
  company: string;
  position: string;
  status: string;
  status_text: string;
  updated_at: string;
}

export interface JobAlertData {
  job_id: string;
  company: string;
  position: string;
  location: string;
  match_score: number;
  posted_date: string;
  urgency: 'low' | 'normal' | 'high';
}

export interface InterviewData {
  interview_id: string;
  application_id: string;
  company: string;
  position: string;
  interview_date: string;
  interview_time: string;
  interview_type: 'video' | 'phone' | 'in-person';
  reminder_sent?: boolean;
}

export interface ActivityData {
  activity_id: string;
  type: string;
  description: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface SearchSuggestionData {
  query: string;
  suggestions: Array<{
    id: string;
    title: string;
    type: string;
    metadata?: Record<string, any>;
  }>;
  total_results: number;
}

export interface AnalyticsUpdateData {
  profile_views?: number;
  applications_submitted?: number;
  interviews_scheduled?: number;
  response_rate?: number;
  [key: string]: any;
}
