/**
 * Enhanced Data Management Page
 *
 * Comprehensive export/import functionality with:
 * - CSV export with filters
 * - JSON backup with templates
 * - Import preview and validation
 * - Progress tracking and cancellation
 * - Conflict resolution and rollback
 */

"use client";

import { useState, useCallback, memo, useRef, useEffect } from "react";
import { Navigation } from "@/components/navigation-lite";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { apiClient } from "@/lib/api-client-lite";
import { logger, LogCategory } from "@/lib/logger";
import {
  Download,
  Upload,
  Database,
  FileJson,
  FileSpreadsheet,
  RefreshCw,
  HardDrive,
  Settings,
  CheckCircle2,
  AlertCircle,
  X,
  Filter,
  FileText,
  AlertTriangle,
  Eye,
  ChevronRight,
  ChevronDown,
  Copy,
  Check,
  Info,
} from "lucide-react";

// Types
interface Backup {
  id: string;
  created_at: string;
  size: number;
  files_count: number;
}

interface DataStatus {
  resumes_count: number;
  jds_count: number;
  applications_count: number;
  database_size: number;
  last_backup: string | null;
}

interface ExportProgress {
  stage: string;
  progress: number;
  total: number;
  current: number;
}

interface ImportPreview {
  total_records: number;
  resumes: number;
  jds: number;
  applications: number;
  conflicts: Array<{
    type: string;
    id: string;
    existing: any;
    incoming: any;
  }>;
  validation_errors: Array<{
    record: number;
    field: string;
    message: string;
  }>;
}

interface ImportResult {
  success: boolean;
  imported: number;
  failed: number;
  skipped: number;
  errors: string[];
}

// Export templates
const EXPORT_TEMPLATES = {
  basic: {
    name: "Basic Data",
    description: "Essential data for quick backup",
    fields: ["id", "created_at", "status"],
  },
  detailed: {
    name: "Detailed Export",
    description: "Complete data with all fields",
    fields: ["*"],
  },
  analytics: {
    name: "Analytics Export",
    description: "Data formatted for analytics",
    fields: ["id", "status", "created_at", "updated_at", "metrics"],
  },
};

function DataManagementPage() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<DataStatus | null>(null);
  const [backups, setBackups] = useState<Backup[]>([]);
  const [message, setMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  // Export states
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);
  const [exportFilters, setExportFilters] = useState({
    dataTypes: [] as string[],
    dateRange: { from: "", to: "" },
    status: [] as string[],
  });
  const [showExportFilters, setShowExportFilters] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("basic");

  // Import states
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [importProgress, setImportProgress] = useState<number>(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importMode, setImportMode] = useState<"merge" | "replace">("merge");
  const [showImportPreview, setShowImportPreview] = useState(false);
  const [resolveConflicts, setResolveConflicts] = useState<"skip" | "overwrite" | "rename">("skip");
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const data = await apiClient.portability.getStatus();
        setStatus(data);
      } catch (error) {
        logger.error(LogCategory.API, "Failed to load data status", error as Error);
      }
    };

    const loadBackups = async () => {
      try {
        const data = await apiClient.portability.listBackups();
        setBackups(data.backups || []);
      } catch (error) {
        logger.error(LogCategory.API, "Failed to load backups", error as Error);
      }
    };

    loadStatus();
    loadBackups();
  }, []);

  // Helper functions for refresh operations
  const loadStatus = useCallback(async () => {
    try {
      const data = await apiClient.portability.getStatus();
      setStatus(data);
    } catch (error) {
      logger.error(LogCategory.API, "Failed to load data status", error as Error);
    }
  }, []);

  const loadBackups = useCallback(async () => {
    try {
      const data = await apiClient.portability.listBackups();
      setBackups(data.backups || []);
    } catch (error) {
      logger.error(LogCategory.API, "Failed to load backups", error as Error);
    }
  }, []);

  const showMessage = useCallback(
    (type: "success" | "error" | "info", text: string) => {
      setMessage({ type, text });
      setTimeout(() => setMessage(null), 5000);
    },
    []
  );

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Enhanced Export Functions
  const handleExportJSON = useCallback(async () => {
    setLoading(true);
    setExportProgress({ stage: "Initializing", progress: 0, total: 100, current: 0 });
    abortControllerRef.current = new AbortController();

    try {
      const signal = abortControllerRef.current.signal;

      // Stage 1: Collecting data
      setExportProgress((prev) => ({ ...prev!, stage: "Collecting data", progress: 20 }));
      const data = await apiClient.portability.exportJSON();

      if (signal.aborted) throw new Error("Export cancelled");

      // Stage 2: Processing
      setExportProgress((prev) => ({ ...prev!, stage: "Processing data", progress: 50 }));
      const json = JSON.stringify(data, null, 2);

      if (signal.aborted) throw new Error("Export cancelled");

      // Stage 3: Creating file
      setExportProgress((prev) => ({ ...prev!, stage: "Creating file", progress: 80 }));
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `synchire-backup-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportProgress({ stage: "Complete", progress: 100, total: 100, current: 100 });
      showMessage("success", "Data exported successfully as JSON");
      logger.info(LogCategory.API, "Data exported as JSON");

      setTimeout(() => setExportProgress(null), 2000);
    } catch (error: any) {
      if (error.message === "Export cancelled") {
        showMessage("info", "Export cancelled");
      } else {
        showMessage("error", "Failed to export data");
        logger.error(LogCategory.API, "Failed to export JSON", error);
      }
      setExportProgress(null);
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, [showMessage]);

  const handleExportCSV = useCallback(async () => {
    setLoading(true);
    setExportProgress({ stage: "Initializing", progress: 0, total: 100, current: 0 });
    abortControllerRef.current = new AbortController();

    try {
      const signal = abortControllerRef.current.signal;

      // Build query parameters for filters
      const params = new URLSearchParams();
      if (exportFilters.dataTypes.length > 0) {
        params.append("data_types", exportFilters.dataTypes.join(","));
      }
      if (exportFilters.dateRange.from) {
        params.append("from_date", exportFilters.dateRange.from);
      }
      if (exportFilters.dateRange.to) {
        params.append("to_date", exportFilters.dateRange.to);
      }
      if (exportFilters.status.length > 0) {
        params.append("status", exportFilters.status.join(","));
      }

      // Stage 1: Collecting data
      setExportProgress((prev) => ({ ...prev!, stage: "Collecting data", progress: 20 }));
      const response = await fetch(
        `/api/portability/export/csv${params.toString() ? `?${params}` : ""}`,
        { signal }
      );

      if (signal.aborted) throw new Error("Export cancelled");

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      // Stage 2: Downloading
      setExportProgress((prev) => ({ ...prev!, stage: "Downloading file", progress: 50 }));
      const blob = await response.blob();

      if (signal.aborted) throw new Error("Export cancelled");

      // Stage 3: Saving file
      setExportProgress((prev) => ({ ...prev!, stage: "Saving file", progress: 80 }));
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `synchire-export-${new Date().toISOString().split("T")[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportProgress({ stage: "Complete", progress: 100, total: 100, current: 100 });
      showMessage("success", "Data exported successfully as CSV");
      logger.info(LogCategory.API, "Data exported as CSV");

      setTimeout(() => setExportProgress(null), 2000);
    } catch (error: any) {
      if (error.message === "Export cancelled") {
        showMessage("info", "Export cancelled");
      } else {
        showMessage("error", "Failed to export data");
        logger.error(LogCategory.API, "Failed to export CSV", error);
      }
      setExportProgress(null);
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, [exportFilters, showMessage]);

  const cancelExport = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  // Enhanced Import Functions
  const handleGeneratePreview = async (file: File) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/portability/import/preview", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const preview: ImportPreview = await response.json();
      setImportPreview(preview);

      if (preview.validation_errors.length > 0) {
        showMessage(
          "error",
          `Found ${preview.validation_errors.length} validation errors. Please review before importing.`
        );
      } else if (preview.conflicts.length > 0) {
        showMessage(
          "info",
          `Found ${preview.conflicts.length} potential conflicts. Review and choose how to resolve.`
        );
      } else {
        showMessage("success", "File is ready to import");
      }
    } catch (error) {
      showMessage("error", "Failed to generate import preview");
      logger.error(LogCategory.API, "Failed to generate preview", error as Error);
    } finally {
      setLoading(false);
    }
  };

  const handleImportFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      setImportFile(file);
      setImportPreview(null);
      setImportResult(null);

      // Validate file type
      const validTypes = [
        "application/json",
        "text/csv",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ];

      if (!validTypes.includes(file.type) && !file.name.endsWith(".csv") && !file.name.endsWith(".json")) {
        showMessage("error", "Invalid file type. Please select a JSON or CSV file.");
        setImportFile(null);
        return;
      }

      // Generate preview
      handleGeneratePreview(file);
    },
    [showMessage]
  );

  const handleImport = useCallback(async () => {
    if (!importFile) return;

    setLoading(true);
    setImportProgress(0);
    setImportResult(null);
    abortControllerRef.current = new AbortController();

    try {
      const formData = new FormData();
      formData.append("file", importFile);
      formData.append("mode", importMode);
      formData.append("conflict_resolution", resolveConflicts);

      const signal = abortControllerRef.current.signal;

      // Use fetch with progress tracking
      const response = await fetch("/api/portability/import", {
        method: "POST",
        body: formData,
        signal,
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      // Track progress if available
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let resultText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        resultText += chunk;

        // Parse progress updates (if server sends progress)
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("progress:")) {
            const progress = parseInt(line.replace("progress:", ""));
            setImportProgress(progress);
          }
        }
      }

      const result: ImportResult = JSON.parse(resultText);
      setImportResult(result);

      if (result.success) {
        showMessage(
          "success",
          `Import completed: ${result.imported} imported, ${result.skipped} skipped, ${result.failed} failed`
        );
        loadStatus();
        loadBackups();
      } else {
        showMessage("error", `Import failed: ${result.errors.join(", ")}`);
      }

      logger.info(LogCategory.API, "Data import completed", result);
    } catch (error: any) {
      if (error.name === "AbortError") {
        showMessage("info", "Import cancelled");
      } else {
        showMessage("error", "Failed to import data");
        logger.error(LogCategory.API, "Failed to import data", error);
      }
    } finally {
      setLoading(false);
      setImportProgress(0);
      abortControllerRef.current = null;
    }
  }, [importFile, importMode, resolveConflicts, loadStatus, loadBackups, showMessage]);

  const cancelImport = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const handleCreateBackup = useCallback(async () => {
    setLoading(true);
    try {
      await apiClient.portability.createBackup();
      showMessage("success", "Backup created successfully");
      logger.info(LogCategory.API, "Backup created successfully");
      loadBackups();
      loadStatus();
    } catch (error) {
      showMessage("error", "Failed to create backup");
      logger.error(LogCategory.API, "Failed to create backup", error as Error);
    } finally {
      setLoading(false);
    }
  }, [loadBackups, loadStatus, showMessage]);

  return (
    <div className="min-h-screen bg-gray-50">
      

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Data Management</h1>
          <p className="mt-2 text-gray-600">
            Export, import, and backup your data with advanced options
          </p>
        </div>

        {/* Message Banner */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg border ${
              message.type === "success"
                ? "bg-green-50 border-green-200"
                : message.type === "error"
                ? "bg-red-50 border-red-200"
                : "bg-blue-50 border-blue-200"
            }`}
          >
            <div className="flex items-start">
              {message.type === "success" ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              ) : message.type === "error" ? (
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              ) : (
                <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              )}
              <div className="ml-3 flex-1">
                <p
                  className={`text-sm ${
                    message.type === "success"
                      ? "text-green-800"
                      : message.type === "error"
                      ? "text-red-800"
                      : "text-blue-800"
                  }`}
                >
                  {message.text}
                </p>
              </div>
              <button
                onClick={() => setMessage(null)}
                className="ml-3 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Data Status */}
        {status && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <div className="flex items-center mb-4">
              <Database className="h-6 w-6 text-blue-600 mr-2" />
              <h2 className="text-xl font-semibold text-gray-900">Data Status</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">Resumes</p>
                <p className="text-2xl font-bold text-blue-900">{status.resumes_count}</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-700">Job Descriptions</p>
                <p className="text-2xl font-bold text-green-900">{status.jds_count}</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-purple-700">Applications</p>
                <p className="text-2xl font-bold text-purple-900">{status.applications_count}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700">Database Size</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatFileSize(status.database_size)}
                </p>
              </div>
            </div>
            {status.last_backup && (
              <p className="mt-4 text-sm text-gray-600">
                Last backup: {new Date(status.last_backup).toLocaleString()}
              </p>
            )}
          </div>
        )}

        {/* Export Data */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Download className="h-6 w-6 text-green-600 mr-2" />
              <h2 className="text-xl font-semibold text-gray-900">Export Data</h2>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowExportFilters(!showExportFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              {showExportFilters ? "Hide" : "Show"} Filters
            </Button>
          </div>

          <p className="text-gray-600 mb-4">
            Export your data with advanced filtering and template options
          </p>

          {/* Export Filters */}
          {showExportFilters && (
            <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
              <h3 className="font-medium text-gray-900 mb-3">Export Options</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Data Types */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data Types
                  </label>
                  <div className="space-y-2">
                    {[
                      { value: "resumes", label: "Resumes" },
                      { value: "jds", label: "Job Descriptions" },
                      { value: "applications", label: "Applications" },
                    ].map((type) => (
                      <label key={type.value} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={exportFilters.dataTypes.includes(type.value)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setExportFilters((prev) => ({
                                ...prev,
                                dataTypes: [...prev.dataTypes, type.value],
                              }));
                            } else {
                              setExportFilters((prev) => ({
                                ...prev,
                                dataTypes: prev.dataTypes.filter((t) => t !== type.value),
                              }));
                            }
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700">{type.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Date Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date Range
                  </label>
                  <div className="space-y-2">
                    <input
                      type="date"
                      value={exportFilters.dateRange.from}
                      onChange={(e) =>
                        setExportFilters((prev) => ({
                          ...prev,
                          dateRange: { ...prev.dateRange, from: e.target.value },
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <input
                      type="date"
                      value={exportFilters.dateRange.to}
                      onChange={(e) =>
                        setExportFilters((prev) => ({
                          ...prev,
                          dateRange: { ...prev.dateRange, to: e.target.value },
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Application Status
                  </label>
                  <div className="space-y-2">
                    {[
                      { value: "draft", label: "Draft" },
                      { value: "applied", label: "Applied" },
                      { value: "interviewing", label: "Interviewing" },
                      { value: "offered", label: "Offered" },
                      { value: "rejected", label: "Rejected" },
                    ].map((status) => (
                      <label key={status.value} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={exportFilters.status.includes(status.value)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setExportFilters((prev) => ({
                                ...prev,
                                status: [...prev.status, status.value],
                              }));
                            } else {
                              setExportFilters((prev) => ({
                                ...prev,
                                status: prev.status.filter((s) => s !== status.value),
                              }));
                            }
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700">{status.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Template Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Export Template
                  </label>
                  <select
                    value={selectedTemplate}
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {Object.entries(EXPORT_TEMPLATES).map(([key, template]) => (
                      <option key={key} value={key}>
                        {template.name} - {template.description}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Export Progress */}
          {exportProgress && (
            <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-900">{exportProgress.stage}</span>
                <span className="text-sm text-blue-700">{exportProgress.progress}%</span>
              </div>
              <Progress value={exportProgress.progress} className="h-2" />
              {exportProgress.stage !== "Complete" && (
                <Button variant="outline" size="sm" className="mt-2" onClick={cancelExport}>
                  Cancel
                </Button>
              )}
            </div>
          )}

          {/* Export Buttons */}
          <div className="flex flex-wrap gap-4">
            <Button
              onClick={handleExportJSON}
              disabled={loading || !!exportProgress}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <FileJson className="h-4 w-4 mr-2" />
              Export as JSON
            </Button>
            <Button
              onClick={handleExportCSV}
              disabled={loading || !!exportProgress}
              variant="outline"
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export as CSV
            </Button>
          </div>
        </div>

        {/* Import Data */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex items-center mb-4">
            <Upload className="h-6 w-6 text-orange-600 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">Import Data</h2>
          </div>

          <p className="text-gray-600 mb-4">
            Import previously exported data with validation and conflict resolution
          </p>

          {/* File Selection */}
          <div className="mb-4">
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".json,.csv"
                onChange={handleImportFileSelect}
                disabled={loading}
                className="hidden"
              />
              <Button disabled={loading} variant="outline" type="button">
                <Upload className="h-4 w-4 mr-2" />
                Select File to Import
              </Button>
            </label>
            {importFile && (
              <div className="mt-2 flex items-center text-sm text-gray-600">
                <FileText className="h-4 w-4 mr-2" />
                {importFile.name} ({formatFileSize(importFile.size)})
                <button
                  onClick={() => {
                    setImportFile(null);
                    setImportPreview(null);
                    setImportResult(null);
                  }}
                  className="ml-2 text-red-600 hover:text-red-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* Import Preview */}
          {importPreview && (
            <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-900">Import Preview</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowImportPreview(!showImportPreview)}
                >
                  {showImportPreview ? <ChevronDown /> : <ChevronRight />}
                  {showImportPreview ? "Hide" : "Show"} Details
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-3">
                <div className="bg-white p-3 rounded-lg">
                  <p className="text-sm text-gray-600">Total Records</p>
                  <p className="text-xl font-bold text-gray-900">{importPreview.total_records}</p>
                </div>
                <div className="bg-white p-3 rounded-lg">
                  <p className="text-sm text-gray-600">Conflicts</p>
                  <p className="text-xl font-bold text-orange-600">
                    {importPreview.conflicts.length}
                  </p>
                </div>
                <div className="bg-white p-3 rounded-lg">
                  <p className="text-sm text-gray-600">Errors</p>
                  <p className="text-xl font-bold text-red-600">
                    {importPreview.validation_errors.length}
                  </p>
                </div>
              </div>

              {showImportPreview && (
                <div className="space-y-3">
                  {/* Record breakdown */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Records to Import:</h4>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>Resumes: {importPreview.resumes}</div>
                      <div>JDs: {importPreview.jds}</div>
                      <div>Applications: {importPreview.applications}</div>
                    </div>
                  </div>

                  {/* Conflicts */}
                  {importPreview.conflicts.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-orange-700 mb-2">
                        Conflicts Found:
                      </h4>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {importPreview.conflicts.slice(0, 5).map((conflict, i) => (
                          <div key={i} className="bg-white p-2 rounded border border-orange-200">
                            <div className="flex items-center">
                              <AlertTriangle className="h-4 w-4 text-orange-600 mr-2" />
                              <span className="text-sm">
                                {conflict.type} #{conflict.id}
                              </span>
                            </div>
                          </div>
                        ))}
                        {importPreview.conflicts.length > 5 && (
                          <p className="text-sm text-gray-600">
                            ... and {importPreview.conflicts.length - 5} more conflicts
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Validation Errors */}
                  {importPreview.validation_errors.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-red-700 mb-2">
                        Validation Errors:
                      </h4>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {importPreview.validation_errors.slice(0, 5).map((error, i) => (
                          <div key={i} className="bg-white p-2 rounded border border-red-200">
                            <div className="flex items-center">
                              <AlertCircle className="h-4 w-4 text-red-600 mr-2" />
                              <span className="text-sm">
                                Record {error.record}: {error.field} - {error.message}
                              </span>
                            </div>
                          </div>
                        ))}
                        {importPreview.validation_errors.length > 5 && (
                          <p className="text-sm text-gray-600">
                            ... and {importPreview.validation_errors.length - 5} more errors
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Import Options */}
          {importFile && importPreview && importPreview.validation_errors.length === 0 && (
            <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
              <h3 className="font-medium text-gray-900 mb-3">Import Options</h3>

              <div className="space-y-4">
                {/* Import Mode */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Import Mode
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="merge"
                        checked={importMode === "merge"}
                        onChange={(e) => setImportMode(e.target.value as "merge" | "replace")}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">
                        Merge - Add new records, keep existing
                      </span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="replace"
                        checked={importMode === "replace"}
                        onChange={(e) => setImportMode(e.target.value as "merge" | "replace")}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">
                        Replace - Delete all, import new
                      </span>
                    </label>
                  </div>
                </div>

                {/* Conflict Resolution */}
                {importPreview.conflicts.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Conflict Resolution
                    </label>
                    <select
                      value={resolveConflicts}
                      onChange={(e) =>
                        setResolveConflicts(e.target.value as "skip" | "overwrite" | "rename")
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="skip">Skip conflicting records</option>
                      <option value="overwrite">Overwrite existing records</option>
                      <option value="rename">Rename incoming records</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Import Progress */}
              {importProgress > 0 && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-900">Importing...</span>
                    <span className="text-sm text-blue-700">{importProgress}%</span>
                  </div>
                  <Progress value={importProgress} className="h-2" />
                  {importProgress < 100 && (
                    <Button variant="outline" size="sm" className="mt-2" onClick={cancelImport}>
                      Cancel
                    </Button>
                  )}
                </div>
              )}

              {/* Import Result */}
              {importResult && (
                <div
                  className={`mt-4 p-4 rounded-lg border ${
                    importResult.success
                      ? "bg-green-50 border-green-200"
                      : "bg-red-50 border-red-200"
                  }`}
                >
                  <h4 className="font-medium mb-2">Import Result</h4>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>Imported: {importResult.imported}</div>
                    <div>Skipped: {importResult.skipped}</div>
                    <div>Failed: {importResult.failed}</div>
                  </div>
                  {importResult.errors.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm font-medium text-red-700">Errors:</p>
                      <ul className="text-sm text-red-600 list-disc list-inside">
                        {importResult.errors.map((error, i) => (
                          <li key={i}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-4">
                <Button
                  onClick={handleImport}
                  disabled={loading || importProgress > 0}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Start Import
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Backup Management */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <HardDrive className="h-6 w-6 text-purple-600 mr-2" />
              <h2 className="text-xl font-semibold text-gray-900">Backup Management</h2>
            </div>
            <Button
              onClick={handleCreateBackup}
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Create Backup
            </Button>
          </div>

          <p className="text-gray-600 mb-4">
            Create and manage automatic backups of your data
          </p>

          {backups.length > 0 ? (
            <div className="space-y-2">
              {backups.map((backup) => (
                <div
                  key={backup.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {new Date(backup.created_at).toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-600">
                      {backup.files_count} files • {formatFileSize(backup.size)}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      logger.info(LogCategory.API, `Restore backup: ${backup.id}`);
                      showMessage("info", "Backup restoration will be implemented soon");
                    }}
                  >
                    Restore
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-8 text-gray-600">
              No backups yet. Create your first backup to protect your data.
            </p>
          )}
        </div>

        {/* Privacy Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <CheckCircle2 className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Your Data Stays Local</h3>
              <p className="text-sm text-blue-600 mt-1">
                All data is stored locally on your machine in ~/.synchire. No cloud storage, no
                data collection, no tracking. Your job search data is completely private.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default memo(DataManagementPage);
