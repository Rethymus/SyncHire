"use client";


import { useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
// import { Navigation } from "@/components/navigation";
import InterviewSchedulingForm from "@/components/interview-scheduling-form";
import { apiClient } from "@/lib/api-client";
import { logger, LogCategory } from "@/lib/logger";

interface Application {
  id: string;
  job_title?: string;
  company_name?: string;
}

function NewInterviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const applicationId = searchParams.get('applicationId');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch application details if provided
  const { data: application } = useQuery({
    queryKey: ['applications', applicationId],
    queryFn: async () => {
      if (!applicationId) return null;
      const response = await apiClient.get<Application>(`/applications/${applicationId}`);
      if (response.error) throw new Error(response.error);
      return response.data;
    },
    enabled: !!applicationId,
  });

  // Generate default title from application
  const defaultTitle = application
    ? `${application.company_name || 'Company'} - ${application.job_title || 'Position'} Interview`
    : '';

  // Handle form submission
  const handleSubmit = useCallback(async (data: any) => {
    try {
      setIsSubmitting(true);
      setError(null);

      // Prepare data for API
      const submitData = {
        ...data,
        application_id: applicationId || data.application_id,
        scheduled_date: new Date(data.scheduled_date).toISOString(),
      };

      const response = await apiClient.post('/interviews', submitData);

      if (response.error) {
        setError(response.error);
        logger.error(LogCategory.UI, 'Failed to create interview', new Error(response.error));
        return;
      }

      logger.info(LogCategory.UI, 'Interview created successfully', { interviewId: (response.data as any)?.id });

      // Redirect to interview details or list
      const responseData = response.data as any;
      if (responseData?.id) {
        router.push(`/interviews/${responseData.id}`);
      } else {
        router.push('/interviews');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create interview';
      setError(errorMsg);
      logger.error(LogCategory.UI, 'Failed to create interview', err as Error);
    } finally {
      setIsSubmitting(false);
    }
  }, [applicationId, router]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    router.back();
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50">
      

      <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              onClick={handleCancel}
              className="p-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Schedule Interview</h1>
              <p className="mt-2 text-lg text-gray-700">
                Add a new interview to your calendar
              </p>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <div className="text-red-600">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-900">Error</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-600 hover:text-red-700"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}

        {/* Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <InterviewSchedulingForm
            applicationId={applicationId || undefined}
            initialData={{
              title: defaultTitle,
            }}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            submitLabel={isSubmitting ? "Scheduling..." : "Schedule Interview"}
          />
        </div>

        {/* Info Card */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">Tips for Scheduling Interviews</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Schedule interviews at least 24 hours in advance to allow proper preparation</li>
            <li>• Include interviewer information to help you prepare for who you&apos;ll be meeting</li>
            <li>• Set reminders to ensure you don&apos;t miss any scheduled interviews</li>
            <li>• Add preparation notes with key topics to review and questions to ask</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function NewInterviewPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>}>
      <NewInterviewContent />
    </Suspense>
  );
}