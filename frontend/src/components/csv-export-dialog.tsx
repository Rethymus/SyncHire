"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Download, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { logger, LogCategory } from "@/lib/logger";
import type {
  CSVExportResponse,
  CSVJobStatus,
} from "@/types/csv";

interface CSVExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: "applications" | "resumes" | "jds";
  entityName: string;
}

interface ExportField {
  key: string;
  label: string;
  default: boolean;
}

const APPLICATION_FIELDS: ExportField[] = [
  { key: "id", label: "ID", default: false },
  { key: "status", label: "Status", default: true },
  { key: "match_score", label: "Match Score", default: true },
  { key: "notes", label: "Notes", default: true },
  { key: "tags", label: "Tags", default: true },
  { key: "created_at", label: "Created Date", default: true },
  { key: "updated_at", label: "Updated Date", default: false },
  { key: "resume_title", label: "Resume Title", default: true },
  { key: "jd_title", label: "Job Title", default: true },
  { key: "company_name", label: "Company Name", default: true },
];

const RESUME_FIELDS: ExportField[] = [
  { key: "id", label: "ID", default: false },
  { key: "title", label: "Title", default: true },
  { key: "file_name", label: "File Name", default: true },
  { key: "skills", label: "Skills", default: true },
  { key: "experience_years", label: "Experience Years", default: true },
  { key: "education_level", label: "Education Level", default: true },
  { key: "created_at", label: "Created Date", default: true },
  { key: "updated_at", label: "Updated Date", default: false },
];

const JD_FIELDS: ExportField[] = [
  { key: "id", label: "ID", default: false },
  { key: "title", label: "Title", default: true },
  { key: "company_name", label: "Company Name", default: true },
  { key: "location", label: "Location", default: true },
  { key: "employment_type", label: "Employment Type", default: true },
  { key: "skills_required", label: "Skills Required", default: true },
  { key: "experience_required", label: "Experience Required", default: true },
  { key: "salary_min", label: "Min Salary", default: false },
  { key: "salary_max", label: "Max Salary", default: false },
  { key: "created_at", label: "Created Date", default: true },
  { key: "updated_at", label: "Updated Date", default: false },
];

type ExportStatus = "idle" | "exporting" | "completed" | "error";

export function CSVExportDialog({
  open,
  onOpenChange,
  entityType,
  entityName,
}: CSVExportDialogProps) {
  const [selectedFields, setSelectedFields] = useState<Set<string>>(
    new Set(
      (entityType === "applications"
        ? APPLICATION_FIELDS
        : entityType === "resumes"
        ? RESUME_FIELDS
        : JD_FIELDS
      ).filter((f) => f.default).map((f) => f.key)
    )
  );
  const [status, setStatus] = useState<ExportStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);

  const fields =
    entityType === "applications"
      ? APPLICATION_FIELDS
      : entityType === "resumes"
      ? RESUME_FIELDS
      : JD_FIELDS;

  const handleFieldToggle = (fieldKey: string) => {
    const newFields = new Set(selectedFields);
    if (newFields.has(fieldKey)) {
      newFields.delete(fieldKey);
    } else {
      newFields.add(fieldKey);
    }
    setSelectedFields(newFields);
  };

  const handleExport = async () => {
    if (selectedFields.size === 0) {
      setError("Please select at least one field to export");
      return;
    }

    setStatus("exporting");
    setProgress(0);
    setError(null);

    try {
      // Start export job
      const response = await apiClient.post<CSVExportResponse>("/api/csv/export", {
        entity_type: entityType,
        fields: Array.from(selectedFields),
        batch_size: 100,
      });

      const newJobId = response.data?.job_id;
      if (!newJobId) throw new Error('No job ID returned');
      setJobId(newJobId);

      // Poll for progress
      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await apiClient.get<CSVJobStatus>(
            `/api/csv/export/${newJobId}/status`
          );
          const jobStatus = statusResponse.data as CSVJobStatus;

          setProgress(jobStatus.progress);

          if (jobStatus.status === "completed") {
            clearInterval(pollInterval);
            setStatus("completed");

            // Auto-download
            await downloadFile(newJobId);
          } else if (jobStatus.status === "error") {
            clearInterval(pollInterval);
            setStatus("error");
            setError("Export failed. Please try again.");
          }
        } catch (error) {
          clearInterval(pollInterval);
          setStatus("error");
          setError("Failed to check export status");
          logger.error(LogCategory.API, "Error polling export status:", error as Error);
        }
      }, 1000);
    } catch (error) {
      setStatus("error");
      setError("Failed to start export");
      logger.error(LogCategory.API, "Error starting export:", error as Error);
    }
  };

  const downloadFile = async (exportJobId: string) => {
    try {
      const response = await apiClient.get(
        `/api/csv/export/${exportJobId}/download`,
        {
          responseType: "blob",
        }
      );

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data as BlobPart]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `${entityType}_export_${new Date().toISOString().split("T")[0]}.csv`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setError("Failed to download file");
      logger.error(LogCategory.API, "Error downloading export:", error as Error);
    }
  };

  const handleReset = () => {
    setStatus("idle");
    setProgress(0);
    setError(null);
    setJobId(null);
  };

  const handleClose = () => {
    if (status === "exporting") {
      return; // Prevent closing during export
    }
    handleReset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Export {entityName} to CSV</DialogTitle>
          <DialogDescription>
            Select the fields you want to include in the CSV export
          </DialogDescription>
        </DialogHeader>

        {status === "idle" && (
          <>
            <div className="grid grid-cols-2 gap-4 py-4">
              {fields.map((field) => (
                <div key={field.key} className="flex items-center space-x-2">
                  <Checkbox
                    id={field.key}
                    checked={selectedFields.has(field.key)}
                    onCheckedChange={() => handleFieldToggle(field.key)}
                  />
                  <Label
                    htmlFor={field.key}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {field.label}
                  </Label>
                </div>
              ))}
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleExport} disabled={selectedFields.size === 0}>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </DialogFooter>
          </>
        )}

        {status === "exporting" && (
          <div className="py-6">
            <div className="flex items-center justify-center mb-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
            <div className="text-center mb-4">
              <p className="text-sm font-medium">Exporting data...</p>
              <p className="text-xs text-muted-foreground mt-1">
                {Math.round(progress)}% complete
              </p>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        )}

        {status === "completed" && (
          <div className="py-6">
            <div className="flex items-center justify-center mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
            <div className="text-center mb-4">
              <p className="text-sm font-medium">Export completed!</p>
              <p className="text-xs text-muted-foreground mt-1">
                Your CSV file has been downloaded
              </p>
            </div>
            <DialogFooter>
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