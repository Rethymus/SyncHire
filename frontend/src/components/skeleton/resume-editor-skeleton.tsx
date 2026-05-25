import { Skeleton } from "@/components/ui/skeleton";

export function ResumeEditorSkeleton() {
  return (
    <div
      className="flex flex-col h-full bg-white"
      role="status"
      aria-label="Loading resume editor"
      aria-busy="true"
    >
      {/* Toolbar skeleton */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton variant="rounded" className="h-9 w-8" />
          <Skeleton variant="rounded" className="h-9 w-8" />
        </div>

        <div className="flex items-center gap-2">
          <Skeleton variant="rounded" className="h-9 w-20" />
          <Skeleton variant="rounded" className="h-9 w-24" />
          <Skeleton variant="rounded" className="h-9 w-20" />
          <Skeleton variant="rounded" className="h-9 w-24" />
          <Skeleton variant="rounded" className="h-9 w-16" />
        </div>
      </div>

      {/* Editor area skeleton */}
      <div className="flex-1 flex">
        {/* Textarea skeleton */}
        <div className="flex-1 border-r border-gray-200 p-8 space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>

        {/* Preview skeleton */}
        <div className="flex-1 bg-gray-50 p-8 space-y-4">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <div className="space-y-2 ml-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>

      {/* Tips skeleton */}
      <div className="p-4 bg-blue-50 border-t border-blue-100">
        <div className="flex items-start gap-3">
          <Skeleton variant="circular" className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        </div>
      </div>

      <span className="sr-only">Loading resume editor...</span>
    </div>
  );
}