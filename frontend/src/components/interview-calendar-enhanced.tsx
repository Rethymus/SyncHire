"use client";

import { useState, useCallback, memo, useMemo } from "react";
import { Calendar, dateFnsLocalizer, Views, SlotInfo } from 'react-big-calendar';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, MapPin, Video, Building2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { logger, LogCategory } from "@/lib/logger";
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';

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
  allDay?: boolean;
  resource?: any;
}

interface InterviewCalendarProps {
  events: InterviewEvent[];
  onDateClick?: (date: Date) => void;
  onEventClick?: (event: InterviewEvent) => void;
  onEventDrop?: (event: InterviewEvent, newStart: Date, newEnd: Date) => void;
  onEventResize?: (event: InterviewEvent, newStart: Date, newEnd: Date) => void;
  onSlotClick?: (slotInfo: SlotInfo) => void;
  selectedDate?: Date;
  className?: string;
  defaultView?: 'month' | 'week' | 'day' | 'agenda';
}

const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const interviewTypeColors = {
  screening: { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af' },
  technical: { bg: '#f3e8ff', border: '#a855f7', text: '#6b21a8' },
  behavioral: { bg: '#dcfce7', border: '#22c55e', text: '#15803d' },
  panel: { bg: '#ffedd5', border: '#f97316', text: '#c2410c' },
  onsite: { bg: '#fee2e2', border: '#ef4444', text: '#b91c1c' },
  final: { bg: '#e0e7ff', border: '#6366f1', text: '#4338ca' },
};

const statusColors = {
  scheduled: { border: '#fbbf24', icon: '⏰' },
  confirmed: { border: '#22c55e', icon: '✓' },
  rescheduled: { border: '#3b82f6', icon: '🔄' },
  cancelled: { border: '#ef4444', icon: '✕' },
  completed: { border: '#6b7280', icon: '✓' },
};

// Custom Event Component
const EventComponent = memo(function EventComponent({ event }: { event: InterviewEvent }) {
  const typeColor = interviewTypeColors[event.interview_type as keyof typeof interviewTypeColors] || interviewTypeColors.screening;
  const statusColor = statusColors[event.status as keyof typeof statusColors] || statusColors.scheduled;

  return (
    <div
      className="rbc-event-content h-full flex flex-col justify-center px-2 py-1 rounded"
      style={{
        backgroundColor: typeColor.bg,
        borderLeft: `3px solid ${statusColor.border}`,
        color: typeColor.text,
      }}
    >
      <div className="font-medium text-xs truncate">{event.title}</div>
      <div className="flex items-center gap-1 text-xs opacity-80">
        <span>{statusColor.icon}</span>
        {event.company_name && (
          <span className="truncate">{event.company_name}</span>
        )}
      </div>
    </div>
  );
});

// Custom Toolbar Component
const Toolbar = memo(function Toolbar(props: any) {
  const { label, view, views, onNavigate, onView, date } = props;

  const navigate = useCallback((action: 'PREV' | 'NEXT' | 'TODAY') => {
    const newDate = new Date(date);
    if (action === 'PREV') {
      if (view === 'month') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else if (view === 'week') {
        newDate.setDate(newDate.getDate() - 7);
      } else {
        newDate.setDate(newDate.getDate() - 1);
      }
    } else if (action === 'NEXT') {
      if (view === 'month') {
        newDate.setMonth(newDate.getMonth() + 1);
      } else if (view === 'week') {
        newDate.setDate(newDate.getDate() + 7);
      } else {
        newDate.setDate(newDate.getDate() + 1);
      }
    } else if (action === 'TODAY') {
      newDate.setTime(new Date().getTime());
    }
    onNavigate(newDate, view, action);
  }, [date, view, onNavigate]);

  return (
    <div className="rbc-toolbar mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <CalendarIcon className="h-5 w-5 text-gray-600" />
          <span className="text-lg font-semibold text-gray-900">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('TODAY')}
          >
            Today
          </Button>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('PREV')}
              aria-label="Previous"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('NEXT')}
              aria-label="Next"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex bg-white rounded-lg border border-gray-200 p-1">
          {Object.keys(views).map((v: string) => (
            <button
              key={v}
              onClick={() => onView(v)}
              className={cn(
                "px-3 py-1 rounded text-sm font-medium transition-colors",
                view === v
                  ? "bg-blue-500 text-white"
                  : "text-gray-700 hover:bg-gray-100"
              )}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
});

const InterviewCalendarEnhanced = memo(function InterviewCalendarEnhanced({
  events,
  onDateClick,
  onEventClick,
  onEventDrop,
  onEventResize,
  onSlotClick,
  selectedDate,
  className,
  defaultView = 'month',
}: InterviewCalendarProps) {
  const [view, setView] = useState(defaultView);
  const [currentDate, setCurrentDate] = useState(new Date());

  // Handle navigate
  const handleNavigate = useCallback((newDate: Date, view: string, action: string) => {
    setCurrentDate(new Date(newDate));
  }, []);

  // Handle view change
  const handleViewChange = useCallback((newView: string) => {
    setView(newView as 'month' | 'week' | 'day' | 'agenda');
  }, []);

  // Handle event click
  const handleEventClick = useCallback((event: InterviewEvent) => {
    logger.info(LogCategory.UI, 'Calendar event clicked', { eventId: event.id });
    if (onEventClick) {
      onEventClick(event);
    }
  }, [onEventClick]);

  // Handle slot click (for creating new events)
  const handleSlotClick = useCallback((slotInfo: SlotInfo) => {
    logger.info(LogCategory.UI, 'Calendar slot clicked', {
      start: slotInfo.start,
      end: slotInfo.end,
      action: slotInfo.action
    });
    if (onSlotClick) {
      onSlotClick(slotInfo);
    } else if (onDateClick) {
      onDateClick(slotInfo.start);
    }
  }, [onDateClick, onSlotClick]);

  // Handle event drop
  const handleEventDrop = useCallback(({ event, start, end }: { event: InterviewEvent; start: Date; end: Date }) => {
    logger.info(LogCategory.UI, 'Event dropped', {
      eventId: event.id,
      newStart: start,
      newEnd: end
    });
    if (onEventDrop) {
      onEventDrop(event, start, end);
    }
  }, [onEventDrop]);

  // Handle event resize
  const handleEventResize = useCallback(({ event, start, end }: { event: InterviewEvent; start: Date; end: Date }) => {
    logger.info(LogCategory.UI, 'Event resized', {
      eventId: event.id,
      newStart: start,
      newEnd: end
    });
    if (onEventResize) {
      onEventResize(event, start, end);
    }
  }, [onEventResize]);

  // Memoize calendar events with proper structure
  const calendarEvents = useMemo(() => {
    return events.map(event => ({
      ...event,
      start: new Date(event.start),
      end: new Date(event.end),
    }));
  }, [events]);

  return (
    <div className={cn("bg-white rounded-xl shadow-sm border border-gray-200 p-4", className)}>
      <Calendar
        localizer={localizer}
        events={calendarEvents}
        startAccessor="start"
        endAccessor="end"
        titleAccessor="title"
        allDayAccessor="allDay"
        resourceAccessor="resource"
        view={view}
        views={['month', 'week', 'day', 'agenda']}
        date={currentDate}
        onNavigate={handleNavigate}
        onView={handleViewChange}
        onSelectEvent={handleEventClick}
        onSelectSlot={handleSlotClick}
        selectable
        components={{
          event: EventComponent,
          toolbar: Toolbar,
        }}
        formats={{
          weekdayFormat: (date: Date) => format(date, 'EEE'),
          dayFormat: (date: Date) => format(date, 'd'),
          monthHeaderFormat: (date: Date) => format(date, 'MMMM yyyy'),
          agendaHeaderFormat: ({ start, end }: { start: Date; end: Date }) =>
            `${format(start, 'MMM dd')} - ${format(end, 'MMM dd, yyyy')}`,
          agendaDateFormat: (date: Date) => format(date, 'EEE, MMM dd'),
          timeGutterFormat: (date: Date) => format(date, 'ha'),
        }}
        className="interview-calendar"
        style={{ height: 600 }}
      />

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-sm text-gray-600">Interview Types:</span>
          {Object.entries(interviewTypeColors).map(([type, colors]) => (
            <div key={type} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full border"
                style={{
                  backgroundColor: colors.bg,
                  borderColor: colors.border
                }}
              />
              <span className="text-xs text-gray-700 capitalize">{type}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

export default InterviewCalendarEnhanced;