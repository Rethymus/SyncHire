"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  Download,
  X,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { logger, LogCategory } from "@/lib/logger";
import type { CSVJobStatus } from "@/types/csv";

interface CSVProgressIndicatorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string;
  operation: "export" | "import";
  onComplete?: (result: any) => void;
}

type OperationStatus = "pending" | "processing" | "completed" | "error" | "cancelled";

export function CSVProgressIndicator({
  open,
  onOpenChange,
  jobId,
  operation,
  onComplete,
}: CSVProgressIndicatorProps) {
  const [status, setStatus] = useState<OperationStatus>("pending");
  const [progress, setProgress] = useState(0);
  const [processed, setProcessed] = useState(0);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    if (!open || !jobId) return;

    const pollStatus = async () => {
      try {
        const endpoint =
          operation === "export"
            ? `/api/csv/export/${jobId}/status`
            : `/api/csv/import/${jobId}/status`;

        const response = await apiClient.get<CSVJobStatus>(endpoint);
        const jobData = response.data as CSVJobStatus;

        setStatus(jobData.status);
        setProgress(jobData.progress || 0);
        setProcessed(jobData.processed || 0);
        setTotal(jobData.total || 0);

        if (jobData.status === "completed") {
          setResult(jobData.result);
          if (onComplete) {
            onComplete(jobData.result);
          }
        } else if (jobData.status === "error") {
          setError(jobData.result?.error || "Operation failed");
        }
      } catch (error) {
        logger.error(LogCategory.API, `Error polling ${operation} status:`, error as Error);
        setError("Failed to check operation status");
      }
    };

    // Initial poll
    pollStatus();

    // Set up polling interval
    const interval = setInterval(pollStatus, 1000);

    return () => clearInterval(interval);
  }, [open, jobId, operation, onComplete]);

  const handleDownload = async () => {
    if (operation !== "export" || !jobId) return;

    try {
      const response = await apiClient.get(`/api/csv/export/${jobId}/download`, {
        responseType: "blob",
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data as BlobPart]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `export_${new Date().toISOString().split("T")[0]}.csv`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      logger.error(LogCategory.API, "Error downloading file:", error as Error);
      setError("Failed to download file");
    }
  };

  const handleClose = () => {
    if (status === "processing") {
      return; // Prevent closing during processing
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {operation === "export" ? "CSV Export" : "CSV Import"}
          </DialogTitle>
          <DialogDescription>
            {status === "pending" && "Initializing..."}
            {status === "processing" &&
              `Processing ${processed} of ${total} records...`}
            {status === "completed" && "Operation completed successfully!"}
            {status === "error" && "An error occurred"}
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          {/* Status Icon */}
          <div className="flex items-center justify-center mb-4">
            {status === "pending" && (
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            )}
            {status === "processing" && (
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            )}
            {status === "completed" && (
              <CheckCircle2 className="h-12 w-12 text-green-500" />
            )}
            {status === "error" && (
              <AlertCircle className="h-12 w-12 text-destructive" />
            )}
          </div>

          {/* Progress Bar */}
          {(status === "pending" || status === "processing") && (
            <>
              <Progress value={progress} className="w-full mb-2" />
              <div className="text-center text-sm text-muted-foreground">
                {Math.round(progress)}% complete
                {total > 0 && ` (${processed}/${total} records)`}
              </div>
            </>
          )}

          {/* Error Display */}
          {status === "error" && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Result Display */}
          {status === "completed" && result && (
            <div className="space-y-2">
              {operation === "import" && (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    <p className="font-medium">Import Summary:</p>
                    <p className="text-sm">
                      {result.success} records imported successfully
                    </p>
                    {result.errors > 0 && (
                      <p className="text-sm text-destructive">
                        {result.errors} records had errors
                      </p>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {operation === "export" && (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    <p className="font-medium">Export completed!</p>
                    <p className="text-sm">
                      {result.processed} records exported
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      File size: {(result.size / 1024).toFixed(2)} KB
                    </p>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          {status === "completed" && operation === "export" && (
            <Button onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" />
              Download File
            </Button>
          )}
          {status !== "processing" && (
            <Button variant="outline" onClick={handleClose}>
              {status === "completed" ? "Close" : "Cancel"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}