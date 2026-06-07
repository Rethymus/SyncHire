"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { logger, LogCategory } from "@/lib/logger";
import { useToast } from "@/hooks/use-toast";
import {
  Briefcase,
  FileText,
  CheckCircle2,
  Loader2,
  AlertCircle,
  RefreshCw,
  Wifi,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  dialogContent,
  dialogOverlay,
  fadeInUp,
  buttonPress,
  successCheck,
  errorShake,
  staggerContainer,
  staggerItem,
} from "@/lib/animations";
import { useOptimisticMutation } from "@/lib/optimistic-updates";

interface ApplicationCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (application: any) => void;
}

type ErrorType = "network" | "validation" | "api" | "timeout" | "unknown";

interface ErrorContext {
  type: ErrorType;
  title: string;
  message: string;
  actionable: string[];
  canRetry: boolean;
  retryCount: number;
}

export function ApplicationCreateDialog({
  open,
  onOpenChange,
  onSuccess,
}: ApplicationCreateDialogProps) {
  const { resumes, jobDescriptions, addApplication } = useAppStore();
  const { crud, api } = useToast();

  const [selectedResumeId, setSelectedResumeId] = useState<string>("");
  const [selectedJDId, setSelectedJDId] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [errorContext, setErrorContext] = useState<ErrorContext | null>(null);
  const [step, setStep] = useState<"select" | "confirm">("select");
  const [retryCount, setRetryCount] = useState<number>(0);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);

  // Filter resumes and JDs that are ready
  const availableResumes = useMemo(() => {
    return resumes.filter((resume) => resume.content && resume.id);
  }, [resumes]);

  const availableJDs = useMemo(() => {
    return jobDescriptions.filter((jd) => jd.description && jd.id);
  }, [jobDescriptions]);

  const canProceed = useMemo(() => {
    return selectedResumeId && selectedJDId;
  }, [selectedResumeId, selectedJDId]);

  const resetForm = useCallback(() => {
    setSelectedResumeId("");
    setSelectedJDId("");
    setNotes("");
    setError("");
    setErrorContext(null);
    setStep("select");
    setRetryCount(0);
    setIsRetrying(false);
  }, []);

  const analyzeError = useCallback((error: unknown, errorMsg: string, statusCode?: number): ErrorContext => {
    // Network errors
    if (error instanceof TypeError && error.message.includes("fetch")) {
      return {
        type: "network",
        title: "Connection Failed",
        message: "Unable to reach the server. Your internet connection may be unstable.",
        actionable: [
          "Check your internet connection",
          "Verify the server is running",
          "Try again when connection is stable",
          "Contact support if issue persists"
        ],
        canRetry: true,
        retryCount
      };
    }

    // Timeout errors
    if (errorMsg.includes("timeout") || errorMsg.includes("超时")) {
      return {
        type: "timeout",
        title: "Request Timeout",
        message: "The request took too long to complete. The server may be overloaded.",
        actionable: [
          "Wait a moment and try again",
          "Check if the server is under heavy load",
          "Try with fewer concurrent operations",
          "Contact support if timeouts continue"
        ],
        canRetry: true,
        retryCount
      };
    }

    // Validation errors (4xx status codes)
    if (statusCode && statusCode >= 400 && statusCode < 500) {
      return {
        type: "validation",
        title: "Invalid Data",
        message: `Validation error: ${errorMsg}`,
        actionable: [
          "Review the selected resume and job description",
          "Ensure all required fields are complete",
          "Check that file formats are supported",
          "Try selecting different options"
        ],
        canRetry: false,
        retryCount
      };
    }

    // API errors (5xx status codes)
    if (statusCode && statusCode >= 500) {
      return {
        type: "api",
        title: "Server Error",
        message: "The server encountered an unexpected error. Our team has been notified.",
        actionable: [
          "Wait a moment and try again",
          "Refresh the page and retry",
          "Check application status before retrying",
          "Contact support if issue persists"
        ],
        canRetry: true,
        retryCount
      };
    }

    // Unknown errors
    return {
      type: "unknown",
      title: "Unexpected Error",
      message: `An unexpected error occurred: ${errorMsg}`,
      actionable: [
        "Refresh the page and try again",
        "Clear your browser cache",
        "Try using a different browser",
        "Contact support with error details"
      ],
      canRetry: true,
      retryCount
    };
  }, [retryCount]);

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const retryWithBackoff = useCallback(async <T,>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === maxRetries - 1) throw error;

        const delay = baseDelay * Math.pow(2, i);
        logger.info(LogCategory.API, `Retry attempt ${i + 1}/${maxRetries} after ${delay}ms`);
        await sleep(delay);
      }
    }
    throw new Error("Max retries exceeded");
  }, []);

  // Optimistic mutation for creating applications
  const createApplicationMutation = useOptimisticMutation(
    async (data: { resumeId: string; jdId: string; notes?: string }) => {
      const selectedJD = availableJDs.find((jd) => jd.id === data.jdId);
      const now = new Date();

      await sleep(150);

      return {
        success: true,
        data: {
          id: crypto.randomUUID(),
          jd: {
            title: selectedJD?.title || "Unknown Position",
            company: selectedJD?.company || "Unknown Company",
          },
          status: "draft",
          match_score: undefined,
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
        },
      };
    },
    {
      queryKey: ['applications'],
      updateFn: (oldData, variables) => {
        const selectedResume = availableResumes.find((r) => r.id === variables.resumeId);
        const selectedJD = availableJDs.find((jd) => jd.id === variables.jdId);

        // Create optimistic application with loading state
        const optimisticApplication = {
          id: `optimistic-${Date.now()}`,
          companyName: selectedJD?.company || "Unknown Company",
          position: selectedJD?.title || "Unknown Position",
          status: "pending" as const,
          jobId: variables.jdId,
          resumeId: variables.resumeId,
          matchScore: undefined,
          createdAt: new Date(),
          updatedAt: new Date(),
          _isLoading: true,
        };

        // Handle both array and APIResponse structures
        if (Array.isArray(oldData)) {
          return [...oldData, optimisticApplication] as any;
        } else if (oldData && typeof oldData === 'object' && 'data' in oldData) {
          return {
            ...oldData,
            data: Array.isArray(oldData.data)
              ? [...oldData.data, optimisticApplication]
              : [optimisticApplication]
          } as any;
        }
        return [optimisticApplication] as any;
      },
      onSuccess: (data, variables) => {
        if (data.success && data.data) {
          const confirmedApplication = {
            id: data.data.id,
            companyName: data.data.jd?.company || "Unknown Company",
            position: data.data.jd?.title || "Unknown Position",
            status: (data.data.status || "pending") as "draft" | "applied" | "interview" | "offer" | "rejected",
            jobId: variables.jdId,
            resumeId: variables.resumeId,
            matchScore: data.data.match_score,
            createdAt: new Date(data.data.created_at),
            updatedAt: new Date(data.data.updated_at),
          };

          addApplication(confirmedApplication);
          crud.create.success("Application", `Application for ${data.data.jd?.title || "position"} created successfully`);
          onSuccess?.(confirmedApplication);
          resetForm();
          onOpenChange(false);
        }
      },
      onError: (error, variables) => {
        const errorMsg = error instanceof Error ? error.message : "Failed to create application";
        const context = analyzeError(error, errorMsg);
        setErrorContext(context);
        setError(context.message);
        crud.create.error("Application", context.title);
      },
      invalidateQueries: [['applications'], ['analytics']],
    }
  );

  const handleCreate = useCallback(async () => {
    if (!canProceed) {
      const validationError: ErrorContext = {
        type: "validation",
        title: "Missing Required Information",
        message: "Please select both a resume and a job description to create an application.",
        actionable: [
          "Choose a resume from your uploaded resumes",
          "Select a job description from your list",
          "Upload new resume or JD if needed"
        ],
        canRetry: false,
        retryCount: 0
      };
      setErrorContext(validationError);
      setError(validationError.message);
      return;
    }

    setLoading(true);
    setError("");
    setErrorContext(null);

    try {
      if (isRetrying) {
        await retryWithBackoff(
          () => createApplicationMutation.mutateAsync({
            resumeId: selectedResumeId,
            jdId: selectedJDId,
            notes: notes || undefined,
          }),
          3,
          1000
        );
      } else {
        await createApplicationMutation.mutateAsync({
          resumeId: selectedResumeId,
          jdId: selectedJDId,
          notes: notes || undefined,
        });
      }
    } catch (err) {
      logger.error(LogCategory.API, "Failed to create application", err as Error);
      const errorMsg = err instanceof Error ? err.message : "An unexpected error occurred";
      const context = analyzeError(err, errorMsg);
      setErrorContext(context);
      setError(context.message);
      api.error("Create application", err as Error);
    } finally {
      setLoading(false);
      setIsRetrying(false);
    }
  }, [selectedResumeId, selectedJDId, notes, canProceed, analyzeError, retryWithBackoff, isRetrying, api, createApplicationMutation]);

  const handleRetry = useCallback(async () => {
    if (retryCount >= 3) {
      setErrorContext({
        type: errorContext?.type || "unknown",
        title: "Maximum Retries Exceeded",
        message: "Maximum retry attempts reached. Please try again later or contact support.",
        actionable: [
          "Wait a few minutes before trying again",
          "Refresh the page and restart the process",
          "Contact support if the issue persists"
        ],
        canRetry: false,
        retryCount
      });
      return;
    }

    setIsRetrying(true);
    setRetryCount(prev => prev + 1);
    await handleCreate();
  }, [retryCount, errorContext, handleCreate]);

  const handleContinue = useCallback(() => {
    if (canProceed) {
      setStep("confirm");
    } else {
      const validationError: ErrorContext = {
        type: "validation",
        title: "Missing Required Information",
        message: "Please select both a resume and a job description to continue.",
        actionable: [
          "Choose a resume from your uploaded resumes",
          "Select a job description from your list",
          "Upload new resume or JD if needed"
        ],
        canRetry: false,
        retryCount: 0
      };
      setErrorContext(validationError);
      setError(validationError.message);
    }
  }, [canProceed]);

  const selectedResume = availableResumes.find((r) => r.id === selectedResumeId);
  const selectedJD = availableJDs.find((jd) => jd.id === selectedJDId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <motion.div
        variants={dialogOverlay}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <DialogContent className="sm:max-w-[600px]">
          <motion.div
            variants={dialogContent}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <motion.div
                  variants={fadeInUp}
                  initial="hidden"
                  animate="visible"
                  className="flex items-center gap-2"
                >
                  <Briefcase className="h-5 w-5" />
                  创建职位申请
                </motion.div>
              </DialogTitle>
              <DialogDescription>
                {step === "select"
                  ? "选择简历和职位描述来创建新的职位申请"
                  : "确认您的选择并创建申请"}
              </DialogDescription>
            </DialogHeader>

            <AnimatePresence mode="wait">
              {errorContext && (
                <motion.div
                  key="error"
                  variants={errorShake}
                  initial="initial"
                  animate="animate"
                  className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-start gap-3">
                    <motion.div
                      variants={successCheck}
                      initial="hidden"
                      animate="visible"
                    >
                      {errorContext.type === "network" && <Wifi className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />}
                      {errorContext.type === "validation" && <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />}
                      {errorContext.type === "api" && <XCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />}
                      {errorContext.type === "timeout" && <Loader2 className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />}
                      {errorContext.type === "unknown" && <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />}
                    </motion.div>

                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-red-900 text-sm">{errorContext.title}</h4>
                      <p className="text-sm text-red-800 mt-1">{errorContext.message}</p>

                      {errorContext.actionable.length > 0 && (
                        <motion.div
                          variants={staggerContainer}
                          initial="hidden"
                          animate="visible"
                          className="mt-3"
                        >
                          <p className="text-xs font-medium text-red-900 mb-2">What you can do:</p>
                          <ul className="text-xs text-red-700 space-y-1">
                            {errorContext.actionable.map((action, index) => (
                              <motion.li
                                key={index}
                                variants={staggerItem}
                                className="flex items-start gap-2"
                              >
                                <span className="text-red-500 mt-0.5">•</span>
                                <span>{action}</span>
                              </motion.li>
                            ))}
                          </ul>
                        </motion.div>
                      )}

                      {errorContext.canRetry && retryCount < 3 && (
                        <motion.div
                          variants={fadeInUp}
                          initial="hidden"
                          animate="visible"
                          className="mt-3 flex items-center gap-2"
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleRetry}
                            disabled={loading || retryCount >= 3}
                            className="text-xs"
                          >
                            <motion.div
                              whileHover={{ rotate: 180 }}
                              transition={{ duration: 0.3 }}
                            >
                              <RefreshCw className="h-3 w-3 mr-1" />
                            </motion.div>
                            Retry {retryCount > 0 && `(${retryCount}/3)`}
                          </Button>
                          {retryCount > 0 && (
                            <span className="text-xs text-red-600">
                              Attempt {retryCount} of 3
                            </span>
                          )}
                        </motion.div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
              {step === "select" ? (
                <motion.div
                  key="select"
                  variants={staggerContainer}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="space-y-4 py-4"
                >
                  {/* Resume Selection */}
                  <motion.div variants={staggerItem} className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      选择简历 *
                    </Label>
                    <Select value={selectedResumeId} onValueChange={(value) => setSelectedResumeId(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="选择要使用的简历" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableResumes.map((resume) => (
                          <SelectItem key={resume.id} value={resume.id}>
                            {resume.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {availableResumes.length === 0 && (
                      <motion.p
                        variants={fadeInUp}
                        initial="hidden"
                        animate="visible"
                        className="text-xs text-gray-500"
                      >
                        请先{" "}
                        <Link href="/upload" className="text-blue-600 hover:underline">
                          上传简历
                        </Link>
                      </motion.p>
                    )}
                  </motion.div>

                  {/* Job Description Selection */}
                  <motion.div variants={staggerItem} className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4" />
                      选择职位描述 *
                    </Label>
                    <Select value={selectedJDId} onValueChange={(value) => setSelectedJDId(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="选择要申请的职位" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableJDs.map((jd) => (
                          <SelectItem key={jd.id} value={jd.id}>
                            {jd.title} - {jd.company}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {availableJDs.length === 0 && (
                      <motion.p
                        variants={fadeInUp}
                        initial="hidden"
                        animate="visible"
                        className="text-xs text-gray-500"
                      >
                        请先{" "}
                        <Link href="/jd-input" className="text-blue-600 hover:underline">
                          添加职位描述
                        </Link>
                      </motion.p>
                    )}
                  </motion.div>

                  {/* Notes */}
                  <motion.div variants={staggerItem} className="space-y-2">
                    <Label htmlFor="notes">备注（可选）</Label>
                    <motion.div
                      whileFocus={{ scale: 1.01 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Textarea
                        id="notes"
                        placeholder="添加关于此申请的备注..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                      />
                    </motion.div>
                  </motion.div>
                </motion.div>
              ) : (
                <motion.div
                  key="confirm"
                  variants={fadeInUp}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="space-y-4 py-4"
                >
                  <motion.div
                    variants={staggerContainer}
                    initial="hidden"
                    animate="visible"
                    className="bg-gray-50 rounded-lg p-4 space-y-3"
                  >
                    <motion.div variants={staggerItem}>
                      <h4 className="text-sm font-medium text-gray-700 mb-1">
                        使用的简历
                      </h4>
                      <div className="flex items-center gap-2 text-sm">
                        <FileText className="h-4 w-4 text-gray-500" />
                        <span>{selectedResume?.name}</span>
                      </div>
                    </motion.div>

                    <motion.div variants={staggerItem}>
                      <h4 className="text-sm font-medium text-gray-700 mb-1">
                        申请职位
                      </h4>
                      <div className="flex items-center gap-2 text-sm">
                        <Briefcase className="h-4 w-4 text-gray-500" />
                        <span>{selectedJD?.title}</span>
                        <span className="text-gray-500">at</span>
                        <span>{selectedJD?.company}</span>
                      </div>
                    </motion.div>

                    {notes && (
                      <motion.div variants={staggerItem}>
                        <h4 className="text-sm font-medium text-gray-700 mb-1">
                          备注
                        </h4>
                        <p className="text-sm text-gray-600">{notes}</p>
                      </motion.div>
                    )}
                  </motion.div>

                  <motion.div
                    variants={fadeInUp}
                    initial="hidden"
                    animate="visible"
                    className="bg-blue-50 border border-blue-200 rounded-lg p-3"
                  >
                    <p className="text-sm text-blue-800">
                      创建申请后，AI 将自动分析您的简历与职位描述的匹配度，并提供优化建议。
                    </p>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            <DialogFooter>
              <AnimatePresence mode="wait">
                {step === "select" ? (
                  <motion.div
                    key="select-footer"
                    variants={staggerContainer}
                    initial="hidden"
                    animate="visible"
                    className="flex gap-2"
                  >
                    <motion.div variants={staggerItem}>
                      <Button
                        variant="outline"
                        onClick={() => {
                          resetForm();
                          onOpenChange(false);
                        }}
                      >
                        取消
                      </Button>
                    </motion.div>
                    <motion.div variants={staggerItem}>
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ duration: 0.1 }}
                      >
                        <Button onClick={handleContinue} disabled={!canProceed}>
                          继续
                        </Button>
                      </motion.div>
                    </motion.div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="confirm-footer"
                    variants={staggerContainer}
                    initial="hidden"
                    animate="visible"
                    className="flex gap-2"
                  >
                    <motion.div variants={staggerItem}>
                      <Button
                        variant="outline"
                        onClick={() => setStep("select")}
                        disabled={loading}
                      >
                        返回
                      </Button>
                    </motion.div>
                    <motion.div variants={staggerItem}>
                      <motion.div
                        whileHover={{ scale: loading ? 1 : 1.02 }}
                        whileTap={{ scale: loading ? 1 : 0.98 }}
                        transition={{ duration: 0.1 }}
                      >
                        <Button onClick={handleCreate} disabled={loading}>
                          {loading ? (
                            <>
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, ease: "linear", repeat: Infinity }}
                              >
                                <Loader2 className="h-4 w-4 mr-2" />
                              </motion.div>
                              创建中...
                            </>
                          ) : (
                            <>
                              <motion.div
                                variants={successCheck}
                                initial="hidden"
                                animate="visible"
                                className="flex items-center"
                              >
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                创建申请
                              </motion.div>
                            </>
                          )}
                        </Button>
                      </motion.div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </DialogFooter>
          </motion.div>
        </DialogContent>
      </motion.div>
    </Dialog>
  );
}
