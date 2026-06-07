"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import { BatchApplicationsList } from "@/components/batch-applications-list";
import { MatchRankingControls } from "@/components/match-ranking-controls";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb } from "@/components/breadcrumb";
import Link from "next/link";
import { Plus, TrendingUp, Award, Target, BarChart3, Sparkles, X } from "lucide-react";
import { rankApplications, getMatchStatistics, getRecommendedApplications } from "@/lib/match-ranking";
import { useWorkflowAutomation } from "@/lib/use-workflow-automation";
import { applicationMatchHref } from "@/lib/application-links";
import { useLiteCopy } from "@/lib/lite-i18n";

export default function ApplicationsPage() {
  const { applications } = useAppStore();
  const { t } = useLiteCopy();
  const applicationsCopy = t.applications;
  const {
    highPrioritySuggestions,
    highPriorityCount,
    loadAllSuggestions,
    setAutoMode,
    executeTransition,
  } = useWorkflowAutomation();
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());

  const stats = useMemo(() => getMatchStatistics(applications), [applications]);
  const recommended = useMemo(() => getRecommendedApplications(applications, 3), [applications]);
  const handleRankingChange = useCallback(() => {}, []);

  // Filter out dismissed suggestions
  const activeSuggestions = useMemo(() => {
    return highPrioritySuggestions.filter(
      item => !dismissedSuggestions.has(item.applicationId)
    );
  }, [highPrioritySuggestions, dismissedSuggestions]);

  // Load suggestions when applications change
  useEffect(() => {
    if (applications.length > 0) {
      loadAllSuggestions();
    }
  }, [applications.length, loadAllSuggestions]);

  // Dismiss a suggestion
  const dismissSuggestion = (applicationId: string) => {
    setDismissedSuggestions(prev => new Set([...prev, applicationId]));
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Breadcrumb */}
        <div className="mb-4">
          <Breadcrumb />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{applicationsCopy.title}</h1>
            <p className="text-gray-600">
              {applicationsCopy.subtitle}
            </p>
          </div>
          <Button asChild>
            <Link href="/dashboard">
              <Plus className="h-4 w-4 mr-2" />
              {applicationsCopy.newApplication}
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
              <span className="text-sm text-gray-600">{applicationsCopy.totalApplications}</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
            <p className="text-xs text-gray-500 mt-1">
              {stats.withScores} {applicationsCopy.analyzedMatches}
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <span className="text-sm text-gray-600">{applicationsCopy.averageMatch}</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">{stats.average}%</div>
            <p className="text-xs text-gray-500 mt-1">
              {applicationsCopy.max}: {stats.max}%, {applicationsCopy.min}: {stats.min}%
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Award className="h-5 w-5 text-yellow-600" />
              </div>
              <span className="text-sm text-gray-600">{applicationsCopy.excellentMatches}</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">{stats.excellent}</div>
            <p className="text-xs text-gray-500 mt-1">
              {applicationsCopy.good}: {stats.good}, {applicationsCopy.fair}: {stats.fair}
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Target className="h-5 w-5 text-purple-600" />
              </div>
              <span className="text-sm text-gray-600">{applicationsCopy.median}</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">{stats.median}%</div>
            <p className="text-xs text-gray-500 mt-1">
              {stats.median >= 60 ? applicationsCopy.strong : applicationsCopy.improve}
            </p>
          </Card>
        </div>

        {/* High Priority Workflow Suggestions */}
        {showSuggestions && activeSuggestions.length > 0 && (
          <Card className="p-6 mb-8 border-2 border-yellow-200 bg-yellow-50">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Sparkles className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {applicationsCopy.suggestionsTitle}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {applicationsCopy.suggestionsSubtitle}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSuggestions(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-3">
              {activeSuggestions.slice(0, 3).map(({ applicationId, suggestion, application }) => {
                if (!application) return null;

                return (
                  <div
                    key={applicationId}
                    className="flex items-start justify-between p-4 bg-white rounded-lg border border-yellow-200"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-900">
                          {application.position}
                        </h3>
                        <Badge variant="outline" className="text-xs">
                          {applicationsCopy.confidence}: {Math.round(suggestion.confidence * 100)}%
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {application.companyName}
                      </p>
                      <p className="text-sm text-gray-700">
                        {applicationsCopy.suggestionReasons[
                          application.status as keyof typeof applicationsCopy.suggestionReasons
                        ] || suggestion.reason}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => dismissSuggestion(applicationId)}
                      >
                        {applicationsCopy.dismiss}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => executeTransition(applicationId, suggestion)}
                      >
                        {applicationsCopy.applySuggestion}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {activeSuggestions.length > 3 && (
              <div className="mt-4 text-center">
                <Button variant="link" size="sm">
                  {applicationsCopy.moreSuggestions} ({activeSuggestions.length - 3})
                </Button>
              </div>
            )}
          </Card>
        )}

        {/* Recommended Applications */}
        {recommended.length > 0 && (
          <Card className="p-6 mb-8 border-2 border-green-200 bg-green-50">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">
                  {applicationsCopy.recommendedTitle}
                </h2>
                <p className="text-sm text-gray-600">
                  {applicationsCopy.recommendedSubtitle}
                </p>
              </div>
              <Award className="h-8 w-8 text-green-600" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {recommended.map((app) => (
                <Link
                  key={app.id}
                  href={applicationMatchHref(app.id)}
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
                      {app.matchLevel === "excellent" ? applicationsCopy.excellentMatch : applicationsCopy.goodMatch}
                    </span>
                    {app.percentile && (
                      <span className="text-xs text-gray-500">
                        {applicationsCopy.percentilePrefix} {Math.round(100 - app.percentile)}%
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
          onRankingChange={handleRankingChange}
        >
          <BatchApplicationsList showRanking={true} />
        </MatchRankingControls>

        {/* Empty State */}
        {applications.length === 0 && (
          <Card className="p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {applicationsCopy.emptyTitle}
              </h3>
              <p className="text-gray-600 mb-6">
                {applicationsCopy.emptyDescription}
              </p>
              <Button asChild size="lg">
                <Link href="/dashboard">
                  <Plus className="h-4 w-4 mr-2" />
                  {applicationsCopy.createApplication}
                </Link>
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
