"use client";


import { useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import InterviewSchedulingForm from "@/components/interview-scheduling-form";
import { apiClient } from "@/lib/api-client";
import { logger, LogCategory } from "@/lib/logger";
import { useLiteCopy } from "@/lib/lite-i18n";

interface Application {
  id: string;
  job_title?: string;
  company_name?: string;
}

const NEW_INTERVIEW_COPY = {
  "en-US": {
    title: "Schedule Interview",
    subtitle: "Add a new interview to your calendar",
    companyFallback: "Company",
    positionFallback: "Position",
    titleSuffix: "Interview",
    createError: "Failed to create interview",
    errorTitle: "Error",
    scheduling: "Scheduling...",
    submit: "Schedule Interview",
    tipsTitle: "Tips for Scheduling Interviews",
    tips: [
      "Schedule interviews at least 24 hours in advance to allow proper preparation",
      "Include interviewer information to help you prepare for who you'll be meeting",
      "Set reminders to ensure you don't miss any scheduled interviews",
      "Add preparation notes with key topics to review and questions to ask",
    ],
  },
  "zh-CN": {
    title: "预约面试",
    subtitle: "把新的面试加入日程，并沉淀准备事项",
    companyFallback: "公司",
    positionFallback: "岗位",
    titleSuffix: "面试",
    createError: "创建面试失败",
    errorTitle: "错误",
    scheduling: "预约中...",
    submit: "预约面试",
    tipsTitle: "面试预约建议",
    tips: [
      "尽量提前 24 小时以上安排面试，给自己留出充分准备时间",
      "记录面试官信息，方便提前了解对方职责和关注点",
      "开启提醒，避免错过任何已安排的面试",
      "补充准备备注，把需要复习的主题和想问的问题放在一起",
    ],
  },
} as const;

function NewInterviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale } = useLiteCopy();
  const copy = NEW_INTERVIEW_COPY[locale];
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
    ? `${application.company_name || copy.companyFallback} - ${application.job_title || copy.positionFallback} ${copy.titleSuffix}`
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
      const errorMsg = err instanceof Error ? err.message : copy.createError;
      setError(errorMsg);
      logger.error(LogCategory.UI, 'Failed to create interview', err as Error);
    } finally {
      setIsSubmitting(false);
    }
  }, [applicationId, copy.createError, router]);

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
              <h1 className="text-3xl font-bold text-gray-900">{copy.title}</h1>
              <p className="mt-2 text-lg text-gray-700">
                {copy.subtitle}
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
              <h3 className="text-sm font-medium text-red-900">{copy.errorTitle}</h3>
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
            submitLabel={isSubmitting ? copy.scheduling : copy.submit}
          />
        </div>

        {/* Info Card */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">{copy.tipsTitle}</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            {copy.tips.map((tip) => (
              <li key={tip}>- {tip}</li>
            ))}
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
