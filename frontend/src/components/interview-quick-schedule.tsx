"use client";

import { useState, useCallback, memo } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Calendar,
  Clock,
  Plus,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Video,
  MapPin,
  Phone,
  Star,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { InterviewScheduleModal } from "@/components/interview-schedule-modal";
import { apiClient } from "@/lib/api-client";
import { logger, LogCategory } from "@/lib/logger";

interface Application {
  id: string;
  job_title: string;
  company_name: string;
  status: string;
  match_score?: number;
  resume_title?: string;
}

interface Interview {
  id: string;
  title: string;
  interview_type: string;
  status: string;
  scheduled_date: string;
  duration_minutes: number;
  location_type: string;
  company_name?: string;
  job_title?: string;
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

const locationIcons = {
  remote: Video,
  in_person: MapPin,
  phone: Phone,
};

// Application Card Component
const ApplicationCard = memo(function ApplicationCard({
  application,
  onSchedule,
}: {
  application: Application;
  onSchedule: (application: Application) => void;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h4 className="text-base font-semibold text-gray-900 truncate">
            {application.job_title}
          </h4>
          <p className="text-sm text-gray-600 truncate">{application.company_name}</p>

          {application.match_score !== undefined && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                  style={{ width: `${application.match_score}%` }}
                />
              </div>
              <span className="text-sm font-medium text-gray-700">
                {application.match_score}%
              </span>
            </div>
          )}
        </div>

        <Button
          size="sm"
          onClick={() => onSchedule(application)}
          className="ml-4 flex-shrink-0"
        >
          <Plus className="h-4 w-4 mr-1" />
          Schedule
        </Button>
      </div>
    </div>
  );
});

// Quick Interview Card
const QuickInterviewCard = memo(function QuickInterviewCard({
  interview,
  onClick,
}: {
  interview: Interview;
  onClick: (interview: Interview) => void;
}) {
  const StatusIcon = statusIcons[interview.status as keyof typeof statusIcons];
  const LocationIcon = locationIcons[interview.location_type as keyof typeof locationIcons] || MapPin;
  const interviewDate = new Date(interview.scheduled_date);
  const isToday = interviewDate.toDateString() === new Date().toDateString();

  return (
    <div
      className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onClick(interview)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="text-base font-semibold text-gray-900 truncate">
              {interview.title}
            </h4>
            <span
              className={cn(
                "px-2 py-1 text-xs font-medium rounded-full border",
                statusColors[interview.status as keyof typeof statusColors]
              )}
            >
              {interview.status}
            </span>
          </div>

          <div className="flex items-center gap-3 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span className={isToday ? "font-medium text-blue-600" : ""}>
                {isToday ? (
                  <>Today at {interviewDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</>
                ) : (
                  <>
                    {interviewDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    {interviewDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </>
                )}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <LocationIcon className="h-4 w-4" />
              <span className="capitalize">{interview.location_type.replace('_', ' ')}</span>
            </div>
          </div>

          {(interview.company_name || interview.job_title) && (
            <div className="mt-2 text-sm text-gray-700">
              {interview.company_name && <span className="font-medium">{interview.company_name}</span>}
              {interview.company_name && interview.job_title && <span className="mx-1">•</span>}
              {interview.job_title && <span>{interview.job_title}</span>}
            </div>
          )}
        </div>

        <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0 ml-2" />
      </div>
    </div>
  );
});

export function InterviewQuickSchedule() {
  const router = useRouter();
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch applications ready for interviews
  const { data: applicationsData, isLoading: applicationsLoading } = useQuery({
    queryKey: ['applications', 'interview-ready', refreshKey],
    queryFn: async () => {
      const response = await apiClient.get<{ applications: Application[] }>('/applications?status=applied&page_size=10');
      if (response.error) throw new Error(response.error);
      return response.data;
    },
  });

  // Fetch upcoming interviews
  const { data: interviewsData, isLoading: interviewsLoading } = useQuery({
    queryKey: ['interviews', 'upcoming', refreshKey],
    queryFn: async () => {
      const response = await apiClient.get<{ interviews: Interview[] }>('/interviews?status=scheduled&status=confirmed&page_size=5');
      if (response.error) throw new Error(response.error);
      return response.data;
    },
  });

  // Handle schedule interview
  const handleScheduleClick = useCallback((application: Application) => {
    setSelectedApplication(application);
    setIsModalOpen(true);
  }, []);

  // Handle modal close
  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
    setSelectedApplication(null);
  }, []);

  // Handle success
  const handleSuccess = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  // Handle interview click
  const handleInterviewClick = useCallback((interview: Interview) => {
    router.push(`/interviews/${interview.id}`);
  }, [router]);

  return (
    <div className="space-y-6">
      {/* Quick Schedule Modal */}
      <InterviewScheduleModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        application={selectedApplication}
        onSuccess={handleSuccess}
      />

      {/* Applications Ready for Interview */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Ready for Interview</h3>
            <p className="text-sm text-gray-600">
              Applications with interview status
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push('/applications')}
          >
            View All
          </Button>
        </div>

        {applicationsLoading ? (
          <div className="text-center py-8 text-gray-500">
            <Clock className="h-8 w-8 mx-auto mb-2 animate-spin" />
            <p>Loading applications...</p>
          </div>
        ) : applicationsData?.applications && applicationsData.applications.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {applicationsData.applications.map((application) => (
              <ApplicationCard
                key={application.id}
                application={application}
                onSchedule={handleScheduleClick}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No applications ready for interview</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => router.push('/upload')}
            >
              Apply to Jobs
            </Button>
          </div>
        )}
      </div>

      {/* Upcoming Interviews */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Upcoming Interviews</h3>
            <p className="text-sm text-gray-600">
              Your scheduled and confirmed interviews
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push('/interviews')}
          >
            View Calendar
          </Button>
        </div>

        {interviewsLoading ? (
          <div className="text-center py-8 text-gray-500">
            <Clock className="h-8 w-8 mx-auto mb-2 animate-spin" />
            <p>Loading interviews...</p>
          </div>
        ) : interviewsData?.interviews && interviewsData.interviews.length > 0 ? (
          <div className="space-y-3">
            {interviewsData.interviews.map((interview) => (
              <QuickInterviewCard
                key={interview.id}
                interview={interview}
                onClick={handleInterviewClick}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No upcoming interviews</p>
            <p className="text-xs mt-1">Schedule your first interview above</p>
          </div>
        )}
      </div>
    </div>
  );
}
