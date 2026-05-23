"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import { logger } from "@/lib/logger";
import { LogCategory } from "@/lib/logger";
import {
  Upload,
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
  File,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function UploadPage() {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addResume, resumes, setCurrentResume } = useAppStore();

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setError(null);

      if (acceptedFiles.length === 0) {
        setError(
          `不支持的文件格式。请上传 PDF、Word 或文本文档。`
        );
        return;
      }

      setUploading(true);

      try {
        for (const file of acceptedFiles) {
          // Simulate file upload and parsing
          const text = await file.text();

          const newResume = {
            id: crypto.randomUUID(),
            name: file.name,
            content: text,
            uploadedAt: new Date(),
          };

          addResume(newResume);

          // Set as current resume
          setCurrentResume(newResume);
        }

        // Redirect to editor after successful upload
        setTimeout(() => {
          router.push("/editor");
        }, 1000);
      } catch (err) {
        logger.error(LogCategory.API, "Failed to upload resume", err as Error);
        setError("文件上传失败，请重试");
      } finally {
        setUploading(false);
      }
    },
    [addResume, setCurrentResume, router]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } =
    useDropzone({
      onDrop,
      accept: {
        "application/pdf": [".pdf"],
        "application/msword": [".doc"],
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
          ".docx",
        ],
        "text/plain": [".txt"],
      },
      maxFiles: 5,
      multiple: true,
    });

  const handleDelete = (id: string) => {
    const { deleteResume } = useAppStore.getState();
    deleteResume(id);
  };

  const handleEdit = (id: string) => {
    const resume = resumes.find((r) => r.id === id);
    if (resume) {
      setCurrentResume(resume);
      router.push("/editor");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="max-w-4xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            上传您的简历
          </h1>
          <p className="mt-2 text-lg text-gray-700">
            支持 PDF、Word 文档，AI 将帮助您优化简历内容
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="space-y-8">
          {/* Upload Area */}
          <div className="bg-white rounded-2xl shadow-sm p-8">
            <div
              {...getRootProps()}
              className={cn(
                "border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all",
                isDragActive && !isDragReject
                  ? "border-blue-500 bg-blue-50"
                  : isDragReject
                  ? "border-red-500 bg-red-50"
                  : "border-gray-300 hover:border-gray-400"
              )}
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-center gap-4">
                <div
                  className={cn(
                    "p-4 rounded-full",
                    isDragActive && !isDragReject
                      ? "bg-blue-100"
                      : isDragReject
                      ? "bg-red-100"
                      : "bg-gray-100"
                  )}
                >
                  <Upload
                    className={cn(
                      "h-8 w-8",
                      isDragActive && !isDragReject
                        ? "text-blue-600"
                        : isDragReject
                        ? "text-red-600"
                        : "text-gray-700"
                    )}
                  />
                </div>
                <div>
                  <h3
                    className={cn(
                      "text-lg font-semibold",
                      isDragReject ? "text-red-900" : "text-gray-900"
                    )}
                  >
                    {isDragReject
                      ? "不支持的文件格式"
                      : isDragActive
                      ? "放下文件以上传"
                      : "拖放文件到此处，或点击选择"}
                  </h3>
                  <p className="mt-2 text-sm text-gray-700">
                    支持 PDF、DOC、DOCX、TXT 格式，单个文件最大 10MB
                  </p>
                </div>
              </div>
            </div>

            {uploading && (
              <div className="mt-6 text-center">
                <div className="inline-flex items-center gap-3 text-gray-700">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
                  <span>正在处理简历...</span>
                </div>
              </div>
            )}
          </div>

          {/* Uploaded Resumes */}
          {resumes.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  已上传的简历 ({resumes.length})
                </h2>
                <Button
                  variant="outline"
                  onClick={() => router.push("/dashboard")}
                >
                  前往控制台
                </Button>
              </div>

              <div className="space-y-3">
                {resumes.map((resume) => (
                  <div
                    key={resume.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-white rounded-lg shadow-sm">
                        <FileText className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {resume.name}
                        </p>
                        <p className="text-sm text-gray-600">
                          上传于{" "}
                          {new Date(resume.uploadedAt).toLocaleDateString(
                            "zh-CN"
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(resume.id)}
                      >
                        编辑
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(resume.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900">智能解析</h3>
              </div>
              <p className="text-sm text-gray-700">
                AI 自动提取简历中的关键信息，识别技能、经历和教育背景
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <h3 className="font-semibold text-gray-900">格式兼容</h3>
              </div>
              <p className="text-sm text-gray-700">
                支持 PDF、Word、文本等多种格式，无需手动转换
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <ArrowRight className="h-5 w-5 text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-900">快速开始</h3>
              </div>
              <p className="text-sm text-gray-700">
                上传后立即进入编辑器，AI 帮助您优化简历内容
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
