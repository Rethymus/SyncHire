import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export function JDListSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-label="Loading job descriptions" aria-busy="true">
      {[...Array(5)].map((_, i) => (
        <Card key={i} className="p-6">
          <div className="flex items-start gap-4">
            {/* Company logo */}
            <Skeleton variant="circular" className="h-12 w-12 flex-shrink-0" />

            <div className="flex-1 min-w-0 space-y-3">
              {/* Job title */}
              <Skeleton className="h-5 w-2/3 max-w-md" />

              {/* Company name and location */}
              <div className="flex items-center gap-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>

              {/* Job description preview */}
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />

              {/* Skills tags */}
              <div className="flex items-center gap-2 flex-wrap">
                <Skeleton variant="rounded" className="h-6 w-16" />
                <Skeleton variant="rounded" className="h-6 w-20" />
                <Skeleton variant="rounded" className="h-6 w-18" />
                <Skeleton variant="rounded" className="h-6 w-14" />
              </div>
            </div>

            {/* Status badge and actions */}
            <div className="flex flex-col items-end gap-2">
              <Skeleton variant="rounded" className="h-6 w-16" />
              <div className="flex gap-2">
                <Skeleton variant="rounded" className="h-9 w-9" />
                <Skeleton variant="rounded" className="h-9 w-9" />
              </div>
            </div>
          </div>
        </Card>
      ))}

      <span className="sr-only">Loading job descriptions...</span>
    </div>
  );
}