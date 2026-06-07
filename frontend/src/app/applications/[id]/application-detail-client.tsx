"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Breadcrumb } from "@/components/breadcrumb";
import { logger, LogCategory } from "@/lib/logger";
import { applicationAPI, resumeAPI, jdAPI } from "@/lib/api-client-consolidated";
import { generateTailoredResumeMarkdown } from "@/lib/tailored-resume";
import { ApplicationNotes } from "@/components/application-notes";
import { MatchAnalysisDisplay } from "@/components/match-analysis-display";
import { WorkflowAutomation } from "@/components/workflow-automation";
import { StatusWorkflowTracker, MiniStatusTracker } from "@/components/status-workflow-tracker";
import {
  ArrowLeft,
  Briefcase,
  FileText,
  Target,
  TrendingUp,
  Clock,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  Calendar,
  Building2,
  Mail,
  Phone,
  MapPin,
  DollarSign,
  Sparkles,
} from "lucide-react";

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  draft: { label: "草稿", color: "bg-gray-100 text-gray-800", icon: FileText },
  applied: { label: "已申请", color: "bg-blue-100 text-blue-800", icon: Clock },
  interview: { label: "面试中", color: "bg-purple-100 text-purple-800", icon: MessageSquare },
  offer: { label: "已录用", color: "bg-green-100 text-green-800", icon: CheckCircle2 },
  rejected: { label: "已拒绝", color: "bg-red-100 text-red-800", icon: XCircle },
  optimized: { label: "已优化", color: "bg-green-100 text-green-800", icon: TrendingUp },
  pending: { label: "处理中", color: "bg-yellow-100 text-yellow-800", icon: Clock },
};

export default function ApplicationDetailClient() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    applications,
    resumes,
    jobDescriptions,
    candidateProfile,
    hasHydrated,
    updateApplication,
    updateResume,
    setCurrentResume,
  } = useAppStore();
  const routeApplicationId = params.id;
  const applicationId = searchParams.get("id")
    || (Array.isArray(routeApplicationId) ? routeApplicationId[0] : routeApplicationId)
    || "";

  const [loading, setLoading] = useState(true);
  const [application, setApplication] = useState<any>(null);
  const [resume, setResume] = useState<any>(null);
  const [jd, setJD] = useState<any>(null);
  const [matchScore, setMatchScore] = useState<any>(null);
  const [loadingMatch, setLoadingMatch] = useState(false);
  const [optimizedResume, setOptimizedResume] = useState<any>(null);
  const [loadingOptimization, setLoadingOptimization] = useState(false);
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [error, setError] = useState("");
  const isLocalApplication = applications.some((item) => item.id === applicationId);

  // Load application details
  useEffect(() => {
    const loadApplication = async () => {
      if (!hasHydrated) {
        return;
      }

      setLoading(true);
      setError("");

      if (!applicationId) {
        setError("缺少申请 ID");
        setLoading(false);
        return;
      }

      try {
        const storedApplication = applications.find((item) => item.id === applicationId);
        if (storedApplication) {
          const storedResume = resumes.find((item) => item.id === storedApplication.resumeId);
          const storedJD = jobDescriptions.find((item) => item.id === storedApplication.jobId);
          const localApplication = {
            id: storedApplication.id,
            resume_id: storedApplication.resumeId,
            jd_id: storedApplication.jobId,
            status: storedApplication.status,
            match_score: storedApplication.matchScore,
            created_at: storedApplication.createdAt,
            updated_at: storedApplication.updatedAt,
            notes: "",
            jobDescription: storedJD,
            resume: storedResume,
            jd: storedJD,
          };

          setApplication(localApplication);
          setResume(storedResume
            ? {
                id: storedResume.id,
                title: storedResume.name,
                content: storedResume.content,
                created_at: storedResume.uploadedAt,
              }
            : null);
          setJD(storedJD
            ? {
                id: storedJD.id,
                title: storedJD.title,
                company: storedJD.company,
                description: storedJD.description,
                created_at: storedJD.createdAt,
              }
            : null);
          setNotes("");
          setLoading(false);
          return;
        }

        const response = await applicationAPI.getById(applicationId);
        if (response.success && response.data) {
          setApplication(response.data);
          setNotes(response.data.notes || "");

          // Load associated resume and JD
          if (response.data.resume_id) {
            const resumeResponse = await resumeAPI.getById(response.data.resume_id);
            if (resumeResponse.success) {
              setResume(resumeResponse.data);
            }
          }

          if (response.data.jd_id) {
            const jdResponse = await jdAPI.getById(response.data.jd_id);
            if (jdResponse.success) {
              setJD(jdResponse.data);
            }
          }
        } else {
          setError(typeof response.error === 'string' ? response.error : "加载申请详情时发生错误");
        }
      } catch (err) {
        logger.error(LogCategory.API, "Failed to load application", err as Error);
        setError("加载申请详情时发生错误");
      } finally {
        setLoading(false);
      }
    };

    loadApplication();
  }, [applicationId, applications, hasHydrated, jobDescriptions, resumes]);

  // Load match score
  const loadMatchScore = useCallback(async () => {
    setLoadingMatch(true);
    setError("");

    try {
      if (isLocalApplication) {
        setMatchScore({
          match_score: application.match_score ?? 0,
          match_details: {
            skills_match: 0,
            experience_match: 0,
            education_match: 0,
            missing_skills: [],
            recommendations: [
              "Lite mode keeps your data local. Connect the API service for AI-generated match analysis.",
            ],
          },
        });
        return;
      }

      const response = await applicationAPI.getMatchScore(applicationId);
      if (response.success && response.data) {
        setMatchScore(response.data);
      } else {
        setError(typeof response.error === 'string' ? response.error : "加载匹配度时发生错误");
      }
    } catch (err) {
      logger.error(LogCategory.API, "Failed to load match score", err as Error);
      setError("加载匹配度时发生错误");
    } finally {
      setLoadingMatch(false);
    }
  }, [application, applicationId, isLocalApplication]);

  // Optimize resume
  const optimizeResume = useCallback(async () => {
    setLoadingOptimization(true);
    setError("");

    try {
      if (isLocalApplication) {
        const storedApplication = applications.find((item) => item.id === applicationId);
        const sourceResume = storedApplication
          ? resumes.find((item) => item.id === storedApplication.resumeId)
          : undefined;
        const targetJD = storedApplication
          ? jobDescriptions.find((item) => item.id === storedApplication.jobId)
          : undefined;
        const tailoredResume = generateTailoredResumeMarkdown({
          profile: candidateProfile,
          resume: sourceResume,
          jd: targetJD,
        });

        if (sourceResume) {
          const nextResume = {
            ...sourceResume,
            content: tailoredResume,
            skills: candidateProfile.skills,
            experience: candidateProfile.projects,
          };

          updateResume(sourceResume.id, nextResume);
          setCurrentResume(nextResume);
          setResume({
            id: nextResume.id,
            title: nextResume.name,
            content: nextResume.content,
            created_at: nextResume.uploadedAt,
          });
        }

        setOptimizedResume({
          optimized_resume: tailoredResume,
          changes_made: [
            "Generated a role-specific summary from the local candidate role card.",
            "Prioritized skills that appear in the selected job description.",
            "Added project proof points for manual review before submission.",
          ],
          keywords_added: targetJD?.skills ?? [],
          sections_improved: ["summary", "skills", "projects"],
        });
        setApplication((current: any) => current
          ? { ...current, status: "optimized", updated_at: new Date() }
          : current);
        updateApplication(applicationId, { status: "optimized", updatedAt: new Date() });
        return;
      }

      const response = await applicationAPI.optimizeResume(applicationId);
      if (response.success && response.data) {
        setOptimizedResume(response.data);
        // Update application status
        if (application) {
          setApplication({ ...application, status: "optimized" });
        }
      } else {
        setError(typeof response.error === 'string' ? response.error : "优化简历时发生错误");
      }
    } catch (err) {
      logger.error(LogCategory.API, "Failed to optimize resume", err as Error);
      setError("优化简历时发生错误");
    } finally {
      setLoadingOptimization(false);
    }
  }, [
    applicationId,
    application,
    applications,
    candidateProfile,
    isLocalApplication,
    jobDescriptions,
    resumes,
    setCurrentResume,
    updateApplication,
    updateResume,
  ]);

  // Update application status
  const updateStatus = useCallback(
    async (newStatus: string) => {
      try {
        if (isLocalApplication) {
          setApplication((current: any) => current
            ? {
                ...current,
                status: newStatus,
                updated_at: new Date(),
              }
            : current);
          updateApplication(applicationId, { status: newStatus as any, updatedAt: new Date() });
          return;
        }

        const response = await applicationAPI.updateStatus(applicationId, {
          status: newStatus,
          notes: notes || undefined,
        });

        if (response.success && response.data) {
          setApplication(response.data);
          updateApplication(applicationId, { status: newStatus as any });
        } else {
          setError(typeof response.error === 'string' ? response.error : "更新状态时发生错误");
        }
      } catch (err) {
        logger.error(LogCategory.API, "Failed to update status", err as Error);
        setError("更新状态时发生错误");
      }
    },
    [applicationId, isLocalApplication, notes, updateApplication]
  );

  // Save notes
  const saveNotes = useCallback(async () => {
    setSavingNotes(true);
    setError("");

    try {
      if (isLocalApplication) {
        setApplication((current: any) => current ? { ...current, notes } : current);
        return;
      }

      const response = await applicationAPI.update(applicationId, {
        notes,
      });

      if (response.success) {
        if (application) {
          setApplication({ ...application, notes });
        }
      } else {
        setError(typeof response.error === 'string' ? response.error : "保存备注时发生错误");
      }
    } catch (err) {
      logger.error(LogCategory.API, "Failed to save notes", err as Error);
      setError("保存备注时发生错误");
    } finally {
      setSavingNotes(false);
    }
  }, [applicationId, application, isLocalApplication, notes]);

  const config = application ? statusConfig[application.status] : statusConfig.pending;
  const StatusIcon = config?.icon || Clock;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">加载申请详情...</p>
        </div>
      </div>
    );
  }

  if (error && !application) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 max-w-md">
          <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2 text-center">
            加载失败
          </h2>
          <p className="text-gray-600 text-center mb-4">{error}</p>
          <Button onClick={() => router.back()} className="w-full">
            返回
          </Button>
        </Card>
      </div>
    );
  }

  if (!application) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Breadcrumb */}
        <div className="mb-4">
          <Breadcrumb
            currentTitle={application?.jobDescription?.title || "Application Details"}
            dynamicParams={{ id: applicationId }}
          />
        </div>

        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回
          </Button>

          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">
                  {jd?.title || "Unknown Position"}
                </h1>
                <Badge className={config.color}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {config.label}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-gray-600">
                <div className="flex items-center gap-1">
                  <Building2 className="h-4 w-4" />
                  <span>{jd?.company || "Unknown Company"}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>申请于 {new Date(application.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Select value={application.status} onValueChange={(value) => updateStatus(value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statusConfig).map(([key, value]) => (
                    <SelectItem key={key} value={key}>
                      {value.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Main Content */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">概览</TabsTrigger>
            <TabsTrigger value="match">匹配分析</TabsTrigger>
            <TabsTrigger value="optimization">优化建议</TabsTrigger>
            <TabsTrigger value="workflow">智能工作流</TabsTrigger>
            <TabsTrigger value="notes">备注</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Status Workflow Tracker */}
            <StatusWorkflowTracker
              currentStatus={application.status}
              onStatusClick={(status) => updateStatus(status)}
              showHistory={true}
              history={application.status_history?.map((h: any) => ({
                status: h.new_status,
                timestamp: new Date(h.changed_at),
              })) || []}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Resume Card */}
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">使用的简历</h3>
                    <p className="text-sm text-gray-600">{resume?.title || "Unknown"}</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="h-4 w-4" />
                    上传于 {resume?.created_at ? new Date(resume.created_at).toLocaleDateString() : "Unknown"}
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full mt-4"
                  onClick={() => router.push(`/editor?applicationId=${applicationId}`)}
                >
                  编辑简历
                </Button>
              </Card>

              {/* Job Description Card */}
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Briefcase className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">职位描述</h3>
                    <p className="text-sm text-gray-600">{jd?.title || "Unknown"}</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Building2 className="h-4 w-4" />
                    {jd?.company || "Unknown Company"}
                  </div>
                  {jd?.location && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <MapPin className="h-4 w-4" />
                      {jd.location}
                    </div>
                  )}
                </div>
                <Button
                  variant="outline"
                  className="w-full mt-4"
                  onClick={() => router.push(`/jd-input?id=${jd?.id}`)}
                >
                  查看详情
                </Button>
              </Card>
            </div>

            {/* Match Score Summary */}
            {application.match_score !== undefined && (
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">匹配度评分</h3>
                    <p className="text-sm text-gray-600">
                      基于您的简历和职位要求的AI分析
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-4xl font-bold text-blue-600">
                      {Math.round(application.match_score)}%
                    </div>
                    <Button
                      variant="link"
                      className="p-0 h-auto text-sm"
                      onClick={() => document.getElementById("match-tab")?.click()}
                    >
                      查看详细分析
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </TabsContent>

          {/* Match Analysis Tab */}
          <TabsContent value="match">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">匹配度分析</h2>
                  <p className="text-sm text-gray-600">
                    AI 分析您的简历与职位要求的匹配情况
                  </p>
                </div>
                <Button
                  onClick={loadMatchScore}
                  disabled={loadingMatch}
                >
                  {loadingMatch ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      分析中...
                    </>
                  ) : (
                    <>
                      <Target className="h-4 w-4 mr-2" />
                      重新分析
                    </>
                  )}
                </Button>
              </div>

              {matchScore ? (
                <MatchAnalysisDisplay matchData={matchScore} />
              ) : (
                <div className="text-center py-12">
                  <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">
                    点击上方按钮开始匹配度分析
                  </p>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Optimization Tab */}
          <TabsContent value="optimization">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">简历优化</h2>
                  <p className="text-sm text-gray-600">
                    AI 根据职位要求优化您的简历内容
                  </p>
                </div>
                <Button
                  onClick={optimizeResume}
                  disabled={loadingOptimization}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  {loadingOptimization ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      优化中...
                    </>
                  ) : (
                    <>
                      <TrendingUp className="h-4 w-4 mr-2" />
                      优化简历
                    </>
                  )}
                </Button>
              </div>

              {optimizedResume ? (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <h3 className="font-semibold text-green-900">优化完成</h3>
                    </div>
                  <p className="text-sm text-green-800">
                      已根据本地角色卡和职位描述生成岗位化简历。请在编辑器中审核内容，再导出 PDF 人工提交。
                  </p>
                  </div>

                  <Button
                    onClick={() => router.push(`/editor?applicationId=${applicationId}`)}
                    className="w-full"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    在编辑器中查看优化结果
                  </Button>
                </div>
              ) : (
                <div className="text-center py-12">
                  <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">
                    点击上方按钮开始AI简历优化
                  </p>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Workflow Automation Tab */}
          <TabsContent value="workflow">
            <WorkflowAutomation applicationId={applicationId} />
          </TabsContent>

          {/* Notes Tab */}
          <TabsContent value="notes">
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">申请备注</h2>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="notes">备注内容</Label>
                  <Textarea
                    id="notes"
                    placeholder="添加关于此申请的备注、面试时间、联系方式等信息..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={8}
                    className="mt-2"
                  />
                </div>
                <Button
                  onClick={saveNotes}
                  disabled={savingNotes}
                  className="w-full"
                >
                  {savingNotes ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      保存中...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      保存备注
                    </>
                  )}
                </Button>

                {/* Status History */}
                {application.status_history && application.status_history.length > 0 && (
                  <div className="mt-8">
                    <h3 className="font-semibold text-gray-900 mb-4">状态历史</h3>
                    <div className="space-y-3">
                      {application.status_history.map((history: any) => (
                        <div
                          key={history.id}
                          className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                        >
                          <Clock className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="font-medium text-gray-900">
                                {statusConfig[history.old_status]?.label || "开始"} → {statusConfig[history.new_status]?.label}
                              </span>
                              <span className="text-gray-500">
                                {new Date(history.changed_at).toLocaleString()}
                              </span>
                            </div>
                            {history.notes && (
                              <p className="text-sm text-gray-600 mt-1">
                                {history.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="mt-8 flex gap-4">
          <Button
            onClick={() => router.push(`/interview-prep?applicationId=${applicationId}`)}
            className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            面试准备
          </Button>
          <Button
            onClick={() => router.push(`/editor?applicationId=${applicationId}`)}
            variant="outline"
            className="flex-1"
          >
            <FileText className="h-4 w-4 mr-2" />
            编辑简历
          </Button>
        </div>
      </div>
    </div>
  );
}
