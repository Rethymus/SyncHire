"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Upload, FileText, X, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useAppStore, type Resume } from "@/lib/store";
import { cn } from "@/lib/utils";
import { logger, LogCategory } from "@/lib/logger";
import { resumeAPI } from "@/lib/api-client-consolidated";
import { memo } from "react";

interface UploadError {
  file: string;
  error: string;
}

function ResumeUploadComponent() {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadErrors, setUploadErrors] = useState<UploadError[]>([]);
  const { addResume, resumes, setCurrentResume } = useAppStore();

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setUploading(true);
      setUploadProgress(0);
      setUploadErrors([]);

      const totalFiles = acceptedFiles.length;
      let processedFiles = 0;

      try {
        for (const file of acceptedFiles) {
          try {
            logger.info(LogCategory.API, `Uploading resume: ${file.name}`);

            // Create form data for file upload
            const formData = new FormData();
            formData.append('file', file);
            formData.append('title', file.name.replace(/\.[^/.]+$/, '')); // Remove extension

            // Upload to backend API
            const response = await fetch('/api/resumes', {
              method: 'POST',
              body: formData,
              // Don't set Content-Type header, let browser set it with boundary
            });

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({ detail: 'Upload failed' }));
              throw new Error(errorData.detail || 'Upload failed');
            }

            const data = await response.json();

            // Create new resume object from API response
            const newResume: Resume = {
              id: data.id,
              name: data.title || file.name,
              content: data.content || '',
              uploadedAt: new Date(data.created_at),
              fileUrl: data.file_path,
            };

            addResume(newResume);
            logger.info(LogCategory.API, `Successfully uploaded resume: ${file.name}`);

          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error(LogCategory.API, `Failed to upload resume: ${file.name}`, error as Error);
            setUploadErrors(prev => [...prev, { file: file.name, error: errorMessage }]);
          } finally {
            processedFiles++;
            setUploadProgress(Math.round((processedFiles / totalFiles) * 100));
          }
        }
      } finally {
        setUploading(false);
        // Clear errors after 5 seconds
        if (uploadErrors.length > 0) {
          setTimeout(() => setUploadErrors([]), 5000);
        }
      }
    },
    [addResume, uploadErrors.length]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "text/plain": [".txt"],
    },
    maxFiles: 5,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const handleDelete = useCallback((id: string) => {
    const { deleteResume } = useAppStore.getState();
    deleteResume(id);
  }, []);

  const handleSelectResume = useCallback((resume: Resume) => {
    setCurrentResume(resume);
    logger.info(LogCategory.UI, `Selected resume: ${resume.name}`);
  }, [setCurrentResume]);

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors",
          isDragActive
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 hover:border-gray-400",
          uploading && "opacity-50 cursor-not-allowed"
        )}
        aria-label="上传简历区域"
      >
        <input {...getInputProps()} aria-label="选择文件上传" />
        <div className="flex flex-col items-center gap-4">
          <div className="p-4 bg-blue-100 rounded-full">
            {uploading ? (
              <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
            ) : (
              <Upload className="h-8 w-8 text-blue-600" />
            )}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {isDragActive ? "放下文件以上传" : "上传您的简历"}
            </h3>
            <p className="mt-2 text-sm text-gray-700">
              拖放文件到此处，或点击选择文件
            </p>
            <p className="mt-1 text-xs text-gray-600">
              支持 PDF、Word 文档、纯文本，最多 5 个文件，最大 10MB
            </p>
          </div>
        </div>
      </div>

      {/* Upload Progress */}
      {uploading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900">
                正在上传简历... {uploadProgress}%
              </p>
              <div className="mt-2 bg-blue-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Errors */}
      {uploadErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h4 className="flex items-center gap-2 text-sm font-medium text-red-900 mb-3">
            <AlertCircle className="h-4 w-4" />
            上传失败 ({uploadErrors.length})
          </h4>
          <div className="space-y-2">
            {uploadErrors.map((error, index) => (
              <div key={index} className="text-sm text-red-800">
                <span className="font-medium">{error.file}:</span> {error.error}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Uploaded Resumes List */}
      {resumes.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">
            已上传的简历 ({resumes.length})
          </h4>
          <div className="space-y-2">
            {resumes.map((resume) => (
              <div
                key={resume.id}
                className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <FileText className="h-8 w-8 text-blue-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{resume.name}</p>
                    <p className="text-sm text-gray-600">
                      上传于 {new Date(resume.uploadedAt).toLocaleDateString("zh-CN")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <CheckCircle2 className="h-5 w-5 text-green-500" aria-hidden="true" />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSelectResume(resume)}
                    className="min-h-[44px] px-4"
                  >
                    选择
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(resume.id)}
                    className="h-10 w-10"
                    aria-label={`删除简历 ${resume.name}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export const ResumeUpload = memo(ResumeUploadComponent);
