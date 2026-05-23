/**
 * Dashboard页面无障碍增强补丁
 * 修复WCAG 2.1合规性问题
 */

"use client";

import { SkipLink } from "@/lib/accessibility-enhancements";
import { LiveRegion } from "@/lib/accessibility-enhancements";

/**
 * 应用此补丁到dashboard/page.tsx:
 *
 * 1. 在Navigation后添加:
 * <SkipLink targetId="main-content">跳到主内容</SkipLink>
 *
 * 2. 在main标签添加id:
 * <main id="main-content" className="flex-1 p-4 md:p-8">
 *
 * 3. 在内容顶部添加实时通知:
 * <DashboardA11yAnnouncements currentStep={currentStep} stats={stats} />
 */

interface DashboardA11yAnnouncementsProps {
  currentStep: number;
  stats: Array<{ name: string; value: number }>;
}

export function DashboardA11yAnnouncements({
  currentStep,
  stats,
}: DashboardA11yAnnouncementsProps) {
  const stepNames = [
    "上传简历",
    "输入职位描述",
    "AI 分析匹配",
    "生成优化简历",
  ];

  const announcements = [];

  // 步骤状态
  if (currentStep > 0 && currentStep <= 4) {
    announcements.push(`当前步骤: ${stepNames[currentStep - 1]}`);
  }

  // 统计摘要 (仅在值变化时通知)
  const totalApplications = stats[0]?.value || 0;
  if (totalApplications > 0) {
    announcements.push(`总申请数: ${totalApplications}`);
  }

  return (
    <>
      {announcements.map((msg, i) => (
        <LiveRegion
          key={i}
          message={msg}
          politeness="polite"
          role="status"
        />
      ))}
    </>
  );
}

/**
 * 统计卡片增强版本
 */
export function AccessibleStatCard({
  name,
  value,
  icon: Icon
}: {
  name: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <article
      className="bg-white rounded-lg p-6 border border-gray-200"
      aria-label={`${name}: ${value}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-700">{name}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {value}
          </p>
        </div>
        <div className="bg-blue-500 p-3 rounded-lg" aria-hidden="true">
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </article>
  );
}

/**
 * 应用状态卡片增强版本
 * 使用图标+文字，不依赖颜色
 */
export function AccessibleAppStatus({
  status
}: {
  status: "interview" | "applied" | "rejected" | "draft" | "offer"
}) {
  const statusConfig = {
    interview: {
      label: "面试中",
      color: "bg-green-100 text-green-800",
      icon: "📞",
    },
    applied: {
      label: "已申请",
      color: "bg-blue-100 text-blue-800",
      icon: "📝",
    },
    rejected: {
      label: "已拒绝",
      color: "bg-red-100 text-red-800",
      icon: "❌",
    },
    draft: {
      label: "草稿",
      color: "bg-gray-100 text-gray-800",
      icon: "📄",
    },
    offer: {
      label: "收到offer",
      color: "bg-purple-100 text-purple-800",
      icon: "🎉",
    },
  };

  const config = statusConfig[status];

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-medium ${config.color}`}
    >
      <span aria-hidden="true" className="mr-1">
        {config.icon}
      </span>
      <span>{config.label}</span>
    </span>
  );
}

/**
 * 导航链接增强版本
 * 处理焦点恢复
 */
interface NavLinksEnhancedProps {
  href: string;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  ariaCurrent?: "page";
}

export function NavLinksEnhanced({
  href,
  children,
  onClick,
  className,
  ariaCurrent,
}: NavLinksEnhancedProps) {
  const handleClick = () => {
    onClick?.();

    // 将焦点移至主内容
    setTimeout(() => {
      const mainContent = document.getElementById("main-content");
      if (mainContent) {
        mainContent.focus();
        // 某些元素可能需要tabindex
        if (mainContent.getAttribute("tabindex") === null) {
          mainContent.setAttribute("tabindex", "-1");
        }
      }
    }, 100);
  };

  return (
    <Link
      href={href}
      className={className}
      onClick={handleClick}
      aria-current={ariaCurrent}
    >
      {children}
    </Link>
  );
}

import { useAppStore } from "@/lib/store";
import Link from "next/link";

/**
 * 完整的无障碍修复示例
 * 展示如何将所有增强组件整合
 */
export function DashboardA11yExample() {
  const { applications } = useAppStore();
  const [currentStep, setCurrentStep] = useState(1);

  const stats = [
    {
      name: "总申请数",
      value: applications.length,
    },
    // ...
  ];

  return (
    <>
      <SkipLink targetId="main-content">跳到主内容</SkipLink>

      <DashboardA11yAnnouncements
        currentStep={currentStep}
        stats={stats}
      />

      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 p-4 md:p-8"
      >
        <section aria-labelledby="stats-heading">
          <h2 id="stats-heading" className="sr-only">
            统计数据
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((stat) => (
              <AccessibleStatCard
                key={stat.name}
                name={stat.name}
                value={stat.value}
                icon={Briefcase}
              />
            ))}
          </div>
        </section>

        {/* 应用列表 */}
        <section aria-labelledby="activity-heading">
          <h2 id="activity-heading" className="text-xl font-semibold">
            最近活动
          </h2>
          {applications.slice(0, 5).map((app) => (
            <article
              key={app.id}
              className="flex items-center justify-between py-3 border-b"
            >
              <div>
                <p className="font-medium">{app.position}</p>
                <p className="text-sm text-gray-700">{app.companyName}</p>
              </div>
              <AccessibleAppStatus status={app.status} />
            </article>
          ))}
        </section>
      </main>
    </>
  );
}

import { useState } from "react";
import { Briefcase } from "lucide-react";
