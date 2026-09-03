"use client";

/**
 * 本周行动 ring — the hero metric of the 求职进度 page.
 *
 * Evidence mapping (docs/DESIGN_ETHICS.md):
 * - Counts CONTROLLABLE PROCESS ACTIONS (Liu, Huang & Wang, 2014), not
 *   outcomes, and frames them per week (Wanberg, Zhu & van Hooft, 2010).
 * - The ring is self-referential: it fills relative to the busiest week in
 *   the visible window, never against an external norm, so there is no
 *   "target" to fall behind on. No shaming copy lives here.
 */

import { useLiteCopy } from "@/lib/lite-i18n";
import type { ActivityCounts } from "@/lib/progress-model";

interface WeeklyActionsRingProps {
  actionCount: number;
  counts: ActivityCounts;
  /**
   * Fill fraction 0-1, computed by the caller as
   * `actionCount / max(1, busiest week in window)` — self-referential by
   * design (no fixed quota).
   */
  fraction: number;
}

const RING_SIZE = 160;
const RING_STROKE = 12;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export function WeeklyActionsRing({
  actionCount,
  counts,
  fraction,
}: WeeklyActionsRingProps) {
  const { locale } = useLiteCopy();
  const en = locale === "en-US";
  const clamped = Math.max(0, Math.min(1, fraction));

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-8">
      <div
        className="relative shrink-0"
        role="img"
        aria-label={
          en
            ? `This week's actions: ${actionCount} — created ${counts.created}, sent ${counts.applied}, interview advanced ${counts.interview}`
            : `本周行动 ${actionCount} 次：新增申请 ${counts.created}，投递 ${counts.applied}，推进面试 ${counts.interview}`
        }
      >
        <svg
          width={RING_SIZE}
          height={RING_SIZE}
          viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
          className="-rotate-90"
          aria-hidden="true"
        >
          <circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            fill="none"
            strokeWidth={RING_STROKE}
            className="stroke-muted"
          />
          <circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            fill="none"
            strokeWidth={RING_STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - clamped)}
            className="stroke-primary transition-[stroke-dashoffset] duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold text-foreground tabular-nums">
            {actionCount}
          </span>
          <span className="text-xs text-muted-foreground">
            {en ? "actions this week" : "本周行动（次）"}
          </span>
        </div>
      </div>

      <div className="space-y-2 text-center sm:text-left">
        <p className="text-sm text-muted-foreground">
          {en
            ? "Actions = creating applications, marking them sent, advancing interviews. All things you directly control."
            : "行动 = 新增申请、标记投递、推进面试。这些都是你能直接控制的事。"}
        </p>
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm sm:justify-start">
          <span className="text-muted-foreground">
            {en ? "Created" : "新增申请"}{" "}
            <span className="font-semibold text-foreground tabular-nums">{counts.created}</span>
          </span>
          <span className="text-muted-foreground">
            {en ? "Sent" : "标记投递"}{" "}
            <span className="font-semibold text-foreground tabular-nums">{counts.applied}</span>
          </span>
          <span className="text-muted-foreground">
            {en ? "Interview advanced" : "推进面试"}{" "}
            <span className="font-semibold text-foreground tabular-nums">{counts.interview}</span>
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          {en
            ? "How much is enough, and when to act — the pace is yours to set."
            : "多少算够、什么时候行动，节奏由你决定。"}
        </p>
      </div>
    </div>
  );
}
