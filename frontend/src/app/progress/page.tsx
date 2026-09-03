"use client";

/**
 * 求职进度 (Progress) page.
 *
 * Evidence-informed design — full rationale in docs/DESIGN_ETHICS.md:
 * - Hero metric is THIS WEEK'S CONTROLLABLE ACTIONS (Liu, Huang & Wang,
 *   2014), framed weekly (Wanberg, Zhu & van Hooft, 2010).
 * - Response/interview rates render small, neutral, as raw counts.
 * - Rejections open a guided recovery micro-flow (Vinokur & Schul, 1997).
 * - All copy is autonomy-supportive (Ryan & Deci, 2000): choices, no
 *   commands, no shaming.
 *
 * Data comes from the lite store (`useAppStore().applications`) — the same
 * source every other lite page reads, so an application created anywhere in
 * the product is visible here. The aggregation is the pure
 * `buildProgressSummary` over `storeApplicationToProgress` inputs.
 */

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Briefcase } from "lucide-react";
import { Breadcrumb } from "@/components/breadcrumb";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  ProgressRates,
} from "@/components/progress/progress-rates";
import { StatusDistribution } from "@/components/progress/status-distribution";
import { WeeklyActionsRing } from "@/components/progress/weekly-actions-ring";
import { WeeklyActivityChart } from "@/components/progress/weekly-activity-chart";
import { RejectionRecoveryCard } from "@/components/rejection-recovery-card";
import { useLiteCopy } from "@/lib/lite-i18n";
import { useAppStore } from "@/lib/store";
import {
  buildProgressSummary,
  CLOSED_OUT_STATUSES,
  storeApplicationToProgress,
  type ProgressApplication,
} from "@/lib/progress-model";

const VISIBLE_WEEKS = 6;
const MAX_RECOVERY_CARDS = 3;

const COPY = {
  "zh-CN": {
    breadcrumb: "求职进度",
    title: "求职进度",
    subtitle: "记录你能控制的部分，按周看节奏；其余的，不必打分。",
    loading: "正在读取本地记录…",
    emptySubtitle: "这里会记录你的行动和进展——从第一条开始。",
    emptyTitle: "还没有申请记录",
    emptyDescription: "一个具体的开始：去申请页创建第一条申请，进度页就会开始记录。",
    emptyAction: "去创建申请",
    thisWeek: "本周行动",
    recentWeeks: "最近几周的行动",
    recentWeeksHint: "只统计你能直接控制的事：新增申请、标记投递、推进面试。",
    distribution: "申请状态分布",
    distributionHint: "各条申请现在的位置，只是记录。",
    closedSection: "刚结束的几条申请",
    closedHint:
      "结束也是信息。愿意的话，可以用一分钟梳理一下；不想看就收起来，随时可以跳过。",
  },
  "en-US": {
    breadcrumb: "Progress",
    title: "Progress",
    subtitle: "Track what you control, week by week; the rest needs no scoring.",
    loading: "Reading local records…",
    emptySubtitle: "Your actions and progress will live here — starting from the first one.",
    emptyTitle: "No applications yet",
    emptyDescription:
      "A concrete start: create your first application on the applications page, and this page starts recording.",
    emptyAction: "Create an application",
    thisWeek: "This week's actions",
    recentWeeks: "Recent weeks",
    recentWeeksHint:
      "Counts only what you directly control: created, marked sent, interview advanced.",
    distribution: "Where applications stand",
    distributionHint: "Each application's current place — a record, not a ranking.",
    closedSection: "Recently closed applications",
    closedHint:
      "Closed outcomes carry information too. Take a minute if you like; collapse the cards anytime — skipping is fine.",
  },
} as const;

export default function ProgressPage() {
  const router = useRouter();
  const { locale } = useLiteCopy();
  const labels = COPY[locale];
  const storeApplications = useAppStore((state) => state.applications);
  const hasHydrated = useAppStore((state) => state.hasHydrated);

  // `now` is pinned to the mount time so re-renders never shift the weeks.
  const [now] = useState(() => new Date());

  const applications = useMemo(
    () => storeApplications.map(storeApplicationToProgress),
    [storeApplications]
  );

  const summary = useMemo(
    () => buildProgressSummary(applications, now, VISIBLE_WEEKS),
    [applications, now]
  );

  const recoveryApplications = useMemo(() => {
    return applications
      .filter((app) => CLOSED_OUT_STATUSES.includes(app.status))
      .sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""))
      .slice(0, MAX_RECOVERY_CARDS);
  }, [applications]);

  const storeApplicationById = useMemo(() => {
    return new Map(storeApplications.map((app) => [app.id, app]));
  }, [storeApplications]);

  if (!hasHydrated) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Breadcrumb currentTitle={labels.breadcrumb} />
        <h1 className="mb-2 mt-6 text-3xl font-bold text-foreground">{labels.title}</h1>
        <p className="mb-8 text-muted-foreground">{labels.loading}</p>
      </main>
    );
  }

  if (applications.length === 0) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Breadcrumb currentTitle={labels.breadcrumb} />
        <h1 className="mb-2 mt-6 text-3xl font-bold text-foreground">{labels.title}</h1>
        <p className="mb-8 text-muted-foreground">{labels.emptySubtitle}</p>
        <Card className="p-12">
          <EmptyState
            icon={Briefcase}
            title={labels.emptyTitle}
            description={labels.emptyDescription}
            action={{ label: labels.emptyAction, onClick: () => router.push("/applications") }}
          />
        </Card>
      </main>
    );
  }

  // Self-referential ring fill: this week vs the busiest week in the window.
  // No fixed quota — there is no "behind schedule" to be.
  const busiestWeek = Math.max(...summary.weeks.map((week) => week.total), 1);
  const ringFraction = summary.currentWeek.actionCount / Math.max(1, busiestWeek);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <Breadcrumb currentTitle={labels.breadcrumb} />

      <header className="mb-8 mt-6">
        <h1 className="mb-2 text-3xl font-bold text-foreground">{labels.title}</h1>
        <p className="text-muted-foreground">{labels.subtitle}</p>
      </header>

      <div className="space-y-6">
        {/* Hero: 本周行动 */}
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">{labels.thisWeek}</h2>
          <WeeklyActionsRing
            actionCount={summary.currentWeek.actionCount}
            counts={summary.currentWeek.counts}
            fraction={ringFraction}
          />
        </Card>

        {/* Per-week controllable actions */}
        <Card className="p-6">
          <h2 className="mb-1 text-lg font-semibold text-foreground">{labels.recentWeeks}</h2>
          <p className="mb-4 text-sm text-muted-foreground">{labels.recentWeeksHint}</p>
          <WeeklyActivityChart weeks={summary.weeks} />
        </Card>

        {/* Status distribution + neutral rates */}
        <Card className="p-6">
          <h2 className="mb-1 text-lg font-semibold text-foreground">{labels.distribution}</h2>
          <p className="mb-4 text-sm text-muted-foreground">{labels.distributionHint}</p>
          <StatusDistribution entries={summary.statusDistribution} />
          <div className="mt-6 border-t border-border pt-4">
            <ProgressRates
              responseRate={summary.responseRate}
              interviewRate={summary.interviewRate}
            />
          </div>
        </Card>

        {/* Rejection recovery micro-flow */}
        {recoveryApplications.length > 0 && (
          <section aria-label={labels.closedSection}>
            <h2 className="mb-1 text-lg font-semibold text-foreground">
              {labels.closedSection}
            </h2>
            <p className="mb-4 text-sm text-muted-foreground">{labels.closedHint}</p>
            <div className="space-y-4">
              {recoveryApplications.map((application) => {
                const storeApp = storeApplicationById.get(application.id);
                return (
                  <RejectionRecoveryCard
                    key={application.id}
                    application={application}
                    jobTitle={storeApp?.position}
                    company={storeApp?.companyName}
                  />
                );
              })}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
