"use client";

import { useState, useCallback, useMemo, memo, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  X,
  ChevronRight,
  ChevronLeft,
  Info,
  LayoutDashboard,
  FileText,
  Briefcase,
  Search,
  Settings,
} from "lucide-react";

interface TourStep {
  id: string;
  title: string;
  description: string;
  target: string;
  position: "top" | "bottom" | "left" | "right" | "center";
  icon?: React.ComponentType<{ className?: string }>;
}

interface ProductTourProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

const tourSteps: TourStep[] = [
  {
    id: "dashboard",
    title: "控制台",
    description: "这里显示您的求职概况、统计数据和快速操作入口。您可以从此处开始新的申请流程。",
    target: "[data-tour='dashboard']",
    position: "right",
    icon: LayoutDashboard,
  },
  {
    id: "search",
    title: "搜索功能",
    description: "使用强大的搜索功能快速找到您的简历、职位描述和申请记录。支持关键词、标签和高级筛选。",
    target: "[data-tour='search']",
    position: "bottom",
    icon: Search,
  },
  {
    id: "resumes",
    title: "简历管理",
    description: "上传和管理您的简历。AI 会自动分析并优化您的简历，提高 ATS 通过率。",
    target: "[data-tour='resumes']",
    position: "right",
    icon: FileText,
  },
  {
    id: "jobs",
    title: "职位管理",
    description: "保存和管理您感兴趣的职位描述。创建申请并跟踪每个职位的状态。",
    target: "[data-tour='jobs']",
    position: "right",
    icon: Briefcase,
  },
  {
    id: "settings",
    title: "设置",
    description: "自定义您的账户设置、偏好配置和隐私选项。",
    target: "[data-tour='settings']",
    position: "left",
    icon: Settings,
  },
];

function ProductTour({ isOpen, onClose, onComplete }: ProductTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightedElement, setHighlightedElement] = useState<HTMLElement | null>(null);
  const spotlightRef = useRef<HTMLDivElement>(null);

  const currentTourStep = useMemo(() => tourSteps[currentStep], [currentStep]);
  const isLastStep = currentStep === tourSteps.length - 1;
  const isFirstStep = currentStep === 0;

  const goToNextStep = useCallback(() => {
    if (isLastStep) {
      onComplete?.();
      onClose();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  }, [isLastStep, onComplete, onClose]);

  const goToPrevStep = useCallback(() => {
    if (!isFirstStep) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [isFirstStep]);

  const skipTour = useCallback(() => {
    onClose();
  }, [onClose]);

  // Find and highlight target element
  useEffect(() => {
    if (!isOpen) {
      requestAnimationFrame(() => {
        setHighlightedElement(null);
      });
      return;
    }

    const targetElement = document.querySelector(currentTourStep.target) as HTMLElement;
    if (targetElement) {
      // Use requestAnimationFrame to avoid setting state during render
      requestAnimationFrame(() => {
        setHighlightedElement(targetElement);

        // Scroll element into view
        targetElement.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "center",
        });

        // Add highlight class
        targetElement.classList.add("tour-highlight");
      });

      return () => {
        targetElement.classList.remove("tour-highlight");
      };
    }
  }, [isOpen, currentStep, currentTourStep.target]);

  // Update spotlight position
  useEffect(() => {
    if (!isOpen || !highlightedElement || !spotlightRef.current) return;

    const rect = highlightedElement.getBoundingClientRect();
    const spotlight = spotlightRef.current;

    spotlight.style.width = `${rect.width + 16}px`;
    spotlight.style.height = `${rect.height + 16}px`;
    spotlight.style.top = `${Math.max(0, rect.top - 8)}px`;
    spotlight.style.left = `${Math.max(0, rect.left - 8)}px`;
  }, [isOpen, highlightedElement]);

  if (!isOpen) return null;

  const Icon = currentTourStep.icon || Info;

  return (
    <>
      {/* Spotlight overlay */}
      <div
        ref={spotlightRef}
        className="fixed inset-0 z-40 pointer-events-none transition-all duration-300"
        style={{
          boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.75)",
          borderRadius: "8px",
        }}
      />

      {/* Tooltip */}
      <div
        className={cn(
          "fixed z-50 bg-white rounded-lg shadow-2xl p-6 max-w-sm transition-all duration-300",
          currentTourStep.position === "center" && "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        )}
        style={
          currentTourStep.position !== "center" && highlightedElement
            ? {
                top:
                  currentTourStep.position === "bottom"
                    ? `${highlightedElement.getBoundingClientRect().bottom + 16}px`
                    : currentTourStep.position === "top"
                    ? `${highlightedElement.getBoundingClientRect().top - 8}px`
                    : `${highlightedElement.getBoundingClientRect().top}px`,
                left:
                  currentTourStep.position === "left"
                    ? `${highlightedElement.getBoundingClientRect().left - 400}px`
                    : currentTourStep.position === "right"
                    ? `${highlightedElement.getBoundingClientRect().right + 16}px`
                    : `${highlightedElement.getBoundingClientRect().left}px`,
              }
            : {}
        }
        role="dialog"
        aria-labelledby="tour-title"
        aria-modal="true"
      >
        {/* Close button */}
        <button
          onClick={skipTour}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
          aria-label="跳过教程"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Content */}
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <div className="bg-blue-100 rounded-lg p-2">
                <Icon className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <div className="flex-1">
              <h3
                id="tour-title"
                className="text-lg font-semibold text-gray-900 mb-2"
              >
                {currentTourStep.title}
              </h3>
              <p className="text-gray-600 text-sm">
                {currentTourStep.description}
              </p>
            </div>
          </div>

          {/* Progress indicator */}
          <div className="flex items-center gap-2">
            {tourSteps.map((_, idx) => (
              <div
                key={idx}
                className={cn(
                  "h-1 rounded-full transition-all duration-300",
                  idx === currentStep
                    ? "bg-blue-600 flex-1"
                    : idx < currentStep
                    ? "bg-blue-300 w-4"
                    : "bg-gray-200 w-4"
                )}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPrevStep}
              disabled={isFirstStep}
              className="min-h-[36px]"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              上一步
            </Button>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">
                {currentStep + 1} / {tourSteps.length}
              </span>
              <Button
                size="sm"
                onClick={goToNextStep}
                className="min-h-[36px]"
              >
                {isLastStep ? "完成" : "下一步"}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Global styles for tour highlight */}
      <style jsx global>{`
        .tour-highlight {
          position: relative;
          z-index: 45;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.5);
          border-radius: 8px;
          transition: all 0.3s ease;
        }
        .tour-highlight:hover {
          box-shadow: 0 0 0 6px rgba(59, 130, 246, 0.7);
        }
      `}</style>
    </>
  );
}

export default memo(ProductTour);
