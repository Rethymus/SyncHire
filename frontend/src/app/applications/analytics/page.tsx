/**
 * Workflow Analytics Page
 * Comprehensive analytics and insights for application workflow management
 */

"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAppStore } from '@/lib/store';
import { useWorkflowAutomation } from '@/lib/use-workflow-automation';
import { getWorkflowEngine, analyzeUserBehavior, getApplicationStatistics } from '@/lib/workflow-engine';
import WorkflowAnalyticsDashboard from '@/components/workflow-analytics-dashboard';
import StatusHistoryTimeline from '@/components/status-history-timeline';
import WorkflowNotificationCenter from '@/components/workflow-notification-center';
import {
  BarChart3,
  Timeline,
  Bell,
  Settings,
  TrendingUp,
  Target,
  Award,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';

export default function WorkflowAnalyticsPage() {
  const { applications } = useAppStore();
  const {
    statistics,
    loadStatistics,
    loadAllSuggestions,
    highPriorityCount,
  } = useWorkflowAutomation();

  const [activeTab, setActiveTab] = useState('overview');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const workflowEngine = React.useMemo(() => getWorkflowEngine(), []);

  // Load data on mount
  useEffect(() => {
    const loadAnalyticsData = async () => {
      setIsRefreshing(true);
      try {
        await Promise.all([
          loadStatistics(),
          loadAllSuggestions(),
        ]);

        // Calculate advanced analytics
        workflowEngine.calculateAdvancedAnalytics(applications);
      } catch (error) {
        console.error('Failed to load analytics data:', error);
      } finally {
        setIsRefreshing(false);
      }
    };

    loadAnalyticsData();
  }, [applications, workflowEngine, loadStatistics, loadAllSuggestions]);

  // Expose loadAnalyticsData for refresh button
  const loadAnalyticsData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        loadStatistics(),
        loadAllSuggestions(),
      ]);

      // Calculate advanced analytics
      workflowEngine.calculateAdvancedAnalytics(applications);
    } catch (error) {
      console.error('Failed to load analytics data:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [applications, workflowEngine, loadStatistics, loadAllSuggestions]);

  // Get all history for the timeline
  const allHistory = React.useMemo(() => {
    const historyEntries = [];
    for (const application of applications) {
      const appHistory = workflowEngine.getHistory(application.id);
      historyEntries.push(...appHistory);
    }
    return historyEntries.sort((a, b) =>
      new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime()
    );
  }, [applications, workflowEngine]);

  // Get user behavior insights
  const userBehavior = React.useMemo(() => {
    return analyzeUserBehavior(applications);
  }, [applications]);

  // Get application statistics
  const applicationStats = React.useMemo(() => {
    return getApplicationStatistics(applications);
  }, [applications]);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/applications">
                <ArrowLeft className="h-4 w-4 mr-2" />
                返回申请列表
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">工作流分析</h1>
              <p className="text-gray-600">
                深入了解您的申请流程和智能建议
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadAnalyticsData}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            刷新数据
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BarChart3 className="h-5 w-5 text-blue-600" />
              </div>
              <span className="text-sm text-gray-600">总申请数</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">{applications.length}</div>
            <p className="text-xs text-gray-500 mt-1">
              活跃申请: {applicationStats?.activeApplications || 0}
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <Target className="h-5 w-5 text-green-600" />
              </div>
              <span className="text-sm text-gray-600">智能建议</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">{highPriorityCount}</div>
            <p className="text-xs text-gray-500 mt-1">
              高优先级建议
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <span className="text-sm text-gray-600">面试转化率</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {((statistics?.successMetrics?.interviewRate || 0)).toFixed(1)}%
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {((statistics?.successMetrics?.interviewRate || 0)) >= 20 ? '表现优秀' : '有提升空间'}
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Award className="h-5 w-5 text-yellow-600" />
              </div>
              <span className="text-sm text-gray-600">录用转化率</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {((statistics?.successMetrics?.offerRate || 0)).toFixed(1)}%
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {((statistics?.successMetrics?.offerRate || 0)) >= 10 ? '表现优秀' : '继续努力'}
            </p>
          </Card>
        </div>

        {/* Main Analytics Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              概览分析
            </TabsTrigger>
            <TabsTrigger value="timeline" className="flex items-center gap-2">
              <Timeline className="h-4 w-4" />
              历史记录
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              通知中心
            </TabsTrigger>
            <TabsTrigger value="insights" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              智能洞察
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <WorkflowAnalyticsDashboard />
          </TabsContent>

          <TabsContent value="timeline" className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">状态变更历史</h3>
                  <p className="text-sm text-gray-600">
                    查看所有申请的状态变更记录
                  </p>
                </div>
                <Badge variant="outline" className="text-sm">
                  {allHistory.length} 条记录
                </Badge>
              </div>
              <StatusHistoryTimeline
                history={allHistory}
                showFilters={true}
                showExport={true}
              />
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <WorkflowNotificationCenter
              showHeader={true}
              showFilters={true}
              showStats={true}
            />
          </TabsContent>

          <TabsContent value="insights" className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">智能洞察</h3>
                  <p className="text-sm text-gray-600">
                    基于您的工作流数据生成的个性化建议
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                {/* User Behavior Insights */}
                {userBehavior && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="font-semibold text-blue-900 mb-3">用户行为分析</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-blue-700">申请频率</p>
                        <p className="text-lg font-bold text-blue-900">
                          {userBehavior.applicationFrequency || 0} 份/周
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-blue-700">平均匹配度</p>
                        <p className="text-lg font-bold text-blue-900">
                          {userBehavior.averageMatchScore?.toFixed(1) || '0.0'}%
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-blue-700">常用状态</p>
                        <p className="text-lg font-bold text-blue-900">
                          {userBehavior.preferredStatuses?.join(', ') || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Application Statistics */}
                {applicationStats && (
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <h4 className="font-semibold text-green-900 mb-3">申请统计</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-green-700">面试率</p>
                        <p className="text-lg font-bold text-green-900">
                          {applicationStats.interviewRate.toFixed(1)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-green-700">录用率</p>
                        <p className="text-lg font-bold text-green-900">
                          {applicationStats.offerRate.toFixed(1)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-green-700">活跃申请</p>
                        <p className="text-lg font-bold text-green-900">
                          {applicationStats.activeApplications} / {applicationStats.totalApplications}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Success Metrics */}
                {statistics?.successMetrics && (
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <h4 className="font-semibold text-purple-900 mb-3">成功指标</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-purple-700">平均录用匹配度</p>
                        <p className="text-lg font-bold text-purple-900">
                          {statistics.successMetrics.averageMatchToOffer.toFixed(1)}%
                        </p>
                        <p className="text-xs text-purple-600 mt-1">
                          获得录用职位的平均匹配分数
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-purple-700">建议周申请量</p>
                        <p className="text-lg font-bold text-purple-900">
                          {statistics.successMetrics.optimalApplicationCount} 份
                        </p>
                        <p className="text-xs text-purple-600 mt-1">
                          基于当前成功率建议的申请数量
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Actionable Insights */}
                <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <h4 className="font-semibold text-yellow-900 mb-3">可操作建议</h4>
                  <div className="space-y-2">
                    {(statistics?.successMetrics?.interviewRate ?? 0) < 20 && (
                      <div className="flex items-start gap-2">
                        <Target className="h-5 w-5 text-yellow-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-yellow-900">提高面试率</p>
                          <p className="text-sm text-yellow-700">
                            专注于匹配度高于 70% 的职位，并优化您的申请材料。
                          </p>
                        </div>
                      </div>
                    )}
                    {(statistics?.successMetrics?.offerRate ?? 0) < 10 && (
                      <div className="flex items-start gap-2">
                        <Award className="h-5 w-5 text-yellow-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-yellow-900">提高录用率</p>
                          <p className="text-sm text-yellow-700">
                            加强面试准备，考虑模拟面试和技能提升。
                          </p>
                        </div>
                      </div>
                    )}
                    {(userBehavior?.applicationFrequency ?? 0) < 5 && (
                      <div className="flex items-start gap-2">
                        <TrendingUp className="h-5 w-5 text-yellow-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-yellow-900">增加申请频率</p>
                          <p className="text-sm text-yellow-700">
                            建议每周至少申请 5-10 个匹配度较高的职位。
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
