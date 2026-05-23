"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";
import { Save, Download, Eye, Edit, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { sanitizeHtml } from "@/lib/sanitize";
import { memo } from "react";
import { TIMING } from "@/lib/constants";

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

const renderMarkdownRules = [
  { pattern: /^### (.*$)/gim, replacement: "<h3 class='text-xl font-bold mt-6 mb-3'>$1</h3>" },
  { pattern: /^## (.*$)/gim, replacement: "<h2 class='text-2xl font-bold mt-6 mb-4'>$1</h2>" },
  { pattern: /^# (.*$)/gim, replacement: "<h1 class='text-3xl font-bold mb-4'>$1</h1>" },
  { pattern: /\*\*(.*)\*\*/gim, replacement: "<strong class='font-semibold'>$1</strong>" },
  { pattern: /^\* (.*$)/gim, replacement: "<li class='ml-4'>$1</li>" },
  { pattern: /^- (.*$)/gim, replacement: "<li class='ml-4'>$1</li>" },
  { pattern: /\n/gim, replacement: "<br>" },
] as const;

/**
 * 优化的markdown渲染函数
 * 使用规则数组提高可维护性和性能
 */
function renderMarkdown(markdown: string): string {
  return renderMarkdownRules.reduce((text, rule) =>
    text.replace(rule.pattern, rule.replacement), markdown
  );
}

function ResumeEditorComponent() {
  const { currentResume, updateResume } = useAppStore();
  const [content, setContent] = useState(defaultResumeTemplate);
  const [previewMode, setPreviewMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aiOptimizing, setAiOptimizing] = useState(false);

  useEffect(() => {
    if (currentResume?.content) {
      setContent(currentResume.content);
    }
  }, [currentResume]);

  const handleSave = useCallback(async () => {
    if (!currentResume) return;

    setSaving(true);
    try {
      updateResume(currentResume.id, { content });
      await new Promise(resolve => setTimeout(resolve, TIMING.API_CALL.SHORT));
    } finally {
      setSaving(false);
    }
  }, [currentResume, updateResume]);

  const handleAIOptimize = useCallback(async () => {
    setAiOptimizing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, TIMING.API_CALL.EXTRA_LONG));
      // TODO: Implement AI optimization API call
    } finally {
      setAiOptimizing(false);
    }
  }, []);

  const handleExportPDF = useCallback(() => {
    // TODO: Implement PDF export functionality
    // Navigate to preview page with export dialog
    // router.push("/preview");
  }, []);

  const handleTogglePreview = useCallback(() => {
    setPreviewMode(prev => !prev);
  }, []);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-gray-900">
            简历编辑器
          </h2>
          {currentResume && (
            <span className="text-sm text-gray-500">
              - {currentResume.name}
            </span>
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
            onClick={handleAIOptimize}
            disabled={aiOptimizing}
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
            disabled={saving}
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
                <h3 className="text-sm font-medium text-gray-500 mb-4 pb-2 border-b">
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
              点击"AI 优化"按钮，让 AI 帮助您改进简历内容。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export const ResumeEditor = memo(ResumeEditorComponent);
