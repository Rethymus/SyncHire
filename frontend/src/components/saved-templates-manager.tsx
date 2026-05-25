"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import {
  getSavedTemplates,
  saveTemplate,
  updateTemplate,
  deleteTemplate,
  cloneTemplate,
  exportTemplates,
  importTemplates,
  resetToDefaults,
  getTemplateStats,
  type SavedTemplate,
} from "@/lib/templates/template-manager";
import { resumeTemplates, getTemplateById } from "@/lib/templates/resume-templates";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  FolderOpen,
  Plus,
  Trash2,
  Copy,
  Download,
  Upload,
  RotateCcw,
  Edit,
  Star,
  Clock,
  Palette,
  Check,
  X,
} from "lucide-react";
import { logger } from "@/lib/logger";
import { LogCategory } from "@/lib/logger";

interface SavedTemplatesManagerProps {
  onLoadTemplate: (templateId: string) => void;
  onClose: () => void;
}

export function SavedTemplatesManager({ onLoadTemplate, onClose }: SavedTemplatesManagerProps) {
  const [savedTemplates, setSavedTemplates] = useState<SavedTemplate[]>(() => getSavedTemplates());
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [stats, setStats] = useState(() => getTemplateStats());

  // Load templates on mount
  const refreshTemplates = useCallback(() => {
    const templates = getSavedTemplates();
    setSavedTemplates(templates);
    setStats(getTemplateStats());
  }, []);

  const handleDeleteTemplate = useCallback((id: string) => {
    if (confirm("确定要删除这个模板吗？")) {
      const success = deleteTemplate(id);
      if (success) {
        refreshTemplates();
        logger.info(LogCategory.UI, `Template deleted: ${id}`);
      }
    }
  }, [refreshTemplates]);

  const handleCloneTemplate = useCallback((id: string) => {
    const template = savedTemplates.find((t) => t.id === id);
    if (!template) return;

    const clone = cloneTemplate(id, `${template.name} (副本)`);
    if (clone) {
      refreshTemplates();
      logger.info(LogCategory.UI, `Template cloned: ${id}`);
    }
  }, [savedTemplates, refreshTemplates]);

  const handleEditTemplate = useCallback((id: string) => {
    setEditingTemplate(id);
    const template = savedTemplates.find((t) => t.id === id);
    if (template) {
      setNewTemplateName(template.name);
    }
  }, [savedTemplates]);

  const handleSaveEdit = useCallback(() => {
    if (editingTemplate && newTemplateName.trim()) {
      updateTemplate(editingTemplate, { name: newTemplateName.trim() });
      refreshTemplates();
      setEditingTemplate(null);
      setNewTemplateName("");
      logger.info(LogCategory.UI, `Template renamed: ${editingTemplate}`);
    }
  }, [editingTemplate, newTemplateName, refreshTemplates]);

  const handleExportTemplates = useCallback(() => {
    exportTemplates();
    logger.info(LogCategory.UI, "Templates exported");
  }, []);

  const handleImportTemplates = useCallback(async (file: File) => {
    try {
      await importTemplates(file);
      refreshTemplates();
      setShowImportDialog(false);
      logger.info(LogCategory.UI, "Templates imported successfully");
    } catch (error) {
      logger.error(LogCategory.UI, "Failed to import templates", error as Error);
      alert("导入失败：文件格式不正确");
    }
  }, [refreshTemplates]);

  const handleResetToDefaults = useCallback(() => {
    if (confirm("确定要重置为默认模板吗？这将删除所有自定义模板。")) {
      resetToDefaults();
      refreshTemplates();
      logger.info(LogCategory.UI, "Templates reset to defaults");
    }
  }, [refreshTemplates]);

  const handleLoadTemplate = useCallback((templateId: string) => {
    onLoadTemplate(templateId);
    onClose();
    logger.info(LogCategory.UI, `Template loaded: ${templateId}`);
  }, [onLoadTemplate, onClose]);

  const customTemplates = useMemo(() =>
    savedTemplates.filter((t) => !t.isDefault),
    [savedTemplates]
  );

  const defaultTemplates = useMemo(() =>
    savedTemplates.filter((t) => t.isDefault),
    [savedTemplates]
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <FolderOpen className="h-6 w-6 text-indigo-600" />
                我的模板库
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                管理您的自定义简历模板
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

          {/* Stats */}
          <div className="flex gap-4 mb-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg">
              <FolderOpen className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">
                总计: {stats.total}
              </span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-lg">
              <Palette className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-900">
                自定义: {stats.custom}
              </span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg">
              <Star className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-900">
                默认: {stats.default}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportTemplates}
              className="min-h-[36px]"
            >
              <Download className="h-4 w-4 mr-2" />
              导出模板
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowImportDialog(true)}
              className="min-h-[36px]"
            >
              <Upload className="h-4 w-4 mr-2" />
              导入模板
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetToDefaults}
              className="min-h-[36px]"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              重置默认
            </Button>
          </div>
        </div>

        {/* Template Lists */}
        <div className="flex-1 overflow-auto p-6">
          {/* Custom Templates */}
          {customTemplates.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Palette className="h-5 w-5 text-indigo-600" />
                自定义模板
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {customTemplates.map((template) => {
                  const baseTemplate = getTemplateById(template.baseTemplateId);
                  return (
                    <div
                      key={template.id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          {editingTemplate === template.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={newTemplateName}
                                onChange={(e) => setNewTemplateName(e.target.value)}
                                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                                autoFocus
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={handleSaveEdit}
                                className="h-8 w-8 p-0"
                              >
                                <Check className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingTemplate(null)}
                                className="h-8 w-8 p-0"
                              >
                                <X className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          ) : (
                            <h4 className="font-medium text-gray-900">{template.name}</h4>
                          )}
                          <p className="text-sm text-gray-500">
                            基于: {baseTemplate?.name}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditTemplate(template.id)}
                            className="h-8 w-8 p-0"
                            aria-label="编辑"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCloneTemplate(template.id)}
                            className="h-8 w-8 p-0"
                            aria-label="克隆"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteTemplate(template.id)}
                            className="h-8 w-8 p-0 text-red-600"
                            aria-label="删除"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                        <Clock className="h-3.5 w-3.5" />
                        <span>
                          更新于 {new Date(template.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleLoadTemplate(template.id)}
                        className="w-full min-h-[36px]"
                      >
                        <FolderOpen className="h-4 w-4 mr-2" />
                        使用此模板
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Default Templates */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-600" />
              默认模板
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {defaultTemplates.map((template) => {
                const baseTemplate = getTemplateById(template.baseTemplateId);
                return (
                  <div
                    key={template.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{
                          backgroundColor: baseTemplate?.colors.primary + "20",
                          color: baseTemplate?.colors.primary
                        }}
                      >
                        <Palette className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{template.name}</h4>
                        <p className="text-xs text-gray-500">{baseTemplate?.nameEn}</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {baseTemplate?.description}
                    </p>
                    <Button
                      size="sm"
                      onClick={() => handleLoadTemplate(template.id)}
                      className="w-full min-h-[36px]"
                    >
                      <FolderOpen className="h-4 w-4 mr-2" />
                      使用此模板
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>

          {customTemplates.length === 0 && defaultTemplates.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <FolderOpen className="h-16 w-16 text-gray-400 mb-4" />
              <p className="text-gray-700 font-medium">暂无保存的模板</p>
              <p className="text-sm text-gray-500 mt-1">选择模板后可在此处管理</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end">
          <Button variant="outline" onClick={onClose}>
            关闭
          </Button>
        </div>
      </div>

      {/* Import Dialog */}
      {showImportDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">导入模板</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowImportDialog(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                选择之前导出的模板文件（.json）来导入自定义模板。
              </p>
              <input
                type="file"
                accept=".json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleImportTemplates(file);
                  }
                }}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}