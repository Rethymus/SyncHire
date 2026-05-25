import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export function SearchResultsSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-label="Loading search results" aria-busy="true">
      {/* Search bar skeleton */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <Skeleton variant="rounded" className="h-10 flex-1" />
          <Skeleton variant="rounded" className="h-10 w-10" />
        </div>
      </Card>

      {/* Filters skeleton */}
      <div className="flex items-center gap-2 flex-wrap">
        <Skeleton variant="rounded" className="h-8 w-24" />
        <Skeleton variant="rounded" className="h-8 w-28" />
        <Skeleton variant="rounded" className="h-8 w-20" />
        <Skeleton variant="rounded" className="h-8 w-16" />
      </div>

      {/* Results count skeleton */}
      <Skeleton className="h-5 w-48" />

      {/* Result cards skeleton */}
      {[...Array(6)].map((_, i) => (
        <Card key={i} className="p-6">
          <div className="flex items-start gap-4">
            {/* Icon/Thumbnail */}
            <Skeleton variant="circular" className="h-14 w-14 flex-shrink-0" />

            <div className="flex-1 min-w-0 space-y-3">
              {/* Title */}
              <Skeleton className="h-5 w-3/4 max-w-md" />

              {/* Subtitle/Metadata */}
              <div className="flex items-center gap-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
              </div>

              {/* Description */}
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />

              {/* Tags/Labels */}
              <div className="flex items-center gap-2 flex-wrap">
                <Skeleton variant="rounded" className="h-6 w-16" />
                <Skeleton variant="rounded" className="h-6 w-20" />
                <Skeleton variant="rounded" className="h-6 w-14" />
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-2">
              <Skeleton variant="rounded" className="h-9 w-20" />
              <Skeleton variant="rounded" className="h-9 w-9" />
            </div>
          </div>
        </Card>
      ))}

      {/* Pagination skeleton */}
      <div className="flex items-center justify-center gap-2">
        <Skeleton variant="rounded" className="h-9 w-9" />
        <Skeleton variant="rounded" className="h-9 w-9" />
        <Skeleton variant="rounded" className="h-9 w-9" />
        <Skeleton variant="rounded" className="h-9 w-9" />
        <Skeleton variant="rounded" className="h-9 w-9" />
      </div>

      <span className="sr-only">Loading search results...</span>
    </div>
  );
}