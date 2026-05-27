"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MobileOptimizedCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  active?: boolean;
}

export function MobileOptimizedCard({
  children,
  className,
  onClick,
  active = false,
}: MobileOptimizedCardProps) {
  return (
    <div
      className={cn(
        "bg-white rounded-lg border border-gray-200 p-4",
        "transition-all duration-200",
        "active:scale-[0.98] active:bg-gray-50",
        "touch-manipulation", // Improves touch response on iOS
        onClick && "cursor-pointer hover:border-blue-300 hover:shadow-sm",
        active && "border-blue-500 ring-2 ring-blue-100",
        className
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {children}
    </div>
  );
}