/**
 * Data Export Component
 */

"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client-unified";
import { logger, LogCategory } from "@/lib/logger";
import { Download, FileJson, FileSpreadsheet, CheckCircle2, AlertCircle } from "lucide-react";

export function DataExport() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleExportJSON = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const data = await apiClient.portability.exportJSON();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `synchire-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setMessage({ type: "success", text: "Data exported successfully as JSON" });
      logger.info(LogCategory.API, "Data exported as JSON");
    } catch (error) {
      setMessage({ type: "error", text: "Failed to export data" });
      logger.error(LogCategory.API, "Failed to export JSON", error as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleExportCSV = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const data = await apiClient.portability.exportCSV();
      const blob = new Blob([data], { type: "application/zip" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `synchire-export-${new Date().toISOString().split("T")[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setMessage({ type: "success", text: "Data exported successfully as CSV" });
      logger.info(LogCategory.API, "Data exported as CSV");
    } catch (error) {
      setMessage({ type: "error", text: "Failed to export data" });
      logger.error(LogCategory.API, "Failed to export CSV", error as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center mb-4">
        <Download className="h-6 w-6 text-green-600 mr-2" />
        <h2 className="text-xl font-semibold text-gray-900">Export Data</h2>
      </div>
      <p className="text-gray-600 mb-4">
        Export all your data in various formats for safekeeping or migration.
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

      <div className="flex flex-wrap gap-4">
        <Button
          onClick={handleExportJSON}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <FileJson className="h-4 w-4 mr-2" />
          Export as JSON
        </Button>
        <Button
          onClick={handleExportCSV}
          disabled={loading}
          variant="outline"
        >
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Export as CSV
        </Button>
      </div>
    </div>
  );
}
