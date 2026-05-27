"use client";

import React, { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, Loader2, CheckCircle2, AlertCircle, FileText } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { logger, LogCategory } from "@/lib/logger";
import type {
  CSVImportResponse,
  CSVJobStatus,
} from "@/types/csv";

interface CSVImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: "applications" | "resumes" | "jds";
  entityName: string;
  onSuccess?: () => void;
}

type ImportStatus = "idle" | "uploading" | "processing" | "completed" | "error";

interface ImportResult {
  processed: number;
  total: number;
  success: number;
  errors: number;
  validation_errors?: string[];
}

export function CSVImportDialog({
  open,
  onOpenChange,
  entityType,
  entityName,
  onSuccess,
}: CSVImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [onDuplicate, setOnDuplicate] = useState<string>("skip");
  const [status, setStatus] = useState<ImportStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith(".csv")) {
        setError("Please select a CSV file");
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleImport = async () => {
    if (!file) {
      setError("Please select a file to import");
      return;
    }

    setStatus("uploading");
    setProgress(0);
    setError(null);
    setResult(null);

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append("csv_file", file);
      formData.append("entity_type", entityType);
      formData.append("on_duplicate", onDuplicate);
      formData.append("batch_size", "50");

      // Start import job
      const response = await apiClient.post<CSVImportResponse>("/api/csv/import", formData);

      const jobId = response.data?.job_id;
      if (!jobId) throw new Error('No job ID returned');
      setStatus("processing");

      // Poll for progress
      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await apiClient.get<CSVJobStatus>(
            `/api/csv/import/${jobId}/status`
          );
          const jobStatus = statusResponse.data as CSVJobStatus;

          setProgress(jobStatus.progress);

          if (jobStatus.status === "completed") {
            clearInterval(pollInterval);
            setStatus("completed");
            setResult(jobStatus.result);

            if (onSuccess) {
              onSuccess();
            }
          } else if (jobStatus.status === "error") {
            clearInterval(pollInterval);
            setStatus("error");
            setError(jobStatus.result?.error || "Import failed. Please try again.");
          }
        } catch (error) {
          clearInterval(pollInterval);
          setStatus("error");
          setError("Failed to check import status");
          logger.error(LogCategory.API, "Error polling import status:", error as Error);
        }
      }, 1000);
    } catch (error) {
      setStatus("error");
      setError("Failed to start import");
      logger.error(LogCategory.API, "Error starting import:", error as Error);
    }
  };

  const handleReset = () => {
    setStatus("idle");
    setProgress(0);
    setError(null);
    setResult(null);
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClose = () => {
    if (status === "uploading" || status === "processing") {
      return; // Prevent closing during import
    }
    handleReset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Import {entityName} from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file to import {entityName.toLowerCase()} data
          </DialogDescription>
        </DialogHeader>

        {status === "idle" && (
          <>
            <div className="space-y-4 py-4">
              {/* File Upload */}
              <div className="space-y-2">
                <Label htmlFor="csv-file">CSV File</Label>
                <div className="flex items-center gap-4">
                  <input
                    ref={fileInputRef}
                    id="csv-file"
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Choose File
                  </Button>
                  {file && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      <span className="truncate max-w-[200px]">{file.name}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Duplicate Handling */}
              <div className="space-y-2">
                <Label htmlFor="duplicate-handling">Duplicate Handling</Label>
                <Select value={onDuplicate} onValueChange={setOnDuplicate}>
                  <SelectTrigger id="duplicate-handling">
                    <SelectValue placeholder="Select strategy" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="skip">
                      Skip duplicates (default)
                    </SelectItem>
                    <SelectItem value="update">
                      Update existing records
                    </SelectItem>
                    <SelectItem value="error">
                      Error on duplicates
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {onDuplicate === "skip" &&
                    "Existing records will be skipped and not imported."}
                  {onDuplicate === "update" &&
                    "Existing records will be updated with new data."}
                  {onDuplicate === "error" &&
                    "Import will fail if any duplicates are found."}
                </p>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleImport} disabled={!file}>
                <Upload className="mr-2 h-4 w-4" />
                Import CSV
              </Button>
            </DialogFooter>
          </>
        )}

        {(status === "uploading" || status === "processing") && (
          <div className="py-6">
            <div className="flex items-center justify-center mb-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
            <div className="text-center mb-4">
              <p className="text-sm font-medium">
                {status === "uploading" ? "Uploading file..." : "Processing data..."}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {Math.round(progress)}% complete
              </p>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        )}

        {status === "completed" && result && (
          <div className="py-6">
            <div className="flex items-center justify-center mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
            <div className="text-center mb-4">
              <p className="text-sm font-medium">Import completed!</p>
              <p className="text-xs text-muted-foreground mt-1">
                {result.success} of {result.total} records imported successfully
              </p>
              {result.errors > 0 && (
                <p className="text-xs text-destructive mt-1">
                  {result.errors} records had errors
                </p>
              )}
            </div>

            {result.validation_errors && result.validation_errors.length > 0 && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-medium mb-2">Some errors occurred:</p>
                  <ul className="text-xs space-y-1">
                    {result.validation_errors.slice(0, 5).map((error, idx) => (
                      <li key={idx}>{error}</li>
                    ))}
                    {result.validation_errors.length > 5 && (
                      <li>
                        ...and {result.validation_errors.length - 5} more errors
                      </li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <DialogFooter className="mt-4">
              <Button onClick={handleClose}>Close</Button>
            </DialogFooter>
          </div>
        )}

        {status === "error" && (
          <div className="py-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleReset}>Try Again</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}