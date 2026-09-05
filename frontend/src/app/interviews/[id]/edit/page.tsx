import { Suspense } from "react";
import { EditInterviewContent } from "./edit-content";

export function generateStaticParams() {
  return [{ id: "placeholder" }];
}


export default function EditInterviewPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-muted/40 flex items-center justify-center">Loading...</div>}>
      <EditInterviewContent />
    </Suspense>
  );
}
