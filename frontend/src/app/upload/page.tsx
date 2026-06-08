"use client";

import { useCallback, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Breadcrumb } from "@/components/breadcrumb";
import { useAppStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import { logger } from "@/lib/logger";
import { LogCategory } from "@/lib/logger";
import { formatLiteDate, useLiteCopy } from "@/lib/lite-i18n";
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
import { useToastMessage } from "@/components/ui/toast";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_RESUME_EXTENSIONS = new Set([".pdf", ".doc", ".docx", ".txt"]);

type UploadErrorCopy = ReturnType<typeof useLiteCopy>["t"]["upload"]["errors"];

function getUploadRejectionMessage(rejections: FileRejection[], errors: UploadErrorCopy) {
  const firstError = rejections[0]?.errors[0];

  if (firstError?.code === "file-too-large") {
    return errors.tooLarge;
  }

  if (firstError?.code === "too-many-files") {
    return errors.tooMany;
  }

  return errors.invalidType;
}

function validateResumeFile(file: File, errors: UploadErrorCopy) {
  if (file.size > MAX_FILE_SIZE) {
    return {
      code: "file-too-large",
      message: errors.tooLarge,
    };
  }

  const extension = `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`;
  if (!ALLOWED_RESUME_EXTENSIONS.has(extension)) {
    return {
      code: "file-invalid-type",
      message: errors.invalidType,
    };
  }

  return null;
}

export default function UploadPage() {
  const router = useRouter();
  const { locale, t } = useLiteCopy();
  const upload = t.upload;
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addResume, resumes, setCurrentResume } = useAppStore();
  const { success, error: toastError } = useToastMessage();

  const onDrop = useCallback(
    async (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      setError(null);

      if (rejectedFiles.length > 0) {
        setError(getUploadRejectionMessage(rejectedFiles, upload.errors));
        return;
      }

      if (acceptedFiles.length === 0) {
        setError(upload.errors.empty);
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
        success(upload.successTitle, upload.successDescription);
        setTimeout(() => {
          router.push("/editor");
        }, 1000);
      } catch (err) {
        logger.error(LogCategory.API, "Failed to upload resume", err as Error);
        const errorMsg = upload.errors.failed;
        setError(errorMsg);
        toastError("上传失败", errorMsg);
      } finally {
        setUploading(false);
      }
    },
    [addResume, setCurrentResume, router, success, toastError, upload]
  );

  const onDropRejected = useCallback((rejectedFiles: FileRejection[]) => {
    setError(getUploadRejectionMessage(rejectedFiles, upload.errors));
  }, [upload.errors]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } =
    useDropzone({
      onDrop,
      onDropRejected,
      accept: {
        "application/pdf": [".pdf"],
        "application/msword": [".doc"],
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
          ".docx",
        ],
        "text/plain": [".txt"],
      },
      maxFiles: 5,
      maxSize: MAX_FILE_SIZE,
      multiple: true,
      validator: (file) => validateResumeFile(file, upload.errors),
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
      

      <div className="max-w-4xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="mb-4">
          <Breadcrumb />
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {upload.title}
          </h1>
          <p className="mt-2 text-lg text-gray-700">
            {upload.subtitle}
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
                      ? upload.dropInvalid
                      : isDragActive
                      ? upload.dropActive
                      : upload.dropIdle}
                  </h3>
                  <p className="mt-2 text-sm text-gray-700">
                    {upload.supportedFormats}
                  </p>
                </div>
              </div>
            </div>

            {uploading && (
              <div className="mt-6 text-center">
                <div className="inline-flex items-center gap-3 text-gray-700">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
                  <span>{upload.processing}</span>
                </div>
              </div>
            )}
          </div>

          {/* Uploaded Resumes */}
          {resumes.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  {upload.uploadedTitle} ({resumes.length})
                </h2>
                <Button
                  variant="outline"
                  onClick={() => router.push("/dashboard")}
                >
                  {upload.goDashboard}
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
                          {upload.uploadedAt}{" "}
                          {formatLiteDate(resume.uploadedAt, locale)}
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
                        {upload.edit}
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
                <h3 className="font-semibold text-gray-900">{upload.features[0].title}</h3>
              </div>
              <p className="text-sm text-gray-700">
                {upload.features[0].description}
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <h3 className="font-semibold text-gray-900">{upload.features[1].title}</h3>
              </div>
              <p className="text-sm text-gray-700">
                {upload.features[1].description}
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <ArrowRight className="h-5 w-5 text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-900">{upload.features[2].title}</h3>
              </div>
              <p className="text-sm text-gray-700">
                {upload.features[2].description}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
