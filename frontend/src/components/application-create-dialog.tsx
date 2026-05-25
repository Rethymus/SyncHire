"use client";

import { useState, useCallback, useMemo } from "react";
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
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { logger, LogCategory } from "@/lib/logger";
import { applicationAPI } from "@/lib/api-client-consolidated";
import {
  Briefcase,
  FileText,
  CheckCircle2,
  Loader2,
  AlertCircle,
} from "lucide-react";

interface ApplicationCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (application: any) => void;
}

export function ApplicationCreateDialog({
  open,
  onOpenChange,
  onSuccess,
}: ApplicationCreateDialogProps) {
  const { resumes, jobDescriptions, addApplication } = useAppStore();

  const [selectedResumeId, setSelectedResumeId] = useState<string>("");
  const [selectedJDId, setSelectedJDId] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [step, setStep] = useState<"select" | "confirm">("select");

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
    setStep("select");
  }, []);

  const handleCreate = useCallback(async () => {
    if (!canProceed) {
      setError("请选择简历和职位描述");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await applicationAPI.create({
        resume_id: selectedResumeId,
        jd_id: selectedJDId,
        notes: notes || undefined,
      });

      if (response.success && response.data) {
        const newApplication = {
          id: response.data.id,
          companyName: response.data.jd?.company || "Unknown Company",
          position: response.data.jd?.title || "Unknown Position",
          status: (response.data.status || "pending") as "draft" | "applied" | "interview" | "offer" | "rejected",
          jobId: selectedJDId,
          resumeId: selectedResumeId,
          matchScore: response.data.match_score,
          createdAt: new Date(response.data.created_at),
          updatedAt: new Date(response.data.updated_at),
        };

        addApplication(newApplication);
        onSuccess?.(newApplication);
        resetForm();
        onOpenChange(false);
      } else {
        setError(typeof response.error === 'string' ? response.error : "创建申请失败");
      }
    } catch (err) {
      logger.error(LogCategory.API, "Failed to create application", err as Error);
      setError("创建申请时发生错误，请重试");
    } finally {
      setLoading(false);
    }
  }, [selectedResumeId, selectedJDId, notes, canProceed, addApplication, onSuccess, onOpenChange, resetForm]);

  const handleContinue = useCallback(() => {
    if (canProceed) {
      setStep("confirm");
    } else {
      setError("请选择简历和职位描述");
    }
  }, [canProceed]);

  const selectedResume = availableResumes.find((r) => r.id === selectedResumeId);
  const selectedJD = availableJDs.find((jd) => jd.id === selectedJDId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            创建职位申请
          </DialogTitle>
          <DialogDescription>
            {step === "select"
              ? "选择简历和职位描述来创建新的职位申请"
              : "确认您的选择并创建申请"}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {step === "select" ? (
          <div className="space-y-4 py-4">
            {/* Resume Selection */}
            <div className="space-y-2">
              <Label htmlFor="resume-select" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                选择简历 *
              </Label>
              <Select
                id="resume-select"
                value={selectedResumeId}
                onChange={(e) => setSelectedResumeId(e.target.value)}
              >
                <option value="">选择要使用的简历</option>
                {availableResumes.map((resume) => (
                  <option key={resume.id} value={resume.id}>
                    {resume.name}
                  </option>
                ))}
              </Select>
              {availableResumes.length === 0 && (
                <p className="text-xs text-gray-500">
                  请先{" "}
                  <a href="/upload" className="text-blue-600 hover:underline">
                    上传简历
                  </a>
                </p>
              )}
            </div>

            {/* Job Description Selection */}
            <div className="space-y-2">
              <Label htmlFor="jd-select" className="flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                选择职位描述 *
              </Label>
              <Select
                id="jd-select"
                value={selectedJDId}
                onChange={(e) => setSelectedJDId(e.target.value)}
              >
                <option value="">选择要申请的职位</option>
                {availableJDs.map((jd) => (
                  <option key={jd.id} value={jd.id}>
                    {jd.title} - {jd.company}
                  </option>
                ))}
              </Select>
              {availableJDs.length === 0 && (
                <p className="text-xs text-gray-500">
                  请先{" "}
                  <a href="/jd-input" className="text-blue-600 hover:underline">
                    添加职位描述
                  </a>
                </p>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">备注（可选）</Label>
              <Textarea
                id="notes"
                placeholder="添加关于此申请的备注..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">
                  使用的简历
                </h4>
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-gray-500" />
                  <span>{selectedResume?.name}</span>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">
                  申请职位
                </h4>
                <div className="flex items-center gap-2 text-sm">
                  <Briefcase className="h-4 w-4 text-gray-500" />
                  <span>{selectedJD?.title}</span>
                  <span className="text-gray-500">at</span>
                  <span>{selectedJD?.company}</span>
                </div>
              </div>

              {notes && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">
                    备注
                  </h4>
                  <p className="text-sm text-gray-600">{notes}</p>
                </div>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                创建申请后，AI 将自动分析您的简历与职位描述的匹配度，并提供优化建议。
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === "select" ? (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  resetForm();
                  onOpenChange(false);
                }}
              >
                取消
              </Button>
              <Button onClick={handleContinue} disabled={!canProceed}>
                继续
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => setStep("select")}
                disabled={loading}
              >
                返回
              </Button>
              <Button onClick={handleCreate} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    创建中...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    创建申请
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
