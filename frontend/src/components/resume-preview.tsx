"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";
import {
  FileText,
  Download,
  Eye,
  ChevronLeft,
  ChevronRight,
  Palette,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { sanitizeHtml } from "@/lib/sanitize";
import { logger } from "@/lib/logger";
import { LogCategory } from "@/lib/logger";
import { resumeTemplates, getTemplateById, type ResumeTemplate } from "@/lib/templates/resume-templates";
import { TemplateGallery } from "@/components/template-gallery";
import { ResumePreviewSkeleton } from "@/components/skeleton";

function renderMarkdownToHTML(markdown: string): string {
  const lines = markdown.split("\n");
  let html = "";
  let inList = false;
  const currentSection = "";

  const parseInfo = (line: string) => {
    // Extract contact info from header
    if (line.includes("|")) {
      const parts = line.split("|").map(p => p.trim());
      if (parts.length >= 2) {
        return `<div class="resume-contact-item">${parts[1]}</div>`;
      }
    }
    return null;
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    if (trimmed.startsWith("# ")) {
      if (inList) {
        html += "</ul>";
        inList = false;
      }
      const text = trimmed.substring(2);
      if (index < 5) {
        // Assume first few headings are header info
        if (!html.includes("resume-header")) {
          html += `<div class="resume-header">
            <div class="resume-name">${text.replace(/\*\*/g, "")}</div>`;
        }
      } else {
        html += `<div class="resume-section">
          <div class="resume-section-title">${text.replace(/\*\*/g, "")}</div>`;
      }
    } else if (trimmed.startsWith("### ")) {
      if (inList) {
        html += "</ul>";
        inList = false;
      }
      const text = trimmed.substring(3).replace(/\*\*/g, "");
      html += `<div class="resume-item">
        <div class="resume-item-header">
          <div class="resume-item-title">${text}</div>
        </div>`;
    } else if (trimmed.startsWith("## ")) {
      if (inList) {
        html += "</ul>";
        inList = false;
      }
      const text = trimmed.substring(2);
      if (!text.includes("经历") && !text.includes("项目") && !text.includes("技能") && !text.includes("教育")) {
        html += `<div class="resume-item-subtitle">${text.replace(/\*\*/g, "")}</div>`;
      } else {
        html += `</div>`;
        html += `<div class="resume-section">
          <div class="resume-section-title">${text.replace(/\*\*/g, "")}</div>`;
      }
    } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      if (!inList) {
        html += "<ul>";
        inList = true;
      }
      const text = trimmed.substring(2);
      html += `<li>${text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")}</li>`;
    } else if (trimmed.match(/^\*.*\*$/)) {
      // Bold standalone text
      if (!inList) {
        html += `<div class="resume-item-description">${trimmed.replace(/\*/g, "")}</div>`;
      }
    } else if (trimmed && !trimmed.startsWith("#")) {
      // Regular text
      if (inList) {
        html += "</ul>";
        inList = false;
      }
      const text = trimmed.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
      html += `<div class="resume-item-description">${text}</div>`;
    }
  });

  if (inList) {
    html += "</ul>";
  }

  return html;
}

export function ResumePreview() {
  const { currentResume } = useAppStore();
  const [selectedTemplate, setSelectedTemplate] = useState<string>("minimal");
  const [zoom, setZoom] = useState(100);
  const [loading, setLoading] = useState(true);
  const [templateCSS, setTemplateCSS] = useState("");
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [showTemplateGallery, setShowTemplateGallery] = useState(false);
  const [currentTemplateData, setCurrentTemplateData] = useState<ResumeTemplate | null>(null);

  // Memoize rendered HTML to avoid re-rendering markdown on every update
  const renderedHTML = useMemo(() => {
    const content = currentResume?.content || "";
    return renderMarkdownToHTML(content);
  }, [currentResume?.content]);

  // Update current template data when template changes
  const template = useMemo(() => getTemplateById(selectedTemplate), [selectedTemplate]);
  if (template !== currentTemplateData) {
    setCurrentTemplateData(template || null);
  }

  useEffect(() => {
    const loadTemplate = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/templates/${selectedTemplate}.css`);
        const css = await response.text();
        setTemplateCSS(css);
      } catch (error) {
        logger.error(LogCategory.PERF, "Failed to load template", error as Error);
      } finally {
        setLoading(false);
      }
    };

    loadTemplate();
  }, [selectedTemplate]);

  const handleTemplateSelect = useCallback((templateId: string) => {
    setSelectedTemplate(templateId);
    setShowTemplateGallery(false);
    logger.info(LogCategory.UI, `Template changed to: ${templateId}`);
  }, []);

  const handleDownloadPDF = useCallback(async () => {
    if (!currentResume?.id) {
      logger.error(LogCategory.UI, "No resume selected for PDF export");
      return;
    }

    setPdfGenerating(true);
    try {
      // Call backend API to generate PDF
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/resumes/${currentResume.id}/export`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          template: selectedTemplate,
          dpi: 300,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: "Unknown error" }));
        throw new Error(errorData.detail || "Failed to generate PDF");
      }

      // Download the PDF file
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${currentResume.name || "resume"}_${selectedTemplate}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      logger.info(LogCategory.UI, "PDF exported successfully");
    } catch (error) {
      logger.error(LogCategory.UI, "PDF generation error", error as Error);
      // Show user-friendly error message
      alert(`PDF generation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setPdfGenerating(false);
    }
  }, [currentResume, selectedTemplate]);

  const handleZoomIn = useCallback(() => setZoom((prev) => Math.min(prev + 10, 150)), []);
  const handleZoomOut = useCallback(() => setZoom((prev) => Math.max(prev - 10, 50)), []);

  // Memoize template rendering to avoid unnecessary re-renders
  const memoizedTemplates = useMemo(() =>
    resumeTemplates.map((template) => ({ ...template })),
    []
  );

  return (
    <div className="flex flex-col h-full bg-gray-100">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-900">
            简历预览
          </h2>

          {/* Template Selector */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTemplateGallery(true)}
              className="min-h-[36px] px-3"
            >
              <Palette className="h-4 w-4 mr-2" />
              {currentTemplateData?.name || "选择模板"}
            </Button>
            <select
              id="template-select"
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {memoizedTemplates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomOut}
              disabled={zoom <= 50}
              aria-label="缩小"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span
              className="text-sm text-gray-700 min-w-[3rem] text-center"
              aria-label={`当前缩放: ${zoom}%`}
              role="status"
            >
              {zoom}%
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomIn}
              disabled={zoom >= 150}
              aria-label="放大"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleDownloadPDF}
            disabled={!currentResume || loading || pdfGenerating}
          >
            <Download className="h-4 w-4 mr-2" />
            {pdfGenerating ? "生成中..." : "导出 PDF"}
          </Button>
        </div>
      </div>

      {/* Preview Area */}
      <div className="flex-1 overflow-auto p-8">
        {loading || pdfGenerating ? (
          <ResumePreviewSkeleton />
        ) : (
          <div className="flex justify-center">
            <div
              className="bg-white shadow-lg"
              style={{
                transform: `scale(${zoom / 100})`,
                transformOrigin: "top center",
              }}
            >
              <style>{templateCSS}</style>
              <div
                className="resume"
                dangerouslySetInnerHTML={{
                  __html: sanitizeHtml(renderedHTML),
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Template Info */}
      <div className="p-4 bg-white border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-gray-900 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-600" />
              {currentTemplateData?.name}
            </h3>
            <p className="text-sm text-gray-700">
              {currentTemplateData?.description}
            </p>
            {currentTemplateData && (
              <div className="flex items-center gap-2 mt-2">
                {currentTemplateData.atsFriendly && (
                  <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs font-medium">
                    ATS友好
                  </span>
                )}
                <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                  {currentTemplateData.layout === "single-column" && "单栏"}
                  {currentTemplateData.layout === "two-column" && "双栏"}
                  {currentTemplateData.layout === "sidebar" && "侧边栏"}
                  {currentTemplateData.layout === "modern" && "现代"}
                </span>
                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">
                  {currentTemplateData.difficulty === "beginner" && "入门"}
                  {currentTemplateData.difficulty === "intermediate" && "进阶"}
                  {currentTemplateData.difficulty === "advanced" && "高级"}
                </span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            {memoizedTemplates.slice(0, 4).map((template) => (
              <button
                key={template.id}
                onClick={() => setSelectedTemplate(template.id)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                  selectedTemplate === template.id
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                )}
              >
                {template.name}
              </button>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTemplateGallery(true)}
            >
              <Palette className="h-4 w-4 mr-1" />
              更多
            </Button>
          </div>
        </div>
      </div>

      {/* Template Gallery */}
      {showTemplateGallery && (
        <TemplateGallery
          onSelectTemplate={handleTemplateSelect}
          onClose={() => setShowTemplateGallery(false)}
        />
      )}
    </div>
  );
}
