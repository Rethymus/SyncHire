"use client";

import { Navigation } from "@/components/navigation";
import { ResumeEditor } from "@/components/resume-editor";
import { useAppStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function EditorPage() {
  const { currentResume } = useAppStore();
  const router = useRouter();

  useEffect(() => {
    if (!currentResume) {
      router.push("/dashboard");
    }
  }, [currentResume, router]);

  if (!currentResume) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="pt-16 h-[calc(100vh-64px)]">
        <ResumeEditor />
      </div>
    </div>
  );
}
