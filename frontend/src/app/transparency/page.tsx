/**
 * Transparency Page
 *
 * Static disclosure page describing where data lives, when it leaves the
 * machine, which features use AI, the user's rights, and the form-assistant
 * promise. Content mirrors docs/TRANSPARENCY_COMPLIANCE_NOTES.md — keep the
 * two in sync when behavior changes.
 */

import type { Metadata } from "next";
import Link from "next/link";
import {
  Database,
  FileCheck2,
  Scale,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export const metadata: Metadata = {
  title: "透明度说明 - SyncHire Lite",
  description:
    "SyncHire Lite 数据存储、AI 功能边界、用户权利与填表助手承诺说明",
};

interface FeatureRow {
  name: string;
  tag: string;
  tagTone: "ai" | "local";
  detail: string;
}

const AI_FEATURES: FeatureRow[] = [
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
    detail: "从粘贴或导入的职位描述中提取结构化字段，文本会发送至所选 LLM 提供商。",
  },
  {
    name: "匹配打分",
    tag: "本地",
    tagTone: "local",
    detail:
      "本地确定性算法，在你的设备上完成，不使用 AI、不向任何服务外发数据。",
  },
];

interface RightItem {
  title: string;
  detail: string;
}

const RIGHTS: RightItem[] = [
  {
    title: "要求解释匹配结果",
    detail: "匹配打分提供分项明细（技能、经验、学历、缺失关键词），可随时查看依据。",
  },
  {
    title: "拒绝完全自动的决策",
    detail: "任何 AI 输出都只是建议，不会自动写入简历或提交申请，最终决定权始终在你。",
  },
  {
    title: "随时导出、带走全部数据",
    detail: "支持一键导出 JSON / CSV 及创建备份，无任何锁定。",
  },
];

function tagToneClass(tone: FeatureRow["tagTone"]): string {
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

export default function TransparencyPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <header className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
          <ShieldCheck className="h-7 w-7 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
          透明度说明
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          SyncHire Lite 是一款本地优先的求职工具。本页说明你的数据如何被存储和使用、
          哪些功能使用了 AI、你拥有哪些权利，以及我们的填表助手承诺。
        </p>
      </header>

      <div className="space-y-4">
        <SectionCard icon={Database} title="数据存在哪里">
          <p>
            全部数据保存在你本机的 SQLite 数据库中（默认目录{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-foreground">~/.synchire</code>{" "}
            及其子目录），<strong className="text-foreground">不上传云端</strong>。
            卸载或删除该目录即可彻底清除数据。
          </p>
        </SectionCard>

        <SectionCard icon={Send} title="数据什么时候会离开本机">
          <p>
            仅当你<strong className="text-foreground">主动触发 AI 功能</strong>（如简历优化、职位解析）时，
            相关文本才会发送至你在设置中配置的 LLM 提供商。除此之外，SyncHire Lite 不会向任何服务器发送你的数据。
          </p>
          <p>
            发送前会自动掩码手机号、邮箱、身份证号等个人标识符
            <span className="ml-1 inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              默认开启
            </span>
            。如需发送原始文本，可在启动后端前设置环境变量{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-foreground">PII_SCRUB_ENABLED=0</code>
            关闭（请自行留意敏感信息）。
          </p>
        </SectionCard>

        <SectionCard icon={Sparkles} title="AI 功能清单与边界">
          <ul className="space-y-3">
            {AI_FEATURES.map((feature) => (
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

        <SectionCard icon={Scale} title="你的权利">
          <ul className="space-y-3">
            {RIGHTS.map((right) => (
              <li key={right.title}>
                <span className="font-medium text-foreground">{right.title}</span>
                <p>{right.detail}</p>
              </li>
            ))}
          </ul>
          <p>
            前往{" "}
            <Link
              href="/data"
              className="font-medium text-blue-700 underline underline-offset-2 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200"
            >
              数据管理
            </Link>{" "}
            即可导出或备份全部数据；在{" "}
            <Link
              href="/settings"
              className="font-medium text-blue-700 underline underline-offset-2 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200"
            >
              设置
            </Link>{" "}
            中可随时查看或更改所配置的 LLM 提供商。
          </p>
        </SectionCard>

        <SectionCard icon={FileCheck2} title="填表助手承诺">
          <p>
            填表助手<strong className="text-foreground">只检测表单字段并给出预填建议</strong>，
            <strong className="text-foreground">绝不自动提交表单</strong>。
            每一次提交都由你亲自确认并点击完成。
          </p>
        </SectionCard>
      </div>
    </main>
  );
}
