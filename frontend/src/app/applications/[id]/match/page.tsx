"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppStore } from "@/lib/store";
import { apiClient } from "@/lib/api-client";
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

export default function MatchAnalysisPage() {
  const params = useParams();
  const router = useRouter();
  const { applicationId } = params as { applicationId: string };
  const { applications, updateApplication } = useAppStore();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // Find the application in the store
  const application = useMemo(
    () => applications.find((app) => app.id === applicationId),
    [applications, applicationId]
  );

  // Fetch match details
  const {
    data: matchDetails,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["match-details", applicationId],
    queryFn: async () => {
      const response = await apiClient.get<MatchDetails>(
        `/applications/${applicationId}/match`
      );
      return response.data;
    },
    enabled: !!applicationId,
    retry: 1,
  });

  // Update application in store when match details are loaded
  useEffect(() => {
    if (matchDetails && application) {
      updateApplication(application.id, {
        matchScore: Math.round(matchDetails.overallPercentage),
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

    const shareUrl = `${window.location.origin}/applications/${applicationId}/match`;
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">正在分析匹配度...</p>
        </div>
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

// Add missing import
import { cn } from "@/lib/utils";
