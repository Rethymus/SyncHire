"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Upload, FileText, X, CheckCircle2, AlertCircle, Loader2, File } from "lucide-react";
import { useAppStore, type Resume } from "@/lib/store";
import { cn } from "@/lib/utils";
import { logger, LogCategory } from "@/lib/logger";
import { createChunkedUpload, type UploadProgress } from "@/lib/chunked-upload";
import { UploadProgress as UploadProgressComponent } from "@/components/upload-progress";
import { useToast } from "@/hooks/use-toast";
import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  uploadZoneIdle,
  uploadZoneHover,
  uploadZoneDrag,
  fileDrop,
  successCheck,
  errorShake,
  fadeInUp,
  staggerContainer,
  staggerItem,
  scaleIn,
  listItemEnter,
} from "@/lib/animations";

interface UploadError {
  file: string;
  error: string;
}

// Helper function to get file icon based on file type
function getFileIcon(fileName: string) {
  const extension = fileName.toLowerCase().split('.').pop();
  switch (extension) {
    case 'pdf':
      return <FileText className="h-8 w-8 text-red-600" />;
    case 'doc':
    case 'docx':
      return <FileText className="h-8 w-8 text-blue-600" />;
    case 'txt':
      return <FileText className="h-8 w-8 text-gray-600" />;
    default:
      return <File className="h-8 w-8 text-gray-500" />;
  }
}

function ResumeUploadComponent() {
  const [uploading, setUploading] = useState(false);
  const [uploadErrors, setUploadErrors] = useState<UploadError[]>([]);
  const [currentUploadProgress, setCurrentUploadProgress] = useState<UploadProgress | null>(null);
  const { addResume, resumes, setCurrentResume } = useAppStore();
  const { crud, api } = useToast();

  const handleChunkedUpload = useCallback(async (file: File) => {
    logger.info(LogCategory.API, `Starting chunked upload: ${file.name}`);

    const chunkedUpload = createChunkedUpload(file, '/api/upload/chunk', {
      chunkSize: 1024 * 1024, // 1MB chunks
      maxRetries: 3,
      onProgress: (progress) => {
        setCurrentUploadProgress(progress);
      },
      onComplete: (response) => {
        // Create new resume object from API response
        const newResume: Resume = {
          id: response.id,
          name: response.title || file.name,
          content: response.content || '',
          uploadedAt: new Date(response.created_at),
          fileUrl: response.file_path,
        };

        addResume(newResume);
        crud.create.success("Resume", `${file.name} uploaded successfully`);
        logger.info(LogCategory.API, `Successfully uploaded resume: ${file.name}`);
      },
      onError: (error) => {
        logger.error(LogCategory.API, `Failed to upload resume: ${file.name}`, error);
        crud.create.error("Resume", error.message);
        setUploadErrors(prev => [...prev, { file: file.name, error: error.message }]);
      },
    });

    return await chunkedUpload.start();
  }, [addResume, crud]);

  const onDrop = useCallback(
    async (acceptedFiles: File[], rejectedFiles: any[]) => {
      // Handle rejected files first
      if (rejectedFiles.length > 0) {
        const errors = rejectedFiles.map((rejection: any) => {
          const error = rejection.errors[0];
          let errorMessage = 'Unknown error';
          if (error.code === 'file-too-large') {
            errorMessage = '文件大小超过10MB限制';
          } else if (error.code === 'file-invalid-type') {
            errorMessage = '不支持的文件格式。请上传PDF、Word或文本文档。';
          } else if (error.code === 'too-many-files') {
            errorMessage = '最多只能上传5个文件';
          }
          return {
            file: rejection.file.name,
            error: errorMessage
          };
        });
        setUploadErrors(errors);
        // Clear validation errors after 5 seconds
        setTimeout(() => setUploadErrors([]), 5000);
      }

      if (acceptedFiles.length === 0) {
        return;
      }

      setUploading(true);

      try {
        // Process files sequentially
        for (const file of acceptedFiles) {
          await handleChunkedUpload(file);
        }
      } finally {
        setUploading(false);
        setCurrentUploadProgress(null);
        // Clear errors after 5 seconds
        if (uploadErrors.length > 0) {
          setTimeout(() => setUploadErrors([]), 5000);
        }
      }
    },
    [handleChunkedUpload, uploadErrors.length]
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
      <motion.div
        {...getRootProps({ onClick: (e) => e.stopPropagation() })}
        variants={uploadZoneIdle}
        initial="initial"
        animate={isDragActive ? "drag" : "animate"}
        whileHover="hover"
        className={cn(
          "border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors",
          "relative overflow-hidden",
          isDragActive
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 hover:border-gray-400",
          uploading && "opacity-50 cursor-not-allowed"
        )}
        aria-label="上传简历区域"
      >
        <input {...getInputProps()} aria-label="选择文件上传" />
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-center gap-4"
        >
          <motion.div
            variants={staggerItem}
            className={cn(
              "p-4 rounded-full transition-colors",
              isDragActive ? "bg-blue-100" : "bg-blue-100"
            )}
          >
            {uploading ? (
              <motion.div
                variants={scaleIn}
                initial="hidden"
                animate="visible"
              >
                <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
              </motion.div>
            ) : (
              <motion.div
                variants={scaleIn}
                initial="hidden"
                animate="visible"
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ duration: 0.2 }}
              >
                <Upload className="h-8 w-8 text-blue-600" />
              </motion.div>
            )}
          </motion.div>
          <motion.div variants={staggerItem}>
            <h3 className="text-lg font-semibold text-gray-900">
              {isDragActive ? "放下文件以上传" : "上传您的简历"}
            </h3>
            <p className="mt-2 text-sm text-gray-700">
              拖放文件到此处，或点击选择文件
            </p>
            <p className="mt-1 text-xs text-gray-600">
              支持 PDF、Word 文档、纯文本，最多 5 个文件，最大 10MB
            </p>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Upload Progress */}
      <AnimatePresence>
        {uploading && currentUploadProgress && (
          <motion.div
            key="progress"
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <UploadProgressComponent
              progress={currentUploadProgress}
              fileName={currentUploadProgress.state === 'uploading' ? 'Uploading resume...' : 'Resume upload'}
              onPause={() => {
                // Pause functionality for future implementation
              }}
              onResume={() => {
                // Resume functionality for future implementation
              }}
              onCancel={() => {
                setCurrentUploadProgress(null);
                setUploading(false);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload Errors */}
      <AnimatePresence>
        {uploadErrors.length > 0 && (
          <motion.div
            key="errors"
            variants={errorShake}
            initial="initial"
            animate="animate"
            exit="exit"
            className="bg-red-50 border border-red-200 rounded-lg p-4"
          >
            <motion.h4
              variants={fadeInUp}
              initial="hidden"
              animate="visible"
              className="flex items-center gap-2 text-sm font-medium text-red-900 mb-3"
            >
              <AlertCircle className="h-4 w-4" />
              上传失败 ({uploadErrors.length})
            </motion.h4>
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="space-y-2"
            >
              {uploadErrors.map((error, index) => (
                <motion.div
                  key={index}
                  variants={staggerItem}
                  className="text-sm text-red-800"
                >
                  <span className="font-medium">{error.file}:</span> {error.error}
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Uploaded Resumes List */}
      <AnimatePresence>
        {resumes.length > 0 && (
          <motion.div
            key="resumes"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="space-y-3"
          >
            <motion.h4
              variants={staggerItem}
              className="font-medium text-gray-900"
            >
              已上传的简历 ({resumes.length})
            </motion.h4>
            <motion.div
              variants={staggerContainer}
              className="space-y-2"
            >
              {resumes.map((resume, index) => (
                <motion.div
                  key={resume.id}
                  variants={listItemEnter}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  custom={index}
                  className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ duration: 0.2 }}
                    >
                      {getFileIcon(resume.name)}
                    </motion.div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{resume.name}</p>
                      <p className="text-sm text-gray-600">
                        上传于 {new Date(resume.uploadedAt).toLocaleDateString("zh-CN")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <motion.div
                      variants={successCheck}
                      initial="hidden"
                      animate="visible"
                    >
                      <CheckCircle2 className="h-5 w-5 text-green-500" aria-hidden="true" />
                    </motion.div>
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSelectResume(resume)}
                        className="min-h-[44px] px-4"
                      >
                        选择
                      </Button>
                    </motion.div>
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: 90 }}
                      whileTap={{ scale: 0.9 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(resume.id)}
                        className="h-10 w-10"
                        aria-label={`删除简历 ${resume.name}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export const ResumeUpload = memo(ResumeUploadComponent);