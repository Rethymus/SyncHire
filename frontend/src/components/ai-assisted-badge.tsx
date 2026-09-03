/**
 * AI-Assisted Badge
 *
 * Marks AI-generated / AI-optimized content so users always know which
 * material was produced by a model and should be reviewed by a human.
 * Transparency requirement — see docs/TRANSPARENCY_COMPLIANCE_NOTES.md
 * (EU AI Act Art. 50 disclosure principles, PIPL Art. 24 transparency).
 */

"use client";

import { Sparkles } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export const AI_ASSISTED_HINT = "由 AI 生成/优化，内容请人工复核";

export function AiAssistedBadge({ className }: { className?: string }) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            tabIndex={0}
            title={AI_ASSISTED_HINT}
            className={cn(
              "inline-flex cursor-help items-center gap-1 rounded-full border border-purple-200 bg-purple-100/60 px-2 py-0.5 text-xs font-medium text-purple-800 outline-none focus-visible:ring-2 focus-visible:ring-purple-500 dark:border-purple-400/40 dark:bg-purple-400/10 dark:text-purple-300",
              className
            )}
          >
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            AI 优化
            <span className="sr-only">（{AI_ASSISTED_HINT}）</span>
          </span>
        </TooltipTrigger>
        <TooltipContent role="tooltip">{AI_ASSISTED_HINT}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
