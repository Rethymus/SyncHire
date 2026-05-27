"use client";

import { useState, useCallback, memo, useMemo } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, MapPin, Video, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { logger, LogCategory } from "@/lib/logger";

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

interface InterviewCalendarProps {
  events: InterviewEvent[];
  onDateClick?: (date: Date) => void;
  onEventClick?: (event: InterviewEvent) => void;
  selectedDate?: Date;
  className?: string;
}

const interviewTypeColors = {
  screening: "bg-blue-100 text-blue-800 border-blue-200",
  technical: "bg-purple-100 text-purple-800 border-purple-200",
  behavioral: "bg-green-100 text-green-800 border-green-200",
  panel: "bg-orange-100 text-orange-800 border-orange-200",
  onsite: "bg-red-100 text-red-800 border-red-200",
  final: "bg-indigo-100 text-indigo-800 border-indigo-200",
};

const statusColors = {
  scheduled: "border-l-4 border-l-yellow-400",
  confirmed: "border-l-4 border-l-green-400",
  rescheduled: "border-l-4 border-l-blue-400",
};

const locationIcons = {
  remote: Video,
  in_person: MapPin,
  phone: Clock,
  video: Video,
};

// Week day names
const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Month names
const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const InterviewCalendar = memo(function InterviewCalendar({
  events,
  onDateClick,
  onEventClick,
  selectedDate,
  className,
}: InterviewCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Navigate to previous month
  const previousMonth = useCallback(() => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() - 1);
      return newDate;
    });
  }, []);

  // Navigate to next month
  const nextMonth = useCallback(() => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + 1);
      return newDate;
    });
  }, []);

  // Navigate to today
  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  // Handle date click
  const handleDateClick = useCallback((date: Date) => {
    if (onDateClick) {
      onDateClick(date);
    }
  }, [onDateClick]);

  // Handle event click
  const handleEventClick = useCallback((event: InterviewEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEventClick) {
      onEventClick(event);
    }
  }, [onEventClick]);

  // Memoize calendar days
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // First day of the month
    const firstDay = new Date(year, month, 1);
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0);
    // Start of the week (Sunday)
    const startOfWeek = new Date(firstDay);
    startOfWeek.setDate(firstDay.getDate() - firstDay.getDay());

    // Generate 6 weeks of days
    const days: Date[] = [];
    for (let i = 0; i < 42; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }

    return days;
  }, [currentDate]);

  // Memoize events by date
  const eventsByDate = useMemo(() => {
    const grouped = new Map<string, InterviewEvent[]>();

    events.forEach(event => {
      const dateKey = event.start.toISOString().split('T')[0];
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)!.push(event);
    });

    return grouped;
  }, [events]);

  // Check if date is today
  const isToday = useCallback((date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  }, []);

  // Check if date is selected
  const isSelected = useCallback((date: Date) => {
    return selectedDate &&
           date.getDate() === selectedDate.getDate() &&
           date.getMonth() === selectedDate.getMonth() &&
           date.getFullYear() === selectedDate.getFullYear();
  }, [selectedDate]);

  // Check if date is in current month
  const isCurrentMonth = useCallback((date: Date) => {
    return date.getMonth() === currentDate.getMonth() &&
           date.getFullYear() === currentDate.getFullYear();
  }, [currentDate]);

  return (
    <div className={cn("bg-white rounded-xl shadow-sm border border-gray-200", className)}>
      {/* Calendar Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <CalendarIcon className="h-5 w-5 text-gray-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={goToToday}
            >
              Today
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={previousMonth}
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={nextMonth}
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-4">
        {/* Week day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map(day => (
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
            const dateKey = date.toISOString().split('T')[0];
            const dayEvents = eventsByDate.get(dateKey) || [];
            const today = isToday(date);
            const selected = isSelected(date);
            const currentMonth = isCurrentMonth(date);

            return (
              <div
                key={index}
                onClick={() => handleDateClick(date)}
                className={cn(
                  "min-h-[80px] p-1 border border-gray-100 rounded-lg cursor-pointer transition-colors",
                  "hover:bg-gray-50",
                  today && "bg-blue-50 border-blue-200",
                  selected && "ring-2 ring-blue-500 ring-offset-1",
                  !currentMonth && "bg-gray-50 opacity-60"
                )}
              >
                <div className={cn(
                  "text-sm font-medium mb-1",
                  today && "text-blue-600",
                  !currentMonth && "text-gray-400"
                )}>
                  {date.getDate()}
                </div>

                {/* Events for this day */}
                <div className="space-y-1">
                  {dayEvents.slice(0, 2).map(event => {
                    const LocationIcon = locationIcons[event.location_type as keyof typeof locationIcons] || MapPin;
                    const timeStr = event.start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

                    return (
                      <div
                        key={event.id}
                        onClick={(e) => handleEventClick(event, e)}
                        className={cn(
                          "text-xs p-1 rounded border cursor-pointer transition-colors hover:opacity-80",
                          interviewTypeColors[event.interview_type as keyof typeof interviewTypeColors],
                          statusColors[event.status as keyof typeof statusColors]
                        )}
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

                  {dayEvents.length > 2 && (
                    <div className="text-xs text-gray-600 text-center">
                      +{dayEvents.length - 2} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="px-6 py-4 border-t border-gray-200">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-sm text-gray-600">Interview Types:</span>
          {Object.entries(interviewTypeColors).map(([type, classes]) => (
            <div key={type} className="flex items-center gap-2">
              <div className={cn("w-3 h-3 rounded-full border", classes)} />
              <span className="text-xs text-gray-700 capitalize">{type}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

export default InterviewCalendar;