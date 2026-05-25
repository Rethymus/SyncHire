import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "circular" | "rounded";
}

export function Skeleton({ className, variant = "default", ...props }: SkeletonProps) {
  const variantClasses = {
    default: "rounded-md",
    circular: "rounded-full",
    rounded: "rounded-lg",
  };

  return (
    <div
      className={cn(
        "animate-shimmer bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%]",
        variantClasses[variant],
        "dark:from-gray-700 dark:via-gray-600 dark:to-gray-700",
        className
      )}
      role="status"
      aria-label="Loading content"
      {...props}
    />
  );
}

interface SkeletonBaseProps {
  className?: string;
  children?: React.ReactNode;
}

function SkeletonBase({ className, children }: SkeletonBaseProps) {
  return (
    <div
      className={cn("animate-pulse bg-gray-200 dark:bg-gray-700", className)}
      role="status"
      aria-label="Loading content"
      aria-live="polite"
    >
      {children}
    </div>
  );
}

export { SkeletonBase };