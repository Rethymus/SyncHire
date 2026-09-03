"use client";

/**
 * 申请状态分布 — how applications are spread over the REAL
 * ApplicationStatus enum values (zero-count statuses are hidden).
 *
 * Deliberately monochrome: one accent color for every status. Coloring
 * `rejected` red would turn a recorded fact into a verdict; the model only
 * reports where things stand (docs/DESIGN_ETHICS.md, copy do/don't).
 */

import { useLiteCopy } from "@/lib/lite-i18n";
import type { StatusDistributionEntry } from "@/lib/progress-model";
import { progressStatusLabels } from "./status-meta";

interface StatusDistributionProps {
  entries: StatusDistributionEntry[];
}

export function StatusDistribution({ entries }: StatusDistributionProps) {
  const { locale } = useLiteCopy();
  const labels = progressStatusLabels(locale);
  const visible = entries.filter((entry) => entry.count > 0);
  const max = Math.max(...visible.map((entry) => entry.count), 1);

  if (visible.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {locale === "en-US"
          ? "Nothing recorded yet. The first application can start anytime."
          : "还没有记录。第一条申请随时可以开始。"}
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {visible.map((entry) => (
        <li key={entry.status} className="flex items-center gap-3">
          <span className="w-20 shrink-0 text-sm text-muted-foreground">
            {labels[entry.status]}
          </span>
          <div
            className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted"
            role="presentation"
          >
            <div
              className="h-full rounded-full bg-foreground/70"
              style={{ width: `${Math.round((entry.count / max) * 100)}%` }}
            />
          </div>
          <span className="w-8 shrink-0 text-right text-sm font-semibold text-foreground tabular-nums">
            {entry.count}
          </span>
        </li>
      ))}
    </ul>
  );
}
