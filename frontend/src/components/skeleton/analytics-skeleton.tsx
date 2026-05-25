import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export function AnalyticsSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading analytics" aria-busy="true">
      {/* Header skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Stats cards skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-6">
            <div className="space-y-3">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-16" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-12" />
                <Skeleton variant="rounded" className="h-4 w-12" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Chart skeleton */}
      <Card className="p-6">
        <div className="space-y-4">
          <Skeleton className="h-6 w-32" />
          <div className="h-64 flex items-end gap-2">
            {Array.from({ length: 12 }, (_, i) => {
              const heights = [40, 60, 45, 70, 55, 80, 65, 50, 75, 60, 45, 55];
              return <Skeleton key={i} className="flex-1" style={{ height: `${heights[i]}%` }} />;
            })}
          </div>
          <div className="flex justify-between">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-12" />
            ))}
          </div>
        </div>
      </Card>

      {/* Activity timeline skeleton */}
      <Card className="p-6">
        <div className="space-y-4">
          <Skeleton className="h-6 w-32" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-start gap-4">
              <Skeleton variant="circular" className="h-10 w-10 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-64" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <span className="sr-only">Loading analytics data...</span>
    </div>
  );
}