import { Skeleton } from "@/components/ui/skeleton";

export function ResumePreviewSkeleton() {
  return (
    <div
      className="flex flex-col h-full bg-gray-100"
      role="status"
      aria-label="Loading resume preview"
      aria-busy="true"
    >
      {/* Toolbar skeleton */}
      <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
        <div className="flex items-center gap-4">
          <Skeleton className="h-6 w-24" />

          {/* Template selector skeleton */}
          <div className="flex items-center gap-2">
            <Skeleton variant="rounded" className="h-9 w-32" />
            <Skeleton variant="rounded" className="h-9 w-24" />
          </div>

          {/* Zoom controls skeleton */}
          <div className="flex items-center gap-2">
            <Skeleton variant="rounded" className="h-9 w-8" />
            <Skeleton className="h-4 w-12" />
            <Skeleton variant="rounded" className="h-9 w-8" />
          </div>
        </div>

        <Skeleton variant="rounded" className="h-9 w-24" />
      </div>

      {/* Preview area skeleton */}
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-4xl mx-auto bg-white shadow-lg p-8 space-y-6">
          {/* Resume header skeleton */}
          <div className="space-y-3">
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
            <div className="flex gap-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>

          {/* Resume sections skeleton */}
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-3 pt-4 border-t border-gray-100">
              <Skeleton className="h-6 w-1/4" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/5" />
              </div>
              <div className="space-y-2 ml-4">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Template info skeleton */}
      <div className="p-4 bg-white border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
            <div className="flex gap-2">
              <Skeleton variant="rounded" className="h-5 w-16" />
              <Skeleton variant="rounded" className="h-5 w-12" />
              <Skeleton variant="rounded" className="h-5 w-14" />
            </div>
          </div>

          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} variant="rounded" className="h-8 w-16" />
            ))}
            <Skeleton variant="rounded" className="h-8 w-12" />
          </div>
        </div>
      </div>

      <span className="sr-only">Loading resume preview...</span>
    </div>
  );
}