"use client";

/**
 * Transparency Page
 *
 * Static disclosure page describing where data lives, when it leaves the
 * machine, which features use AI, the user's rights, and the form-assistant
 * promise. Content mirrors docs/TRANSPARENCY_COMPLIANCE_NOTES.md — keep the
 * two in sync when behavior changes. The English wording follows that
 * document's terminology (EU AI Act Art. 50 disclosure, PIPL Art. 24).
 */

import Link from "next/link";
import {
  Database,
  FileCheck2,
  Scale,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useLiteCopy } from "@/lib/lite-i18n";

type Locale = "zh-CN" | "en-US";

interface FeatureRow {
  name: string;
  tag: string;
  tagTone: "ai" | "local";
  detail: string;
}

const AI_FEATURES: Record<Locale, FeatureRow[]> = {
  "zh-CN": [
    {
      name: "简历优化",
      tag: "AI",
      tagTone: "ai",
      detail:
        "调用你配置的 LLM 生成优化建议，输出结果一律标注「AI 优化」，应用前请人工复核。",
    },
    {
      name: "职位解析",
      tag: "AI",
      tagTone: "ai",
      detail:
        "从粘贴或导入的职位描述中提取结构化字段，文本会发送至所选 LLM 提供商。",
    },
    {
      name: "匹配打分",
      tag: "本地",
      tagTone: "local",
      detail:
        "本地确定性算法，在你的设备上完成，不使用 AI、不向任何服务外发数据。",
    },
  ],
  "en-US": [
    {
      name: "Resume optimization",
      tag: "AI",
      tagTone: "ai",
      detail:
        "Calls the LLM you configured to produce optimization suggestions. Every output is labeled as AI-optimized — review it manually before applying.",
    },
    {
      name: "Job-description parsing",
      tag: "AI",
      tagTone: "ai",
      detail:
        "Extracts structured fields from pasted or imported job descriptions. The text is sent to the LLM provider you selected.",
    },
    {
      name: "Match scoring",
      tag: "Local",
      tagTone: "local",
      detail:
        "A deterministic local algorithm, computed on your device. No AI involved, nothing sent anywhere.",
    },
  ],
};

interface RightItem {
  title: string;
  detail: string;
}

const RIGHTS: Record<Locale, RightItem[]> = {
  "zh-CN": [
    {
      title: "要求解释匹配结果",
      detail:
        "匹配打分提供分项明细（技能、经验、学历、缺失关键词），可随时查看依据。",
    },
    {
      title: "拒绝完全自动的决策",
      detail:
        "任何 AI 输出都只是建议，不会自动写入简历或提交申请，最终决定权始终在你。",
    },
    {
      title: "随时导出、带走全部数据",
      detail: "支持一键导出 JSON / CSV 及创建备份，无任何锁定。",
    },
  ],
  "en-US": [
    {
      title: "Ask why a match came out the way it did",
      detail:
        "Match scoring exposes a per-factor breakdown — skills, experience, education, missing keywords — that you can review at any time.",
    },
    {
      title: "Refuse fully automated decisions",
      detail:
        "Every AI output is advisory only: nothing is written into your resume or submitted automatically, and the final call is always yours.",
    },
    {
      title: "Export and take all of your data anytime",
      detail:
        "One-click JSON / CSV export and backups. There is no lock-in of any kind.",
    },
  ],
};

const COPY: Record<
  Locale,
  {
    title: string;
    intro: string;
    storageTitle: string;
    storageBody: string;
    leavesTitle: string;
    leavesBody1: string;
    leavesBody2Pre: string;
    leavesBadge: string;
    leavesBody2Post: string;
    aiTitle: string;
    rightsTitle: string;
    rightsFooterPre: string;
    rightsFooterData: string;
    rightsFooterMid: string;
    rightsFooterSettings: string;
    rightsFooterPost: string;
    promiseTitle: string;
    promiseBody: string;
  }
> = {
  "zh-CN": {
    title: "透明度说明",
    intro:
      "SyncHire Lite 是一款本地优先的求职工具。本页说明你的数据如何被存储和使用、哪些功能使用了 AI、你拥有哪些权利，以及我们的填表助手承诺。",
    storageTitle: "数据存在哪里",
    storageBody:
      "全部数据保存在你本机的 SQLite 数据库中（默认目录 ~/.synchire 及其子目录），不上传云端。卸载或删除该目录即可彻底清除数据。",
    leavesTitle: "数据什么时候会离开本机",
    leavesBody1:
      "仅当你主动触发 AI 功能（如简历优化、职位解析）时，相关文本才会发送至你在设置中配置的 LLM 提供商。除此之外，SyncHire Lite 不会向任何服务器发送你的数据。",
    leavesBody2Pre: "发送前会自动掩码手机号、邮箱、身份证号等个人标识符",
    leavesBadge: "默认开启",
    leavesBody2Post:
      "。如需发送原始文本，可在启动后端前设置环境变量 PII_SCRUB_ENABLED=0 关闭（请自行留意敏感信息）。",
    aiTitle: "AI 功能清单与边界",
    rightsTitle: "你的权利",
    rightsFooterPre: "前往",
    rightsFooterData: "数据管理",
    rightsFooterMid: "即可导出或备份全部数据；在",
    rightsFooterSettings: "设置",
    rightsFooterPost: "中可随时查看或更改所配置的 LLM 提供商。",
    promiseTitle: "填表助手承诺",
    promiseBody:
      "填表助手只检测表单字段并给出预填建议，绝不自动提交表单。每一次提交都由你亲自确认并点击完成。",
  },
  "en-US": {
    title: "Transparency",
    intro:
      "SyncHire Lite is a local-first job-hunting tool. This page explains how your data is stored and used, which features use AI, the rights you have, and our form-assistant promise.",
    storageTitle: "Where your data lives",
    storageBody:
      "All data stays in a SQLite database on your machine (default directory ~/.synchire and its subdirectories) and is never uploaded to the cloud. Uninstalling the app — or deleting that directory — removes your data completely.",
    leavesTitle: "When your data leaves the machine",
    leavesBody1:
      "Only when you actively trigger an AI feature (such as resume optimization or job-description parsing) is relevant text sent to the LLM provider you configured in Settings. Other than that, SyncHire Lite never sends your data to any server.",
    leavesBody2Pre:
      "Before sending, direct identifiers such as phone numbers, email addresses, and resident ID numbers are automatically masked",
    leavesBadge: "on by default",
    leavesBody2Post:
      ". To send raw text instead, set the environment variable PII_SCRUB_ENABLED=0 before starting the backend (please mind sensitive information).",
    aiTitle: "AI features and boundaries",
    rightsTitle: "Your rights",
    rightsFooterPre: "Open",
    rightsFooterData: "Data management",
    rightsFooterMid: "to export or back up everything; view or change the configured LLM provider anytime in",
    rightsFooterSettings: "Settings",
    rightsFooterPost: "",
    promiseTitle: "Form-assistant promise",
    promiseBody:
      "The form assistant only detects form fields and suggests pre-fill values — it never submits a form automatically. Every submission is confirmed and completed by you.",
  },
};

function tagToneClass(tone: "ai" | "local"): string {
  return tone === "ai"
    ? "border-purple-200 bg-purple-100/60 text-purple-800 dark:border-purple-400/40 dark:bg-purple-400/10 dark:text-purple-300"
    : "border-emerald-200 bg-emerald-100/60 text-emerald-800 dark:border-emerald-400/40 dark:bg-emerald-400/10 dark:text-emerald-300";
}

function SectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Database;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-6">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
        <Icon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
        {children}
      </div>
    </section>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-foreground">
      {children}
    </code>
  );
}

function InlineLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="font-medium text-blue-700 underline underline-offset-2 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200"
    >
      {children}
    </Link>
  );
}

export default function TransparencyPage() {
  const { locale } = useLiteCopy();
  const copy = COPY[locale];
  const aiFeatures = AI_FEATURES[locale];
  const rights = RIGHTS[locale];

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <header className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
          <ShieldCheck className="h-7 w-7 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
          {copy.title}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{copy.intro}</p>
      </header>

      <div className="space-y-4">
        <SectionCard icon={Database} title={copy.storageTitle}>
          <p>
            {locale === "zh-CN" ? (
              <>
                全部数据保存在你本机的 SQLite 数据库中（默认目录{" "}
                <Code>~/.synchire</Code> 及其子目录），
                <strong className="text-foreground">不上传云端</strong>。
                卸载或删除该目录即可彻底清除数据。
              </>
            ) : (
              <>
                All data stays in a SQLite database on your machine (default
                directory <Code>~/.synchire</Code> and its subdirectories) and is{" "}
                <strong className="text-foreground">never uploaded to the cloud</strong>.
                Uninstalling the app — or deleting that directory — removes your
                data completely.
              </>
            )}
          </p>
        </SectionCard>

        <SectionCard icon={Send} title={copy.leavesTitle}>
          <p>{copy.leavesBody1}</p>
          <p>
            {copy.leavesBody2Pre}
            <span className="ml-1 inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {copy.leavesBadge}
            </span>
            {locale === "zh-CN" ? (
              <>
                。如需发送原始文本，可在启动后端前设置环境变量{" "}
                <Code>PII_SCRUB_ENABLED=0</Code>
                关闭（请自行留意敏感信息）。
              </>
            ) : (
              <>
                {" "}
                (<Code>PII_SCRUB_ENABLED=0</Code> before starting the backend
                turns masking off — please mind sensitive information).
              </>
            )}
          </p>
        </SectionCard>

        <SectionCard icon={Sparkles} title={copy.aiTitle}>
          <ul className="space-y-3">
            {aiFeatures.map((feature) => (
              <li key={feature.name} className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{feature.name}</span>
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${tagToneClass(feature.tagTone)}`}
                  >
                    {feature.tag}
                  </span>
                </div>
                <p>{feature.detail}</p>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard icon={Scale} title={copy.rightsTitle}>
          <ul className="space-y-3">
            {rights.map((right) => (
              <li key={right.title}>
                <span className="font-medium text-foreground">{right.title}</span>
                <p>{right.detail}</p>
              </li>
            ))}
          </ul>
          <p>
            {locale === "zh-CN" ? (
              <>
                {copy.rightsFooterPre}{" "}
                <InlineLink href="/data">{copy.rightsFooterData}</InlineLink>{" "}
                {copy.rightsFooterMid}{" "}
                <InlineLink href="/settings">{copy.rightsFooterSettings}</InlineLink>{" "}
                {copy.rightsFooterPost}
              </>
            ) : (
              <>
                {copy.rightsFooterPre}{" "}
                <InlineLink href="/data">{copy.rightsFooterData}</InlineLink>{" "}
                {copy.rightsFooterMid}{" "}
                <InlineLink href="/settings">{copy.rightsFooterSettings}</InlineLink>.
              </>
            )}
          </p>
        </SectionCard>

        <SectionCard icon={FileCheck2} title={copy.promiseTitle}>
          {locale === "zh-CN" ? (
            <p>
              填表助手<strong className="text-foreground">只检测表单字段并给出预填建议</strong>，
              <strong className="text-foreground">绝不自动提交表单</strong>。
              每一次提交都由你亲自确认并点击完成。
            </p>
          ) : (
            <p>
              The form assistant{" "}
              <strong className="text-foreground">
                only detects form fields and suggests pre-fill values
              </strong>{" "}
              — it{" "}
              <strong className="text-foreground">never submits a form automatically</strong>.
              Every submission is confirmed and completed by you.
            </p>
          )}
        </SectionCard>
      </div>
    </main>
  );
}
