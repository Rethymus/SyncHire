import { Suspense } from "react";
import ApplicationDetailClient from "./application-detail-client";

export const dynamicParams = false;

export function generateStaticParams() {
  return [{ id: "app-seed-1" }];
}

export default function ApplicationDetailPage() {
  return (
    <Suspense fallback={null}>
      <ApplicationDetailClient />
    </Suspense>
  );
}
