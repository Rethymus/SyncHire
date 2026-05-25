"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";
import { Save, Download, Eye, Edit, Sparkles, X, Check, AlertCircle, Clock, AlertTriangle, Palette } from "lucide-react";
import { cn } from "@/lib/utils";
import { sanitizeHtml, sanitizeMarkdownHtml } from "@/lib/sanitize";
import { memo } from "react";
import { TIMING, RESUME } from "@/lib/constants";
import { marked } from "marked";
import { resumeAPI } from "@/lib/api-client-consolidated";
import { useRouter } from "next/navigation";
import { TemplateGallery } from "@/components/template-gallery";
import { SavedTemplatesManager } from "@/components/saved-templates-manager";
import { ResumeEditorSkeleton } from "@/components/skeleton";
import { logger, LogCategory } from "@/lib/logger";

const defaultResumeTemplate = `# 张三
**前端开发工程师**

## 个人简介
5年前端开发经验，专注于React生态系统和现代Web技术。热衷于构建高性能、可维护的用户界面。

## 工作经历

### 字节跳动 | 高级前端工程师
*2022年3月 - 至今*

- 负责核心产品的前端架构设计和开发
- 使用Next.js和TypeScript重构旧系统，提升性能30%
- 带领5人前端团队，建立代码规范和CI/CD流程
- 实施前端监控和性能优化，LCP从2.5s优化到1.2s

### 腾讯 | 前端工程师
*2020年7月 - 2022年2月*

- 开发企业级SaaS平台的前端功能
- 使用React和Redux构建复杂的数据可视化组件
- 优化首屏加载速度，FCP提升40%
- 编写单元测试，测试覆盖率达到85%

## 技能

- **前端框架**: React, Vue, Next.js, Nuxt.js
- **状态管理**: Redux, Zustand, Pinia
- **构建工具**: Webpack, Vite, Turbopack
- **样式方案**: Tailwind CSS, CSS-in-JS
- **测试**: Jest, Testing Library, Playwright
- **语言**: TypeScript, JavaScript, Python

## 教育背景

### 清华大学 | 计算机科学与技术 | 本科
*2016年9月 - 2020年6月*

- GPA: 3.8/4.0
- 主修课程: 数据结构、算法、计算机网络、操作系统
- 毕业设计: 基于React的实时协作文档编辑器

## 项目经验

### 在线协作白板系统
*个人项目 | 2023年*

- 技术栈: Next.js 14, TypeScript, WebSocket, Canvas API
- 实现实时多人协作的白板功能，支持绘制、文字、图片等
- 使用WebSocket实现低延迟的同步机制
- 部署在Vercel，支持10,000+日活用户

## 证书与奖项

- AWS Certified Developer - Associate (2023)
- 公司年度优秀员工 (2023)
- ACM-ICPC区域赛银奖 (2019)
`;

/**
 * 安全的markdown渲染函数
 * 使用marked库解析markdown，然后通过DOMPurify进行XSS防护
 */
function renderMarkdown(markdown: string): string {
  try {
    // 使用marked库将markdown转换为HTML
    const html = marked(markdown) as string;
    // 使用DOMPurify净化HTML，防止XSS攻击
    return sanitizeMarkdownHtml(html);
  } catch (error) {
    // 如果渲染失败，返回纯文本（转义HTML）
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
  const { currentResume, updateResume, currentJD } = useAppStore();
  const router = useRouter();
  const [content, setContent] = useState(defaultResumeTemplate);
  const [previewMode, setPreviewMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aiOptimizing, setAiOptimizing] = useState(false);
  const [showOptimization, setShowOptimization] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
  const [optimizationError, setOptimizationError] = useState<string | null>(null);
  const [appliedOptimization, setAppliedOptimization] = useState(false);
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
    if (currentResume?.id !== prevResumeIdRef.current && currentResume?.content) {
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
  }, [currentResume?.id, currentResume?.content]);

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
      setSaveError(error instanceof Error ? error.message : "保存失败");
      setSaveStatus("error");

      // Reset status after 3 seconds
      resetSaveStatusTimer();
    } finally {
      setSaving(false);
    }
  }, [currentResume, updateResume, content, resetSaveStatusTimer]);

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
          text: "保存失败",
          className: "text-red-600"
        };
      default:
        return null;
    }
  }, [saveStatus, hasUnsavedChanges]);

  const handleAIOptimize = useCallback(async () => {
    if (!currentResume?.id) {
      setOptimizationError("请先选择要优化的简历");
      return;
    }

    if (!currentJD?.description) {
      setOptimizationError("请先选择目标职位描述");
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
          : response.error?.message || "优化失败，请重试";
        setOptimizationError(errorMessage);
      }
    } catch (error) {
      setOptimizationError(error instanceof Error ? error.message : "优化过程中出现错误");
    } finally {
      setAiOptimizing(false);
    }
  }, [currentResume, currentJD]);

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

  const handleExportPDF = useCallback(() => {
    // TODO: Implement PDF export functionality
    // Navigate to preview page with export dialog
    // router.push("/preview");
  }, []);

  const handleTogglePreview = useCallback(() => {
    setPreviewMode(prev => !prev);
  }, []);

  const handleSelectTemplate = useCallback((templateId: string) => {
    // Template selection logic
    logger.info(LogCategory.UI, `Template selected: ${templateId}`);
    // Could integrate with backend to save template preference
  }, []);

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
            简历编辑器
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
                编辑
              </>
            ) : (
              <>
                <Eye className="h-4 w-4 mr-2" />
                预览
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
            选择模板
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleManageTemplates}
            className="min-h-[44px] px-4"
          >
            <Palette className="h-4 w-4 mr-2" />
            我的模板
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleAIOptimize}
            disabled={aiOptimizing || !currentJD}
            className="min-h-[44px] px-4"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {aiOptimizing ? "优化中..." : "AI 优化"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPDF}
            className="min-h-[44px] px-4"
          >
            <Download className="h-4 w-4 mr-2" />
            导出 PDF
          </Button>

          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || !hasUnsavedChanges || saveStatus === "saving"}
            className="min-h-[44px] px-4"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? "保存中..." : "保存"}
          </Button>
        </div>
      </div>

      {/* Editor/Preview */}
      <div className="flex-1 overflow-hidden">
        {previewMode ? (
          <div className="h-full overflow-auto bg-gray-50">
            <div className="max-w-4xl mx-auto p-8 bg-white shadow-sm">
              <div
                className="prose prose-lg max-w-none"
                dangerouslySetInnerHTML={{
                  __html: sanitizeHtml(renderMarkdown(content)),
                }}
              />
            </div>
          </div>
        ) : (
          <div className="h-full flex">
            {/* Editor Area */}
            <div className="flex-1 border-r border-gray-200">
              <label htmlFor="resume-editor" className="sr-only">
                简历内容编辑
              </label>
              <textarea
                id="resume-editor"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full h-full p-8 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm leading-relaxed"
                placeholder="在这里编辑您的简历..."
                aria-describedby="editor-tips"
                style={{
                  minHeight: "100%",
                }}
              />
            </div>

            {/* Live Preview */}
            <div className="flex-1 overflow-auto bg-gray-50">
              <div className="max-w-4xl mx-auto p-8 bg-white shadow-sm">
                <h3 className="text-sm font-medium text-gray-600 mb-4 pb-2 border-b">
                  实时预览
                </h3>
                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{
                    __html: sanitizeHtml(renderMarkdown(content)),
                  }}
                />
              </div>
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
              编辑提示
            </h3>
            <p className="text-sm text-blue-700 mt-1">
              使用 Markdown 语法编辑简历。支持标题（#, ##, ###）、列表（-, *）、加粗（**text**）等功能。
              点击&ldquo;AI 优化&rdquo;按钮，让 AI 帮助您改进简历内容。
            </p>
            {currentJD ? (
              <p className="text-sm text-green-700 mt-1">
                ✓ 已选择目标职位：{currentJD.title}
              </p>
            ) : (
              <p className="text-sm text-amber-700 mt-1">
                ⚠ 请先选择目标职位描述以使用AI优化功能
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
              <h4 className="text-sm font-medium text-red-900">优化失败</h4>
              <p className="text-sm text-red-700 mt-1">{optimizationError}</p>
            </div>
            <button
              onClick={() => setOptimizationError(null)}
              className="text-red-500 hover:text-red-700"
              aria-label="关闭错误提示"
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
                  <h3 className="text-xl font-semibold text-gray-900">AI 优化结果</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    查看优化建议并决定是否应用更改
                  </p>
                </div>
                <button
                  onClick={handleRejectOptimization}
                  className="text-gray-400 hover:text-gray-600"
                  aria-label="关闭优化结果"
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
                      改进内容
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
                    <h4 className="font-medium text-blue-900">新增关键词</h4>
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
                    <h4 className="font-medium text-purple-900">优化的部分</h4>
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
                  <h4 className="font-medium text-gray-900 mb-3">原始简历</h4>
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
                  <h4 className="font-medium text-gray-900 mb-3">优化后简历</h4>
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
                拒绝更改
              </Button>
              <Button
                onClick={handleApplyOptimization}
                className="min-h-[44px] px-6 bg-green-600 hover:bg-green-700"
              >
                <Check className="h-4 w-4 mr-2" />
                应用优化
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
                  有未保存的更改
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  您有未保存的更改。是否要在离开前保存这些更改？
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => confirmNavigation(false)}
                className="min-h-[44px] px-6"
              >
                不保存
              </Button>
              <Button
                onClick={() => confirmNavigation(true)}
                className="min-h-[44px] px-6"
              >
                保存并继续
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
                留在此页面
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
              <h4 className="text-sm font-medium text-red-900">保存失败</h4>
              <p className="text-sm text-red-700 mt-1">{saveError}</p>
            </div>
            <button
              onClick={() => setSaveError(null)}
              className="text-red-500 hover:text-red-700"
              aria-label="关闭错误提示"
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
