"use client";

import { ReactNode } from "react";
import { ArrowLeft, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MobileHeaderProps {
  title: string;
  showBackButton?: boolean;
  onBack?: () => void;
  rightAction?: ReactNode;
  className?: string;
}

export function MobileHeader({
  title,
  showBackButton = false,
  onBack,
  rightAction,
  className,
}: MobileHeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-16 z-30 bg-white border-b border-gray-200",
        "px-4 py-3",
        "flex items-center justify-between gap-4",
        className
      )}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {showBackButton && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="shrink-0 min-h-[44px] min-w-[44px]"
            aria-label="返回"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <h1 className="text-lg font-semibold text-gray-900 truncate">
          {title}
        </h1>
      </div>
      {rightAction && (
        <div className="shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center">
          {rightAction}
        </div>
      )}
    </header>
  );
}