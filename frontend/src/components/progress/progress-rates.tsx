"use client";

/**
 * Neutral, small-format rates ("面试转化：x/y"). Raw counts only — no
 * percentages, no benchmarks, no trend arrows. Rates stay `null` (rendered
 * as 暂无数据) until at least one application has actually been applied, so
 * a fresh user never sees a meaningless "0%".
 */

import { useLiteCopy } from "@/lib/lite-i18n";
import type { RateCounts } from "@/lib/progress-model";

interface ProgressRatesProps {
  responseRate: RateCounts | null;
  interviewRate: RateCounts | null;
}

export function ProgressRates({ responseRate, interviewRate }: ProgressRatesProps) {
  const { locale } = useLiteCopy();
  const en = locale === "en-US";
  const noData = en ? "no data yet" : "暂无数据";
  const formatRate = (rate: RateCounts | null): string =>
    rate ? `${rate.numerator}/${rate.denominator}` : noData;

  return (
    <div className="space-y-1">
      <p className="text-sm text-muted-foreground">
        {en ? "Interview conversion" : "面试转化"}：{formatRate(interviewRate)}
        <span className="mx-2 text-border">|</span>
        {en ? "Responses" : "有回应"}：{formatRate(responseRate)}
      </p>
      <p className="text-xs text-muted-foreground">
        {en
          ? "Counts applications actually sent. Response pace belongs to the employer's process — these numbers are records, not grades."
          : "仅统计已投递的申请。回复节奏由对方流程决定，这些数字只是记录，不是评分。"}
      </p>
    </div>
  );
}
