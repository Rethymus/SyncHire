import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingStateProps {
  size?: "sm" | "md" | "lg";
  text?: string;
  className?: string;
}

export function LoadingState({
  size = "md",
  text,
  className,
}: LoadingStateProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  };

  return (
    <div
      className={cn("flex flex-col items-center justify-center p-12", className)}
      role="status"
      aria-live="polite"
    >
      <Loader2
        className={cn("animate-spin text-blue-600", sizeClasses[size])}
        aria-hidden="true"
      />
      {text && (
        <p className="mt-4 text-sm text-gray-700">{text}</p>
      )}
      <span className="sr-only">加载中...</span>
    </div>
  );
}

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-gray-200", className)}
      aria-hidden="true"
    />
  );
}
