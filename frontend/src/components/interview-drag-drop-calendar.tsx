"use client";

import { useState, useCallback, memo, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Calendar,
  Clock,
  Plus,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Video,
  MapPin,
  Phone,
  Building2,
  Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";
import { logger, LogCategory } from "@/lib/logger";

// Application types
interface Application {
  id: string;
  job_title: string;
  company_name: string;
  status: string;
  match_score?: number;
  resume_title?: string;
}

// Interview types
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
  application_id?: string;
}

interface DraggableApplicationProps {
  application: Application;
  onDragStart: (application: Application) => void;
}

const DraggableApplication = memo(function DraggableApplication({
  application,
  onDragStart,
}: DraggableApplicationProps) {
  const handleDragStart = useCallback((e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = "copy";
    e.dataTransfer.setData("application", JSON.stringify(application));
    onDragStart(application);
  }, [application, onDragStart]);

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="bg-white p-3 rounded-lg border-2 border-gray-200 shadow-sm cursor-grab active:cursor-grabbing transition-all hover:border-blue-400 hover:shadow-md"
    >
      <div className="flex items-start gap-2">
        <GripVertical className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 text-sm truncate">
            {application.job_title}
          </p>
          <p className="text-xs text-gray-600 truncate">{application.company_name}</p>
          {application.match_score !== undefined && (
            <div className="mt-1 flex items-center gap-1">
              <div className="h-1.5 flex-1 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${application.match_score}%` }}
                />
              </div>
              <span className="text-xs text-gray-600">{application.match_score}%</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

// Calendar day drop zone
interface CalendarDayProps {
  date: Date;
  events: InterviewEvent[];
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  onDateClick: (date: Date) => void;
  onEventClick: (event: InterviewEvent) => void;
  onDrop: (application: Application, date: Date) => void;
}

const CalendarDay = memo(function CalendarDay({
  date,
  events,
  isCurrentMonth,
  isToday,
  isSelected,
  onDateClick,
  onEventClick,
  onDrop,
}: CalendarDayProps) {
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const applicationData = e.dataTransfer.getData("application");
      if (applicationData) {
        const application = JSON.parse(applicationData) as Application;
        onDrop(application, date);
      }
    },
    [date, onDrop]
  );

  const locationIcons = {
    remote: Video,
    in_person: MapPin,
    phone: Phone,
  };

  return (
    <div
      onClick={() => onDateClick(date)}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={cn(
        "min-h-[100px] p-2 border border-gray-100 rounded-lg transition-all",
        "hover:bg-blue-50 hover:border-blue-200",
        isToday && "bg-blue-50 border-blue-300",
        isSelected && "ring-2 ring-blue-500 ring-offset-1",
        !isCurrentMonth && "bg-gray-50 opacity-60"
      )}
    >
      <div
        className={cn(
          "text-sm font-medium mb-1",
          isToday && "text-blue-600 font-bold",
          !isCurrentMonth && "text-gray-400"
        )}
      >
        {date.getDate()}
      </div>

      <div className="space-y-1">
        {events.slice(0, 2).map((event) => {
          const LocationIcon = locationIcons[event.location_type as keyof typeof locationIcons] || Video;
          const timeStr = event.start.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
          });

          return (
            <div
              key={event.id}
              onClick={(e) => {
                e.stopPropagation();
                onEventClick(event);
              }}
              className="text-xs p-1.5 rounded bg-purple-100 text-purple-800 border border-purple-200 cursor-pointer hover:opacity-80"
            >
              <div className="flex items-center gap-1 truncate">
                <Clock className="h-3 w-3 flex-shrink-0" />
                <span className="font-medium">{timeStr}</span>
              </div>
              {event.company_name && (
                <div className="flex items-center gap-1 truncate">
                  <Building2 className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{event.company_name}</span>
                </div>
              )}
            </div>
          );
        })}

        {events.length > 2 && (
          <div className="text-xs text-purple-700 text-center font-medium">
            +{events.length - 2} more
          </div>
        )}
      </div>
    </div>
  );
});

// Main drag-drop calendar component
interface InterviewDragDropCalendarProps {
  onScheduleInterview?: (application: Application, date: Date) => void;
  onEventClick?: (event: InterviewEvent) => void;
  className?: string;
}

export function InterviewDragDropCalendar({
  onScheduleInterview,
  onEventClick,
  className,
}: InterviewDragDropCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [draggedApplication, setDraggedApplication] = useState<Application | null>(null);

  // Fetch applications that can be dragged
  const { data: applicationsData } = useQuery({
    queryKey: ["applications", "interview-ready"],
    queryFn: async () => {
      const response = await apiClient.get<{ applications: Application[] }>(
        "/applications?status=applied&page_size=20"
      );
      if (response.error) throw new Error(response.error);
      return response.data;
    },
  });

  // Fetch calendar events
  const { data: calendarData } = useQuery({
    queryKey: ["interviews", "calendar", currentDate.getFullYear(), currentDate.getMonth() + 1],
    queryFn: async () => {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const response = await apiClient.get<any>(`/interviews/calendar?year=${year}&month=${month}`);
      if (response.error) throw new Error(response.error);
      return response.data;
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

  // Group events by date
  const eventsByDate = useMemo(() => {
    const grouped = new Map<string, InterviewEvent[]>();
    calendarEvents.forEach((event: InterviewEvent) => {
      const dateKey = event.start.toISOString().split("T")[0];
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)!.push(event);
    });
    return grouped;
  }, [calendarEvents]);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startOfWeek = new Date(firstDay);
    startOfWeek.setDate(firstDay.getDate() - firstDay.getDay());

    const days: Date[] = [];
    for (let i = 0; i < 42; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }

    return days;
  }, [currentDate]);

  // Handle drag start
  const handleDragStart = useCallback((application: Application) => {
    setDraggedApplication(application);
  }, []);

  // Handle drop
  const handleDrop = useCallback(
    (application: Application, date: Date) => {
      setDraggedApplication(null);
      if (onScheduleInterview) {
        onScheduleInterview(application, date);
      }
    },
    [onScheduleInterview]
  );

  // Navigate months
  const previousMonth = useCallback(() => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() - 1);
      return newDate;
    });
  }, []);

  const nextMonth = useCallback(() => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + 1);
      return newDate;
    });
  }, []);

  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  // Check date properties
  const isToday = useCallback((date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  }, []);

  const isSelected = useCallback((date: Date) => {
    return (
      selectedDate &&
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  }, [selectedDate]);

  const isCurrentMonth = useCallback((date: Date) => {
    return (
      date.getMonth() === currentDate.getMonth() &&
      date.getFullYear() === currentDate.getFullYear()
    );
  }, [currentDate]);

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  return (
    <div className={cn("space-y-6", className)}>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Applications sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Applications</h3>
              <span className="text-sm text-gray-600">
                {applicationsData?.applications.length || 0}
              </span>
            </div>
            <p className="text-xs text-gray-600 mb-4">
              Drag applications to calendar dates to schedule interviews
            </p>

            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {applicationsData?.applications.map((application) => (
                <DraggableApplication
                  key={application.id}
                  application={application}
                  onDragStart={handleDragStart}
                />
              ))}

              {(!applicationsData?.applications.length ||
                applicationsData.applications.length === 0) && (
                <div className="text-center py-8 text-gray-500">
                  <Briefcase className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No applications available</p>
                  <p className="text-xs">Apply to jobs first</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Calendar */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            {/* Calendar Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Calendar className="h-5 w-5 text-gray-600" />
                  <h2 className="text-xl font-semibold text-gray-900">
                    {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={goToToday}>
                    Today
                  </Button>
                  <Button variant="ghost" size="sm" onClick={previousMonth}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={nextMonth}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="p-4">
              {/* Week day headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {weekDays.map((day) => (
                  <div
                    key={day}
                    className="text-center text-sm font-medium text-gray-600 py-2"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar days */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((date, index) => {
                  const dateKey = date.toISOString().split("T")[0];
                  const dayEvents = eventsByDate.get(dateKey) || [];

                  return (
                    <CalendarDay
                      key={index}
                      date={date}
                      events={dayEvents}
                      isCurrentMonth={isCurrentMonth(date)}
                      isToday={isToday(date)}
                      isSelected={isSelected(date) || false}
                      onDateClick={(date) => setSelectedDate(date)}
                      onEventClick={(event) => onEventClick?.(event)}
                      onDrop={handleDrop}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
