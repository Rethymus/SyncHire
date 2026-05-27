/**
 * Workflow Analytics Dashboard
 * Comprehensive analytics for application workflow, status transitions, and funnel analysis
 */

"use client";

import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useWorkflowAutomation } from '@/lib/use-workflow-automation';
import { useAppStore } from '@/lib/store';
import {
  TrendingUp,
  TrendingDown,
  Target,
  Clock,
  Award,
  BarChart3,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Calendar,
  Filter,
} from 'lucide-react';

interface FunnelStage {
  status: string;
  label: string;
  count: number;
  percentage: number;
  conversionRate?: number;
  color: string;
}

interface TimeInStatus {
  status: string;
  label: string;
  averageTime: number;
  timeUnit: 'hours' | 'days';
}

export function WorkflowAnalyticsDashboard() {
  const { applications } = useAppStore();
  const { statistics, loadStatistics } = useWorkflowAutomation();

  React.useEffect(() => {
    loadStatistics();
  }, [applications.length, loadStatistics]);

  // Calculate funnel analysis
  const funnelData = useMemo((): FunnelStage[] => {
    if (!statistics || applications.length === 0) return [];

    const total = applications.length;
    const statusCounts = applications.reduce((acc, app) => {
      acc[app.status] = (acc[app.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const stages: FunnelStage[] = [
      {
        status: 'draft',
        label: '草稿',
        count: statusCounts.draft || 0,
        percentage: total > 0 ? ((statusCounts.draft || 0) / total) * 100 : 0,
        color: 'bg-gray-500',
      },
      {
        status: 'optimized',
        label: '已优化',
        count: statusCounts.optimized || 0,
        percentage: total > 0 ? ((statusCounts.optimized || 0) / total) * 100 : 0,
        color: 'bg-green-500',
      },
      {
        status: 'applied',
        label: '已申请',
        count: statusCounts.applied || 0,
        percentage: total > 0 ? ((statusCounts.applied || 0) / total) * 100 : 0,
        color: 'bg-blue-500',
      },
      {
        status: 'interview',
        label: '面试中',
        count: statusCounts.interview || 0,
        percentage: total > 0 ? ((statusCounts.interview || 0) / total) * 100 : 0,
        color: 'bg-purple-500',
      },
      {
        status: 'offer',
        label: '已录用',
        count: statusCounts.offer || 0,
        percentage: total > 0 ? ((statusCounts.offer || 0) / total) * 100 : 0,
        color: 'bg-green-600',
      },
      {
        status: 'rejected',
        label: '已拒绝',
        count: statusCounts.rejected || 0,
        percentage: total > 0 ? ((statusCounts.rejected || 0) / total) * 100 : 0,
        color: 'bg-red-500',
      },
    ];

    // Calculate conversion rates
    for (let i = 0; i < stages.length - 1; i++) {
      const currentCount = stages[i].count;
      const nextCount = stages[i + 1].count;

      if (currentCount > 0) {
        stages[i].conversionRate = (nextCount / currentCount) * 100;
      }
    }

    return stages;
  }, [applications, statistics]);

  // Calculate time in status
  const timeInStatusData = useMemo((): TimeInStatus[] => {
    if (!statistics?.averageTimeInStatus) return [];

    return Object.entries(statistics.averageTimeInStatus)
      .filter(([_, time]) => time > 0)
      .map(([status, time]) => {
        const statusLabels: Record<string, string> = {
          draft: '草稿',
          applied: '已申请',
          interview: '面试中',
          offer: '已录用',
          rejected: '已拒绝',
          optimized: '已优化',
          pending: '处理中',
        };

        let displayTime = time;
        let timeUnit: 'hours' | 'days' = 'hours';

        if (time > 24) {
          displayTime = time / 24;
          timeUnit = 'days';
        }

        return {
          status,
          label: statusLabels[status] || status,
          averageTime: Math.round(displayTime * 10) / 10,
          timeUnit,
        };
      })
      .sort((a, b) => b.averageTime - a.averageTime);
  }, [statistics]);

  // Calculate success metrics
  const successMetrics = useMemo(() => {
    if (!statistics?.successMetrics || applications.length === 0) {
      return {
        interviewRate: 0,
        offerRate: 0,
        averageMatchToOffer: 0,
        optimalApplicationCount: 5,
      };
    }

    return statistics.successMetrics;
  }, [statistics, applications.length]);

  // Calculate dropoff analysis
  const dropoffAnalysis = useMemo(() => {
    if (!statistics?.dropoffPoints || statistics.dropoffPoints.length === 0) {
      return [];
    }

    return statistics.dropoffPoints
      .filter(point => point.dropoffRate > 10)
      .sort((a, b) => b.dropoffRate - a.dropoffRate)
      .slice(0, 3);
  }, [statistics]);

  if (applications.length === 0) {
    return (
      <Card className="p-8 text-center">
        <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          暂无分析数据
        </h3>
        <p className="text-gray-600">
          创建申请后即可查看工作流分析和统计数据
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Target className="h-5 w-5 text-purple-600" />
            </div>
            <span className="text-sm text-gray-600">面试转化率</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {successMetrics.interviewRate.toFixed(1)}%
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {successMetrics.interviewRate >= 20 ? '表现优秀' : '有提升空间'}
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <Award className="h-5 w-5 text-green-600" />
            </div>
            <span className="text-sm text-gray-600">录用转化率</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {successMetrics.offerRate.toFixed(1)}%
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {successMetrics.offerRate >= 10 ? '表现优秀' : '继续努力'}
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
            <span className="text-sm text-gray-600">平均录用匹配度</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {successMetrics.averageMatchToOffer.toFixed(1)}%
          </div>
          <p className="text-xs text-gray-500 mt-1">
            录用职位的平均匹配分数
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Calendar className="h-5 w-5 text-yellow-600" />
            </div>
            <span className="text-sm text-gray-600">建议周申请量</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {successMetrics.optimalApplicationCount}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            基于当前成功率建议
          </p>
        </Card>
      </div>

      {/* Funnel Analysis */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">申请流程漏斗</h3>
            <p className="text-sm text-gray-600">查看各阶段转化率和流失情况</p>
          </div>
          <Badge variant="outline" className="flex items-center gap-1">
            <Filter className="h-3 w-3" />
            总申请数: {applications.length}
          </Badge>
        </div>

        <div className="space-y-4">
          {funnelData.map((stage, index) => (
            <div key={stage.status} className="relative">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${stage.color}`} />
                  <span className="font-medium text-gray-900">{stage.label}</span>
                  <Badge variant="outline" className="text-xs">
                    {stage.count} 份
                  </Badge>
                </div>
                <div className="flex items-center gap-4">
                  {stage.conversionRate !== undefined && index < funnelData.length - 1 && (
                    <div className="flex items-center gap-1 text-sm">
                      {stage.conversionRate > 0 ? (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-600" />
                      )}
                      <span className={stage.conversionRate > 0 ? 'text-green-600' : 'text-red-600'}>
                        {stage.conversionRate.toFixed(1)}%
                      </span>
                      <ArrowRight className="h-3 w-3 text-gray-400" />
                    </div>
                  )}
                  <span className="text-sm font-medium text-gray-700">
                    {stage.percentage.toFixed(1)}%
                  </span>
                </div>
              </div>

              <Progress value={stage.percentage} className="h-2" />
            </div>
          ))}
        </div>
      </Card>

      {/* Time in Status Analysis */}
      {timeInStatusData.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">各阶段停留时间</h3>
              <p className="text-sm text-gray-600">平均在每个状态停留的时间</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {timeInStatusData.map((item) => (
              <div
                key={item.status}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="font-medium text-gray-900">{item.label}</p>
                  <p className="text-sm text-gray-600">
                    平均 {item.averageTime} {item.timeUnit === 'hours' ? '小时' : '天'}
                  </p>
                </div>
                <Clock className="h-5 w-5 text-gray-400" />
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Dropoff Analysis */}
      {dropoffAnalysis.length > 0 && (
        <Card className="p-6 border-2 border-orange-200 bg-orange-50">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-orange-100 rounded-lg">
              <AlertCircle className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">流失分析</h3>
              <p className="text-sm text-gray-600">需要关注的高流失率阶段</p>
            </div>
          </div>

          <div className="space-y-3">
            {dropoffAnalysis.map((point, index) => {
              const statusLabels: Record<string, string> = {
                draft: '草稿',
                applied: '已申请',
                interview: '面试中',
                pending: '处理中',
                optimized: '已优化',
              };

              return (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-white rounded-lg border border-orange-200"
                >
                  <div className="flex items-center gap-3">
                    <XCircle className="h-5 w-5 text-red-600" />
                    <div>
                      <p className="font-medium text-gray-900">
                        {statusLabels[point.from]} → 已拒绝
                      </p>
                      <p className="text-sm text-gray-600">
                        {point.dropoffCount} 份申请被拒绝
                      </p>
                    </div>
                  </div>
                  <Badge variant="destructive" className="text-sm">
                    {point.dropoffRate.toFixed(1)}% 流失率
                  </Badge>
                </div>
              );
            })}
          </div>

          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium text-blue-900">改进建议</p>
                <p className="text-sm text-blue-700 mt-1">
                  重点关注高流失率阶段，优化申请材料和面试准备技巧。
                  建议在提交申请前进行简历优化以提高匹配度。
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Workflow Automation Stats */}
      {statistics && (
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-green-100 rounded-lg">
              <BarChart3 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">工作流自动化统计</h3>
              <p className="text-sm text-gray-600">智能建议和自动化操作的数据</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">总状态变更</p>
              <p className="text-2xl font-bold text-gray-900">
                {statistics.totalTransitions}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                手动: {statistics.manualTransitions} | 自动: {statistics.automatedTransitions}
              </p>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">自动化率</p>
              <p className="text-2xl font-bold text-gray-900">
                {statistics.totalTransitions > 0
                  ? ((statistics.automatedTransitions / statistics.totalTransitions) * 100).toFixed(1)
                  : 0}%
              </p>
              <p className="text-xs text-gray-500 mt-1">
                由智能规则自动执行
              </p>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">平均处理时间</p>
              <p className="text-2xl font-bold text-gray-900">
                {Math.round(statistics.averageTransitionTime)}h
              </p>
              <p className="text-xs text-gray-500 mt-1">
                状态变更平均耗时
              </p>
            </div>
          </div>

          {/* Most Common Transitions */}
          {statistics.mostCommonTransitions.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-900 mb-3">最常见状态转换</h4>
              <div className="space-y-2">
                {statistics.mostCommonTransitions.slice(0, 5).map((transition, index) => {
                  const statusLabels: Record<string, string> = {
                    draft: '草稿',
                    applied: '已申请',
                    interview: '面试中',
                    offer: '已录用',
                    rejected: '已拒绝',
                    optimized: '已优化',
                    pending: '处理中',
                  };

                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-white rounded-lg border"
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {statusLabels[transition.from]}
                        </Badge>
                        <ArrowRight className="h-3 w-3 text-gray-400" />
                        <Badge variant="outline" className="text-xs">
                          {statusLabels[transition.to]}
                        </Badge>
                      </div>
                      <Badge className="text-xs">
                        {transition.count} 次
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

export default WorkflowAnalyticsDashboard;
