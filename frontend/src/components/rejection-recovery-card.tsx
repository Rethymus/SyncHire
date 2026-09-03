"use client";

/**
 * RejectionRecoveryCard — a dismissible guided micro-flow shown for
 * applications whose status is a closed-out value (`rejected` /
 * `withdrawn`, the real terminal statuses in ApplicationStatus).
 *
 * Structure follows Vinokur & Schul (1997): "inoculation against setbacks"
 * — naming what was and was not in one's control, then committing to one
 * small next step — was an active ingredient of the JOBS intervention
 * (Caplan, Vinokur, Price & Van Ryn, 1989).
 *
 * Copy rules (docs/DESIGN_ETHICS.md):
 * - Autonomy-supportive (Ryan & Deci, 2000; Vansteenkiste et al., 2004):
 *   choices are offered, never commanded. Selecting 暂停休息 is framed as a
 *   valid choice, not a failure.
 * - No shaming, no "你已 X 天未行动" style copy, no outcome verdicts.
 *
 * Dismissal and the chosen action persist in the app store
 * (`rejectionRecovery` slice). An entry with `dismissed: true` keeps the
 * card hidden; a `chosenAction` without dismissal keeps it visible in a
 * confirmed state, so the user always sees what they picked.
 */

import { memo } from "react";
import { CheckCircle2, FileText, Moon, RefreshCw, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { ApplicationStatus } from "@/lib/api-client";
import { useLiteCopy } from "@/lib/lite-i18n";
import type { ProgressApplication } from "@/lib/progress-model";
import {
  useAppStore,
  type RecoveryActionChoice,
  type RejectionRecoveryEntry,
} from "@/lib/store";
import { progressStatusLabels } from "@/components/progress/status-meta";

const REFLECTION_PROMPTS = {
  zh: ["哪些是可控的？", "哪些不可控？", "下一步最小的一个行动是什么？"],
  en: [
    "What was in your control?",
    "What wasn't?",
    "What's the smallest next step?",
  ],
} as const;

const ACTION_CHOICES: Array<{
  value: RecoveryActionChoice;
  zh: { label: string; hint: string };
  en: { label: string; hint: string };
  icon: typeof FileText;
}> = [
  {
    value: "tune_resume",
    zh: { label: "调整简历要点", hint: "针对这类职位改一两处表述" },
    en: { label: "Tune the resume", hint: "Adjust a line or two for this kind of role" },
    icon: FileText,
  },
  {
    value: "switch_channel",
    zh: { label: "换个渠道", hint: "试试别的平台或找人内推" },
    en: { label: "Try another channel", hint: "Another platform, or ask for a referral" },
    icon: RefreshCw,
  },
  {
    value: "rest",
    zh: { label: "暂停休息", hint: "什么都不做也是一种选择" },
    en: { label: "Rest", hint: "Doing nothing is also a choice" },
    icon: Moon,
  },
];

interface RejectionRecoveryCardProps {
  application: ProgressApplication;
  /** Job title from the linked JD, when available. */
  jobTitle?: string;
  /** Company from the linked JD, when available. */
  company?: string;
}

function RecoveryCardImpl({
  application,
  jobTitle,
  company,
}: RejectionRecoveryCardProps) {
  const { locale } = useLiteCopy();
  const en = locale === "en-US";
  const entry: RejectionRecoveryEntry | undefined = useAppStore(
    (state) => state.rejectionRecovery[application.id]
  );
  const dismissRejectionRecovery = useAppStore(
    (state) => state.dismissRejectionRecovery
  );
  const chooseRecoveryAction = useAppStore(
    (state) => state.chooseRecoveryAction
  );

  // Explicitly dismissed cards stay dismissed (persisted) — the user asked
  // to move on. A chosen action alone keeps the card in its confirmed state.
  if (entry?.dismissed) {
    return null;
  }

  const chosenAction = entry?.chosenAction ?? null;
  const statusLabel: string =
    progressStatusLabels(locale)[application.status as ApplicationStatus] ??
    application.status;
  const heading = [company, jobTitle].filter(Boolean).join(" · ") || (en ? "this application" : "这条申请");

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {statusLabel}
            </Badge>
            <span className="truncate text-sm font-semibold text-foreground">
              {heading}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {en
              ? "The outcome happened; it says something about this one match. Want to spend two minutes turning it into a lead? No rush — you can collapse this too."
              : "结果已经发生，它说明的是这一次的匹配情况。想花两分钟把它变成线索吗？不着急，也可以先收起来。"}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground"
          onClick={() => dismissRejectionRecovery(application.id)}
          aria-label={en ? `Collapse the ${heading} card` : `收起 ${heading} 的卡片`}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="mt-4 rounded-lg bg-muted/50 p-4">
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          {en
            ? "Worth reflecting on (just sorting thoughts — nothing is graded):"
            : "可以想想（只是梳理，不记录对错）："}
        </p>
        <ul className="space-y-1.5">
          {(en ? REFLECTION_PROMPTS.en : REFLECTION_PROMPTS.zh).map((prompt) => (
            <li key={prompt} className="text-sm text-foreground">
              · {prompt}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4">
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          {en
            ? "If you want a small step, pick one here (or none):"
            : "如果想迈一小步，可以从这里挑一个（也可以都不挑）："}
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          {ACTION_CHOICES.map(({ value, zh, en: enCopy, icon: Icon }) => {
            const copy = en ? enCopy : zh;
            const isSelected = chosenAction === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => chooseRecoveryAction(application.id, value)}
                className={`flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-ring ${
                  isSelected
                    ? "border-primary bg-accent"
                    : "border-border bg-card hover:bg-accent/50"
                }`}
                aria-pressed={isSelected}
              >
                <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Icon
                    className="h-4 w-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                  {copy.label}
                  {isSelected && (
                    <CheckCircle2
                      className="h-4 w-4 text-primary"
                      aria-hidden="true"
                    />
                  )}
                </span>
                <span className="text-xs text-muted-foreground">{copy.hint}</span>
              </button>
            );
          })}
        </div>
        {chosenAction && (
          <p className="mt-3 text-sm text-muted-foreground" role="status">
            {en
              ? "Noted. When and how much is up to you."
              : "已记录。什么时候做、做多少，由你决定。"}
          </p>
        )}
      </div>
    </Card>
  );
}

export const RejectionRecoveryCard = memo(RecoveryCardImpl);
