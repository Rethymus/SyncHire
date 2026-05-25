"use client";

import { useState, useCallback, useMemo, memo, useEffect } from "react";
import { useAppStore, OnboardingStep } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  X,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Sparkles,
  Upload,
  FileText,
  Briefcase,
  TrendingUp,
  GraduationCap,
  ArrowRight,
  XCircle,
} from "lucide-react";

interface OnboardingStepConfig {
  id: OnboardingStep;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  action?: string;
}

const onboardingSteps: OnboardingStepConfig[] = [
  {
    id: "welcome",
    title: "欢迎来到 SyncHire",
    description: "让我们帮助您快速上手，开始您的智能求职之旅",
    icon: Sparkles,
  },
  {
    id: "profile",
    title: "完善个人资料",
    description: "告诉我们您的背景，以便我们提供个性化建议",
    icon: GraduationCap,
    action: "设置资料",
  },
  {
    id: "resume-upload",
    title: "上传您的简历",
    description: "上传现有简历，让 AI 了解您的经历和技能",
    icon: Upload,
    action: "上传简历",
  },
  {
    id: "first-jd",
    title: "添加第一个职位描述",
    description: "粘贴您感兴趣的职位描述，开始智能匹配",
    icon: Briefcase,
    action: "添加职位",
  },
  {
    id: "first-analysis",
    title: "查看 AI 分析结果",
    description: "了解您的简历与职位的匹配度及改进建议",
    icon: TrendingUp,
    action: "查看分析",
  },
  {
    id: "tutorial",
    title: "了解平台功能",
    description: "快速浏览 SyncHire 的核心功能和操作指南",
    icon: FileText,
    action: "开始教程",
  },
  {
    id: "complete",
    title: "开始您的求职之旅",
    description: "您已准备好使用 SyncHire 的所有功能",
    icon: CheckCircle2,
    action: "前往控制台",
  },
];

function OnboardingWorkflow() {
  const { onboarding, setOnboardingStep, completeOnboardingStep, skipOnboarding, finishOnboarding, resumes, jobDescriptions } = useAppStore();
  const [isOpen, setIsOpen] = useState(true);
  const [direction, setDirection] = useState<"next" | "prev">("next");

  const currentStepData = useMemo(
    () => onboardingSteps[onboarding.currentStep] || onboardingSteps[0],
    [onboarding.currentStep]
  );

  const progress = useMemo(
    () => ((onboarding.currentStep + 1) / onboardingSteps.length) * 100,
    [onboarding.currentStep]
  );

  const goToNextStep = useCallback(() => {
    if (onboarding.currentStep < onboardingSteps.length - 1) {
      completeOnboardingStep(currentStepData.id);
      setDirection("next");
      setOnboardingStep(onboarding.currentStep + 1);
    } else {
      finishOnboarding();
      setIsOpen(false);
    }
  }, [onboarding.currentStep, currentStepData.id, completeOnboardingStep, setOnboardingStep, finishOnboarding]);

  const goToPrevStep = useCallback(() => {
    if (onboarding.currentStep > 0) {
      setDirection("prev");
      setOnboardingStep(onboarding.currentStep - 1);
    }
  }, [onboarding.currentStep, setOnboardingStep]);

  const handleSkip = useCallback(() => {
    skipOnboarding();
    setIsOpen(false);
  }, [skipOnboarding]);

  const handleClose = useCallback(() => {
    if (onboarding.currentStep === 0) {
      handleSkip();
    } else {
      setIsOpen(false);
    }
  }, [onboarding.currentStep, handleSkip]);

  // Auto-progress based on user actions
  useEffect(() => {
    if (onboarding.currentStep === 2 && resumes.length > 0) {
      // Auto-advance from resume upload step if resume exists
      const timer = setTimeout(goToNextStep, 1000);
      return () => clearTimeout(timer);
    }
  }, [onboarding.currentStep, resumes.length, goToNextStep]);

  useEffect(() => {
    if (onboarding.currentStep === 3 && jobDescriptions.length > 0) {
      // Auto-advance from JD upload step if JD exists
      const timer = setTimeout(goToNextStep, 1000);
      return () => clearTimeout(timer);
    }
  }, [onboarding.currentStep, jobDescriptions.length, goToNextStep]);

  if (!isOpen || onboarding.isOnboarded) {
    return null;
  }

  const Icon = currentStepData.icon;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      role="dialog"
      aria-labelledby="onboarding-title"
      aria-modal="true"
    >
      <div
        className={cn(
          "bg-white rounded-2xl shadow-2xl w-full max-w-2xl transition-all duration-500 ease-in-out",
          direction === "next" ? "slide-in-right" : "slide-in-left"
        )}
      >
        {/* Header */}
        <div className="relative p-6 border-b border-gray-200">
          <button
            onClick={handleClose}
            className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
            aria-label="关闭引导"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600">
                步骤 {onboarding.currentStep + 1} / {onboardingSteps.length}
              </span>
              <button
                onClick={handleSkip}
                className="text-sm text-gray-500 hover:text-gray-700 underline focus:outline-none focus:ring-2 focus:ring-blue-600 rounded"
              >
                跳过引导
              </button>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          <div className="text-center">
            <div
              className={cn(
                "inline-flex items-center justify-center w-20 h-20 rounded-full mb-6 transition-all duration-500",
                onboarding.currentStep === 0
                  ? "bg-gradient-to-br from-blue-500 to-purple-600"
                  : onboarding.currentStep === onboardingSteps.length - 1
                  ? "bg-green-100"
                  : "bg-blue-100"
              )}
            >
              <Icon
                className={cn(
                  "h-10 w-10 transition-all duration-500",
                  onboarding.currentStep === 0
                    ? "text-white"
                    : onboarding.currentStep === onboardingSteps.length - 1
                    ? "text-green-600"
                    : "text-blue-600"
                )}
              />
            </div>

            <h2
              id="onboarding-title"
              className="text-2xl font-bold text-gray-900 mb-3"
            >
              {currentStepData.title}
            </h2>
            <p className="text-gray-600 text-lg mb-8">
              {currentStepData.description}
            </p>

            {/* Step-specific content */}
            {onboarding.currentStep === 1 && (
              <div className="bg-blue-50 rounded-lg p-6 mb-6 text-left">
                <h3 className="font-semibold text-gray-900 mb-3">
                  为什么需要完善资料？
                </h3>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span>个性化职位推荐</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span>更准确的简历匹配分析</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span>针对性的面试准备建议</span>
                  </li>
                </ul>
              </div>
            )}

            {onboarding.currentStep === 4 && (
              <div className="bg-green-50 rounded-lg p-6 mb-6 text-left">
                <h3 className="font-semibold text-gray-900 mb-3">
                  AI 分析将为您提供：
                </h3>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>简历与职位的匹配度评分</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>缺失技能和经验分析</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>具体的简历优化建议</span>
                  </li>
                </ul>
              </div>
            )}

            {onboarding.currentStep === 5 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-4 text-left">
                  <Briefcase className="h-8 w-8 text-blue-600 mb-2" />
                  <h4 className="font-semibold text-gray-900 mb-1">智能匹配</h4>
                  <p className="text-sm text-gray-600">
                    AI 分析简历与职位的匹配度
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-left">
                  <FileText className="h-8 w-8 text-green-600 mb-2" />
                  <h4 className="font-semibold text-gray-900 mb-1">简历优化</h4>
                  <p className="text-sm text-gray-600">
                    自动优化简历以提高 ATS 评分
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-left">
                  <TrendingUp className="h-8 w-8 text-purple-600 mb-2" />
                  <h4 className="font-semibold text-gray-900 mb-1">面试准备</h4>
                  <p className="text-sm text-gray-600">
                    生成针对性的面试问题和答案
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-left">
                  <GraduationCap className="h-8 w-8 text-orange-600 mb-2" />
                  <h4 className="font-semibold text-gray-900 mb-1">申请追踪</h4>
                  <p className="text-sm text-gray-600">
                    管理所有求职申请和状态
                  </p>
                </div>
              </div>
            )}

            {onboarding.currentStep === onboardingSteps.length - 1 && (
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-2 text-green-600">
                  <CheckCircle2 className="h-6 w-6" />
                  <span className="font-semibold">引导完成！</span>
                </div>
                <p className="text-gray-600">
                  您现在可以开始使用 SyncHire 的所有功能
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              onClick={goToPrevStep}
              disabled={onboarding.currentStep === 0}
              className="min-h-[44px] px-6"
              aria-label="上一步"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              上一步
            </Button>

            <div className="flex gap-2">
              {onboarding.currentStep < onboardingSteps.length - 1 ? (
                <Button
                  onClick={goToNextStep}
                  className="min-h-[44px] px-6"
                  aria-label="下一步"
                >
                  {currentStepData.action || "下一步"}
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={goToNextStep}
                  className="min-h-[44px] px-6 bg-green-600 hover:bg-green-700"
                  aria-label="开始使用"
                >
                  开始使用
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(OnboardingWorkflow);
