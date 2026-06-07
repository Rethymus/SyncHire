"use client";

// import { Navigation } from "@/components/navigation";
import { ResumeEditor } from "@/components/resume-editor";
import { useAppStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function EditorPage() {
  const { currentResume, hasHydrated } = useAppStore();
  const router = useRouter();

  useEffect(() => {
    if (hasHydrated && !currentResume) {
      router.push("/dashboard");
    }
  }, [currentResume, hasHydrated, router]);

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
