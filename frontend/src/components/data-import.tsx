/**
 * Data Import Component
 */

"use client";

import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client-unified";
import { logger, LogCategory } from "@/lib/logger";
import { Upload, CheckCircle2, AlertCircle } from "lucide-react";

export function DataImport() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImport = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setMessage(null);
    try {
      await apiClient.portability.import(file, false);
      setMessage({ type: "success", text: "Data imported successfully" });
      logger.info(LogCategory.API, "Data imported successfully");
    } catch (error) {
      setMessage({ type: "error", text: "Failed to import data" });
      logger.error(LogCategory.API, "Failed to import data", error as Error);
    } finally {
      setLoading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, []);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center mb-4">
        <Upload className="h-6 w-6 text-orange-600 mr-2" />
        <h2 className="text-xl font-semibold text-gray-900">Import Data</h2>
      </div>
      <p className="text-gray-600 mb-4">
        Import previously exported data. Choose whether to overwrite existing data.
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

      <div className="flex items-center gap-4">
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImport}
          disabled={loading}
          className="hidden"
        />
        <Button
          onClick={handleClick}
          disabled={loading}
          variant="outline"
        >
          <Upload className="h-4 w-4 mr-2" />
          Import JSON File
        </Button>
        <span className="text-sm text-gray-500">
          Accepts .json files exported from SyncHire Lite
        </span>
      </div>
    </div>
  );
}
