"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";
import { Save, Download, Eye, Edit, Sparkles, X, Check, AlertCircle, Clock, AlertTriangle, Palette, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { sanitizeHtml } from "@/lib/sanitize";
import { memo } from "react";
import { TIMING, RESUME } from "@/lib/constants";
import { resumeAPI } from "@/lib/api-client-consolidated";
import { useRouter } from "next/navigation";
import { TemplateGallery } from "@/components/template-gallery";
import { SavedTemplatesManager } from "@/components/saved-templates-manager";
import { ResumeEditorSkeleton } from "@/components/skeleton";
import { logger, LogCategory } from "@/lib/logger";
import { useLiteCopy } from "@/lib/lite-i18n";
import {
  buildResumeDocumentHtml,
  getResumeTemplateLabel,
  getResumeTemplateStyles,
  renderResumeMarkdownHtml,
} from "@/lib/resume-rendering";

const COPY = {
  "en-US": {
    title: "Resume Editor",
    edit: "Edit",
    preview: "Preview",
    selectTemplate: "Choose Template",
    myTemplates: "My Templates",
    optimize: "AI Optimize",
    optimizing: "Optimizing...",
    exportPdf: "Export PDF",
    exportingPdf: "Exporting...",
    save: "Save",
    saving: "Saving...",
    editorLabel: "Resume content editor",
    placeholder: "Edit your resume here...",
    livePreview: "Live Preview",
    a4Preview: "A4 rendered preview",
    currentTemplate: "Current template",
    tipsTitle: "Editing Tip",
    tipsDescription:
      "Use Markdown to edit your resume. Headings, lists, and bold text are supported. Use AI Optimize to improve the resume for the selected job.",
    selectedTarget: "Target job selected:",
    missingTarget: "Select a target job description to use AI optimization.",
    optimizationFailed: "Optimization Failed",
    pdfMissingResume: "Select a resume before exporting.",
    pdfFailed: "PDF export failed",
    saveFailed: "Save failed",
    closeError: "Close error message",
    optimizationTitle: "AI Optimization Result",
    optimizationSubtitle: "Review the suggestions and decide whether to apply them.",
    changes: "Changes Made",
    keywords: "Keywords Added",
    sections: "Sections Improved",
    original: "Original Resume",
    optimized: "Optimized Resume",
    reject: "Reject Changes",
    apply: "Apply Optimization",
    unsavedTitle: "Unsaved Changes",
    unsavedDescription: "You have unsaved changes. Save before leaving this page?",
    discard: "Don't Save",
    saveContinue: "Save and Continue",
    stay: "Stay on this page",
  },
  "zh-CN": {
    title: "简历编辑器",
    edit: "编辑",
    preview: "预览",
    selectTemplate: "选择模板",
    myTemplates: "我的模板",
    optimize: "AI 优化",
    optimizing: "优化中...",
    exportPdf: "导出 PDF",
    exportingPdf: "导出中...",
    save: "保存",
    saving: "保存中...",
    editorLabel: "简历内容编辑",
    placeholder: "在这里编辑您的简历...",
    livePreview: "实时预览",
    a4Preview: "A4 渲染预览",
    currentTemplate: "当前模板",
    tipsTitle: "编辑提示",
    tipsDescription:
      "使用 Markdown 语法编辑简历。右侧 A4 预览与 PDF 导出使用同一套排版；模板可切换，内容可以继续由你和 AI 共同修改。",
    selectedTarget: "已选择目标职位：",
    missingTarget: "请先选择目标职位描述以使用 AI 优化功能。",
    optimizationFailed: "优化失败",
    pdfMissingResume: "请先选择要导出的简历",
    pdfFailed: "导出失败",
    saveFailed: "保存失败",
    closeError: "关闭错误提示",
    optimizationTitle: "AI 优化结果",
    optimizationSubtitle: "查看优化建议并决定是否应用更改。",
    changes: "改进内容",
    keywords: "新增关键词",
    sections: "优化的部分",
    original: "原始简历",
    optimized: "优化后简历",
    reject: "拒绝更改",
    apply: "应用优化",
    unsavedTitle: "有未保存的更改",
    unsavedDescription: "您有未保存的更改。是否要在离开前保存这些更改？",
    discard: "不保存",
    saveContinue: "保存并继续",
    stay: "留在此页面",
  },
} as const;

const defaultResumeTemplate = `# 陈宇
上海 | 138-0000-0000 | chen.yu@example.com | github.com/chenyu | portfolio.example.com

## 求职意向
前端开发工程师 / 全栈开发实习生，可尽快到岗，关注用户体验、工程质量与自动化测试。

## 教育背景
### 上海交通大学 | 计算机科学与技术 | 本科
2022.09 - 2026.06

- GPA：3.72/4.00，专业排名前 15%
- 主修课程：数据结构、计算机网络、操作系统、数据库系统、软件工程、人机交互
- 校内经历：前端技术社团核心成员，组织 4 次 React 与 TypeScript 分享

## 专业技能
- **前端工程**：React、Next.js、TypeScript、Zustand、Tailwind CSS，能独立完成组件拆分、状态管理与页面联调
- **测试与质量**：熟悉 Vitest、Testing Library、Playwright，能为关键流程补充单元测试和端到端测试
- **后端与数据**：了解 Node.js、REST API、PostgreSQL、Redis，能完成基础接口设计与数据建模
- **工程协作**：熟悉 Git、GitHub Actions、代码评审、需求拆解与问题复盘

## 项目经历
### SyncHire 本地优先求职助手 | 课程项目
2025.09 - 2026.01

- 负责简历管理、岗位匹配和申请看板的前端实现，使用 React + TypeScript 构建可复用表单、列表和状态流
- 设计本地存储的数据结构，支持简历、职位描述、申请状态和面试记录在浏览器内持久化
- 为核心流程补充 Playwright 回归用例，覆盖简历上传、岗位录入、匹配分析和 PDF 导出
- 将岗位关键词映射到简历证据，减少无依据改写，保证应届生项目经历表达真实可追溯

### 校园活动报名与签到系统 | 团队项目
2024.10 - 2025.01

- 负责活动列表、报名表单和签到管理页面，完成移动端适配和异常状态提示
- 使用 TypeScript 抽象表单校验规则，将重复校验代码减少约 40%
- 与后端同学联调 REST API，处理分页、搜索、失败重试和空状态展示

## 实习与实践
### 前端开发实习生 | 某 SaaS 创业团队
2025.07 - 2025.09

- 参与客户管理模块迭代，完成表格筛选、批量操作和详情抽屉等高频功能
- 根据设计稿还原页面并优化可访问性，为按钮、弹窗和表单补齐键盘焦点与语义标签
- 参与每周代码评审，修复 12 个影响数据展示和交互反馈的问题

## 个人优势
- 能把岗位要求转化为可验证的项目证据，不堆砌空泛形容词
- 对中文简历表达、A4 排版、ATS 可读性和 PDF 导出一致性有工程化意识
- 接受快速学习和跨端协作，能在明确边界内独立推进任务
`;

function renderMarkdown(markdown: string): string {
  try {
    return renderResumeMarkdownHtml(markdown);
  } catch (error) {
    return sanitizeHtml(markdown);
  }
}

interface OptimizationResult {
  optimized_content: string;
  changes_made: string[];
  keywords_added: string[];
  sections_improved: string[];
}

type SaveStatus = "saving" | "saved" | "error" | "idle" | "unsaved";

function ResumeEditorComponent() {
  const { locale } = useLiteCopy();
  const copy = COPY[locale];
  const {
    currentResume,
    updateResume,
    currentJD,
    selectedTemplate,
    setSelectedTemplate,
  } = useAppStore();
  const router = useRouter();
  const [content, setContent] = useState(defaultResumeTemplate);
  const [previewMode, setPreviewMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aiOptimizing, setAiOptimizing] = useState(false);
  const [showOptimization, setShowOptimization] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
  const [optimizationError, setOptimizationError] = useState<string | null>(null);
  const [appliedOptimization, setAppliedOptimization] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [showTemplateGallery, setShowTemplateGallery] = useState(false);
  const [showSavedTemplates, setShowSavedTemplates] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Auto-save states
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle" as SaveStatus);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const [lastSavedContent, setLastSavedContent] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);

  const prevResumeIdRef = useRef<string | undefined>(undefined);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const saveStatusTimerRef = useRef<NodeJS.Timeout | null>(null);
  const INITIAL_CONTENT_REF = useRef("");
  const AUTO_SAVE_INTERVAL = 30000; // 30 seconds

  // Derived state: has unsaved changes
  const hasUnsavedChanges = lastSavedContent && content !== lastSavedContent;

  useEffect(() => {
    if (!currentResume?.content) {
      return;
    }

    const resumeChanged = currentResume.id !== prevResumeIdRef.current;
    const upstreamContentChanged = currentResume.content !== lastSavedContent && !hasUnsavedChanges;

    if (resumeChanged || upstreamContentChanged) {
      setInitialLoading(true);
      setContent(currentResume.content);
      setLastSavedContent(currentResume.content);
      INITIAL_CONTENT_REF.current = currentResume.content;
      setSaveStatus("idle");
      setSaveError(null);
      prevResumeIdRef.current = currentResume.id;

      // Simulate minimum loading time for smooth UX
      setTimeout(() => setInitialLoading(false), 300);
    }
  }, [currentResume?.id, currentResume?.content, hasUnsavedChanges, lastSavedContent]);

  // Auto-save functionality
  useEffect(() => {
    // Clear existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // Only auto-save if there are unsaved changes and not currently saving
    if (hasUnsavedChanges && saveStatus !== "saving" && currentResume) {
      autoSaveTimerRef.current = setTimeout(() => {
        // Direct inline auto-save logic to avoid useCallback dependency issues
        if (!currentResume) return;

        setSaveStatus("saving");
        setSaveError(null);

        updateResume(currentResume.id, { content });

        // Simulate API call delay
        setTimeout(() => {
          setLastSavedContent(content);
          setSaveStatus("saved");

          // Reset status after 3 seconds
          setTimeout(() => {
            setSaveStatus(prevStatus => (prevStatus === "saved" || prevStatus === "error") ? "idle" : prevStatus);
          }, 3000);
        }, TIMING.API_CALL.SHORT);
      }, AUTO_SAVE_INTERVAL);
    }

    // Cleanup on unmount
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [hasUnsavedChanges, saveStatus, currentResume, content, updateResume]);

  // Reset save status timer
  const resetSaveStatusTimer = useCallback(() => {
    if (saveStatusTimerRef.current) {
      clearTimeout(saveStatusTimerRef.current);
    }

    saveStatusTimerRef.current = setTimeout(() => {
      setSaveStatus(prevStatus => {
        if (prevStatus === "saved" || prevStatus === "error") {
          return "unsaved";
        }
        return prevStatus;
      });
    }, 3000);
  }, []);

  // Handle navigation with unsaved changes warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = ""; // Required for Chrome
        return "";
      }
    };

    const handleRouteChange = (url: string) => {
      if (hasUnsavedChanges) {
        setPendingNavigation(url);
        setShowUnsavedWarning(true);
        // @ts-ignore - Preventing navigation
        router.events?.emit("routeChangeError", url, url, { shallow: false });
        throw new Error("Navigation cancelled due to unsaved changes");
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    // Note: Next.js App Router doesn't have router.events like Pages Router
    // Navigation protection is handled through beforeunload event

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasUnsavedChanges, router]);

  // Confirm navigation with unsaved changes
  const confirmNavigation = useCallback((shouldSave: boolean) => {
    setShowUnsavedWarning(false);

    if (shouldSave && currentResume) {
      // Save before navigating
      setSaveStatus("saving");
      setSaveError(null);

      updateResume(currentResume.id, { content });

      // Simulate API call delay and navigate
      setTimeout(() => {
        setLastSavedContent(content);
        setSaveStatus("saved");

        if (pendingNavigation) {
          router.push(pendingNavigation);
        }
      }, TIMING.API_CALL.SHORT);
    } else {
      // Navigate without saving
      if (pendingNavigation) {
        router.push(pendingNavigation);
      }
    }

    setPendingNavigation(null);
  }, [currentResume, pendingNavigation, content, updateResume, router]);

  const handleSave = useCallback(async () => {
    if (!currentResume) return;

    setSaving(true);
    setSaveStatus("saving");
    setSaveError(null);

    try {
      updateResume(currentResume.id, { content });

      await new Promise(resolve => setTimeout(resolve, TIMING.API_CALL.SHORT));

      setLastSavedContent(content);
      setSaveStatus("saved");

      // Reset status after 3 seconds
      resetSaveStatusTimer();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : copy.saveFailed);
      setSaveStatus("error");

      // Reset status after 3 seconds
      resetSaveStatusTimer();
    } finally {
      setSaving(false);
    }
  }, [copy.saveFailed, currentResume, updateResume, content, resetSaveStatusTimer]);

  // Get save status icon and text
  const getSaveStatusDisplay = useCallback(() => {
    // Show unsaved status if there are unsaved changes and not currently saving
    if (hasUnsavedChanges && saveStatus === "idle") {
      return {
        icon: <AlertTriangle className="h-4 w-4" />,
        text: RESUME.STATUS_UNSAVED,
        className: "text-amber-600"
      };
    }

    switch (saveStatus) {
      case "saving":
        return {
          icon: <Clock className="h-4 w-4 animate-spin" />,
          text: RESUME.STATUS_SAVING,
          className: "text-blue-600"
        };
      case "saved":
        return {
          icon: <Check className="h-4 w-4" />,
          text: RESUME.STATUS_SAVED,
          className: "text-green-600"
        };
      case "error":
        return {
          icon: <AlertCircle className="h-4 w-4" />,
          text: copy.saveFailed,
          className: "text-red-600"
        };
      default:
        return null;
    }
  }, [copy.saveFailed, saveStatus, hasUnsavedChanges]);

  const handleAIOptimize = useCallback(async () => {
    if (!currentResume?.id) {
      setOptimizationError(copy.pdfMissingResume);
      return;
    }

    if (!currentJD?.description) {
      setOptimizationError(copy.missingTarget);
      return;
    }

    setAiOptimizing(true);
    setOptimizationError(null);
    setAppliedOptimization(false);

    try {
      const response = await resumeAPI.optimize(currentResume.id, currentJD.description);

      if (response.success && response.data) {
        setOptimizationResult(response.data);
        setShowOptimization(true);
      } else {
        // Normalize error to string (handle both string and APIError types)
        const errorMessage = typeof response.error === 'string'
          ? response.error
          : response.error?.message || copy.optimizationFailed;
        setOptimizationError(errorMessage);
      }
    } catch (error) {
      setOptimizationError(error instanceof Error ? error.message : copy.optimizationFailed);
    } finally {
      setAiOptimizing(false);
    }
  }, [copy.missingTarget, copy.optimizationFailed, copy.pdfMissingResume, currentResume, currentJD]);

  const handleApplyOptimization = useCallback(() => {
    if (optimizationResult?.optimized_content) {
      setContent(optimizationResult.optimized_content);
      setAppliedOptimization(true);
      setShowOptimization(false);
    }
  }, [optimizationResult]);

  const handleRejectOptimization = useCallback(() => {
    setShowOptimization(false);
    setOptimizationResult(null);
  }, []);

  const handleExportPDF = useCallback(async () => {
    if (!currentResume) {
      setSaveError(copy.pdfMissingResume);
      setSaveStatus("error");
      return;
    }

    setExportingPdf(true);
    setSaveError(null);

    try {
      const html = buildResumeDocumentHtml(content, selectedTemplate);
      const response = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          html,
          template: selectedTemplate,
          filename: currentResume.name || "synchire-tailored-resume",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: copy.pdfFailed }));
        throw new Error(errorData.error || errorData.detail || copy.pdfFailed);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${currentResume.name || "synchire-tailored-resume"}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      setSaveStatus("saved");
      resetSaveStatusTimer();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : copy.pdfFailed);
      setSaveStatus("error");
      resetSaveStatusTimer();
    } finally {
      setExportingPdf(false);
    }
  }, [content, copy.pdfFailed, copy.pdfMissingResume, currentResume, resetSaveStatusTimer, selectedTemplate]);

  const handleTogglePreview = useCallback(() => {
    setPreviewMode(prev => !prev);
  }, []);

  const handleSelectTemplate = useCallback((templateId: string) => {
    logger.info(LogCategory.UI, `Template selected: ${templateId}`);
    setSelectedTemplate(templateId);
  }, [setSelectedTemplate]);

  const handleManageTemplates = useCallback(() => {
    setShowSavedTemplates(true);
  }, []);

  // Show skeleton during initial load
  if (initialLoading) {
    return <ResumeEditorSkeleton />;
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-gray-900">
            {copy.title}
          </h2>
          {currentResume && (
            <span className="text-sm text-gray-600">
              - {currentResume.name}
            </span>
          )}
          {/* Save Status Indicator */}
          {getSaveStatusDisplay() && (
            <div className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100",
              getSaveStatusDisplay()?.className
            )}>
              {getSaveStatusDisplay()?.icon}
              <span>{getSaveStatusDisplay()?.text}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <Button
            variant="outline"
            size="sm"
            onClick={handleTogglePreview}
            className="min-h-[44px] px-4"
          >
            {previewMode ? (
              <>
                <Edit className="h-4 w-4 mr-2" />
                {copy.edit}
              </>
            ) : (
              <>
                <Eye className="h-4 w-4 mr-2" />
                {copy.preview}
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTemplateGallery(true)}
            className="min-h-[44px] px-4"
          >
            <Palette className="h-4 w-4 mr-2" />
            {copy.selectTemplate}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleManageTemplates}
            className="min-h-[44px] px-4"
          >
            <Palette className="h-4 w-4 mr-2" />
            {copy.myTemplates}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleAIOptimize}
            disabled={aiOptimizing || !currentJD}
            className="min-h-[44px] px-4"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {aiOptimizing ? copy.optimizing : copy.optimize}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPDF}
            disabled={exportingPdf}
            className="min-h-[44px] px-4"
          >
            <Download className="h-4 w-4 mr-2" />
            {exportingPdf ? copy.exportingPdf : copy.exportPdf}
          </Button>

          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || !hasUnsavedChanges || saveStatus === "saving"}
            className="min-h-[44px] px-4"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? copy.saving : copy.save}
          </Button>
        </div>
      </div>

      {/* Editor/Preview */}
      <div className="flex-1 overflow-hidden">
        {previewMode ? (
          <div className="synchire-resume-shell h-full">
            <style>{getResumeTemplateStyles(selectedTemplate)}</style>
            <div className="mb-4 flex items-center justify-between text-sm text-gray-700">
              <div className="flex items-center gap-2 font-medium">
                <FileText className="h-4 w-4" />
                {copy.a4Preview}
              </div>
              <span>
                {copy.currentTemplate}: {getResumeTemplateLabel(selectedTemplate, locale)}
              </span>
            </div>
            <main
              className="synchire-resume-page"
              dangerouslySetInnerHTML={{
                __html: renderMarkdown(content),
              }}
            />
          </div>
        ) : (
          <div className="grid h-full lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.86fr)]">
            {/* Editor Area */}
            <div className="min-h-0 border-r border-gray-200">
              <label htmlFor="resume-editor" className="sr-only">
                {copy.editorLabel}
              </label>
              <textarea
                id="resume-editor"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full h-full p-8 pb-32 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm leading-relaxed"
                placeholder={copy.placeholder}
                aria-describedby="editor-tips"
                style={{
                  minHeight: "100%",
                }}
              />
            </div>

            {/* Live Preview */}
            <div className="synchire-resume-shell min-h-0 pb-32">
              <style>{getResumeTemplateStyles(selectedTemplate)}</style>
              <div className="mb-4 flex items-center justify-between gap-3 text-sm text-gray-700">
                <h3 className="flex items-center gap-2 font-medium">
                  <FileText className="h-4 w-4" />
                  {copy.livePreview}
                </h3>
                <span className="shrink-0">
                  {copy.currentTemplate}: {getResumeTemplateLabel(selectedTemplate, locale)}
                </span>
              </div>
              <main
                className="synchire-resume-page"
                dangerouslySetInnerHTML={{
                  __html: renderMarkdown(content),
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Tips */}
      <div className="p-4 bg-blue-50 border-t border-blue-100" id="editor-tips">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" aria-hidden="true" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-blue-900">
              {copy.tipsTitle}
            </h3>
            <p className="text-sm text-blue-700 mt-1">
              {copy.tipsDescription}
            </p>
            {currentJD ? (
              <p className="text-sm text-green-700 mt-1">
                {copy.selectedTarget}{currentJD.title}
              </p>
            ) : (
              <p className="text-sm text-amber-700 mt-1">
                {copy.missingTarget}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Optimization Error Alert */}
      {optimizationError && (
        <div className="absolute bottom-20 right-4 max-w-md bg-red-50 border border-red-200 rounded-lg shadow-lg p-4 z-10">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-red-900">{copy.optimizationFailed}</h4>
              <p className="text-sm text-red-700 mt-1">{optimizationError}</p>
            </div>
            <button
              onClick={() => setOptimizationError(null)}
              className="text-red-500 hover:text-red-700"
              aria-label={copy.closeError}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Optimization Result Panel */}
      {showOptimization && optimizationResult && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">{copy.optimizationTitle}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {copy.optimizationSubtitle}
                  </p>
                </div>
                <button
                  onClick={handleRejectOptimization}
                  className="text-gray-400 hover:text-gray-600"
                  aria-label={copy.closeError}
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Changes Summary */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-medium text-green-900 flex items-center gap-2">
                      <Check className="h-4 w-4" />
                      {copy.changes}
                    </h4>
                    <ul className="mt-2 space-y-1 text-sm text-green-800">
                      {optimizationResult.changes_made.map((change, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-green-600 mt-1">•</span>
                          <span>{change}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900">{copy.keywords}</h4>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {optimizationResult.keywords_added.map((keyword, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <h4 className="font-medium text-purple-900">{copy.sections}</h4>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {optimizationResult.sections_improved.map((section, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-sm"
                        >
                          {section}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Original vs Optimized */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">{copy.original}</h4>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 h-96 overflow-auto">
                    <div
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{
                        __html: sanitizeHtml(renderMarkdown(content)),
                      }}
                    />
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-3">{copy.optimized}</h4>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 h-96 overflow-auto">
                    <div
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{
                        __html: sanitizeHtml(renderMarkdown(optimizationResult.optimized_content)),
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={handleRejectOptimization}
                className="min-h-[44px] px-6"
              >
                {copy.reject}
              </Button>
              <Button
                onClick={handleApplyOptimization}
                className="min-h-[44px] px-6 bg-green-600 hover:bg-green-700"
              >
                <Check className="h-4 w-4 mr-2" />
                {copy.apply}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Unsaved Changes Warning Modal */}
      {showUnsavedWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {copy.unsavedTitle}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {copy.unsavedDescription}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => confirmNavigation(false)}
                className="min-h-[44px] px-6"
              >
                {copy.discard}
              </Button>
              <Button
                onClick={() => confirmNavigation(true)}
                className="min-h-[44px] px-6"
              >
                {copy.saveContinue}
              </Button>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowUnsavedWarning(false);
                  setPendingNavigation(null);
                }}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                {copy.stay}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Error Toast */}
      {saveError && (
        <div className="fixed bottom-20 right-4 max-w-md bg-red-50 border border-red-200 rounded-lg shadow-lg p-4 z-10">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-red-900">{copy.saveFailed}</h4>
              <p className="text-sm text-red-700 mt-1">{saveError}</p>
            </div>
            <button
              onClick={() => setSaveError(null)}
              className="text-red-500 hover:text-red-700"
              aria-label={copy.closeError}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Template Gallery */}
      {showTemplateGallery && (
        <TemplateGallery
          onSelectTemplate={handleSelectTemplate}
          onClose={() => setShowTemplateGallery(false)}
        />
      )}

      {/* Saved Templates Manager */}
      {showSavedTemplates && (
        <SavedTemplatesManager
          onLoadTemplate={handleSelectTemplate}
          onClose={() => setShowSavedTemplates(false)}
        />
      )}
    </div>
  );
}

export const ResumeEditor = memo(ResumeEditorComponent);
