"use client";
import { ResumeEditor } from "@/components/resume-editor";
import { useAppStore } from "@/lib/store";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

function EditorPageContent() {
  const searchParams = useSearchParams();
  const {
    applications,
    currentResume,
    hasHydrated,
    jobDescriptions,
    resumes,
    setCurrentJD,
    setCurrentResume,
  } = useAppStore();
  const router = useRouter();
  const applicationId = searchParams.get("applicationId");
  const resumeId = searchParams.get("resumeId");

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    if (applicationId) {
      const application = applications.find((item) => item.id === applicationId);
      const resume = application
        ? resumes.find((item) => item.id === application.resumeId)
        : undefined;
      const jd = application
        ? jobDescriptions.find((item) => item.id === application.jobId)
        : undefined;

      if (resume) {
        setCurrentResume(resume);
      }

      if (jd) {
        setCurrentJD(jd);
      }

      if (resume) {
        return;
      }
    }

    if (resumeId) {
      const resume = resumes.find((item) => item.id === resumeId);

      if (resume) {
        setCurrentResume(resume);
        return;
      }
    }

    if (!currentResume) {
      router.push("/dashboard");
    }
  }, [
    applicationId,
    applications,
    currentResume,
    hasHydrated,
    jobDescriptions,
    resumeId,
    resumes,
    router,
    setCurrentJD,
    setCurrentResume,
  ]);

  if (!hasHydrated || !currentResume) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      
      <div className="pt-16 h-[calc(100vh-64px)]">
        <ResumeEditor />
      </div>
    </div>
  );
}

function EditorFallback() {
  return (
    <div className="min-h-screen bg-gray-50" />
  );
}

export default function EditorPage() {
  return (
    <Suspense fallback={<EditorFallback />}>
      <EditorPageContent />
    </Suspense>
  );
}
