"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { ResumeBuilder } from "@/components/resume-builder/resume-builder";

function ResumeBuilderPageContent() {
  const searchParams = useSearchParams();
  const resumeId = searchParams.get("resumeId");
  const {
    resumes,
    currentResume,
    hasHydrated,
    setCurrentResume,
  } = useAppStore();

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }
    if (resumeId) {
      const target = resumes.find((r) => r.id === resumeId);
      if (target && target.id !== currentResume?.id) {
        setCurrentResume(target);
      }
    }
  }, [hasHydrated, resumeId, resumes, currentResume, setCurrentResume]);

  if (!hasHydrated) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-400">
        加载中…
      </div>
    );
  }

  const initial =
    (resumeId && resumes.find((r) => r.id === resumeId)) || currentResume;

  return <ResumeBuilder initialResume={initial} />;
}

export default function ResumeBuilderPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen text-gray-400">
          加载中…
        </div>
      }
    >
      <ResumeBuilderPageContent />
    </Suspense>
  );
}
