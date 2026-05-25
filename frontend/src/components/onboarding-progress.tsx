"use client";

import { useMemo, memo, useEffect, useState, useRef } from "react";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Circle,
  Lock,
  Sparkles,
  TrendingUp,
  Award,
} from "lucide-react";

interface OnboardingTask {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  locked?: boolean;
  icon: React.ComponentType<{ className?: string }>;
  action?: string;
  impact: "high" | "medium" | "low";
}

function OnboardingProgress() {
  const { onboarding, resumes, jobDescriptions, applications } = useAppStore();
  const [showCelebration, setShowCelebration] = useState(false);
  const celebrationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const tasks = useMemo<OnboardingTask[]>(() => [
    {
      id: "upload-resume",
      title: "上传第一份简历",
      description: "让 AI 了解您的背景和技能",
      completed: resumes.length > 0,
      icon: () => (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      ),
      impact: "high",
    },
    {
      id: "add-jd",
      title: "添加职位描述",
      description: "保存您感兴趣的职位信息",
      completed: jobDescriptions.length > 0,
      locked: resumes.length === 0,
      icon: () => (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      impact: "high",
    },
    {
      id: "create-application",
      title: "创建第一个申请",
      description: "开始追踪您的求职进度",
      completed: applications.length > 0,
      locked: resumes.length === 0 || jobDescriptions.length === 0,
      icon: () => (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      impact: "high",
    },
    {
      id: "ai-analysis",
      title: "体验 AI 分析",
      description: "查看简历优化建议",
      completed: applications.some((app) => app.matchScore !== undefined),
      locked: applications.length === 0,
      icon: TrendingUp,
      impact: "medium",
    },
    {
      id: "explore-features",
      title: "探索更多功能",
      description: "了解搜索、面试准备等功能",
      completed: onboarding.completedSteps.includes("tutorial"),
      icon: () => (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      impact: "low",
    },
  ], [resumes.length, jobDescriptions.length, applications, onboarding.completedSteps]);

  const completionPercentage = useMemo(() => {
    const completed = tasks.filter((task) => task.completed).length;
    return Math.round((completed / tasks.length) * 100);
  }, [tasks]);

  const completedCount = tasks.filter((task) => task.completed).length;

  // Show celebration when all tasks are completed
  useEffect(() => {
    if (completionPercentage === 100 && !showCelebration && !celebrationTimeoutRef.current) {
      celebrationTimeoutRef.current = setTimeout(() => {
        setShowCelebration(true);
        setTimeout(() => setShowCelebration(false), 5000);
        celebrationTimeoutRef.current = null;
      });
    }
    return () => {
      if (celebrationTimeoutRef.current) {
        clearTimeout(celebrationTimeoutRef.current);
        celebrationTimeoutRef.current = null;
      }
    };
  }, [completionPercentage, showCelebration]);

  if (onboarding.isOnboarded && completionPercentage === 100) {
    return null;
  }

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "high":
        return "text-blue-600 bg-blue-50 border-blue-200";
      case "medium":
        return "text-purple-600 bg-purple-50 border-purple-200";
      case "low":
        return "text-gray-600 bg-gray-50 border-gray-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-600" />
            欢迎使用 SyncHire
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            完成以下任务，快速上手平台功能
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-900">{completionPercentage}%</div>
          <div className="text-xs text-gray-500">完成度</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <div
          className="bg-gradient-to-r from-blue-600 to-blue-400 h-2 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${completionPercentage}%` }}
          role="progressbar"
          aria-valuenow={completionPercentage}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>

      {/* Tasks list */}
      <div className="space-y-3">
        {tasks.map((task, index) => {
          const Icon = task.icon;
          return (
            <div
              key={task.id}
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg border transition-all duration-200",
                task.completed
                  ? "bg-green-50 border-green-200"
                  : task.locked
                  ? "bg-gray-50 border-gray-200 opacity-60"
                  : "bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm"
              )}
            >
              <div className="flex-shrink-0 mt-0.5">
                {task.completed ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : task.locked ? (
                  <Lock className="h-5 w-5 text-gray-400" />
                ) : (
                  <Circle className="h-5 w-5 text-gray-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className={cn(
                    "text-sm font-medium",
                    task.completed ? "text-green-900" : "text-gray-900"
                  )}>
                    {task.title}
                  </h4>
                  {task.impact === "high" && !task.completed && (
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded-full border",
                      getImpactColor(task.impact)
                    )}>
                      重要
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-600 mt-0.5">
                  {task.description}
                </p>
              </div>
              {task.locked && (
                <div className="flex-shrink-0">
                  <span className="text-xs text-gray-500">
                    完成前序任务解锁
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Celebration overlay */}
      {showCelebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 max-w-md mx-4 text-center animate-bounce-in">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full mb-4">
              <Award className="h-10 w-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              恭喜完成！
            </h3>
            <p className="text-gray-600 mb-6">
              您已完成所有引导任务，现在可以充分利用 SyncHire 的功能了！
            </p>
            <button
              onClick={() => setShowCelebration(false)}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium min-h-[44px]"
            >
              开始使用
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(OnboardingProgress);
