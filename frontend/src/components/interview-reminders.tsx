"use client";

import { useState, useCallback, useEffect, memo } from "react";
import Link from "next/link";
import { Bell, X, Clock, Calendar, CheckCircle, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";
import { logger, LogCategory } from "@/lib/logger";

interface InterviewReminder {
  id: string;
  interview_id: string;
  title: string;
  interview_type: string;
  scheduled_date: string;
  duration_minutes: number;
  location_type: string;
  location_url?: string;
  company_name?: string;
  job_title?: string;
  reminder_timing: number; // hours before
  time_until: number; // minutes until interview
}

interface InterviewRemindersProps {
  className?: string;
}

const InterviewReminders = memo(function InterviewReminders({
  className,
}: InterviewRemindersProps) {
  const [reminders, setReminders] = useState<InterviewReminder[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  // Fetch upcoming reminders
  const fetchReminders = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get<InterviewReminder[]>('/interviews/reminders/upcoming');

      if (response.data && !response.error) {
        setReminders(response.data);
      }
    } catch (error) {
      logger.error(LogCategory.UI, 'Failed to fetch interview reminders', error as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Dismiss a reminder
  const dismissReminder = useCallback((reminderId: string) => {
    setDismissed(prev => new Set([...prev, reminderId]));
  }, []);

  // Dismiss all reminders
  const dismissAll = useCallback(() => {
    const allIds = reminders.map(r => r.id);
    setDismissed(prev => new Set([...prev, ...allIds]));
  }, [reminders]);

  // Format time until interview
  const formatTimeUntil = useCallback((minutes: number) => {
    if (minutes < 60) {
      return `${Math.round(minutes)} minutes`;
    } else if (minutes < 1440) {
      const hours = Math.floor(minutes / 60);
      const mins = Math.round(minutes % 60);
      return mins > 0 ? `${hours}h ${mins}m` : `${hours} hours`;
    } else {
      const days = Math.floor(minutes / 1440);
      const hours = Math.round((minutes % 1440) / 60);
      return hours > 0 ? `${days}d ${hours}h` : `${days} days`;
    }
  }, []);

  // Get urgency level
  const getUrgencyLevel = useCallback((minutesUntil: number) => {
    if (minutesUntil <= 30) return 'critical';
    if (minutesUntil <= 120) return 'urgent';
    if (minutesUntil <= 1440) return 'upcoming';
    return 'normal';
  }, []);

  // Filter out dismissed reminders
  const activeReminders = reminders.filter(r => !dismissed.has(r.id));

  // Auto-refresh reminders every minute
  useEffect(() => {
    fetchReminders();
    const interval = setInterval(fetchReminders, 60000);
    return () => clearInterval(interval);
  }, [fetchReminders]);

  // Don't render if no reminders
  if (activeReminders.length === 0) {
    return null;
  }

  return (
    <div className={cn("fixed top-4 right-4 z-50 max-w-md w-full", className)}>
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 px-4 py-3 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-purple-600" />
              <h3 className="font-semibold text-gray-900">
                Upcoming Interview{activeReminders.length > 1 ? 's' : ''}
              </h3>
              <span className="bg-purple-600 text-white text-xs font-medium px-2 py-0.5 rounded-full">
                {activeReminders.length}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={dismissAll}
              className="text-gray-600 hover:text-gray-900"
            >
              Dismiss All
            </Button>
          </div>
        </div>

        {/* Reminders List */}
        <div className="max-h-96 overflow-y-auto">
          {activeReminders.map((reminder) => {
            const urgencyLevel = getUrgencyLevel(reminder.time_until);
            const urgencyColors = {
              critical: "bg-red-50 border-red-200",
              urgent: "bg-orange-50 border-orange-200",
              upcoming: "bg-yellow-50 border-yellow-200",
              normal: "bg-blue-50 border-blue-200",
            };

            return (
              <div
                key={reminder.id}
                className={cn(
                  "p-4 border-b border-gray-100 last:border-b-0",
                  urgencyColors[urgencyLevel]
                )}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 truncate">
                      {reminder.company_name || 'Interview'} - {reminder.job_title || 'Position'}
                    </h4>
                    <p className="text-sm text-gray-600 truncate">{reminder.title}</p>
                  </div>
                  <button
                    onClick={() => dismissReminder(reminder.id)}
                    className="ml-2 text-gray-400 hover:text-gray-600 flex-shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex items-center gap-3 text-sm text-gray-700 mb-3">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span className="font-medium">
                      {formatTimeUntil(reminder.time_until)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {new Date(reminder.scheduled_date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {reminder.location_url ? (
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="flex-1"
                    >
                      <a
                        href={reminder.location_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Join Meeting
                      </a>
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="flex-1"
                    >
                      <Link href={`/interviews/${reminder.interview_id}`}>
                        <CheckCircle className="h-3 w-3 mr-1" />
                        View Details
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
          <Link
            href="/interviews"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center justify-center gap-1"
          >
            View All Interviews
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
});

export default InterviewReminders;
