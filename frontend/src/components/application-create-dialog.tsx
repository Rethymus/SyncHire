"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useAppStore } from "@/lib/store";
import { canonicalizeStatus } from "@/lib/status-vocabulary";
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
import { useOptimisticMutation } from "@/lib/optimistic-updates";
import { useLiteCopy } from "@/lib/lite-i18n";

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
  const { t } = useLiteCopy();
  const dialogCopy = t.applications.createDialog;

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
          status: "submitted" as const,
          jobId: variables.jdId,
          resumeId: variables.resumeId,
          matchScore: undefined,
          createdAt: new Date(),
          updatedAt: new Date(),
          appliedAt: new Date(),
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
            // The create dialog submits an application, so the canonical
            // status is submitted; canonicalizeStatus also absorbs any
            // legacy value a backend or cached payload might return.
            status: canonicalizeStatus(data.data.status || "submitted"),
            jobId: variables.jdId,
            resumeId: variables.resumeId,
            matchScore: data.data.match_score,
            createdAt: new Date(data.data.created_at),
            updatedAt: new Date(data.data.updated_at),
            // The dialog's create flow just handed the application over.
            appliedAt: new Date(data.data.created_at),
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
        title: dialogCopy.missingTitle,
        message: dialogCopy.missingCreateMessage,
        actionable: [...dialogCopy.missingActions],
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
  }, [selectedResumeId, selectedJDId, notes, canProceed, analyzeError, retryWithBackoff, isRetrying, api, createApplicationMutation, dialogCopy]);

  const handleRetry = useCallback(async () => {
    if (retryCount >= 3) {
      setErrorContext({
        type: errorContext?.type || "unknown",
        title: dialogCopy.maxRetriesTitle,
        message: dialogCopy.maxRetriesMessage,
        actionable: [...dialogCopy.maxRetriesActions],
        canRetry: false,
        retryCount
      });
      return;
    }

    setIsRetrying(true);
    setRetryCount(prev => prev + 1);
    await handleCreate();
  }, [retryCount, errorContext, handleCreate, dialogCopy]);

  const handleContinue = useCallback(() => {
    if (canProceed) {
      setStep("confirm");
    } else {
      const validationError: ErrorContext = {
        type: "validation",
        title: dialogCopy.missingTitle,
        message: dialogCopy.missingContinueMessage,
        actionable: [...dialogCopy.missingActions],
        canRetry: false,
        retryCount: 0
      };
      setErrorContext(validationError);
      setError(validationError.message);
    }
  }, [canProceed, dialogCopy]);

  const selectedResume = availableResumes.find((r) => r.id === selectedResumeId);
  const selectedJD = availableJDs.find((jd) => jd.id === selectedJDId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <div className="animate-in fade-in duration-200">
        <DialogContent className="sm:max-w-[600px]">
          <div className="animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-300">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <Briefcase className="h-5 w-5" />
                  {dialogCopy.title}
                </div>
              </DialogTitle>
              <DialogDescription>
                {step === "select"
                  ? dialogCopy.selectDescription
                  : dialogCopy.confirmDescription}
              </DialogDescription>
            </DialogHeader>

              {errorContext && (
                <div key="error" className="animate-shake bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="animate-in zoom-in-50 duration-300">
                      {errorContext.type === "network" && <Wifi className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />}
                      {errorContext.type === "validation" && <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />}
                      {errorContext.type === "api" && <XCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />}
                      {errorContext.type === "timeout" && <Loader2 className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />}
                      {errorContext.type === "unknown" && <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-red-900 text-sm">{errorContext.title}</h4>
                      <p className="text-sm text-red-800 mt-1">{errorContext.message}</p>

                      {errorContext.actionable.length > 0 && (
                        <div className="mt-3 animate-in fade-in duration-300">
                          <p className="text-xs font-medium text-red-900 mb-2">
                            {dialogCopy.errorActionsTitle}
                          </p>
                          <ul className="text-xs text-red-700 space-y-1">
                            {errorContext.actionable.map((action, index) => (
                              <li key={index} className="flex items-start gap-2 animate-in fade-in slide-in-from-bottom-1 duration-300">
                                <span className="text-red-500 mt-0.5">•</span>
                                <span>{action}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {errorContext.canRetry && retryCount < 3 && (
                        <div className="mt-3 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleRetry}
                            disabled={loading || retryCount >= 3}
                            className="text-xs"
                          >
                            <div className="inline-flex transition-transform duration-300 hover:rotate-180">
                              <RefreshCw className="h-3 w-3 mr-1" />
                            </div>
                            {dialogCopy.retry} {retryCount > 0 && `(${retryCount}/3)`}
                          </Button>
                          {retryCount > 0 && (
                            <span className="text-xs text-red-600">
                              {dialogCopy.attempt.replace("{count}", String(retryCount))}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {step === "select" ? (
                <div key="select" className="space-y-4 py-4 animate-in fade-in duration-300">
                  {/* Resume Selection */}
                  <div className="space-y-2 animate-in fade-in slide-in-from-bottom-1 duration-300">
                    <Label className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      {dialogCopy.selectResume}
                    </Label>
                    <Select value={selectedResumeId} onValueChange={(value) => setSelectedResumeId(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder={dialogCopy.resumePlaceholder} />
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
                      <p className="text-xs text-muted-foreground animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {dialogCopy.noResumePrefix}{" "}
                        <Link href="/upload" className="text-blue-600 hover:underline">
                          {dialogCopy.uploadResume}
                        </Link>
                      </p>
                    )}
                  </div>

                  {/* Job Description Selection */}
                  <div className="space-y-2 animate-in fade-in slide-in-from-bottom-1 duration-300">
                    <Label className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4" />
                      {dialogCopy.selectJobDescription}
                    </Label>
                    <Select value={selectedJDId} onValueChange={(value) => setSelectedJDId(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder={dialogCopy.jdPlaceholder} />
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
                      <p className="text-xs text-muted-foreground animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {dialogCopy.noJdPrefix}{" "}
                        <Link href="/jd-input" className="text-blue-600 hover:underline">
                          {dialogCopy.addJobDescription}
                        </Link>
                      </p>
                    )}
                  </div>

                  {/* Notes */}
                  <div className="space-y-2 animate-in fade-in slide-in-from-bottom-1 duration-300">
                    <Label htmlFor="notes">{dialogCopy.notes}</Label>
                      <Textarea
                        id="notes"
                        placeholder={dialogCopy.notesPlaceholder}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                      />
                  </div>
                </div>
              ) : (
                <div key="confirm" className="space-y-4 py-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="bg-muted/40 rounded-lg p-4 space-y-3 animate-in fade-in duration-300">
                    <div className="animate-in fade-in slide-in-from-bottom-1 duration-300">
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">
                        {dialogCopy.resumeUsed}
                      </h4>
                      <div className="flex items-center gap-2 text-sm">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedResume?.name}</span>
                      </div>
                    </div>

                    <div className="animate-in fade-in slide-in-from-bottom-1 duration-300">
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">
                        {dialogCopy.targetRole}
                      </h4>
                      <div className="flex items-center gap-2 text-sm">
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedJD?.title}</span>
                        <span className="text-muted-foreground">{dialogCopy.at}</span>
                        <span>{selectedJD?.company}</span>
                      </div>
                    </div>

                    {notes && (
                      <div className="animate-in fade-in slide-in-from-bottom-1 duration-300">
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">
                          {dialogCopy.notes}
                        </h4>
                        <p className="text-sm text-muted-foreground">{notes}</p>
                      </div>
                    )}
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <p className="text-sm text-blue-800">
                      {dialogCopy.createHint}
                    </p>
                  </div>
                </div>
              )}

            <DialogFooter>
                {step === "select" ? (
                  <div key="select-footer" className="flex gap-2 animate-in fade-in duration-300">
                    <div className="animate-in fade-in slide-in-from-bottom-1 duration-300">
                      <Button
                        variant="outline"
                        onClick={() => {
                          resetForm();
                          onOpenChange(false);
                        }}
                      >
                        {dialogCopy.cancel}
                      </Button>
                    </div>
                    <div className="animate-in fade-in slide-in-from-bottom-1 duration-300">
                      <div className="inline-flex transition-transform duration-100 active:scale-[0.98]">
                        <Button onClick={handleContinue} disabled={!canProceed}>
                          {dialogCopy.continue}
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div key="confirm-footer" className="flex gap-2 animate-in fade-in duration-300">
                    <div className="animate-in fade-in slide-in-from-bottom-1 duration-300">
                      <Button
                        variant="outline"
                        onClick={() => setStep("select")}
                        disabled={loading}
                      >
                        {dialogCopy.back}
                      </Button>
                    </div>
                    <div className="animate-in fade-in slide-in-from-bottom-1 duration-300">
                      <div className="inline-flex transition-transform duration-100 active:scale-[0.98]">
                        <Button onClick={handleCreate} disabled={loading}>
                          {loading ? (
                            <>
                              <div className="inline-flex animate-spin">
                                <Loader2 className="h-4 w-4 mr-2" />
                              </div>
                              {dialogCopy.creating}
                            </>
                          ) : (
                            <>
                              <div className="flex items-center animate-in zoom-in-50 duration-300">
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                {t.applications.createApplication}
                              </div>
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
            </DialogFooter>
          </div>
        </DialogContent>
      </div>
    </Dialog>
  );
}
