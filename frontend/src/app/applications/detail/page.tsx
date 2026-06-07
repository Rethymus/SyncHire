import { Suspense } from "react";
import ApplicationDetailClient from "../[id]/application-detail-client";

function ApplicationDetailFallback() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-600">加载申请详情...</p>
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
