"use client";

/**
 * Per-week stacked bar chart of controllable actions
 * (新增申请 / 标记投递 / 推进面试), rendered with the recharts dependency
 * the project already ships (same choice as app/analytics).
 *
 * Weekly framing follows Wanberg, Zhu & van Hooft (2010): perceived progress
 * sustains search effort. The chart shows only process actions the user
 * controls — outcomes never appear here (docs/DESIGN_ETHICS.md).
 */

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useLiteCopy } from "@/lib/lite-i18n";
import type { WeekActivity } from "@/lib/progress-model";

interface WeeklyActivityChartProps {
  weeks: WeekActivity[];
}

const SERIES = [
  { key: "created", zh: "新增申请", en: "Created", color: "#6366f1" },
  { key: "applied", zh: "标记投递", en: "Sent", color: "#10b981" },
  { key: "interview", zh: "推进面试", en: "Interview advanced", color: "#f59e0b" },
] as const;

export function WeeklyActivityChart({ weeks }: WeeklyActivityChartProps) {
  const { locale } = useLiteCopy();
  const data = weeks.map((week) => ({
    label: week.label,
    created: week.counts.created,
    applied: week.counts.applied,
    interview: week.counts.interview,
  }));

  return (
    <div className="h-56 w-full" aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
          />
          <YAxis
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
          />
          <Tooltip
            cursor={{ fill: "var(--accent)", opacity: 0.5 }}
            contentStyle={{
              backgroundColor: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              color: "var(--card-foreground)",
              fontSize: 12,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {SERIES.map((series) => (
            <Bar
              key={series.key}
              dataKey={series.key}
              name={locale === "en-US" ? series.en : series.zh}
              stackId="actions"
              fill={series.color}
              radius={[3, 3, 0, 0]}
              maxBarSize={36}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
