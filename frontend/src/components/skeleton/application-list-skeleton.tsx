import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export function ApplicationListSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-label="Loading applications" aria-busy="true">
      {[...Array(5)].map((_, i) => (
        <Card key={i} className="p-6">
          <div className="flex items-start gap-4">
            {/* Company logo */}
            <Skeleton variant="circular" className="h-12 w-12 flex-shrink-0" />

            <div className="flex-1 min-w-0 space-y-3">
              {/* Position title */}
              <Skeleton className="h-5 w-1/2 max-w-md" />

              {/* Company and date */}
              <div className="flex items-center gap-4">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-24" />
              </div>

              {/* Match score */}
              <div className="flex items-center gap-2">
                <Skeleton className="h-2 w-32" />
                <Skeleton className="h-4 w-12" />
              </div>
            </div>

            {/* Status badge and actions */}
            <div className="flex flex-col items-end gap-2">
              <Skeleton variant="rounded" className="h-6 w-20" />
              <Skeleton variant="rounded" className="h-9 w-24" />
            </div>
          </div>
        </Card>
      ))}

      <span className="sr-only">Loading applications...</span>
    </div>
  );
}