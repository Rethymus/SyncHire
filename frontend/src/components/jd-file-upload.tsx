"use client";

import { useState, useCallback, memo } from "react";
import { Upload, FileText, X, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { createChunkedUpload, type UploadProgress } from "@/lib/chunked-upload";
import { UploadProgress as UploadProgressComponent } from "@/components/upload-progress";
import { motion, AnimatePresence } from "framer-motion";
import {
  uploadZoneIdle,
  uploadZoneHover,
  uploadZoneDrag,
  successCheck,
  errorShake,
  fadeInUp,
  scaleIn,
  staggerContainer,
  staggerItem,
} from "@/lib/animations";

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
  const { crud, api } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [currentUploadProgress, setCurrentUploadProgress] = useState<UploadProgress | null>(null);

  const handleChunkedUpload = useCallback(async (file: File) => {
    // Reset states
    setUploadError(null);
    setUploadSuccess(false);
    setIsUploading(true);

    const chunkedUpload = createChunkedUpload(file, '/api/upload/chunk', {
      chunkSize: 1024 * 1024, // 1MB chunks
      maxRetries: 3,
      uploadType: 'jd',
      onProgress: (progress) => {
        setCurrentUploadProgress(progress);
      },
      onComplete: (response) => {
        setUploadSuccess(true);
        crud.create.success("Job Description", `${response.title || "Job Description"} uploaded successfully`);
        onUploadSuccess({
          id: response.id,
          title: response.title,
          company: null, // Will be filled by the actual response
          content: response.content,
          parsedData: null, // Will be filled by the actual response
        });

        // Reset success message after 3 seconds
        setTimeout(() => {
          setUploadSuccess(false);
          setCurrentUploadProgress(null);
        }, 3000);
      },
      onError: (error) => {
        const errorMessage = error.message || "Failed to upload file";
        setUploadError(errorMessage);
        crud.create.error("Job Description", errorMessage);
        onError?.(errorMessage);
        setCurrentUploadProgress(null);
      },
    });

    try {
      await chunkedUpload.start();
    } finally {
      setIsUploading(false);
    }
  }, [onUploadSuccess, onError, crud]);

  const handleFileUpload = useCallback(async (file: File) => {
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

    // Validate file size (100MB for chunked upload)
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      const error = "File too large. Maximum size is 100MB.";
      setUploadError(error);
      onError?.(error);
      return;
    }

    await handleChunkedUpload(file);
  }, [handleChunkedUpload, onError]);

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
      <motion.div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        variants={uploadZoneIdle}
        initial="initial"
        animate={isDragging ? "drag" : "animate"}
        whileHover="hover"
        className={cn(
          "relative border-2 border-dashed rounded-lg p-8 transition-colors",
          "flex flex-col items-center justify-center text-center",
          "min-h-[200px] cursor-pointer overflow-hidden",
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

        <AnimatePresence mode="wait">
          {isUploading ? (
            <motion.div
              key="uploading"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="flex flex-col items-center gap-3"
            >
              <motion.div variants={staggerItem}>
                <motion.div
                  variants={scaleIn}
                  initial="hidden"
                  animate="visible"
                >
                  <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
                </motion.div>
              </motion.div>
              <motion.div variants={staggerItem} className="text-center">
                <p className="text-gray-700 font-medium">Uploading and parsing...</p>
                <p className="text-sm text-gray-600">This may take a moment</p>
              </motion.div>
            </motion.div>
          ) : uploadSuccess ? (
            <motion.div
              key="success"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="flex flex-col items-center gap-3"
            >
              <motion.div variants={staggerItem}>
                <motion.div
                  variants={successCheck}
                  initial="hidden"
                  animate="visible"
                >
                  <CheckCircle className="h-12 w-12 text-green-600" />
                </motion.div>
              </motion.div>
              <motion.div variants={staggerItem} className="text-center">
                <p className="text-gray-900 font-medium">Upload successful!</p>
                <p className="text-sm text-gray-600">JD parsed and saved</p>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="flex flex-col items-center gap-3 w-full"
            >
              <motion.div variants={staggerItem}>
                <motion.div
                  variants={scaleIn}
                  initial="hidden"
                  animate="visible"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ duration: 0.2 }}
                  className={cn(
                    "p-4 rounded-full transition-colors",
                    isDragging ? "bg-blue-100" : "bg-gray-100"
                  )}
                >
                  <Upload className="h-8 w-8 text-gray-600" />
                </motion.div>
              </motion.div>
              <motion.div variants={staggerItem} className="text-center">
                <p className="text-gray-900 font-medium text-lg">
                  Upload Job Description
                </p>
                <p className="text-gray-700 mt-2">
                  Drag and drop your PDF or DOCX file here, or click to browse
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  Maximum file size: 100MB (chunked upload enabled)
                </p>
              </motion.div>
              <motion.div variants={staggerItem}>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.1 }}
                >
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    disabled={disabled}
                    className="mt-2"
                    onClick={(e) => {
                      e?.stopPropagation();
                      document.getElementById('jd-file-input')?.click();
                    }}
                  >
                    <FileText className="h-5 w-5 mr-2" />
                    Choose File
                  </Button>
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>
        {isUploading && currentUploadProgress && (
          <motion.div
            key="progress"
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <UploadProgressComponent
              progress={currentUploadProgress}
              fileName={currentUploadProgress.state === 'uploading' ? 'Uploading JD...' : 'JD upload'}
              onPause={() => {
                // Pause functionality for future implementation
              }}
              onResume={() => {
                // Resume functionality for future implementation
              }}
              onCancel={() => {
                setCurrentUploadProgress(null);
                setIsUploading(false);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {uploadError && (
          <motion.div
            key="error"
            variants={errorShake}
            initial="initial"
            animate="animate"
            exit="exit"
            className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3"
            role="alert"
            aria-live="assertive"
          >
            <motion.div
              variants={scaleIn}
              initial="hidden"
              animate="visible"
            >
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            </motion.div>
            <div className="flex-1">
              <p className="text-sm text-red-800 font-medium">Upload Failed</p>
              <p className="text-sm text-red-700 mt-1">{uploadError}</p>
            </div>
            <motion.div
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              transition={{ duration: 0.2 }}
            >
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
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        variants={fadeInUp}
        initial="hidden"
        animate="visible"
        className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg"
      >
        <FileText className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-blue-900">Supported Formats</p>
          <p className="text-blue-700 mt-1">
            PDF and DOCX files. The system will automatically extract text,
            parse job details, and identify skills and requirements.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export const JDFileUpload = memo(JDFileUploadComponent);