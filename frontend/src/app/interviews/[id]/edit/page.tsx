"use client";


import { useState, useCallback, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import InterviewSchedulingForm from "@/components/interview-scheduling-form";
import { useLiteCopy } from "@/lib/lite-i18n";
import {
  readLocalInterviews,
  saveLocalInterview,
  type LocalInterview,
} from "@/lib/interviews-local";
import { logger, LogCategory } from "@/lib/logger";

const EDIT_INTERVIEW_COPY = {
  "en-US": {
    title: "Edit Interview",
    subtitle: "Update the details of a scheduled interview",
    notFound: "Interview not found",
    back: "Back",
  },
  "zh-CN": {
    title: "编辑面试",
    subtitle: "更新已预约面试的详细信息",
    notFound: "未找到该面试",
    back: "返回",
  },
} as const;

/**
 * Map a stored interview_type to the form's zod enum. External tools and
 * older versions may have written values outside the form's vocabulary
 * (e.g. "video"); fall back to "screening" — the least-assuming stage.
 */
function toFormInterviewType(raw: string): string {
  const valid = ["screening", "technical", "behavioral", "panel", "onsite", "final"];
  return valid.includes(raw) ? raw : "screening";
}

function EditInterviewContent() {
  const router = useRouter();
  const { locale } = useLiteCopy();
  const copy = EDIT_INTERVIEW_COPY[locale];
  const params = useParams();
  const interviewId = Array.isArray(params.id) ? params.id[0] : params.id ?? "";
  const [existing] = useState<LocalInterview | undefined>(
    () => readLocalInterviews().find((i) => i.id === interviewId),
  );

  const handleSubmit = useCallback(
    async (data: any) => {
      if (!existing) return;
      saveLocalInterview({
        ...existing,
        ...data,
        scheduled_date: new Date(data.scheduled_date).toISOString(),
        updated_at: new Date().toISOString(),
      });
      logger.info(LogCategory.UI, "Interview updated locally", { interviewId: interviewId });
      router.push("/interviews");
    },
    [existing, interviewId, router],
  );

  const handleCancel = useCallback(() => {
    router.push("/interviews");
  }, [router]);

  return (
    <div className="min-h-screen bg-muted/40">
      <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="ghost" onClick={handleCancel} className="p-2">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">{copy.title}</h1>
              <p className="mt-2 text-lg text-muted-foreground">{copy.subtitle}</p>
            </div>
          </div>
        </div>

        {existing ? (
          <div className="bg-card rounded-xl shadow-sm border border-border p-6">
            <InterviewSchedulingForm
              applicationId={existing.application_id}
              initialData={{
                title: existing.title,
                description: existing.description || "",
                interview_type: toFormInterviewType(existing.interview_type) as any,
                // datetime-local inputs require minute precision, not ISO with Z.
                scheduled_date: existing.scheduled_date.slice(0, 16),
                duration_minutes: existing.duration_minutes,
                timezone: existing.timezone,
                location_type: existing.location_type as any,
                location_url: existing.location_url || "",
                location_address: existing.location_address || "",
                meeting_platform: existing.meeting_platform || "",
                meeting_id: existing.meeting_id || "",
                meeting_password: existing.meeting_password || "",
                preparation_notes: existing.preparation_notes || "",
                reminder_enabled: existing.reminder_enabled,
                interviewers: existing.interviewers,
              }}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
            />
          </div>
        ) : (
          <div className="bg-card rounded-xl shadow-sm border border-border p-12 text-center text-muted-foreground">
            {copy.notFound}
          </div>
        )}
      </div>
    </div>
  );
}

export default function EditInterviewPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-muted/40 flex items-center justify-center">Loading...</div>}>
      <EditInterviewContent />
    </Suspense>
  );
}
