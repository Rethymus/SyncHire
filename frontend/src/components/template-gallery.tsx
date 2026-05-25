"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { resumeTemplates, getTemplatesByCategory, searchTemplates, type ResumeTemplate, type TemplateCustomization } from "@/lib/templates/resume-templates";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { marked } from "marked";
import { sanitizeMarkdownHtml } from "@/lib/sanitize";
import {
  FileText,
  Download,
  Eye,
  Check,
  Star,
  Filter,
  Search,
  X,
  Palette,
  Sliders,
  Sparkles,
  Zap,
  Shield,
  Award,
  BookOpen,
} from "lucide-react";

interface TemplateGalleryProps {
  onSelectTemplate: (templateId: string) => void;
  onClose: () => void;
}

type CategoryFilter = "all" | ResumeTemplate["category"];
type SortOption = "popular" | "newest" | "name";

export function TemplateGallery({ onSelectTemplate, onClose }: TemplateGalleryProps) {
  const { currentResume } = useAppStore();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("popular");
  const [showCustomization, setShowCustomization] = useState(false);
  const [customization, setCustomization] = useState<TemplateCustomization>({});
  const [previewMode, setPreviewMode] = useState(false);

  // Filter and sort templates
  const filteredTemplates = useMemo(() => {
    let templates = categoryFilter === "all"
      ? resumeTemplates
      : getTemplatesByCategory(categoryFilter);

    if (searchQuery) {
      templates = searchTemplates(searchQuery);
    }

    // Sort templates
    switch (sortBy) {
      case "name":
        templates = [...templates].sort((a, b) => a.name.localeCompare(b.name, "zh"));
        break;
      case "popular":
        // Keep executive and professional first
        templates = [...templates].sort((a, b) => {
          const priority: Record<string, number> = { executive: 3, professional: 2, minimal: 1 };
          return (priority[b.category] || 0) - (priority[a.category] || 0);
        });
        break;
      case "newest":
        // Keep creative and modern first
        templates = [...templates].sort((a, b) => {
          const priority: Record<string, number> = { modern: 3, creative: 2, technical: 1 };
          return (priority[b.category] || 0) - (priority[a.category] || 0);
        });
        break;
    }

    return templates;
  }, [categoryFilter, searchQuery, sortBy]);

  const handleSelectTemplate = useCallback((templateId: string) => {
    setSelectedTemplate(templateId);
    setShowCustomization(true);
  }, []);

  const handleApplyTemplate = useCallback(() => {
    if (selectedTemplate) {
      // Save template preferences to store
      useAppStore.getState().saveTemplatePreferences(selectedTemplate, customization);
      onSelectTemplate(selectedTemplate);
      onClose();
    }
  }, [selectedTemplate, customization, onSelectTemplate, onClose]);

  const handlePreviewTemplate = useCallback((templateId: string) => {
    setSelectedTemplate(templateId);
    setPreviewMode(true);
  }, []);

  const categories = [
    { id: "all" as const, name: "全部", icon: Filter },
    { id: "minimal" as const, name: "简约", icon: Sparkles },
    { id: "professional" as const, name: "商务", icon: Award },
    { id: "creative" as const, name: "创意", icon: Palette },
    { id: "executive" as const, name: "高管", icon: Star },
    { id: "technical" as const, name: "技术", icon: Zap },
  ];

  const getTemplateIcon = (template: ResumeTemplate) => {
    switch (template.category) {
      case "minimal":
        return Sparkles;
      case "professional":
        return Award;
      case "creative":
        return Palette;
      case "executive":
        return Star;
      case "technical":
        return Zap;
      default:
        return FileText;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Palette className="h-6 w-6 text-indigo-600" />
                简历模板库
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                选择专业模板，打造完美简历
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-10 w-10 p-0"
              aria-label="关闭"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-wrap gap-4 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索模板..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                aria-label="搜索模板"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {categories.map((category) => {
                const Icon = category.icon;
                return (
                  <button
                    key={category.id}
                    onClick={() => setCategoryFilter(category.id)}
                    className={cn(
                      "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
                      categoryFilter === category.id
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {category.name}
                  </button>
                );
              })}
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              aria-label="排序方式"
            >
              <option value="popular">热门优先</option>
              <option value="newest">最新优先</option>
              <option value="name">名称排序</option>
            </select>
          </div>
        </div>

        {/* Template Grid */}
        <div className="flex-1 overflow-auto p-6">
          {filteredTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <FileText className="h-16 w-16 text-gray-400 mb-4" />
              <p className="text-gray-700 font-medium">未找到匹配的模板</p>
              <p className="text-sm text-gray-500 mt-1">请尝试其他搜索条件</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTemplates.map((template) => {
                const TemplateIcon = getTemplateIcon(template);
                const isSelected = selectedTemplate === template.id;

                return (
                  <div
                    key={template.id}
                    className={cn(
                      "group relative bg-white border-2 rounded-xl overflow-hidden transition-all duration-200 hover:shadow-xl",
                      isSelected
                        ? "border-indigo-600 shadow-lg"
                        : "border-gray-200 hover:border-indigo-300"
                    )}
                  >
                    {/* Preview Image */}
                    <div className="relative h-48 bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
                      <div
                        className="absolute inset-0 flex items-center justify-center"
                        style={{
                          background: `linear-gradient(135deg, ${template.colors.primary}22 0%, ${template.colors.accent}22 100%)`
                        }}
                      >
                        <TemplateIcon className="h-16 w-16" style={{ color: template.colors.primary }} />
                      </div>

                      {/* ATS Badge */}
                      {template.atsFriendly && (
                        <div className="absolute top-3 right-3 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                          <Shield className="h-3 w-3" />
                          ATS友好
                        </div>
                      )}

                      {/* Difficulty Badge */}
                      <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-medium text-gray-700">
                        {template.difficulty === "beginner" && "入门"}
                        {template.difficulty === "intermediate" && "进阶"}
                        {template.difficulty === "advanced" && "高级"}
                      </div>

                      {/* Quick Actions */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handlePreviewTemplate(template.id)}
                          className="min-h-[36px]"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          预览
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleSelectTemplate(template.id)}
                          className="min-h-[36px]"
                        >
                          {isSelected ? (
                            <>
                              <Check className="h-4 w-4 mr-1" />
                              已选择
                            </>
                          ) : (
                            <>
                              <Sliders className="h-4 w-4 mr-1" />
                              选择
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Template Info */}
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-bold text-gray-900">{template.name}</h3>
                          <p className="text-xs text-gray-500">{template.nameEn}</p>
                        </div>
                        <div
                          className="w-4 h-4 rounded-full border-2 border-gray-300"
                          style={{ backgroundColor: template.colors.primary }}
                          title="主题颜色"
                        />
                      </div>

                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {template.description}
                      </p>

                      {/* Features */}
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {template.features.slice(0, 3).map((feature, index) => (
                          <span
                            key={index}
                            className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs"
                          >
                            {feature}
                          </span>
                        ))}
                        {template.features.length > 3 && (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                            +{template.features.length - 3}
                          </span>
                        )}
                      </div>

                      {/* Layout Badge */}
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <BookOpen className="h-3.5 w-3.5" />
                        <span>
                          {template.layout === "single-column" && "单栏布局"}
                          {template.layout === "two-column" && "双栏布局"}
                          {template.layout === "sidebar" && "侧边栏布局"}
                          {template.layout === "modern" && "现代布局"}
                        </span>
                      </div>
                    </div>

                    {/* Selection Indicator */}
                    {isSelected && (
                      <div className="absolute top-3 right-3 w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center">
                        <Check className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            显示 {filteredTemplates.length} 个模板
            {selectedTemplate && (
              <span className="ml-2 text-indigo-600 font-medium">
                已选择: {resumeTemplates.find(t => t.id === selectedTemplate)?.name}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              取消
            </Button>
            <Button
              onClick={handleApplyTemplate}
              disabled={!selectedTemplate}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              <Download className="h-4 w-4 mr-2" />
              应用模板
            </Button>
          </div>
        </div>
      </div>

      {/* Preview Mode */}
      {previewMode && selectedTemplate && (
        <TemplatePreviewModal
          templateId={selectedTemplate}
          onClose={() => setPreviewMode(false)}
          onSelect={() => {
            setPreviewMode(false);
            setShowCustomization(true);
          }}
        />
      )}

      {/* Customization Panel */}
      {showCustomization && selectedTemplate && (
        <TemplateCustomizationPanel
          templateId={selectedTemplate}
          customization={customization}
          onCustomizationChange={setCustomization}
          onClose={() => setShowCustomization(false)}
          onApply={handleApplyTemplate}
        />
      )}
    </div>
  );
}

interface TemplatePreviewModalProps {
  templateId: string;
  onClose: () => void;
  onSelect: () => void;
}

function TemplatePreviewModal({ templateId, onClose, onSelect }: TemplatePreviewModalProps) {
  const template = resumeTemplates.find(t => t.id === templateId);
  const [zoom, setZoom] = useState(100);
  const [templateCSS, setTemplateCSS] = useState("");
  const [loading, setLoading] = useState(true);

  // Load template CSS for preview
  useEffect(() => {
    const loadTemplateCSS = async () => {
      if (!template) return;

      setLoading(true);
      try {
        const response = await fetch(template.cssFile);
        const css = await response.text();
        setTemplateCSS(css);
      } catch (error) {
        console.error("Failed to load template CSS:", error);
      } finally {
        setLoading(false);
      }
    };

    loadTemplateCSS();
  }, [template]);

  if (!template) return null;

  const sampleResumeContent = `# 李明
**高级软件工程师**

## 个人简介
8年全栈开发经验，专注于React生态系统和云原生架构。曾带领团队完成多个大型项目，具有丰富的技术管理和架构设计经验。

## 工作经历

### 字节跳动 | 高级前端工程师
*2020年3月 - 至今*

- 负责抖音电商前端架构设计与开发
- 使用Next.js和TypeScript重构核心模块，性能提升40%
- 建立前端监控体系，线上故障率降低60%
- 带领10人前端团队，制定技术规范

### 腾讯 | 前端开发工程师
*2017年7月 - 2020年2月*

- 开发微信小程序平台核心功能
- 优化首屏加载性能，FCP从1.8s降至0.9s
- 实现组件库系统，提升开发效率30%

## 技能

- **前端开发**: JavaScript, TypeScript, React, Vue.js, Next.js
- **后端开发**: Node.js, Python, Go
- **云原生**: Docker, Kubernetes, AWS
- **工具**: Git, Webpack, Vite, Jenkins

## 教育背景

### 北京大学 | 计算机科学与技术 | 本科
*2013年9月 - 2017年6月*

- GPA: 3.7/4.0
- 主修课程: 数据结构、算法、操作系统、计算机网络`;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900">{template.name}</h3>
            <p className="text-sm text-gray-600">{template.nameEn}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Preview */}
        <div className="flex-1 overflow-auto p-8 bg-gray-100">
          <div className="flex justify-center items-center min-h-full">
            {loading ? (
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                <p className="text-gray-600">加载模板预览...</p>
              </div>
            ) : (
              <div
                className="bg-white shadow-lg overflow-hidden"
                style={{
                  transform: `scale(${zoom / 100})`,
                  transformOrigin: "top center",
                  width: "800px",
                  minHeight: "1000px"
                }}
              >
                <style>{templateCSS}</style>
                <div dangerouslySetInnerHTML={{
                  __html: sanitizeMarkdownHtml(marked(sampleResumeContent) as string)
                }} />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setZoom(Math.max(zoom - 10, 50))}
            >
              缩小
            </Button>
            <span className="text-sm text-gray-600 min-w-[3rem] text-center">
              {zoom}%
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setZoom(Math.min(zoom + 10, 150))}
            >
              放大
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              关闭
            </Button>
            <Button onClick={onSelect} className="bg-indigo-600 hover:bg-indigo-700">
              <Check className="h-4 w-4 mr-2" />
              选择此模板
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface TemplateCustomizationPanelProps {
  templateId: string;
  customization: TemplateCustomization;
  onCustomizationChange: (customization: TemplateCustomization) => void;
  onClose: () => void;
  onApply: () => void;
}

function TemplateCustomizationPanel({
  templateId,
  customization,
  onCustomizationChange,
  onClose,
  onApply,
}: TemplateCustomizationPanelProps) {
  const template = resumeTemplates.find(t => t.id === templateId);

  if (!template) return null;

  const handleColorChange = (colorKey: keyof NonNullable<TemplateCustomization["colors"]>, value: string) => {
    onCustomizationChange({
      ...customization,
      colors: {
        ...customization.colors,
        [colorKey]: value
      }
    });
  };

  const predefinedColors = [
    { name: "经典蓝", value: "#3b82f6" },
    { name: "专业灰", value: "#6b7280" },
    { name: "优雅紫", value: "#8b5cf6" },
    { name: "活力橙", value: "#f97316" },
    { name: "沉稳黑", value: "#1f2937" },
    { name: "清新绿", value: "#10b981" },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">自定义模板</h2>
              <p className="text-sm text-gray-600 mt-1">
                {template.name} - {template.nameEn}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Customization Options */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Color Customization */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Palette className="h-5 w-5" />
              颜色方案
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  主色调
                </label>
                <div className="flex flex-wrap gap-2">
                  {predefinedColors.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => handleColorChange("primary", color.value)}
                      className={cn(
                        "w-10 h-10 rounded-lg border-2 transition-all",
                        customization.colors?.primary === color.value
                          ? "border-indigo-600 scale-110"
                          : "border-gray-300 hover:border-gray-400"
                      )}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                  <input
                    type="color"
                    value={customization.colors?.primary || template.colors.primary}
                    onChange={(e) => handleColorChange("primary", e.target.value)}
                    className="w-10 h-10 rounded-lg border-2 border-gray-300 cursor-pointer"
                    title="自定义颜色"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  强调色
                </label>
                <div className="flex flex-wrap gap-2">
                  {predefinedColors.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => handleColorChange("accent", color.value)}
                      className={cn(
                        "w-10 h-10 rounded-lg border-2 transition-all",
                        customization.colors?.accent === color.value
                          ? "border-indigo-600 scale-110"
                          : "border-gray-300 hover:border-gray-400"
                      )}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                  <input
                    type="color"
                    value={customization.colors?.accent || template.colors.accent}
                    onChange={(e) => handleColorChange("accent", e.target.value)}
                    className="w-10 h-10 rounded-lg border-2 border-gray-300 cursor-pointer"
                    title="自定义颜色"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Layout Options */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Sliders className="h-5 w-5" />
              布局选项
            </h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={customization.layout?.showPhoto ?? false}
                  onChange={(e) =>
                    onCustomizationChange({
                      ...customization,
                      layout: {
                        showPhoto: e.target.checked,
                        showContact: customization.layout?.showContact ?? true,
                        showSkills: customization.layout?.showSkills ?? true
                      }
                    })
                  }
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">显示照片</div>
                  <div className="text-sm text-gray-500">在简历中显示个人照片</div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={customization.layout?.showContact ?? true}
                  onChange={(e) =>
                    onCustomizationChange({
                      ...customization,
                      layout: {
                        showPhoto: customization.layout?.showPhoto ?? false,
                        showContact: e.target.checked,
                        showSkills: customization.layout?.showSkills ?? true
                      }
                    })
                  }
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">显示联系方式</div>
                  <div className="text-sm text-gray-500">在简历头部显示联系方式</div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={customization.layout?.showSkills ?? true}
                  onChange={(e) =>
                    onCustomizationChange({
                      ...customization,
                      layout: {
                        showPhoto: customization.layout?.showPhoto ?? false,
                        showContact: customization.layout?.showContact ?? true,
                        showSkills: e.target.checked
                      }
                    })
                  }
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">显示技能列表</div>
                  <div className="text-sm text-gray-500">突出显示专业技能</div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={customization.spacing?.compact ?? false}
                  onChange={(e) =>
                    onCustomizationChange({
                      ...customization,
                      spacing: {
                        compact: e.target.checked
                      }
                    })
                  }
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">紧凑布局</div>
                  <div className="text-sm text-gray-500">减少间距，适合内容较多的简历</div>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={onApply} className="bg-indigo-600 hover:bg-indigo-700">
            <Sparkles className="h-4 w-4 mr-2" />
            应用自定义
          </Button>
        </div>
      </div>
    </div>
  );
}