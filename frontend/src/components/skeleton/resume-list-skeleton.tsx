import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export function ResumeListSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-label="Loading resumes" aria-busy="true">
      {[...Array(5)].map((_, i) => (
        <Card key={i} className="p-6">
          <div className="flex items-start gap-4">
            {/* File icon */}
            <Skeleton variant="circular" className="h-12 w-12 flex-shrink-0" />

            <div className="flex-1 min-w-0 space-y-3">
              {/* Resume name */}
              <Skeleton className="h-5 w-3/4 max-w-sm" />

              {/* Resume metadata */}
              <div className="flex items-center gap-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>

              {/* Resume preview */}
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <Skeleton variant="rounded" className="h-9 w-20" />
              <Skeleton variant="rounded" className="h-9 w-9" />
              <Skeleton variant="rounded" className="h-9 w-9" />
            </div>
          </div>
        </Card>
      ))}

      <span className="sr-only">Loading resume list...</span>
    </div>
  );
}