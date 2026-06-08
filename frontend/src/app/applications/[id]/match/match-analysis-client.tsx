"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppStore, type JobApplication, type JobDescription, type Resume } from "@/lib/store";
import { apiClient } from "@/lib/api-client";
import { applicationMatchHref } from "@/lib/application-links";
import { getMatchLevel } from "@/lib/match-ranking";
import { cn } from "@/lib/utils";
import { MatchScoreBreakdown } from "@/components/match-score-breakdown";
import { SkillGapAnalysis } from "@/components/skill-gap-analysis";
import {
  ArrowLeft,
  RefreshCw,
  Download,
  Share2,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

interface MatchDetails {
  overallScore: number;
  overallPercentage: number;
  matchLevel: "excellent" | "good" | "fair" | "poor";
  hardSkillsScore: {
    category: string;
    score: number;
    maxScore: number;
    percentage: number;
    details: string[];
  };
  softSkillsScore: {
    category: string;
    score: number;
    maxScore: number;
    percentage: number;
    details: string[];
  };
  experienceScore: {
    category: string;
    score: number;
    maxScore: number;
    percentage: number;
    details: string[];
  };
  educationScore: {
    category: string;
    score: number;
    maxScore: number;
    percentage: number;
    details: string[];
  };
  skillMatches: Array<{
    skill: string;
    hasSkill: boolean;
    required: boolean;
    matchQuality: "exact" | "partial" | "missing";
  }>;
  missingSkills: string[];
  missingRequiredSkills: string[];
  additionalSkills: string[];
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  radarChartData: Array<{
    category: string;
    score: number;
    maxScore: number;
  }>;
  calculatedAt: string;
  confidence: number;
}

function normalizeSkill(skill: string) {
  return skill.trim().toLowerCase();
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function categoryScore(
  category: string,
  maxScore: number,
  percentage: number,
  detail: string
): MatchDetails["hardSkillsScore"] {
  const boundedPercentage = Math.max(0, Math.min(100, percentage));

  return {
    category,
    maxScore,
    percentage: boundedPercentage,
    score: Math.round((boundedPercentage / 100) * maxScore * 10) / 10,
    details: [detail],
  };
}

function buildLocalMatchDetails(
  application: JobApplication,
  jd?: JobDescription,
  resume?: Resume
): MatchDetails {
  const requiredSkills = jd?.requirements ?? [];
  const jdSkills = unique([...requiredSkills, ...(jd?.skills ?? [])]);
  const resumeText = `${resume?.content ?? ""} ${(resume?.skills ?? []).join(" ")} ${(resume?.experience ?? []).join(" ")}`.toLowerCase();
  const resumeSkillSet = new Set((resume?.skills ?? []).map(normalizeSkill));

  const skillMatches = jdSkills.map((skill, index) => {
    const normalized = normalizeSkill(skill);
    const exact = resumeSkillSet.has(normalized) || resumeText.includes(normalized);
    const partial = !exact && normalized
      .split(/[\s,/|+.-]+/)
      .filter((token) => token.length > 2)
      .some((token) => resumeText.includes(token));

    return {
      skill,
      hasSkill: exact || partial,
      required: index < requiredSkills.length,
      matchQuality: exact ? "exact" as const : partial ? "partial" as const : "missing" as const,
    };
  });

  const matchedSkills = skillMatches.filter((match) => match.hasSkill);
  const missingSkills = skillMatches
    .filter((match) => !match.hasSkill)
    .map((match) => match.skill);
  const missingRequiredSkills = skillMatches
    .filter((match) => !match.hasSkill && match.required)
    .map((match) => match.skill);
  const normalizedJdSkills = new Set(jdSkills.map(normalizeSkill));
  const additionalSkills = unique(resume?.skills ?? [])
    .filter((skill) => !normalizedJdSkills.has(normalizeSkill(skill)));
  const inferredPercentage = jdSkills.length > 0
    ? Math.round((matchedSkills.length / jdSkills.length) * 100)
    : 0;
  const overallPercentage = Math.max(
    0,
    Math.min(100, application.matchScore ?? inferredPercentage)
  );
  const skillsPercentage = jdSkills.length > 0 ? inferredPercentage : overallPercentage;
  const strengths = [
    matchedSkills.length > 0 ? `已匹配 ${matchedSkills.length} 项职位技能` : "",
    overallPercentage >= 60 ? "整体匹配度达到可推进申请的水平" : "",
  ].filter(Boolean);
  const weaknesses = missingRequiredSkills.length > 0
    ? [`缺少 ${missingRequiredSkills.length} 项必需技能`]
    : [];
  const recommendations = [
    ...missingRequiredSkills.slice(0, 3).map((skill) => `优先补强必需技能：${skill}`),
    ...missingSkills
      .filter((skill) => !missingRequiredSkills.includes(skill))
      .slice(0, 2)
      .map((skill) => `补充 ${skill} 相关项目或关键词，提升 JD 命中率`),
    "Lite 模式已使用本地简历和职位数据完成分析；连接 API 服务可获得更细粒度的 AI 建议。",
  ];

  return {
    overallScore: overallPercentage,
    overallPercentage,
    matchLevel: getMatchLevel(overallPercentage),
    hardSkillsScore: categoryScore(
      "硬技能",
      40,
      skillsPercentage,
      jdSkills.length > 0 ? "基于本地 JD 技能和简历内容匹配" : "暂无 JD 技能数据，使用总分兜底"
    ),
    softSkillsScore: categoryScore("软技能", 20, overallPercentage, "Lite 模式使用总分估算软技能匹配"),
    experienceScore: categoryScore("项目经历", 25, overallPercentage, "Lite 模式使用简历经历与总分估算经验匹配"),
    educationScore: categoryScore("教育背景", 15, overallPercentage, "Lite 模式使用总分估算教育背景匹配"),
    skillMatches,
    missingSkills,
    missingRequiredSkills,
    additionalSkills,
    strengths,
    weaknesses,
    recommendations,
    radarChartData: [
      { category: "硬技能", score: skillsPercentage, maxScore: 100 },
      { category: "软技能", score: overallPercentage, maxScore: 100 },
      { category: "项目经历", score: overallPercentage, maxScore: 100 },
      { category: "教育背景", score: overallPercentage, maxScore: 100 },
    ],
    calculatedAt: new Date().toISOString(),
    confidence: jdSkills.length > 0 ? 0.78 : 0.6,
  };
}

export default function MatchAnalysisClient() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const routeApplicationId = params.id;
  const applicationId = searchParams.get("id")
    || (Array.isArray(routeApplicationId) ? routeApplicationId[0] : routeApplicationId)
    || "";
  const {
    applications,
    jobDescriptions,
    resumes,
    hasHydrated,
    updateApplication,
  } = useAppStore();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // Find the application in the store
  const application = useMemo(
    () => applications.find((app) => app.id === applicationId),
    [applications, applicationId]
  );
  const jobDescription = useMemo(
    () => application
      ? jobDescriptions.find((jd) => jd.id === application.jobId)
      : undefined,
    [application, jobDescriptions]
  );
  const resume = useMemo(
    () => application
      ? resumes.find((item) => item.id === application.resumeId)
      : undefined,
    [application, resumes]
  );

  // Fetch match details
  const {
    data: matchDetails,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["match-details", applicationId, application?.matchScore, hasHydrated],
    queryFn: async () => {
      if (!applicationId) {
        throw new Error("Missing application ID");
      }

      if (application) {
        return buildLocalMatchDetails(application, jobDescription, resume);
      }

      const response = await apiClient.get<MatchDetails>(
        `/applications/${applicationId}/match`
      );
      return response.data;
    },
    enabled: hasHydrated && !!applicationId,
    retry: application ? 0 : 1,
  });

  // Update application in store when match details are loaded
  useEffect(() => {
    if (matchDetails && application) {
      const nextMatchScore = Math.round(matchDetails.overallPercentage);
      if (application.matchScore === nextMatchScore) {
        return;
      }

      updateApplication(application.id, {
        matchScore: nextMatchScore,
      });
    }
  }, [matchDetails, application, updateApplication]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      toast.success("匹配分析已更新");
    } catch (error) {
      toast.error("更新失败，请稍后重试");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleExport = () => {
    if (!matchDetails) return;

    const report = {
      application: {
        position: application?.position,
        company: application?.companyName,
        date: application?.createdAt.toISOString(),
      },
      matchAnalysis: matchDetails,
      generatedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `match-analysis-${applicationId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("分析报告已导出");
  };

  const handleShare = async () => {
    if (!matchDetails || !application) return;

    const shareUrl = `${window.location.origin}${applicationMatchHref(applicationId)}`;
    const shareText = `我在 ${application.companyName} 的 ${application.position} 职位匹配度为 ${matchDetails.overallPercentage.toFixed(1)}%`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "SyncHire 匹配分析",
          text: shareText,
          url: shareUrl,
        });
      } catch (error) {
        console.error("Share failed:", error);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      toast.success("链接已复制到剪贴板");
    }
  };

  if (!hasHydrated || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">正在分析匹配度...</p>
        </div>
      </div>
    );
  }

  if (!applicationId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-6">
          <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 text-center mb-2">
            缺少申请 ID
          </h2>
          <p className="text-gray-600 text-center mb-4">
            请从申请列表进入匹配分析。
          </p>
          <Button onClick={() => router.push("/applications")} className="w-full">
            返回申请列表
          </Button>
        </Card>
      </div>
    );
  }

  if (error || !matchDetails) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-6">
          <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 text-center mb-2">
            分析失败
          </h2>
          <p className="text-gray-600 text-center mb-4">
            无法加载匹配分析，请确保简历和职位描述已成功解析。
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.back()} className="flex-1">
              返回
            </Button>
            <Button onClick={() => refetch()} className="flex-1">
              重试
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-6">
          <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 text-center mb-2">
            申请未找到
          </h2>
          <p className="text-gray-600 text-center mb-4">
            该申请不存在或已被删除。
          </p>
          <Button onClick={() => router.push("/dashboard")} className="w-full">
            返回首页
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="mb-2"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw
                  className={cn(
                    "h-4 w-4 mr-2",
                    isRefreshing && "animate-spin"
                  )}
                />
                刷新
              </Button>
              <Button variant="outline" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                导出
              </Button>
              <Button variant="outline" onClick={handleShare}>
                <Share2 className="h-4 w-4 mr-2" />
                分享
              </Button>
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {application.position}
            </h1>
            <p className="text-lg text-gray-600">{application.companyName}</p>
            <p className="text-sm text-gray-500 mt-1">
              分析时间: {new Date(matchDetails.calculatedAt).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">概览</TabsTrigger>
            <TabsTrigger value="skills">技能分析</TabsTrigger>
            <TabsTrigger value="recommendations">建议</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <MatchScoreBreakdown {...matchDetails} />
          </TabsContent>

          <TabsContent value="skills" className="mt-6">
            <SkillGapAnalysis
              skillMatches={matchDetails.skillMatches}
              missingRequiredSkills={matchDetails.missingRequiredSkills}
              missingOptionalSkills={matchDetails.missingSkills.filter(
                (skill) => !matchDetails.missingRequiredSkills.includes(skill)
              )}
              onSkillClick={(skill) => {
                window.open(
                  `https://www.google.com/search?q=${encodeURIComponent(`${skill} course tutorial`)}`,
                  "_blank"
                );
              }}
            />
          </TabsContent>

          <TabsContent value="recommendations" className="mt-6">
            <Card className="p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                改进建议
              </h3>
              {matchDetails.recommendations.length > 0 ? (
                <div className="space-y-4">
                  {matchDetails.recommendations.map((recommendation, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200"
                    >
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                        {index + 1}
                      </div>
                      <p className="text-gray-800">{recommendation}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">
                  暂无具体建议，您的简历与该职位匹配良好！
                </p>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
