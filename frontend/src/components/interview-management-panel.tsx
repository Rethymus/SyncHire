"use client";

import { useState, useCallback, memo } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Calendar,
  Clock,
  Edit,
  Trash2,
  Bell,
  BellRing,
  CheckCircle2,
  X,
  XCircle,
  Video,
  MapPin,
  Phone,
  Mail,
  FileText,
  Star,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";
import { logger, LogCategory } from "@/lib/logger";

interface Interview {
  id: string;
  title: string;
  description?: string;
  interview_type: string;
  status: string;
  scheduled_date: string;
  duration_minutes: number;
  timezone: string;
  location_type: string;
  location_url?: string;
  location_address?: string;
  meeting_platform?: string;
  meeting_id?: string;
  meeting_password?: string;
  interviewers: Array<{ name: string; role?: string; email?: string }>;
  preparation_notes?: string;
  feedback?: string;
  rating?: number;
  next_steps?: string;
  reminder_enabled: boolean;
  reminder_timings: number[];
  created_at: string;
  updated_at: string;
  job_title?: string;
  company_name?: string;
  resume_title?: string;
}

interface InterviewManagementPanelProps {
  interviewId: string;
  onClose?: () => void;
}

const statusColors = {
  scheduled: "bg-yellow-100 text-yellow-800 border-yellow-200",
  confirmed: "bg-green-100 text-green-800 border-green-200",
  completed: "bg-blue-100 text-blue-800 border-blue-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
  rescheduled: "bg-orange-100 text-orange-800 border-orange-200",
};

const locationIcons = {
  remote: Video,
  in_person: MapPin,
  phone: Phone,
};

const typeLabels = {
  screening: "Screening Call",
  technical: "Technical Interview",
  behavioral: "Behavioral Interview",
  panel: "Panel Interview",
  onsite: "Onsite Interview",
  final: "Final Interview",
};

// Action Button Component
const ActionButton = memo(function ActionButton({
  icon: Icon,
  label,
  onClick,
  variant = "default",
  disabled = false,
}: {
  icon: typeof Edit;
  label: string;
  onClick: () => void;
  variant?: "default" | "danger" | "success";
  disabled?: boolean;
}) {
  const variantStyles = {
    default: "text-blue-600 hover:bg-blue-50 border-blue-200",
    danger: "text-red-600 hover:bg-red-50 border-red-200",
    success: "text-green-600 hover:bg-green-50 border-green-200",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        variantStyles[variant]
      )}
    >
      <Icon className="h-4 w-4" />
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
});

// Expandable Section Component
const ExpandableSection = memo(function ExpandableSection({
  title,
  icon: Icon,
  children,
  defaultExpanded = false,
}: {
  title: string;
  icon: typeof FileText;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-gray-600" />
          <span className="font-medium text-gray-900">{title}</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-gray-600" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-600" />
        )}
      </button>
      {isExpanded && <div className="p-4 bg-white">{children}</div>}
    </div>
  );
});

export function InterviewManagementPanel({ interviewId, onClose }: InterviewManagementPanelProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [sendingReminder, setSendingReminder] = useState(false);

  // Fetch interview details
  const { data: interview, isLoading, error } = useQuery({
    queryKey: ['interviews', interviewId],
    queryFn: async () => {
      const response = await apiClient.get<Interview>(`/interviews/${interviewId}`);
      if (response.error) throw new Error(response.error);
      return response.data;
    },
  });

  // Delete interview mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.delete(`/interviews/${interviewId}`);
      if (response.error) throw new Error(response.error);
      return response.data;
    },
    onSuccess: () => {
      logger.info(LogCategory.UI, 'Interview deleted', { interviewId });
      queryClient.invalidateQueries({ queryKey: ['interviews'] });
      router.push('/interviews');
    },
    onError: (error) => {
      logger.error(LogCategory.UI, 'Failed to delete interview', error as Error);
    },
  });

  // Send reminder mutation
  const sendReminderMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post(`/interviews/${interviewId}/reminders`, {});
      if (response.error) throw new Error(response.error);
      return response.data;
    },
    onSuccess: () => {
      logger.info(LogCategory.UI, 'Reminder sent', { interviewId });
      setSendingReminder(false);
      alert('Reminder sent successfully!');
    },
    onError: (error) => {
      logger.error(LogCategory.UI, 'Failed to send reminder', error as Error);
      setSendingReminder(false);
      alert('Failed to send reminder. Please try again.');
    },
  });

  // Handle delete
  const handleDelete = useCallback(() => {
    if (!confirm('Are you sure you want to delete this interview? This action cannot be undone.')) {
      return;
    }
    deleteMutation.mutate();
  }, [deleteMutation]);

  // Handle edit
  const handleEdit = useCallback(() => {
    router.push(`/interviews/${interviewId}/edit`);
  }, [router, interviewId]);

  // Handle send reminder
  const handleSendReminder = useCallback(() => {
    setSendingReminder(true);
    sendReminderMutation.mutate();
  }, [sendReminderMutation]);

  // Handle status update
  const handleStatusUpdate = useCallback(async (newStatus: string) => {
    try {
      const response = await apiClient.patch(`/interviews/${interviewId}`, { status: newStatus });
      if (response.error) throw new Error(response.error);
      logger.info(LogCategory.UI, 'Interview status updated', { interviewId, newStatus });
      queryClient.invalidateQueries({ queryKey: ['interviews'] });
    } catch (error) {
      logger.error(LogCategory.UI, 'Failed to update status', error as Error);
      alert('Failed to update status. Please try again.');
    }
  }, [interviewId, queryClient]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="text-center">
          <Clock className="h-8 w-8 text-purple-600 mx-auto mb-4 animate-spin" />
          <p className="text-lg font-medium text-gray-900">Loading interview details...</p>
        </div>
      </div>
    );
  }

  if (error || !interview) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-900 mb-2">Failed to load interview</p>
          <p className="text-gray-600 mb-4">{error instanceof Error ? error.message : 'Unknown error'}</p>
          <Button onClick={() => router.push('/interviews')}>
            Back to Interviews
          </Button>
        </div>
      </div>
    );
  }

  const interviewDate = new Date(interview.scheduled_date);
  const LocationIcon = locationIcons[interview.location_type as keyof typeof locationIcons] || MapPin;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <h1 className="text-2xl font-bold text-gray-900">{interview.title}</h1>
              <span
                className={cn(
                  "px-3 py-1 text-sm font-medium rounded-full border",
                  statusColors[interview.status as keyof typeof statusColors]
                )}
              >
                {interview.status}
              </span>
            </div>

            {(interview.company_name || interview.job_title) && (
              <div className="text-lg text-gray-700 mb-4">
                {interview.company_name && <span className="font-medium">{interview.company_name}</span>}
                {interview.company_name && interview.job_title && <span className="mx-2">•</span>}
                {interview.job_title && <span>{interview.job_title}</span>}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>
                  {interviewDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>
                  {interviewDate.toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </span>
                <span className="text-gray-400">•</span>
                <span>{interview.duration_minutes} minutes</span>
              </div>

              <div className="flex items-center gap-1">
                <LocationIcon className="h-4 w-4" />
                <span className="capitalize">{interview.location_type.replace('_', ' ')}</span>
              </div>

              <div className="flex items-center gap-1">
                <Star className="h-4 w-4" />
                <span>{typeLabels[interview.interview_type as keyof typeof typeLabels]}</span>
              </div>
            </div>
          </div>

          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 mt-6 pt-6 border-t border-gray-200">
          <ActionButton
            icon={Edit}
            label="Edit"
            onClick={handleEdit}
          />
          <ActionButton
            icon={BellRing}
            label="Send Reminder"
            onClick={handleSendReminder}
            disabled={sendingReminder}
          />
          <ActionButton
            icon={Trash2}
            label="Delete"
            onClick={handleDelete}
            variant="danger"
            disabled={deleteMutation.isPending}
          />

          {/* Status Quick Actions */}
          <div className="ml-auto flex items-center gap-2">
            {interview.status === 'scheduled' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleStatusUpdate('confirmed')}
                className="text-green-600 border-green-200 hover:bg-green-50"
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Confirm
              </Button>
            )}
            {interview.status !== 'completed' && interview.status !== 'cancelled' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleStatusUpdate('completed')}
                className="text-blue-600 border-blue-200 hover:bg-blue-50"
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Mark Complete
              </Button>
            )}
            {interview.status !== 'cancelled' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleStatusUpdate('cancelled')}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                <XCircle className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Location Details */}
      <ExpandableSection
        title="Location Details"
        icon={MapPin}
        defaultExpanded={interview.location_type !== 'remote'}
      >
        <div className="space-y-4">
          {interview.location_type === 'remote' && interview.location_url && (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Meeting URL</label>
              <a
                href={interview.location_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 break-all"
              >
                {interview.location_url}
              </a>
            </div>
          )}

          {interview.meeting_platform && (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Platform</label>
              <p className="text-gray-900 capitalize">{interview.meeting_platform.replace('_', ' ')}</p>
            </div>
          )}

          {interview.meeting_id && (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Meeting ID</label>
              <p className="text-gray-900 font-mono">{interview.meeting_id}</p>
            </div>
          )}

          {interview.meeting_password && (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Meeting Password</label>
              <p className="text-gray-900 font-mono">{interview.meeting_password}</p>
            </div>
          )}

          {interview.location_type === 'in_person' && interview.location_address && (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Address</label>
              <p className="text-gray-900 whitespace-pre-line">{interview.location_address}</p>
            </div>
          )}
        </div>
      </ExpandableSection>

      {/* Interviewers */}
      {interview.interviewers && interview.interviewers.length > 0 && (
        <ExpandableSection title="Interviewers" icon={Mail}>
          <div className="space-y-3">
            {interview.interviewers.map((interviewer, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-medium text-purple-700">
                    {interviewer.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900">{interviewer.name}</p>
                  {interviewer.role && (
                    <p className="text-sm text-gray-600">{interviewer.role}</p>
                  )}
                  {interviewer.email && (
                    <a
                      href={`mailto:${interviewer.email}`}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      {interviewer.email}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ExpandableSection>
      )}

      {/* Preparation Notes */}
      {interview.preparation_notes && (
        <ExpandableSection title="Preparation Notes" icon={FileText}>
          <div className="prose prose-sm max-w-none">
            <p className="text-gray-700 whitespace-pre-line">{interview.preparation_notes}</p>
          </div>
        </ExpandableSection>
      )}

      {/* Description */}
      {interview.description && (
        <ExpandableSection title="Description" icon={FileText}>
          <div className="prose prose-sm max-w-none">
            <p className="text-gray-700 whitespace-pre-line">{interview.description}</p>
          </div>
        </ExpandableSection>
      )}

      {/* Reminders */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-gray-600" />
            <div>
              <h3 className="font-semibold text-gray-900">Reminders</h3>
              <p className="text-sm text-gray-600">
                {interview.reminder_enabled ? 'Enabled' : 'Disabled'}
              </p>
            </div>
          </div>

          {interview.reminder_enabled && interview.reminder_timings && (
            <div className="flex items-center gap-2">
              {interview.reminder_timings.map((timing, index) => (
                <span
                  key={index}
                  className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded"
                >
                  {timing >= 1 ? `${timing}h` : `${timing * 60}m`}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Rating & Feedback (if completed) */}
      {interview.status === 'completed' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Interview Feedback</h3>

          {interview.rating !== undefined && interview.rating !== null && (
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 mb-2 block">Rating</label>
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      "h-5 w-5",
                      i < interview.rating! ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                    )}
                  />
                ))}
              </div>
            </div>
          )}

          {interview.feedback && (
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 mb-1 block">Feedback</label>
              <p className="text-gray-700 whitespace-pre-line">{interview.feedback}</p>
            </div>
          )}

          {interview.next_steps && (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Next Steps</label>
              <p className="text-gray-700 whitespace-pre-line">{interview.next_steps}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
