/**
 * Backup Manager Component
 */

"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client-unified";
import { logger, LogCategory } from "@/lib/logger";
import { HardDrive, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";

interface Backup {
  id: string;
  created_at: string;
  size: number;
  files_count: number;
}

export function BackupManager() {
  const [loading, setLoading] = useState(false);
  const [backups, setBackups] = useState<Backup[]>([]);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadBackups = useCallback(async () => {
    try {
      const data = await apiClient.portability.listBackups();
      setBackups(data.backups || []);
    } catch (error) {
      logger.error(LogCategory.API, "Failed to load backups", error as Error);
    }
  }, []);

  const handleCreateBackup = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      await apiClient.portability.createBackup();
      setMessage({ type: "success", text: "Backup created successfully" });
      logger.info(LogCategory.API, "Backup created successfully");
      // Reload backups
      loadBackups();
    } catch (error) {
      setMessage({ type: "error", text: "Failed to create backup" });
      logger.error(LogCategory.API, "Failed to create backup", error as Error);
    } finally {
      setLoading(false);
    }
  }, [loadBackups]);

  // Load backups on mount
  useEffect(() => {
    const loadInitialBackups = async () => {
      await loadBackups();
    };
    loadInitialBackups();
  }, [loadBackups]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
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
        Create and manage automatic backups of your data.
      </p>

      {message && (
        <div
          className={`mb-4 p-4 rounded-lg ${
            message.type === "success"
              ? "bg-green-50 border border-green-200"
              : "bg-red-50 border border-red-200"
          }`}
        >
          <div className="flex">
            {message.type === "success" ? (
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            )}
            <div className="ml-3">
              <p
                className={`text-sm ${
                  message.type === "success" ? "text-green-800" : "text-red-800"
                }`}
              >
                {message.text}
              </p>
            </div>
          </div>
        </div>
      )}

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
                  // TODO: Implement restore functionality
                  logger.info(LogCategory.API, `Restore backup: ${backup.id}`);
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
  );
}
