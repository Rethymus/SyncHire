"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Upload, FileText, X, CheckCircle2 } from "lucide-react";
import { useAppStore, type Resume } from "@/lib/store";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";
import { LogCategory } from "@/lib/logger";
import { memo } from "react";

function ResumeUploadComponent() {
  const [uploading, setUploading] = useState(false);
  const { addResume, resumes } = useAppStore();

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setUploading(true);
      try {
        for (const file of acceptedFiles) {
          // Simulate file upload and parsing
          const text = await file.text();

          const newResume: Resume = {
            id: crypto.randomUUID(),
            name: file.name,
            content: text,
            uploadedAt: new Date(),
          };

          addResume(newResume);
        }
      } catch (error) {
        logger.error(LogCategory.API, "Failed to upload resume", error as Error);
      } finally {
        setUploading(false);
      }
    },
    [addResume]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
        ".docx",
      ],
    },
    maxFiles: 5,
  });

  const handleDelete = (id: string) => {
    const { deleteResume } = useAppStore.getState();
    deleteResume(id);
  };

  return (
    <div className="space-y-6">
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors",
          isDragActive
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 hover:border-gray-400"
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-4">
          <div className="p-4 bg-blue-100 rounded-full">
            <Upload className="h-8 w-8 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {isDragActive ? "放下文件以上传" : "上传您的简历"}
            </h3>
            <p className="mt-2 text-sm text-gray-700">
              拖放文件到此处，或点击选择文件
            </p>
            <p className="mt-1 text-xs text-gray-500">
              支持 PDF、Word 文档，最多 5 个文件
            </p>
          </div>
        </div>
      </div>

      {resumes.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">已上传的简历</h4>
          <div className="space-y-2">
            {resumes.map((resume) => (
              <div
                key={resume.id}
                className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="font-medium text-gray-900">{resume.name}</p>
                    <p className="text-sm text-gray-500">
                      上传于 {new Date(resume.uploadedAt).toLocaleDateString("zh-CN")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(resume.id)}
                    className="h-10 w-10"
                    aria-label="删除简历"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {uploading && (
        <div className="text-center text-sm text-gray-700">
          正在处理简历...
        </div>
      )}
    </div>
  );
}

export const ResumeUpload = memo(ResumeUploadComponent);
