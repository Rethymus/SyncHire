"use client";

import { useState, useCallback, memo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  Phone,
  Building,
  Users,
  FileText,
  Bell,
  Plus,
  X,
  Save,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";
import { logger, LogCategory } from "@/lib/logger";

// Interview type options
const interviewTypes = [
  { value: "screening", label: "Screening Call", description: "Initial phone screening" },
  { value: "technical", label: "Technical Interview", description: "Deep technical assessment" },
  { value: "behavioral", label: "Behavioral Interview", description: "Cultural fit and behavior" },
  { value: "panel", label: "Panel Interview", description: "Interview with multiple people" },
  { value: "onsite", label: "Onsite Interview", description: "In-person at company office" },
  { value: "final", label: "Final Interview", description: "Final decision-making interview" },
];

// Location type options
const locationTypes = [
  { value: "remote", label: "Remote/Video", icon: Video },
  { value: "in_person", label: "In-Person", icon: Building },
  { value: "phone", label: "Phone Call", icon: Phone },
];

// Form schema
const interviewSchema = z.object({
  title: z.string().min(1, "Title is required").max(255, "Title too long"),
  description: z.string().optional(),
  interview_type: z.enum(["screening", "technical", "behavioral", "panel", "onsite", "final"]),
  scheduled_date: z.string().min(1, "Date and time are required"),
  duration_minutes: z.number().min(15, "Duration must be at least 15 minutes").max(480, "Duration cannot exceed 8 hours"),
  timezone: z.string().default("UTC"),
  location_type: z.enum(["remote", "in_person", "phone", "video"]),
  location_url: z.string().url("Invalid URL").optional().or(z.literal("")),
  location_address: z.string().optional(),
  meeting_platform: z.string().optional(),
  meeting_id: z.string().optional(),
  meeting_password: z.string().optional(),
  interviewers: z.array(z.object({
    name: z.string().min(1, "Name is required"),
    role: z.string().optional(),
    email: z.string().email("Invalid email").optional().or(z.literal("")),
  })).optional(),
  preparation_notes: z.string().optional(),
  reminder_enabled: z.boolean().default(true),
  reminder_timings: z.array(z.number()).default([24, 2, 0.5]),
  application_id: z.string().optional(),
});

type InterviewFormData = z.infer<typeof interviewSchema>;

interface InterviewerInput {
  name: string;
  role?: string;
  email?: string;
}

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
  application_id?: string;
}

interface Application {
  id: string;
  status: string;
  created_at: string;
  updated_at: string;
  job_id: string;
  resume_id: string;
  user_id: string;
  notes?: string;
  job_title?: string;
  company_name?: string;
  resume_title?: string;
}

interface InterviewSchedulingFormProps {
  interviewId?: string;
  applicationId?: string;
  initialDate?: Date;
  initialData?: Partial<InterviewFormData>;
  onSubmit?: (data: InterviewFormData) => Promise<void>;
  onSuccess?: (interview: Interview) => void;
  onCancel?: () => void;
  submitLabel?: string;
  className?: string;
}

const InterviewSchedulingForm = memo(function InterviewSchedulingForm({
  interviewId,
  applicationId,
  initialDate,
  initialData,
  onSubmit,
  onSuccess,
  onCancel,
  submitLabel = "Schedule Interview",
  className,
}: InterviewSchedulingFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [interviewers, setInterviewers] = useState<InterviewerInput[]>(
    initialData?.interviewers as InterviewerInput[] || []
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isDirty },
  } = useForm<InterviewFormData>({
    resolver: zodResolver(interviewSchema) as any,
    defaultValues: {
      title: "",
      description: "",
      interview_type: "screening",
      scheduled_date: initialDate ? initialDate.toISOString().slice(0, 16) : "",
      duration_minutes: 60,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      location_type: "remote",
      reminder_enabled: true,
      reminder_timings: [24, 2, 0.5],
      ...initialData,
    } as any,
  });

  const locationType = watch("location_type");
  const reminderEnabled = watch("reminder_enabled");
  const reminderTimings = watch("reminder_timings") || [24, 2, 0.5];

  // Fetch interview data if editing
  useEffect(() => {
    const fetchInterviewData = async () => {
      if (!interviewId) return;

      setIsLoading(true);
      try {
        const response = await apiClient.get<Interview>(`/interviews/${interviewId}`);
        if (response.error || !response.data) {
          throw new Error(response.error || "Failed to fetch interview");
        }

        const interview = response.data;
        reset({
          title: interview.title,
          description: interview.description || "",
          interview_type: interview.interview_type as any,
          scheduled_date: interview.scheduled_date.slice(0, 16),
          duration_minutes: interview.duration_minutes,
          timezone: interview.timezone,
          location_type: interview.location_type as any,
          location_url: interview.location_url || "",
          location_address: interview.location_address || "",
          meeting_platform: interview.meeting_platform || "",
          meeting_id: interview.meeting_id || "",
          meeting_password: interview.meeting_password || "",
          preparation_notes: interview.preparation_notes || "",
          reminder_enabled: interview.reminder_enabled,
          reminder_timings: interview.reminder_timings,
        });

        if (interview.interviewers.length > 0) {
          setInterviewers(interview.interviewers);
        }
      } catch (err) {
        logger.error(LogCategory.UI, "Failed to fetch interview", err as Error);
        setError("Failed to load interview data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchInterviewData();
  }, [interviewId, reset]);

  // Fetch applications for linking
  useEffect(() => {
    const fetchApplications = async () => {
      try {
        const response = await apiClient.get<any>("/applications?page=1&page_size=50");
        if (response.error || !response.data?.applications) {
          return;
        }

        setApplications(response.data.applications);
      } catch (err) {
        logger.error(LogCategory.UI, "Failed to fetch applications", err as Error);
      }
    };

    fetchApplications();
  }, []);

  // Add interviewer
  const addInterviewer = useCallback(() => {
    setInterviewers(prev => [...prev, { name: "", role: "", email: "" }]);
  }, []);

  // Remove interviewer
  const removeInterviewer = useCallback((index: number) => {
    setInterviewers(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Update interviewer
  const updateInterviewer = useCallback((index: number, field: keyof InterviewerInput, value: string) => {
    setInterviewers(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }, []);

  // Handle form submission
  const handleFormSubmit = useCallback(async (data: any) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Add interviewers to form data
      const submitData = {
        ...data,
        interviewers: interviewers.filter(i => i.name.trim()),
        application_id: applicationId,
      };

      if (onSubmit) {
        await onSubmit(submitData);
      } else {
        // Default API call
        let response;
        if (interviewId) {
          response = await apiClient.put(`/interviews/${interviewId}`, submitData);
        } else {
          response = await apiClient.post("/interviews", submitData);
        }

        if (response.error || !response.data) {
          throw new Error(response.error || "Failed to save interview");
        }

        logger.info(LogCategory.UI, `Interview ${interviewId ? 'updated' : 'created'}`, {
          interviewId: (response.data as any)?.id
        });

        if (onSuccess) {
          onSuccess(response.data as Interview);
        } else {
          router.push(`/interviews/${(response.data as any)?.id}`);
        }
      }
    } catch (err) {
      logger.error(LogCategory.UI, `Failed to ${interviewId ? 'update' : 'create'} interview`, err as Error);
      setError(err instanceof Error ? err.message : "An error occurred");
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [interviewId, interviewers, applicationId, onSubmit, onSuccess, router]);

  // Generate time options
  const generateTimeOptions = useCallback(() => {
    const options: string[] = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        options.push(time);
      }
    }
    return options;
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 text-purple-600 animate-spin" />
        <span className="ml-3 text-lg font-medium text-gray-900">Loading interview...</span>
      </div>
    );
  }

  return (
    <div className={cn("bg-white rounded-xl shadow-sm border border-gray-200", className)}>
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900">
          {interviewId ? "Edit Interview" : "Schedule New Interview"}
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Fill in the details to schedule your interview
        </p>
      </div>

      <form onSubmit={handleSubmit(handleFormSubmit)} className="p-6 space-y-6">
        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>

        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Interview Title *
          </label>
          <input
            id="title"
            type="text"
            {...register("title")}
            placeholder="e.g., Technical Interview - Frontend Engineer"
            className={cn(
              "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
              errors.title && "border-red-500"
            )}
          />
          {errors.title && (
            <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            id="description"
            {...register("description")}
            rows={3}
            placeholder="Additional details about the interview..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Interview Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Interview Type *
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {interviewTypes.map(type => (
              <label
                key={type.value}
                className={cn(
                  "flex items-start p-3 border rounded-lg cursor-pointer transition-colors",
                  watch("interview_type") === type.value
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-300 hover:border-gray-400"
                )}
              >
                <input
                  type="radio"
                  value={type.value}
                  {...register("interview_type")}
                  className="mt-1 mr-3"
                />
                <div>
                  <div className="font-medium text-gray-900">{type.label}</div>
                  <div className="text-sm text-gray-600">{type.description}</div>
                </div>
              </label>
            ))}
          </div>
          {errors.interview_type && (
            <p className="mt-1 text-sm text-red-600">{errors.interview_type.message}</p>
          )}
        </div>
      </div>

      {/* Scheduling */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Scheduling
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Date */}
          <div>
            <label htmlFor="scheduled_date" className="block text-sm font-medium text-gray-700 mb-1">
              Date & Time *
            </label>
            <input
              id="scheduled_date"
              type="datetime-local"
              {...register("scheduled_date")}
              className={cn(
                "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
                errors.scheduled_date && "border-red-500"
              )}
            />
            {errors.scheduled_date && (
              <p className="mt-1 text-sm text-red-600">{errors.scheduled_date.message}</p>
            )}
          </div>

          {/* Duration */}
          <div>
            <label htmlFor="duration_minutes" className="block text-sm font-medium text-gray-700 mb-1">
              Duration (minutes) *
            </label>
            <select
              id="duration_minutes"
              {...register("duration_minutes", { valueAsNumber: true })}
              className={cn(
                "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
                errors.duration_minutes && "border-red-500"
              )}
            >
              <option value={30}>30 minutes</option>
              <option value={45}>45 minutes</option>
              <option value={60}>1 hour</option>
              <option value={90}>1.5 hours</option>
              <option value={120}>2 hours</option>
              <option value={180}>3 hours</option>
              <option value={240}>4 hours</option>
            </select>
            {errors.duration_minutes && (
              <p className="mt-1 text-sm text-red-600">{errors.duration_minutes.message}</p>
            )}
          </div>
        </div>

        {/* Timezone */}
        <div>
          <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 mb-1">
            Timezone
          </label>
          <select
            id="timezone"
            {...register("timezone")}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="UTC">UTC</option>
            <option value="America/New_York">Eastern Time (ET)</option>
            <option value="America/Chicago">Central Time (CT)</option>
            <option value="America/Denver">Mountain Time (MT)</option>
            <option value="America/Los_Angeles">Pacific Time (PT)</option>
            <option value="Europe/London">London (GMT)</option>
            <option value="Europe/Paris">Central European (CET)</option>
            <option value="Asia/Tokyo">Japan (JST)</option>
            <option value="Asia/Shanghai">China (CST)</option>
          </select>
        </div>
      </div>

      {/* Location */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Location
        </h3>

        {/* Location Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Location Type *
          </label>
          <div className="flex gap-3">
            {locationTypes.map(type => {
              const Icon = type.icon;
              return (
                <label
                  key={type.value}
                  className={cn(
                    "flex items-center gap-2 px-4 py-3 border rounded-lg cursor-pointer transition-colors flex-1 justify-center",
                    locationType === type.value
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-300 hover:border-gray-400"
                  )}
                >
                  <input
                    type="radio"
                    value={type.value}
                    {...register("location_type")}
                    className="sr-only"
                  />
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{type.label}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Location URL (for remote/video) */}
        {locationType === "remote" && (
          <div className="space-y-4">
            <div>
              <label htmlFor="meeting_platform" className="block text-sm font-medium text-gray-700 mb-1">
                Meeting Platform
              </label>
              <select
                id="meeting_platform"
                {...register("meeting_platform")}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select platform</option>
                <option value="zoom">Zoom</option>
                <option value="google_meet">Google Meet</option>
                <option value="teams">Microsoft Teams</option>
                <option value="webex">Cisco Webex</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label htmlFor="location_url" className="block text-sm font-medium text-gray-700 mb-1">
                Meeting URL
              </label>
              <input
                id="location_url"
                type="url"
                {...register("location_url")}
                placeholder="https://zoom.us/j/..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {errors.location_url && (
                <p className="mt-1 text-sm text-red-600">{errors.location_url.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="meeting_id" className="block text-sm font-medium text-gray-700 mb-1">
                  Meeting ID
                </label>
                <input
                  id="meeting_id"
                  type="text"
                  {...register("meeting_id")}
                  placeholder="123-456-789"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="meeting_password" className="block text-sm font-medium text-gray-700 mb-1">
                  Meeting Password
                </label>
                <input
                  id="meeting_password"
                  type="text"
                  {...register("meeting_password")}
                  placeholder="Optional password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Location Address (for in-person) */}
        {locationType === "in_person" && (
          <div>
            <label htmlFor="location_address" className="block text-sm font-medium text-gray-700 mb-1">
              Address *
            </label>
            <textarea
              id="location_address"
              {...register("location_address")}
              rows={3}
              placeholder="Full address including street, city, state, and zip code"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        )}
      </div>

      {/* Interviewers */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Users className="h-5 w-5" />
          Interviewers
        </h3>

        {interviewers.map((interviewer, index) => (
          <div key={index} className="p-4 border border-gray-200 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Interviewer {index + 1}</span>
              <button
                type="button"
                onClick={() => removeInterviewer(index)}
                className="text-red-600 hover:text-red-700 text-sm"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <input
                  type="text"
                  value={interviewer.name}
                  onChange={(e) => updateInterviewer(index, "name", e.target.value)}
                  placeholder="Name *"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <input
                  type="text"
                  value={interviewer.role || ""}
                  onChange={(e) => updateInterviewer(index, "role", e.target.value)}
                  placeholder="Role (e.g., Hiring Manager)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <input
                  type="email"
                  value={interviewer.email || ""}
                  onChange={(e) => updateInterviewer(index, "email", e.target.value)}
                  placeholder="Email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          onClick={addInterviewer}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Interviewer
        </Button>
      </div>

      {/* Preparation Notes */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Preparation
        </h3>

        <div>
          <label htmlFor="preparation_notes" className="block text-sm font-medium text-gray-700 mb-1">
            Preparation Notes
          </label>
          <textarea
            id="preparation_notes"
            {...register("preparation_notes")}
            rows={4}
            placeholder="Key points to prepare, questions to ask, topics to review..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Reminders */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Reminders
        </h3>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="reminder_enabled"
            {...register("reminder_enabled")}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="reminder_enabled" className="text-sm font-medium text-gray-700">
            Enable interview reminders
          </label>
        </div>

        {reminderEnabled && (
          <div className="ml-6 space-y-2">
            <p className="text-sm text-gray-600">Get reminded before the interview:</p>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 24, label: "24 hours" },
                { value: 2, label: "2 hours" },
                { value: 1, label: "1 hour" },
                { value: 0.5, label: "30 minutes" },
              ].map(option => (
                <label key={option.value} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={reminderTimings.includes(option.value)}
                    onChange={(e) => {
                      const newTimings = e.target.checked
                        ? [...reminderTimings, option.value]
                        : reminderTimings.filter((t: number) => t !== option.value);
                      setValue("reminder_timings", newTimings);
                    }}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Link to Application */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Link to Application</h3>

          <div>
            <label htmlFor="application_id" className="block text-sm font-medium text-gray-700 mb-1">
              Related Application (Optional)
            </label>
            <select
              id="application_id"
              {...register("application_id")}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select an application...</option>
              {applications.map((app) => (
                <option key={app.id} value={app.id}>
                  {app.company_name || "Unknown Company"} - {app.job_title || "Unknown Position"}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 min-w-[120px]"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              {submitLabel}
            </>
          )}
        </Button>
      </div>
    </form>
    </div>
  );
});

export default InterviewSchedulingForm;