"use client";

import { useState, useCallback, memo } from "react";
import { Upload, FileText, X, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface JDFileUploadProps {
  onUploadSuccess: (data: {
    id: string;
    title: string;
    company: string | null;
    content: string;
    parsedData: Record<string, unknown> | null;
  }) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  className?: string;
}

function JDFileUploadComponent({
  onUploadSuccess,
  onError,
  disabled = false,
  className,
}: JDFileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const handleFileUpload = useCallback(async (file: File) => {
    // Reset states
    setUploadError(null);
    setUploadSuccess(false);

    // Validate file type
    const validTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    const fileExt = file.name.toLowerCase();
    const isValidFile = validTypes.includes(file.type) ||
                       fileExt.endsWith(".pdf") ||
                       fileExt.endsWith(".docx");

    if (!isValidFile) {
      const error = "Invalid file type. Please upload a PDF or DOCX file.";
      setUploadError(error);
      onError?.(error);
      return;
    }

    // Validate file size (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      const error = "File too large. Maximum size is 10MB.";
      setUploadError(error);
      onError?.(error);
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/jds/upload", {
        method: "POST",
        headers: {
          "Accept": "application/json",
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: "Upload failed" }));
        throw new Error(errorData.detail || `Upload failed with status ${response.status}`);
      }

      const data = await response.json();

      setUploadSuccess(true);
      onUploadSuccess({
        id: data.id,
        title: data.title,
        company: data.company,
        content: data.content,
        parsedData: data.parsed_data,
      });

      // Reset success message after 3 seconds
      setTimeout(() => setUploadSuccess(false), 3000);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to upload file";
      setUploadError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsUploading(false);
    }
  }, [onUploadSuccess, onError]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isUploading) {
      setIsDragging(true);
    }
  }, [disabled, isUploading]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled || isUploading) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [disabled, isUploading, handleFileUpload]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  const clearError = useCallback(() => {
    setUploadError(null);
  }, []);

  return (
    <div className={cn("space-y-4", className)}>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "relative border-2 border-dashed rounded-lg p-8 transition-colors",
          "flex flex-col items-center justify-center text-center",
          "min-h-[200px] cursor-pointer",
          isDragging && !disabled && !isUploading && "border-blue-500 bg-blue-50",
          !isDragging && "border-gray-300 hover:border-gray-400",
          disabled && "opacity-50 cursor-not-allowed",
          isUploading && "pointer-events-none"
        )}
        role="button"
        tabIndex={disabled ? undefined : 0}
        aria-label="Upload job description file"
        onKeyDown={(e) => {
          if (!disabled && !isUploading && (e.key === "Enter" || e.key === " ")) {
            document.getElementById('jd-file-input')?.click();
          }
        }}
        onClick={() => {
          if (!disabled && !isUploading) {
            document.getElementById('jd-file-input')?.click();
          }
        }}
      >
        <input
          id="jd-file-input"
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled || isUploading}
          aria-label="Upload job description file"
        />

        {isUploading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
            <p className="text-gray-700 font-medium">Uploading and parsing...</p>
            <p className="text-sm text-gray-600">This may take a moment</p>
          </div>
        ) : uploadSuccess ? (
          <div className="flex flex-col items-center gap-3">
            <CheckCircle className="h-12 w-12 text-green-600" />
            <p className="text-gray-900 font-medium">Upload successful!</p>
            <p className="text-sm text-gray-600">JD parsed and saved</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className={cn(
              "p-4 rounded-full transition-colors",
              isDragging ? "bg-blue-100" : "bg-gray-100"
            )}>
              <Upload className="h-8 w-8 text-gray-600" />
            </div>
            <div>
              <p className="text-gray-900 font-medium text-lg">
                Upload Job Description
              </p>
              <p className="text-gray-700 mt-2">
                Drag and drop your PDF or DOCX file here, or click to browse
              </p>
              <p className="text-sm text-gray-600 mt-2">
                Maximum file size: 10MB
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="lg"
              disabled={disabled}
              className="mt-2"
              onClick={() => {
                document.getElementById('jd-file-input')?.click();
              }}
            >
              <FileText className="h-5 w-5 mr-2" />
              Choose File
            </Button>
          </div>
        )}
      </div>

      {uploadError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3" role="alert" aria-live="assertive">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-red-800 font-medium">Upload Failed</p>
            <p className="text-sm text-red-700 mt-1">{uploadError}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={clearError}
            className="h-8 w-8 flex-shrink-0"
            aria-label="Clear error"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <FileText className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-blue-900">Supported Formats</p>
          <p className="text-blue-700 mt-1">
            PDF and DOCX files. The system will automatically extract text,
            parse job details, and identify skills and requirements.
          </p>
        </div>
      </div>
    </div>
  );
}

export const JDFileUpload = memo(JDFileUploadComponent);
