"use client";

import { useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { ApplicationsList } from "@/components/applications-list";
import { MatchRankingControls } from "@/components/match-ranking-controls";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus, TrendingUp, Award, Target, BarChart3 } from "lucide-react";
import { rankApplications, getMatchStatistics, getRecommendedApplications } from "@/lib/match-ranking";

export default function ApplicationsPage() {
  const { applications } = useAppStore();

  const stats = useMemo(() => getMatchStatistics(applications), [applications]);
  const recommended = useMemo(() => getRecommendedApplications(applications, 3), [applications]);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">我的申请</h1>
            <p className="text-gray-600">
              管理您的职位申请，查看匹配分析和面试准备
            </p>
          </div>
          <Button asChild>
            <Link href="/dashboard">
              <Plus className="h-4 w-4 mr-2" />
              新建申请
            </Link>
          </Button>
        </div>

        {/* Statistics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BarChart3 className="h-5 w-5 text-blue-600" />
              </div>
              <span className="text-sm text-gray-600">总申请数</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
            <p className="text-xs text-gray-500 mt-1">
              {stats.withScores} 个已分析匹配度
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <span className="text-sm text-gray-600">平均匹配度</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">{stats.average}%</div>
            <p className="text-xs text-gray-500 mt-1">
              最高: {stats.max}%, 最低: {stats.min}%
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Award className="h-5 w-5 text-yellow-600" />
              </div>
              <span className="text-sm text-gray-600">优秀匹配</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">{stats.excellent}</div>
            <p className="text-xs text-gray-500 mt-1">
              良好: {stats.good}, 一般: {stats.fair}
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Target className="h-5 w-5 text-purple-600" />
              </div>
              <span className="text-sm text-gray-600">中位数</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">{stats.median}%</div>
            <p className="text-xs text-gray-500 mt-1">
              {stats.median >= 60 ? "表现良好" : "有提升空间"}
            </p>
          </Card>
        </div>

        {/* Recommended Applications */}
        {recommended.length > 0 && (
          <Card className="p-6 mb-8 border-2 border-green-200 bg-green-50">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">
                  推荐优先申请
                </h2>
                <p className="text-sm text-gray-600">
                  基于匹配度分析，这些职位最适合您的背景
                </p>
              </div>
              <Award className="h-8 w-8 text-green-600" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {recommended.map((app) => (
                <Link
                  key={app.id}
                  href={`/applications/${app.id}/match`}
                  className="block p-4 bg-white rounded-lg border border-green-200 hover:border-green-400 hover:shadow-md transition-all"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {app.position}
                    </h3>
                    <span className="text-sm font-bold text-green-600">
                      {app.matchScore}%
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{app.companyName}</p>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded ${
                        app.matchLevel === "excellent"
                          ? "bg-green-100 text-green-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {app.matchLevel === "excellent" ? "优秀匹配" : "良好匹配"}
                    </span>
                    {app.percentile && (
                      <span className="text-xs text-gray-500">
                        前 {Math.round(100 - app.percentile)}%
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </Card>
        )}

        {/* Ranking Controls and Applications List */}
        <MatchRankingControls
          applications={applications}
          onRankingChange={(ranked) => {
            // The applications list will use its own ranking
            console.log("Ranked applications:", ranked.length);
          }}
        >
          <ApplicationsList showRanking={true} />
        </MatchRankingControls>

        {/* Empty State */}
        {applications.length === 0 && (
          <Card className="p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                开始您的求职之旅
              </h3>
              <p className="text-gray-600 mb-6">
                创建第一个职位申请，我们的AI将帮您分析匹配度并提供优化建议
              </p>
              <Button asChild size="lg">
                <Link href="/dashboard">
                  <Plus className="h-4 w-4 mr-2" />
                  创建申请
                </Link>
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
