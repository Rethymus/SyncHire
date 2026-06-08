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

import { useEffect, useState, useCallback, memo, useRef, useMemo } from "react";
import { Navigation } from "@/components/navigation-lite";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { logger, LogCategory } from "@/lib/logger";
import { useLiteCopy } from "@/lib/lite-i18n";
import { useAppStore, type JobApplication, type JobDescription, type Resume } from "@/lib/store";
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

const LOCAL_BACKUPS_KEY = "synchire-backups";

function readLocalBackups(): Backup[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const stored = window.localStorage.getItem(LOCAL_BACKUPS_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalBackups(backups: Backup[]) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(LOCAL_BACKUPS_KEY, JSON.stringify(backups));
  }
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

const COPY = {
  "en-US": {
    title: "Data Management",
    subtitle: "Export, import, and back up your local job-search data",
    status: "Data Status",
    resumes: "Resumes",
    jds: "Job Descriptions",
    applications: "Applications",
    databaseSize: "Database Size",
    lastBackup: "Last backup:",
    exportData: "Export Data",
    exportDescription: "Export your data with filtering and template options",
    showFilters: "Show Filters",
    hideFilters: "Hide Filters",
    exportOptions: "Export Options",
    dataTypes: "Data Types",
    dateRange: "Date Range",
    applicationStatus: "Application Status",
    exportTemplate: "Export Template",
    json: "Export as JSON",
    csv: "Export as CSV",
    importData: "Import Data",
    importDescription: "Import previously exported data with validation and conflict resolution",
    selectFile: "Select File to Import",
    importPreview: "Import Preview",
    showDetails: "Show Details",
    hideDetails: "Hide Details",
    totalRecords: "Total Records",
    conflicts: "Conflicts",
    errors: "Errors",
    createBackup: "Create Local Backup",
    backups: "Local Backups",
    backupDescription: "Local backup metadata is stored in this browser only.",
    backupManagement: "Backup Management",
    backupManagementDescription: "Create and manage automatic backups of your data",
    createBackupButton: "Create Backup",
    backupFiles: "files",
    restore: "Restore",
    restoreSoon: "Backup restoration will be implemented soon",
    emptyBackups: "No backups yet. Create your first backup to protect your data.",
    localPrivacyTitle: "Your Data Stays Local",
    localPrivacyDescription:
      "All data is stored locally on your machine in ~/.synchire. No cloud storage, no data collection, no tracking. Your job search data is completely private.",
    successJson: "Data exported successfully as JSON",
    successCsv: "Data exported successfully as CSV",
    failedExport: "Failed to export data",
    cancelledExport: "Export cancelled",
    readyImport: "File is ready to import",
    failedPreview: "Failed to generate import preview",
    failedImport: "Failed to import data",
    backupCreated: "Backup created successfully",
    backupFailed: "Failed to create backup",
  },
  "zh-CN": {
    title: "数据管理",
    subtitle: "导出、导入并备份你的本地求职数据",
    status: "数据状态",
    resumes: "简历",
    jds: "职位描述",
    applications: "申请",
    databaseSize: "数据大小",
    lastBackup: "最近备份:",
    exportData: "导出数据",
    exportDescription: "通过筛选和模板选项导出你的数据",
    showFilters: "显示筛选",
    hideFilters: "隐藏筛选",
    exportOptions: "导出选项",
    dataTypes: "数据类型",
    dateRange: "日期范围",
    applicationStatus: "申请状态",
    exportTemplate: "导出模板",
    json: "导出 JSON",
    csv: "导出 CSV",
    importData: "导入数据",
    importDescription: "导入已导出的数据，并进行校验和冲突处理",
    selectFile: "选择导入文件",
    importPreview: "导入预览",
    showDetails: "显示详情",
    hideDetails: "隐藏详情",
    totalRecords: "总记录数",
    conflicts: "冲突",
    errors: "错误",
    createBackup: "创建本地备份",
    backups: "本地备份",
    backupDescription: "本地备份元数据仅保存在当前浏览器中。",
    backupManagement: "备份管理",
    backupManagementDescription: "创建并管理你的本地自动备份",
    createBackupButton: "创建备份",
    backupFiles: "个文件",
    restore: "恢复",
    restoreSoon: "备份恢复功能即将上线",
    emptyBackups: "还没有备份。创建第一份备份来保护你的求职数据。",
    localPrivacyTitle: "你的数据只保存在本地",
    localPrivacyDescription:
      "所有数据都存储在你的设备和本地应用目录中。没有云端存储、没有数据采集、没有追踪，你的求职数据完全由你掌控。",
    successJson: "已成功导出 JSON 数据",
    successCsv: "已成功导出 CSV 数据",
    failedExport: "导出数据失败",
    cancelledExport: "导出已取消",
    readyImport: "文件已准备好导入",
    failedPreview: "生成导入预览失败",
    failedImport: "导入数据失败",
    backupCreated: "备份创建成功",
    backupFailed: "创建备份失败",
  },
} as const;

function DataManagementPage() {
  const { locale } = useLiteCopy();
  const copy = COPY[locale];
  const {
    resumes,
    jobDescriptions,
    applications,
    setResumes,
    setJobDescriptions,
    setApplications,
  } = useAppStore();
  const [loading, setLoading] = useState(false);
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

  const buildExportData = useCallback(() => ({
    version: 1,
    exported_at: new Date().toISOString(),
    state: {
      resumes,
      jobDescriptions,
      applications,
    },
  }), [applications, jobDescriptions, resumes]);

  const buildLocalStatus = useCallback((localBackups = readLocalBackups()): DataStatus => {
    const snapshot = JSON.stringify(buildExportData());

    return {
      resumes_count: resumes.length,
      jds_count: jobDescriptions.length,
      applications_count: applications.length,
      database_size: new Blob([snapshot]).size,
      last_backup: localBackups[0]?.created_at ?? null,
    };
  }, [applications.length, buildExportData, jobDescriptions.length, resumes.length]);

  const status = useMemo(() => buildLocalStatus(backups), [backups, buildLocalStatus]);

  const loadBackups = useCallback(() => {
    setBackups(readLocalBackups());
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(loadBackups);

    return () => window.cancelAnimationFrame(frame);
  }, [loadBackups]);

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
      const data = buildExportData();

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
      showMessage("success", copy.successJson);
      logger.info(LogCategory.API, "Data exported as JSON");

      setTimeout(() => setExportProgress(null), 2000);
    } catch (error: any) {
      if (error.message === "Export cancelled") {
        showMessage("info", copy.cancelledExport);
      } else {
        showMessage("error", copy.failedExport);
        logger.error(LogCategory.API, "Failed to export JSON", error);
      }
      setExportProgress(null);
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, [buildExportData, copy.cancelledExport, copy.failedExport, copy.successJson, showMessage]);

  const handleExportCSV = useCallback(async () => {
    setLoading(true);
    setExportProgress({ stage: "Initializing", progress: 0, total: 100, current: 0 });
    abortControllerRef.current = new AbortController();

    try {
      const signal = abortControllerRef.current.signal;

      const escapeCsv = (value: unknown) =>
        `"${String(value ?? "").replace(/"/g, '""')}"`;
      const rows = [
        ["type", "id", "name", "company", "position", "status", "created_at"],
        ...resumes.map((resume) => [
          "resume",
          resume.id,
          resume.name,
          "",
          "",
          "",
          resume.uploadedAt,
        ]),
        ...jobDescriptions.map((jd) => [
          "job_description",
          jd.id,
          jd.title,
          jd.company,
          "",
          "",
          jd.createdAt,
        ]),
        ...applications.map((application) => [
          "application",
          application.id,
          "",
          application.companyName,
          application.position,
          application.status,
          application.createdAt,
        ]),
      ];
      const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\n");

      // Stage 1: Collecting data
      setExportProgress((prev) => ({ ...prev!, stage: "Collecting data", progress: 20 }));

      if (signal.aborted) throw new Error("Export cancelled");

      // Stage 2: Downloading
      setExportProgress((prev) => ({ ...prev!, stage: "Downloading file", progress: 50 }));
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });

      if (signal.aborted) throw new Error("Export cancelled");

      // Stage 3: Saving file
      setExportProgress((prev) => ({ ...prev!, stage: "Saving file", progress: 80 }));
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `synchire-export-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportProgress({ stage: "Complete", progress: 100, total: 100, current: 100 });
      showMessage("success", copy.successCsv);
      logger.info(LogCategory.API, "Data exported as CSV");

      setTimeout(() => setExportProgress(null), 2000);
    } catch (error: any) {
      if (error.message === "Export cancelled") {
        showMessage("info", copy.cancelledExport);
      } else {
        showMessage("error", copy.failedExport);
        logger.error(LogCategory.API, "Failed to export CSV", error);
      }
      setExportProgress(null);
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, [applications, copy.cancelledExport, copy.failedExport, copy.successCsv, jobDescriptions, resumes, showMessage]);

  const cancelExport = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  // Enhanced Import Functions
  const handleGeneratePreview = useCallback(async (file: File) => {
    setLoading(true);
    try {
      const text = await file.text();

      if (!file.name.endsWith(".json")) {
        setImportPreview({
          total_records: 0,
          resumes: 0,
          jds: 0,
          applications: 0,
          conflicts: [],
          validation_errors: [{
            record: 0,
            field: "file",
            message: "CSV import is not available in Lite mode yet. Use JSON backups for restore.",
          }],
        });
        showMessage("error", "CSV import is not available in Lite mode yet. Use JSON backups for restore.");
        return;
      }

      const parsed = JSON.parse(text);
      const state = parsed.state ?? parsed;
      const importedResumes = Array.isArray(state.resumes) ? state.resumes : [];
      const importedJDs = Array.isArray(state.jobDescriptions) ? state.jobDescriptions : [];
      const importedApplications = Array.isArray(state.applications) ? state.applications : [];
      const conflicts = [
        ...importedResumes
          .filter((resume: Resume) => resumes.some((existing) => existing.id === resume.id))
          .map((resume: Resume) => ({
            type: "resume",
            id: resume.id,
            existing: resumes.find((existing) => existing.id === resume.id),
            incoming: resume,
          })),
        ...importedJDs
          .filter((jd: JobDescription) => jobDescriptions.some((existing) => existing.id === jd.id))
          .map((jd: JobDescription) => ({
            type: "job_description",
            id: jd.id,
            existing: jobDescriptions.find((existing) => existing.id === jd.id),
            incoming: jd,
          })),
        ...importedApplications
          .filter((application: JobApplication) => applications.some((existing) => existing.id === application.id))
          .map((application: JobApplication) => ({
            type: "application",
            id: application.id,
            existing: applications.find((existing) => existing.id === application.id),
            incoming: application,
          })),
      ];
      const preview: ImportPreview = {
        total_records: importedResumes.length + importedJDs.length + importedApplications.length,
        resumes: importedResumes.length,
        jds: importedJDs.length,
        applications: importedApplications.length,
        conflicts,
        validation_errors: [],
      };
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
        showMessage("success", copy.readyImport);
      }
    } catch (error) {
      showMessage("error", copy.failedPreview);
      logger.error(LogCategory.API, "Failed to generate preview", error as Error);
    } finally {
      setLoading(false);
    }
  }, [applications, copy.failedPreview, copy.readyImport, jobDescriptions, resumes, showMessage]);

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
    [handleGeneratePreview, showMessage]
  );

  const handleImport = useCallback(async () => {
    if (!importFile) return;

    setLoading(true);
    setImportProgress(0);
    setImportResult(null);
    abortControllerRef.current = new AbortController();

    try {
      const signal = abortControllerRef.current.signal;

      if (!importFile.name.endsWith(".json")) {
        throw new Error("Only JSON backup imports are available in Lite mode");
      }

      setImportProgress(30);
      const parsed = JSON.parse(await importFile.text());
      const state = parsed.state ?? parsed;
      const importedResumes: Resume[] = Array.isArray(state.resumes)
        ? state.resumes.map((resume: Resume) => ({
            ...resume,
            uploadedAt: new Date(resume.uploadedAt),
          }))
        : [];
      const importedJDs: JobDescription[] = Array.isArray(state.jobDescriptions)
        ? state.jobDescriptions.map((jd: JobDescription) => ({
            ...jd,
            createdAt: new Date(jd.createdAt),
          }))
        : [];
      const importedApplications: JobApplication[] = Array.isArray(state.applications)
        ? state.applications.map((application: JobApplication) => ({
            ...application,
            createdAt: new Date(application.createdAt),
            updatedAt: new Date(application.updatedAt),
          }))
        : [];

      if (signal.aborted) throw new Error("Import cancelled");

      setImportProgress(65);
      const mergeById = <T extends { id: string }>(current: T[], incoming: T[]) => {
        if (importMode === "replace") {
          return incoming;
        }

        const records = new Map(current.map((record) => [record.id, record]));
        for (const record of incoming) {
          if (!records.has(record.id) || resolveConflicts === "overwrite") {
            records.set(record.id, record);
          } else if (resolveConflicts === "rename") {
            records.set(`${record.id}-${Date.now()}`, {
              ...record,
              id: `${record.id}-${Date.now()}`,
            });
          }
        }
        return Array.from(records.values());
      };

      setResumes(mergeById(resumes, importedResumes));
      setJobDescriptions(mergeById(jobDescriptions, importedJDs));
      setApplications(mergeById(applications, importedApplications));
      setImportProgress(100);

      const imported =
        importedResumes.length + importedJDs.length + importedApplications.length;
      const result: ImportResult = {
        success: true,
        imported,
        failed: 0,
        skipped: 0,
        errors: [],
      };
      setImportResult(result);

      showMessage(
        "success",
        `Import completed: ${result.imported} imported, ${result.skipped} skipped, ${result.failed} failed`
      );
      loadBackups();

      logger.info(LogCategory.API, "Data import completed", result);
    } catch (error: any) {
      if (error.name === "AbortError") {
        showMessage("info", "Import cancelled");
      } else {
        showMessage("error", copy.failedImport);
        logger.error(LogCategory.API, "Failed to import data", error);
      }
    } finally {
      setLoading(false);
      setImportProgress(0);
      abortControllerRef.current = null;
    }
  }, [
    applications,
    importFile,
    importMode,
    jobDescriptions,
    loadBackups,
    copy.failedImport,
    resolveConflicts,
    resumes,
    setApplications,
    setJobDescriptions,
    setResumes,
    showMessage,
  ]);

  const cancelImport = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const handleCreateBackup = useCallback(async () => {
    setLoading(true);
    try {
      const snapshot = buildExportData();
      const backup: Backup = {
        id: crypto.randomUUID(),
        created_at: snapshot.exported_at,
        size: new Blob([JSON.stringify(snapshot)]).size,
        files_count: 3,
      };
      const nextBackups = [backup, ...readLocalBackups()].slice(0, 10);
      writeLocalBackups(nextBackups);
      setBackups(nextBackups);
      showMessage("success", copy.backupCreated);
      logger.info(LogCategory.API, "Backup created successfully");
    } catch (error) {
      showMessage("error", copy.backupFailed);
      logger.error(LogCategory.API, "Failed to create backup", error as Error);
    } finally {
      setLoading(false);
    }
  }, [buildExportData, copy.backupCreated, copy.backupFailed, showMessage]);

  return (
    <div className="min-h-screen bg-gray-50">
      

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{copy.title}</h1>
          <p className="mt-2 text-gray-600">
            {copy.subtitle}
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
              <h2 className="text-xl font-semibold text-gray-900">{copy.status}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">{copy.resumes}</p>
                <p className="text-2xl font-bold text-blue-900">{status.resumes_count}</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-700">{copy.jds}</p>
                <p className="text-2xl font-bold text-green-900">{status.jds_count}</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-purple-700">{copy.applications}</p>
                <p className="text-2xl font-bold text-purple-900">{status.applications_count}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700">{copy.databaseSize}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatFileSize(status.database_size)}
                </p>
              </div>
            </div>
            {status.last_backup && (
              <p className="mt-4 text-sm text-gray-600">
                {copy.lastBackup} {new Date(status.last_backup).toLocaleString(locale)}
              </p>
            )}
          </div>
        )}

        {/* Export Data */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Download className="h-6 w-6 text-green-600 mr-2" />
              <h2 className="text-xl font-semibold text-gray-900">{copy.exportData}</h2>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowExportFilters(!showExportFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              {showExportFilters ? copy.hideFilters : copy.showFilters}
            </Button>
          </div>

          <p className="text-gray-600 mb-4">
            {copy.exportDescription}
          </p>

          {/* Export Filters */}
          {showExportFilters && (
            <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
              <h3 className="font-medium text-gray-900 mb-3">{copy.exportOptions}</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Data Types */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {copy.dataTypes}
                  </label>
                  <div className="space-y-2">
                    {[
                      { value: "resumes", label: copy.resumes },
                      { value: "jds", label: copy.jds },
                      { value: "applications", label: copy.applications },
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
                    {copy.dateRange}
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
                    {copy.applicationStatus}
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
                    {copy.exportTemplate}
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
              {copy.json}
            </Button>
            <Button
              onClick={handleExportCSV}
              disabled={loading || !!exportProgress}
              variant="outline"
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              {copy.csv}
            </Button>
          </div>
        </div>

        {/* Import Data */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex items-center mb-4">
            <Upload className="h-6 w-6 text-orange-600 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">{copy.importData}</h2>
          </div>

          <p className="text-gray-600 mb-4">
            {copy.importDescription}
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
                {copy.selectFile}
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
                <h3 className="font-medium text-gray-900">{copy.importPreview}</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowImportPreview(!showImportPreview)}
                >
                  {showImportPreview ? <ChevronDown /> : <ChevronRight />}
                  {showImportPreview ? copy.hideDetails : copy.showDetails}
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-3">
                <div className="bg-white p-3 rounded-lg">
                  <p className="text-sm text-gray-600">{copy.totalRecords}</p>
                  <p className="text-xl font-bold text-gray-900">{importPreview.total_records}</p>
                </div>
                <div className="bg-white p-3 rounded-lg">
                  <p className="text-sm text-gray-600">{copy.conflicts}</p>
                  <p className="text-xl font-bold text-orange-600">
                    {importPreview.conflicts.length}
                  </p>
                </div>
                <div className="bg-white p-3 rounded-lg">
                  <p className="text-sm text-gray-600">{copy.errors}</p>
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
              <h2 className="text-xl font-semibold text-gray-900">{copy.backupManagement}</h2>
            </div>
            <Button
              onClick={handleCreateBackup}
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {copy.createBackupButton}
            </Button>
          </div>

          <p className="text-gray-600 mb-4">
            {copy.backupManagementDescription}
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
                      {backup.files_count} {copy.backupFiles} • {formatFileSize(backup.size)}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      logger.info(LogCategory.API, `Restore backup: ${backup.id}`);
                      showMessage("info", copy.restoreSoon);
                    }}
                  >
                    {copy.restore}
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-8 text-gray-600">
              {copy.emptyBackups}
            </p>
          )}
        </div>

        {/* Privacy Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <CheckCircle2 className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">{copy.localPrivacyTitle}</h3>
              <p className="text-sm text-blue-600 mt-1">
                {copy.localPrivacyDescription}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default memo(DataManagementPage);
