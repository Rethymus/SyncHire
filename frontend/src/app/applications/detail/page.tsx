import { Suspense } from "react";
import ApplicationDetailClient from "../[id]/application-detail-client";

function ApplicationDetailFallback() {
  return (
    <div className="min-h-screen bg-muted/40 flex items-center justify-center">
      <p className="text-muted-foreground">加载申请详情...</p>
    </div>
  );
}

export default function ApplicationDetailQueryPage() {
  return (
    <Suspense fallback={<ApplicationDetailFallback />}>
      <ApplicationDetailClient />
    </Suspense>
  );
}
