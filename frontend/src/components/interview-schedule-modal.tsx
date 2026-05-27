"use client";

import { useState, useCallback, memo } from "react";
import { X, Calendar, Clock, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import InterviewSchedulingForm from "@/components/interview-scheduling-form";
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

interface InterviewScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  application: Application | null;
  selectedDate?: Date;
  onSuccess?: () => void;
}

export const InterviewScheduleModal = memo(function InterviewScheduleModal({
  isOpen,
  onClose,
  application,
  selectedDate,
  onSuccess,
}: InterviewScheduleModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = useCallback(async (data: any) => {
    if (!application) return;

    try {
      setIsSubmitting(true);

      const response = await apiClient.post("/interviews", {
        ...data,
        application_id: application.id,
      });

      if (response.error) throw new Error(response.error);

      logger.info(LogCategory.UI, "Interview scheduled successfully", {
        applicationId: application.id,
        interviewId: (response.data as { id?: string })?.id || 'unknown',
      });

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
        onSuccess?.();
      }, 1500);
    } catch (error) {
      logger.error(LogCategory.UI, "Failed to schedule interview", error as Error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, [application, onClose, onSuccess]);

  if (!isOpen) return null;

  // Pre-populate form data
  const initialData = selectedDate
    ? {
        title: `${application?.company_name} - ${application?.job_title}`,
        scheduled_date: selectedDate.toISOString().slice(0, 16),
      }
    : {
        title: `${application?.company_name} - ${application?.job_title}`,
      };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Schedule Interview</h2>
            {application && (
              <p className="text-sm text-gray-600 mt-1">
                {application.company_name} - {application.job_title}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting || success}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mx-6 mt-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
            <div>
              <p className="font-medium text-green-900">Interview scheduled successfully!</p>
              <p className="text-sm text-green-700">Your calendar has been updated.</p>
            </div>
          </div>
        )}

        {/* Form */}
        <div className="p-6">
          <InterviewSchedulingForm
            applicationId={application?.id}
            initialData={initialData}
            onSubmit={handleSubmit}
            onCancel={onClose}
            submitLabel={isSubmitting ? "Scheduling..." : "Schedule Interview"}
          />
        </div>
      </div>
    </div>
  );
});
