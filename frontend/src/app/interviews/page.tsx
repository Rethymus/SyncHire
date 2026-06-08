"use client";


import { useState, useCallback, useMemo, memo, Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Client-side only check to prevent SSR issues
const useClientOnly = () => {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsClient(true);
  }, []);
  return isClient;
};
import {
  Calendar,
  Clock,
  Plus,
  Filter,
  Download,
  Trash2,
  Edit,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Video,
  MapPin,
  Phone,
  Star,
  ChevronRight,
  GripVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import InterviewCalendar from "@/components/interview-calendar";
import InterviewCalendarEnhanced from "@/components/interview-calendar-enhanced";
import { InterviewDragDropCalendar } from "@/components/interview-drag-drop-calendar";
import { InterviewQuickSchedule } from "@/components/interview-quick-schedule";
import { apiClient } from "@/lib/api-client";
import { logger, LogCategory } from "@/lib/logger";
import { toast } from "sonner";
import { useLiteCopy, type LiteLocale } from "@/lib/lite-i18n";

interface InterviewEvent {
  id: string;
  title: string;
  interview_type: string;
  status: string;
  start: Date;
  end: Date;
  location_type: string;
  company_name?: string;
  job_title?: string;
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
}

interface InterviewStats {
  total_interviews: number;
  upcoming_interviews: number;
  completed_interviews: number;
  cancelled_interviews: number;
  average_rating?: number;
  interviews_by_type: Record<string, number>;
  interviews_this_month: number;
  next_interview?: Interview;
}

const statusIcons = {
  scheduled: Clock,
  confirmed: CheckCircle2,
  completed: CheckCircle2,
  cancelled: XCircle,
  rescheduled: AlertCircle,
};

const statusColors = {
  scheduled: "bg-yellow-100 text-yellow-800 border-yellow-200",
  confirmed: "bg-green-100 text-green-800 border-green-200",
  completed: "bg-blue-100 text-blue-800 border-blue-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
  rescheduled: "bg-orange-100 text-orange-800 border-orange-200",
};

const INTERVIEW_PAGE_COPY = {
  "en-US": {
    loading: "Loading interviews...",
    initialLoading: "Loading...",
    title: "Interviews",
    subtitle: "Schedule and manage your job interviews",
    schedule: "Schedule Interview",
    stats: {
      upcoming: "Upcoming Interviews",
      completed: "Completed Interviews",
      averageRating: "Average Rating",
      thisMonth: "This Month",
      scheduledConfirmed: "Scheduled & confirmed",
      notAvailable: "N/A",
    },
    nextInterview: "Next Interview",
    tabs: {
      quick: "Quick Schedule",
      dragDrop: "Drag & Drop",
      enhancedCalendar: "Enhanced Calendar",
      basicCalendar: "Basic Calendar",
      list: "List",
    },
    statusFilter: {
      all: "All Statuses",
      scheduled: "Scheduled",
      confirmed: "Confirmed",
      completed: "Completed",
      cancelled: "Cancelled",
      rescheduled: "Rescheduled",
    },
    typeFilter: {
      all: "All Types",
      screening: "Screening",
      technical: "Technical",
      behavioral: "Behavioral",
      panel: "Panel",
      onsite: "Onsite",
      final: "Final",
    },
    locationLabels: {
      remote: "Remote",
      in_person: "In person",
      phone: "Phone",
      video: "Video",
    },
    emptyTitle: "No interviews found",
    emptyFiltered: "Try adjusting your filters to see more interviews.",
    emptyDefault: "Get started by scheduling your first interview.",
    deleteConfirm: "Are you sure you want to delete this interview? This action cannot be undone.",
    retryDeleteConfirm: "Failed to delete interview. Retry?",
    deleteSuccess: "Interview deleted successfully",
    deleteFailure: "Failed to delete interview",
    deleteRetryFailure: "Failed to delete interview after retry",
    editAria: "Edit interview",
    deleteAria: "Delete interview",
    todayAt: (time: string) => `Today at ${time}`,
  },
  "zh-CN": {
    loading: "正在加载面试...",
    initialLoading: "正在加载...",
    title: "面试管理",
    subtitle: "集中安排、追踪和复盘你的求职面试",
    schedule: "预约面试",
    stats: {
      upcoming: "待参加面试",
      completed: "已完成面试",
      averageRating: "平均评分",
      thisMonth: "本月面试",
      scheduledConfirmed: "已预约与已确认",
      notAvailable: "暂无",
    },
    nextInterview: "下一场面试",
    tabs: {
      quick: "快速预约",
      dragDrop: "拖放排期",
      enhancedCalendar: "增强日历",
      basicCalendar: "基础日历",
      list: "列表",
    },
    statusFilter: {
      all: "全部状态",
      scheduled: "已预约",
      confirmed: "已确认",
      completed: "已完成",
      cancelled: "已取消",
      rescheduled: "已改期",
    },
    typeFilter: {
      all: "全部类型",
      screening: "初筛",
      technical: "技术面",
      behavioral: "行为面",
      panel: "小组面",
      onsite: "现场面",
      final: "终面",
    },
    locationLabels: {
      remote: "远程",
      in_person: "现场",
      phone: "电话",
      video: "视频",
    },
    emptyTitle: "暂无面试",
    emptyFiltered: "调整筛选条件，查看更多面试记录。",
    emptyDefault: "先预约第一场面试，SyncHire 会帮你追踪准备节奏。",
    deleteConfirm: "确定要删除这场面试吗？此操作无法撤销。",
    retryDeleteConfirm: "删除面试失败，是否重试？",
    deleteSuccess: "面试已删除",
    deleteFailure: "删除面试失败",
    deleteRetryFailure: "重试后仍无法删除面试",
    editAria: "编辑面试",
    deleteAria: "删除面试",
    todayAt: (time: string) => `今天 ${time}`,
  },
} as const;

type InterviewPageCopy = (typeof INTERVIEW_PAGE_COPY)[LiteLocale];

const EMPTY_INTERVIEW_STATS: InterviewStats = {
  total_interviews: 0,
  upcoming_interviews: 0,
  completed_interviews: 0,
  cancelled_interviews: 0,
  interviews_by_type: {},
  interviews_this_month: 0,
};

const LOCAL_INTERVIEWS_KEY = "synchire-interviews";

function readLocalInterviews(): Interview[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const stored = window.localStorage.getItem(LOCAL_INTERVIEWS_KEY);
    const parsed = stored ? JSON.parse(stored) : [];

    return Array.isArray(parsed)
      ? parsed.filter((item): item is Interview =>
          typeof item?.id === "string" &&
          typeof item?.title === "string" &&
          typeof item?.interview_type === "string" &&
          typeof item?.status === "string" &&
          typeof item?.scheduled_date === "string" &&
          typeof item?.duration_minutes === "number" &&
          typeof item?.location_type === "string"
        )
      : [];
  } catch {
    return [];
  }
}

function buildLocalInterviewStats(interviews: Interview[]): InterviewStats {
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  const upcoming = interviews.filter((interview) =>
    ["scheduled", "confirmed"].includes(interview.status) &&
    new Date(interview.scheduled_date) >= now
  );
  const completed = interviews.filter((interview) => interview.status === "completed");
  const cancelled = interviews.filter((interview) => interview.status === "cancelled");
  const rated = interviews.filter((interview) => typeof interview.rating === "number");
  const nextInterview = upcoming
    .toSorted((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime())
    .at(0);

  return {
    total_interviews: interviews.length,
    upcoming_interviews: upcoming.length,
    completed_interviews: completed.length,
    cancelled_interviews: cancelled.length,
    average_rating: rated.length
      ? rated.reduce((total, interview) => total + (interview.rating ?? 0), 0) / rated.length
      : undefined,
    interviews_by_type: interviews.reduce<Record<string, number>>((totals, interview) => {
      totals[interview.interview_type] = (totals[interview.interview_type] ?? 0) + 1;
      return totals;
    }, {}),
    interviews_this_month: interviews.filter((interview) => {
      const scheduled = new Date(interview.scheduled_date);
      return scheduled.getFullYear() === thisYear && scheduled.getMonth() === thisMonth;
    }).length,
    next_interview: nextInterview,
  };
}

function buildLocalCalendarEvents(interviews: Interview[]): InterviewEvent[] {
  return interviews.map((interview) => {
    const start = new Date(interview.scheduled_date);
    const end = new Date(start.getTime() + interview.duration_minutes * 60_000);

    return {
      id: interview.id,
      title: interview.title,
      interview_type: interview.interview_type,
      status: interview.status,
      start,
      end,
      location_type: interview.location_type,
      company_name: interview.company_name,
      job_title: interview.job_title,
    };
  });
}

function filterLocalInterviews(interviews: Interview[], status: string, type: string) {
  return interviews.filter((interview) => {
    const statusMatches = status === "all" || interview.status === status;
    const typeMatches = type === "all" || interview.interview_type === type;
    return statusMatches && typeMatches;
  });
}

// Stats Card Component
const StatsCard = memo(function StatsCard({
  title,
  value,
  icon: Icon,
  color,
  trend,
}: {
  title: string;
  value: string | number;
  icon: typeof Clock;
  color: string;
  trend?: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
          {trend && (
            <p className="mt-1 text-sm text-gray-600">{trend}</p>
          )}
        </div>
        <div className={cn("p-3 rounded-lg", color)}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );
});

// Interview List Item Component
const InterviewListItem = memo(function InterviewListItem({
  interview,
  onView,
  onEdit,
  onDelete,
  copy,
  locale,
}: {
  interview: Interview;
  onView: (interview: Interview) => void;
  onEdit: (interview: Interview) => void;
  onDelete: (interview: Interview) => void;
  copy: InterviewPageCopy;
  locale: LiteLocale;
}) {
  const StatusIcon = statusIcons[interview.status as keyof typeof statusIcons];
  const locationIcon: typeof Video | typeof MapPin | typeof Phone = {
    remote: Video,
    in_person: MapPin,
    phone: Phone,
  }[interview.location_type as 'remote' | 'in_person' | 'phone'] || MapPin;

  const LocationIcon = locationIcon;
  const interviewDate = new Date(interview.scheduled_date);
  const isPast = interviewDate < new Date();
  const isToday = interviewDate.toDateString() === new Date().toDateString();
  const formattedTime = interviewDate.toLocaleTimeString(locale, {
    hour: "numeric",
    minute: "2-digit",
  });
  const formattedDate = interviewDate.toLocaleDateString(locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <div
      className={cn(
        "bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer",
        isPast && "opacity-75"
      )}
      onClick={() => onView(interview)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="text-lg font-semibold text-gray-900 truncate">{interview.title}</h4>
            <span
              className={cn(
                "px-2 py-1 text-xs font-medium rounded-full border",
                statusColors[interview.status as keyof typeof statusColors]
              )}
            >
              {copy.statusFilter[interview.status as keyof typeof copy.statusFilter] ?? interview.status}
            </span>
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>
                {isToday ? (
                  <span className="font-medium text-blue-600">{copy.todayAt(formattedTime)}</span>
                ) : (
                  <>
                    {formattedDate} {formattedTime}
                  </>
                )}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <LocationIcon className="h-4 w-4" />
              <span>{copy.locationLabels[interview.location_type as keyof typeof copy.locationLabels] ?? interview.location_type.replace("_", " ")}</span>
            </div>

            <div className="flex items-center gap-1">
              <Star className="h-4 w-4" />
              <span>{copy.typeFilter[interview.interview_type as keyof typeof copy.typeFilter] ?? interview.interview_type}</span>
            </div>
          </div>

          {(interview.company_name || interview.job_title) && (
            <div className="text-sm text-gray-700">
              {interview.company_name && <span className="font-medium">{interview.company_name}</span>}
              {interview.company_name && interview.job_title && <span className="mx-1">•</span>}
              {interview.job_title && <span>{interview.job_title}</span>}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 ml-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e?: React.MouseEvent) => {
              e?.stopPropagation();
              onEdit(interview);
            }}
            aria-label={copy.editAria}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e?: React.MouseEvent) => {
              e?.stopPropagation();
              onDelete(interview);
            }}
            aria-label={copy.deleteAria}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {interview.rating !== undefined && interview.rating !== null && (
        <div className="mt-3 flex items-center gap-1">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={cn(
                "h-4 w-4",
                i < interview.rating! ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
});

function InterviewsContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { locale } = useLiteCopy();
  const copy = INTERVIEW_PAGE_COPY[locale];
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [viewMode, setViewMode] = useState<'dashboard' | 'drag-drop' | 'calendar' | 'enhanced-calendar' | 'list'>('list');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

  // Fetch interview stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['interviews', 'stats'],
    queryFn: async () => {
      return buildLocalInterviewStats(readLocalInterviews());
    },
  });

  // Fetch calendar events
  const { data: calendarData, isLoading: calendarLoading } = useQuery({
    queryKey: ['interviews', 'calendar', new Date().getFullYear(), new Date().getMonth() + 1],
    queryFn: async () => {
      return { events: buildLocalCalendarEvents(readLocalInterviews()) };
    },
  });

  // Fetch interviews list
  const { data: interviewsData, isLoading: interviewsLoading, refetch } = useQuery({
    queryKey: ['interviews', 'list', filterStatus, filterType],
    queryFn: async () => {
      const interviews = filterLocalInterviews(readLocalInterviews(), filterStatus, filterType);
      return { interviews, total: interviews.length };
    },
  });

  // Convert calendar events
  const calendarEvents = useMemo(() => {
    if (!calendarData?.events) return [];
    return calendarData.events.map((event: any) => ({
      ...event,
      start: new Date(event.start),
      end: new Date(event.end),
    }));
  }, [calendarData]);

  // Handle date click
  const handleDateClick = useCallback((date: Date) => {
    setSelectedDate(date);
    // Could filter interviews by date here
  }, []);

  // Handle event click
  const handleEventClick = useCallback((event: InterviewEvent) => {
    router.push(`/interviews/${event.id}`);
  }, [router]);

  // Handle schedule new interview
  const handleScheduleInterview = useCallback(() => {
    router.push('/interviews/new');
  }, [router]);

  // Handle drag and drop schedule
  const handleDragDropSchedule = useCallback((application: any, date: Date) => {
    router.push(`/interviews/new?applicationId=${application.id}&date=${date.toISOString()}`);
  }, [router]);

  // Handle view interview
  const handleViewInterview = useCallback((interview: Interview) => {
    router.push(`/interviews/${interview.id}`);
  }, [router]);

  // Handle edit interview
  const handleEditInterview = useCallback((interview: Interview) => {
    router.push(`/interviews/${interview.id}/edit`);
  }, [router]);

  // Handle delete interview
  const handleDeleteInterview = useCallback(async (interview: Interview) => {
    if (!confirm(copy.deleteConfirm)) {
      return;
    }

    try {
      const response = await apiClient.delete(`/interviews/${interview.id}`);
      if (response.error) throw new Error(response.error);

      logger.info(LogCategory.UI, 'Interview deleted', { interviewId: interview.id });
      toast.success(copy.deleteSuccess);
      refetch();
    } catch (error) {
      logger.error(LogCategory.UI, 'Failed to delete interview', error as Error);
      toast.error(copy.deleteFailure);
      // Simple retry without cyclic dependency
      if (confirm(copy.retryDeleteConfirm)) {
        // Direct retry without useCallback dependency
        try {
          const retryResponse = await apiClient.delete(`/interviews/${interview.id}`);
          if (retryResponse.error) throw new Error(retryResponse.error);
          logger.info(LogCategory.UI, 'Interview deleted on retry', { interviewId: interview.id });
          toast.success(copy.deleteSuccess);
          refetch();
        } catch (retryError) {
          logger.error(LogCategory.UI, 'Retry delete failed', retryError as Error);
          toast.error(copy.deleteRetryFailure);
        }
      }
    }
  }, [copy.deleteConfirm, copy.deleteFailure, copy.deleteRetryFailure, copy.deleteSuccess, copy.retryDeleteConfirm, refetch]);

  // Handle event drop (reschedule interview)
  const handleEventDrop = useCallback(async (event: InterviewEvent, newStart: Date, newEnd: Date) => {
    try {
      const response = await apiClient.put(`/interviews/${event.id}`, {
        scheduled_date: newStart.toISOString(),
        duration_minutes: Math.round((newEnd.getTime() - newStart.getTime()) / 60000),
      });

      if (response.error) throw new Error(response.error);

      logger.info(LogCategory.UI, 'Interview rescheduled', { interviewId: event.id, newStart, newEnd });
      toast.success('Interview rescheduled successfully');
      queryClient.invalidateQueries({ queryKey: ['interviews'] });
    } catch (error) {
      logger.error(LogCategory.UI, 'Failed to reschedule interview', error as Error);
      toast.error('Failed to reschedule interview');
    }
  }, [queryClient]);

  // Handle event resize
  const handleEventResize = useCallback(async (event: InterviewEvent, newStart: Date, newEnd: Date) => {
    try {
      const response = await apiClient.put(`/interviews/${event.id}`, {
        duration_minutes: Math.round((newEnd.getTime() - newStart.getTime()) / 60000),
      });

      if (response.error) throw new Error(response.error);

      logger.info(LogCategory.UI, 'Interview duration updated', { interviewId: event.id, newDuration: Math.round((newEnd.getTime() - newStart.getTime()) / 60000) });
      toast.success('Interview duration updated successfully');
      queryClient.invalidateQueries({ queryKey: ['interviews'] });
    } catch (error) {
      logger.error(LogCategory.UI, 'Failed to update interview duration', error as Error);
      toast.error('Failed to update interview duration');
    }
  }, [queryClient]);

  // Handle slot click (create new interview)
  const handleSlotClick = useCallback((slotInfo: any) => {
    router.push(`/interviews/new?date=${slotInfo.start.toISOString()}`);
  }, [router]);

  if (statsLoading || calendarLoading || interviewsLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <Clock className="h-12 w-12 text-purple-600 mx-auto mb-4 animate-spin" />
            <p className="text-lg font-medium text-gray-900">{copy.loading}</p>
          </div>
        </div>
      </div>
    );
  }

  const visibleInterviews = interviewsData?.interviews ?? [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{copy.title}</h1>
              <p className="mt-2 text-lg text-gray-700">
                {copy.subtitle}
              </p>
            </div>
            <Button
              onClick={handleScheduleInterview}
              size="lg"
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              {copy.schedule}
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <StatsCard
            title={copy.stats.upcoming}
            value={stats?.upcoming_interviews || 0}
            icon={Clock}
            color="bg-yellow-500"
            trend={copy.stats.scheduledConfirmed}
          />
          <StatsCard
            title={copy.stats.completed}
            value={stats?.completed_interviews || 0}
            icon={CheckCircle2}
            color="bg-green-500"
          />
          <StatsCard
            title={copy.stats.averageRating}
            value={stats?.average_rating?.toFixed(1) || copy.stats.notAvailable}
            icon={Star}
            color="bg-purple-500"
          />
          <StatsCard
            title={copy.stats.thisMonth}
            value={stats?.interviews_this_month || 0}
            icon={Calendar}
            color="bg-blue-500"
          />
        </div>

        {/* Next Interview Card */}
        {stats?.next_interview && (
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-6 mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-5 w-5 text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-900">{copy.nextInterview}</h3>
            </div>
            <InterviewListItem
              interview={stats.next_interview}
              onView={handleViewInterview}
              onEdit={handleEditInterview}
              onDelete={handleDeleteInterview}
              copy={copy}
              locale={locale}
            />
          </div>
        )}

        {/* View Toggle and Filters */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="flex bg-white rounded-lg border border-gray-200 p-1">
              <button
                onClick={() => setViewMode('dashboard')}
                className={cn(
                  "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                  viewMode === 'dashboard'
                    ? "bg-blue-500 text-white"
                    : "text-gray-700 hover:bg-gray-100"
                )}
              >
                <Plus className="h-4 w-4 inline mr-2" />
                {copy.tabs.quick}
              </button>
              <button
                onClick={() => setViewMode('drag-drop')}
                className={cn(
                  "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                  viewMode === 'drag-drop'
                    ? "bg-blue-500 text-white"
                    : "text-gray-700 hover:bg-gray-100"
                )}
              >
                <GripVertical className="h-4 w-4 inline mr-2" />
                {copy.tabs.dragDrop}
              </button>
              <button
                onClick={() => setViewMode('enhanced-calendar')}
                className={cn(
                  "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                  viewMode === 'enhanced-calendar'
                    ? "bg-blue-500 text-white"
                    : "text-gray-700 hover:bg-gray-100"
                )}
              >
                <Calendar className="h-4 w-4 inline mr-2" />
                {copy.tabs.enhancedCalendar}
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={cn(
                  "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                  viewMode === 'calendar'
                    ? "bg-blue-500 text-white"
                    : "text-gray-700 hover:bg-gray-100"
                )}
              >
                <Calendar className="h-4 w-4 inline mr-2" />
                {copy.tabs.basicCalendar}
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                  viewMode === 'list'
                    ? "bg-blue-500 text-white"
                    : "text-gray-700 hover:bg-gray-100"
                )}
              >
                <Filter className="h-4 w-4 inline mr-2" />
                {copy.tabs.list}
              </button>
            </div>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">{copy.statusFilter.all}</option>
              <option value="scheduled">{copy.statusFilter.scheduled}</option>
              <option value="confirmed">{copy.statusFilter.confirmed}</option>
              <option value="completed">{copy.statusFilter.completed}</option>
              <option value="cancelled">{copy.statusFilter.cancelled}</option>
            </select>

            {/* Type Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">{copy.typeFilter.all}</option>
              <option value="screening">{copy.typeFilter.screening}</option>
              <option value="technical">{copy.typeFilter.technical}</option>
              <option value="behavioral">{copy.typeFilter.behavioral}</option>
              <option value="panel">{copy.typeFilter.panel}</option>
              <option value="onsite">{copy.typeFilter.onsite}</option>
              <option value="final">{copy.typeFilter.final}</option>
            </select>
          </div>
        </div>

        {/* Content */}
        {viewMode === 'dashboard' ? (
          <InterviewQuickSchedule />
        ) : viewMode === 'drag-drop' ? (
          <InterviewDragDropCalendar
            onScheduleInterview={handleDragDropSchedule}
            onEventClick={handleEventClick}
          />
        ) : viewMode === 'enhanced-calendar' ? (
          <InterviewCalendarEnhanced
            events={calendarEvents}
            onDateClick={handleDateClick}
            onEventClick={handleEventClick}
            onEventDrop={handleEventDrop}
            onEventResize={handleEventResize}
            onSlotClick={handleSlotClick}
            selectedDate={selectedDate}
            defaultView="month"
          />
        ) : viewMode === 'calendar' ? (
          <InterviewCalendar
            events={calendarEvents}
            onDateClick={handleDateClick}
            onEventClick={handleEventClick}
            selectedDate={selectedDate}
          />
        ) : (
          <div className="space-y-4">
            {visibleInterviews.length > 0 ? (
              visibleInterviews.map((interview: Interview) => (
                <InterviewListItem
                  key={interview.id}
                  interview={interview}
                  onView={handleViewInterview}
                  onEdit={handleEditInterview}
                  onDelete={handleDeleteInterview}
                  copy={copy}
                  locale={locale}
                />
              ))
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{copy.emptyTitle}</h3>
                <p className="text-gray-600 mb-4">
                  {filterStatus !== 'all' || filterType !== 'all'
                    ? copy.emptyFiltered
                    : copy.emptyDefault}
                </p>
                {filterStatus === 'all' && filterType === 'all' && (
                  <Button onClick={handleScheduleInterview}>
                    <Plus className="h-4 w-4 mr-2" />
                    {copy.schedule}
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function InterviewsPage() {
  const isClient = useClientOnly();
  const { locale } = useLiteCopy();
  const copy = INTERVIEW_PAGE_COPY[locale];

  if (!isClient) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{copy.initialLoading}</p>
        </div>
      </div>
    );
  }


  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><Clock className="h-8 w-8 text-purple-600 animate-spin" /></div>}>
      <InterviewsContent />
    </Suspense>
  );
}
