import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export function DashboardStatsSkeleton() {
  return (
    <div
      className="grid grid-cols-2 md:grid-cols-4 gap-4"
      role="status"
      aria-label="Loading dashboard statistics"
      aria-busy="true"
    >
      {[...Array(4)].map((_, i) => (
        <Card key={i} className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2 flex-1">
              {/* Stat label */}
              <Skeleton className="h-4 w-20" />
              {/* Stat value */}
              <Skeleton className="h-8 w-16" />
            </div>

            {/* Icon */}
            <Skeleton variant="rounded" className="h-12 w-12 flex-shrink-0" />
          </div>
        </Card>
      ))}

      <span className="sr-only">Loading dashboard statistics...</span>
    </div>
  );
}