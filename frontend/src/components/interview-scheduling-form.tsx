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
import { useLiteCopy, type LiteLocale } from "@/lib/lite-i18n";

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

const INTERVIEW_FORM_COPY = {
  "en-US": {
    loading: "Loading interview...",
    editTitle: "Edit Interview",
    createTitle: "Schedule New Interview",
    subtitle: "Fill in the details to schedule your interview",
    basicInformation: "Basic Information",
    titleLabel: "Interview Title *",
    titlePlaceholder: "e.g., Technical Interview - Frontend Engineer",
    descriptionLabel: "Description",
    descriptionPlaceholder: "Additional details about the interview...",
    interviewTypeLabel: "Interview Type *",
    interviewTypes: {
      screening: { label: "Screening Call", description: "Initial phone screening" },
      technical: { label: "Technical Interview", description: "Deep technical assessment" },
      behavioral: { label: "Behavioral Interview", description: "Cultural fit and behavior" },
      panel: { label: "Panel Interview", description: "Interview with multiple people" },
      onsite: { label: "Onsite Interview", description: "In-person at company office" },
      final: { label: "Final Interview", description: "Final decision-making interview" },
    },
    scheduling: "Scheduling",
    dateTime: "Date & Time *",
    duration: "Duration (minutes) *",
    durations: {
      minutes30: "30 minutes",
      minutes45: "45 minutes",
      hour1: "1 hour",
      hours15: "1.5 hours",
      hours2: "2 hours",
      hours3: "3 hours",
      hours4: "4 hours",
    },
    timezone: "Timezone",
    timezones: {
      eastern: "Eastern Time (ET)",
      central: "Central Time (CT)",
      mountain: "Mountain Time (MT)",
      pacific: "Pacific Time (PT)",
      london: "London (GMT)",
      europe: "Central European (CET)",
      japan: "Japan (JST)",
      china: "China (CST)",
    },
    location: "Location",
    locationType: "Location Type *",
    locationTypes: {
      remote: "Remote/Video",
      in_person: "In-Person",
      phone: "Phone Call",
    },
    meetingPlatform: "Meeting Platform",
    selectPlatform: "Select platform",
    meetingUrl: "Meeting URL",
    meetingId: "Meeting ID",
    meetingPassword: "Meeting Password",
    optionalPassword: "Optional password",
    address: "Address *",
    addressPlaceholder: "Full address including street, city, state, and zip code",
    interviewers: "Interviewers",
    interviewer: (index: number) => `Interviewer ${index}`,
    namePlaceholder: "Name *",
    rolePlaceholder: "Role (e.g., Hiring Manager)",
    emailPlaceholder: "Email",
    addInterviewer: "Add Interviewer",
    preparation: "Preparation",
    preparationNotes: "Preparation Notes",
    preparationPlaceholder: "Key points to prepare, questions to ask, topics to review...",
    reminders: "Reminders",
    enableReminders: "Enable interview reminders",
    remindedBefore: "Get reminded before the interview:",
    reminderOptions: {
      hours24: "24 hours",
      hours2: "2 hours",
      hour1: "1 hour",
      minutes30: "30 minutes",
    },
    linkToApplication: "Link to Application",
    relatedApplication: "Related Application (Optional)",
    selectApplication: "Select an application...",
    unknownCompany: "Unknown Company",
    unknownPosition: "Unknown Position",
    cancel: "Cancel",
    saving: "Saving...",
    defaultSubmit: "Schedule Interview",
  },
  "zh-CN": {
    loading: "正在加载面试...",
    editTitle: "编辑面试",
    createTitle: "预约新面试",
    subtitle: "填写面试细节，SyncHire 会帮你管理日程和准备事项",
    basicInformation: "基础信息",
    titleLabel: "面试标题 *",
    titlePlaceholder: "例如：技术面试 - 前端工程师",
    descriptionLabel: "说明",
    descriptionPlaceholder: "补充面试背景、考察重点或注意事项...",
    interviewTypeLabel: "面试类型 *",
    interviewTypes: {
      screening: { label: "初筛电话", description: "HR 或招聘方的初步沟通" },
      technical: { label: "技术面试", description: "深入技术能力与项目经验评估" },
      behavioral: { label: "行为面试", description: "文化匹配、沟通和行为问题" },
      panel: { label: "小组面试", description: "与多位面试官同时沟通" },
      onsite: { label: "现场面试", description: "到公司办公室参加线下面试" },
      final: { label: "终面", description: "进入最终决策阶段的面试" },
    },
    scheduling: "日程安排",
    dateTime: "日期与时间 *",
    duration: "时长（分钟）*",
    durations: {
      minutes30: "30 分钟",
      minutes45: "45 分钟",
      hour1: "1 小时",
      hours15: "1.5 小时",
      hours2: "2 小时",
      hours3: "3 小时",
      hours4: "4 小时",
    },
    timezone: "时区",
    timezones: {
      eastern: "美国东部时间 (ET)",
      central: "美国中部时间 (CT)",
      mountain: "美国山地时间 (MT)",
      pacific: "美国太平洋时间 (PT)",
      london: "伦敦 (GMT)",
      europe: "中欧时间 (CET)",
      japan: "日本 (JST)",
      china: "中国 (CST)",
    },
    location: "面试地点",
    locationType: "地点类型 *",
    locationTypes: {
      remote: "远程/视频",
      in_person: "线下现场",
      phone: "电话沟通",
    },
    meetingPlatform: "会议平台",
    selectPlatform: "选择平台",
    meetingUrl: "会议链接",
    meetingId: "会议 ID",
    meetingPassword: "会议密码",
    optionalPassword: "可选密码",
    address: "地址 *",
    addressPlaceholder: "填写街道、城市、省市和邮编等完整地址",
    interviewers: "面试官",
    interviewer: (index: number) => `面试官 ${index}`,
    namePlaceholder: "姓名 *",
    rolePlaceholder: "角色（例如：招聘经理）",
    emailPlaceholder: "邮箱",
    addInterviewer: "添加面试官",
    preparation: "准备事项",
    preparationNotes: "准备备注",
    preparationPlaceholder: "记录需要复习的主题、想提的问题和关键项目证据...",
    reminders: "提醒",
    enableReminders: "开启面试提醒",
    remindedBefore: "在面试前提醒我：",
    reminderOptions: {
      hours24: "24 小时",
      hours2: "2 小时",
      hour1: "1 小时",
      minutes30: "30 分钟",
    },
    linkToApplication: "关联申请",
    relatedApplication: "相关申请（可选）",
    selectApplication: "选择一条申请...",
    unknownCompany: "未知公司",
    unknownPosition: "未知岗位",
    cancel: "取消",
    saving: "保存中...",
    defaultSubmit: "预约面试",
  },
} as const;

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
  submitLabel,
  className,
}: InterviewSchedulingFormProps) {
  const router = useRouter();
  const { locale } = useLiteCopy();
  const copy = INTERVIEW_FORM_COPY[locale];
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
        <span className="ml-3 text-lg font-medium text-gray-900">{copy.loading}</span>
      </div>
    );
  }

  return (
    <div className={cn("bg-white rounded-xl shadow-sm border border-gray-200", className)}>
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900">
          {interviewId ? copy.editTitle : copy.createTitle}
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          {copy.subtitle}
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
          <h3 className="text-lg font-semibold text-gray-900">{copy.basicInformation}</h3>

        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            {copy.titleLabel}
          </label>
          <input
            id="title"
            type="text"
            {...register("title")}
            placeholder={copy.titlePlaceholder}
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
            {copy.descriptionLabel}
          </label>
          <textarea
            id="description"
            {...register("description")}
            rows={3}
            placeholder={copy.descriptionPlaceholder}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Interview Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {copy.interviewTypeLabel}
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {interviewTypes.map(type => {
              const typeCopy = copy.interviewTypes[type.value as keyof typeof copy.interviewTypes];
              return (
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
                    <div className="font-medium text-gray-900">{typeCopy.label}</div>
                    <div className="text-sm text-gray-600">{typeCopy.description}</div>
                  </div>
                </label>
              );
            })}
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
          {copy.scheduling}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Date */}
          <div>
            <label htmlFor="scheduled_date" className="block text-sm font-medium text-gray-700 mb-1">
              {copy.dateTime}
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
              {copy.duration}
            </label>
            <select
              id="duration_minutes"
              {...register("duration_minutes", { valueAsNumber: true })}
              className={cn(
                "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
                errors.duration_minutes && "border-red-500"
              )}
            >
              <option value={30}>{copy.durations.minutes30}</option>
              <option value={45}>{copy.durations.minutes45}</option>
              <option value={60}>{copy.durations.hour1}</option>
              <option value={90}>{copy.durations.hours15}</option>
              <option value={120}>{copy.durations.hours2}</option>
              <option value={180}>{copy.durations.hours3}</option>
              <option value={240}>{copy.durations.hours4}</option>
            </select>
            {errors.duration_minutes && (
              <p className="mt-1 text-sm text-red-600">{errors.duration_minutes.message}</p>
            )}
          </div>
        </div>

        {/* Timezone */}
        <div>
          <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 mb-1">
            {copy.timezone}
          </label>
          <select
            id="timezone"
            {...register("timezone")}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="UTC">UTC</option>
            <option value="America/New_York">{copy.timezones.eastern}</option>
            <option value="America/Chicago">{copy.timezones.central}</option>
            <option value="America/Denver">{copy.timezones.mountain}</option>
            <option value="America/Los_Angeles">{copy.timezones.pacific}</option>
            <option value="Europe/London">{copy.timezones.london}</option>
            <option value="Europe/Paris">{copy.timezones.europe}</option>
            <option value="Asia/Tokyo">{copy.timezones.japan}</option>
            <option value="Asia/Shanghai">{copy.timezones.china}</option>
          </select>
        </div>
      </div>

      {/* Location */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          {copy.location}
        </h3>

        {/* Location Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {copy.locationType}
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
                  <span className="font-medium">{copy.locationTypes[type.value as keyof typeof copy.locationTypes]}</span>
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
                {copy.meetingPlatform}
              </label>
              <select
                id="meeting_platform"
                {...register("meeting_platform")}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">{copy.selectPlatform}</option>
                <option value="zoom">Zoom</option>
                <option value="google_meet">Google Meet</option>
                <option value="teams">Microsoft Teams</option>
                <option value="webex">Cisco Webex</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label htmlFor="location_url" className="block text-sm font-medium text-gray-700 mb-1">
                {copy.meetingUrl}
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
                  {copy.meetingId}
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
                  {copy.meetingPassword}
                </label>
                <input
                  id="meeting_password"
                  type="text"
                  {...register("meeting_password")}
                  placeholder={copy.optionalPassword}
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
              {copy.address}
            </label>
            <textarea
              id="location_address"
              {...register("location_address")}
              rows={3}
              placeholder={copy.addressPlaceholder}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        )}
      </div>

      {/* Interviewers */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Users className="h-5 w-5" />
          {copy.interviewers}
        </h3>

        {interviewers.map((interviewer, index) => (
          <div key={index} className="p-4 border border-gray-200 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">{copy.interviewer(index + 1)}</span>
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
                  placeholder={copy.namePlaceholder}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <input
                  type="text"
                  value={interviewer.role || ""}
                  onChange={(e) => updateInterviewer(index, "role", e.target.value)}
                  placeholder={copy.rolePlaceholder}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <input
                  type="email"
                  value={interviewer.email || ""}
                  onChange={(e) => updateInterviewer(index, "email", e.target.value)}
                  placeholder={copy.emailPlaceholder}
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
          {copy.addInterviewer}
        </Button>
      </div>

      {/* Preparation Notes */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <FileText className="h-5 w-5" />
          {copy.preparation}
        </h3>

        <div>
          <label htmlFor="preparation_notes" className="block text-sm font-medium text-gray-700 mb-1">
            {copy.preparationNotes}
          </label>
          <textarea
            id="preparation_notes"
            {...register("preparation_notes")}
            rows={4}
            placeholder={copy.preparationPlaceholder}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Reminders */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Bell className="h-5 w-5" />
          {copy.reminders}
        </h3>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="reminder_enabled"
            {...register("reminder_enabled")}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="reminder_enabled" className="text-sm font-medium text-gray-700">
            {copy.enableReminders}
          </label>
        </div>

        {reminderEnabled && (
          <div className="ml-6 space-y-2">
            <p className="text-sm text-gray-600">{copy.remindedBefore}</p>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 24, label: copy.reminderOptions.hours24 },
                { value: 2, label: copy.reminderOptions.hours2 },
                { value: 1, label: copy.reminderOptions.hour1 },
                { value: 0.5, label: copy.reminderOptions.minutes30 },
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
          <h3 className="text-lg font-semibold text-gray-900">{copy.linkToApplication}</h3>

          <div>
            <label htmlFor="application_id" className="block text-sm font-medium text-gray-700 mb-1">
              {copy.relatedApplication}
            </label>
            <select
              id="application_id"
              {...register("application_id")}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">{copy.selectApplication}</option>
              {applications.map((app) => (
                <option key={app.id} value={app.id}>
                  {app.company_name || copy.unknownCompany} - {app.job_title || copy.unknownPosition}
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
            {copy.cancel}
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
              {copy.saving}
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              {submitLabel ?? copy.defaultSubmit}
            </>
          )}
        </Button>
      </div>
    </form>
    </div>
  );
});

export default InterviewSchedulingForm;
