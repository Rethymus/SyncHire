/**
 * Status Workflow Tracker Component
 * Visualizes the application status workflow and progress
 */

"use client";

import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ApplicationStatus } from '@/lib/workflow-engine';
import {
  CheckCircle2,
  Circle,
  Clock,
  FileText,
  MessageSquare,
  Briefcase,
  XCircle,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';

interface StatusWorkflowTrackerProps {
  currentStatus: ApplicationStatus;
  onStatusClick?: (status: ApplicationStatus) => void;
  showHistory?: boolean;
  history?: Array<{
    status: ApplicationStatus;
    timestamp: Date;
  }>;
  compact?: boolean;
}

const statusConfig: Record<ApplicationStatus, {
  label: string;
  description: string;
  icon: any;
  color: string;
  order: number;
  category: 'active' | 'success' | 'error' | 'neutral';
}> = {
  draft: {
    label: '草稿',
    description: '准备申请材料',
    icon: FileText,
    color: 'bg-gray-100 text-gray-800 border-gray-300',
    order: 1,
    category: 'neutral',
  },
  applied: {
    label: '已申请',
    description: '申请已提交',
    icon: Briefcase,
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    order: 2,
    category: 'active',
  },
  interview: {
    label: '面试中',
    description: '面试安排中',
    icon: MessageSquare,
    color: 'bg-purple-100 text-purple-800 border-purple-300',
    order: 3,
    category: 'active',
  },
  offer: {
    label: '已录用',
    description: '收到录用通知',
    icon: CheckCircle2,
    color: 'bg-green-100 text-green-800 border-green-300',
    order: 4,
    category: 'success',
  },
  rejected: {
    label: '已拒绝',
    description: '申请未通过',
    icon: XCircle,
    color: 'bg-red-100 text-red-800 border-red-300',
    order: 5,
    category: 'error',
  },
  optimized: {
    label: '已优化',
    description: '简历已优化',
    icon: TrendingUp,
    color: 'bg-green-100 text-green-800 border-green-300',
    order: 6,
    category: 'success',
  },
  pending: {
    label: '处理中',
    description: '等待回复',
    icon: Clock,
    color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    order: 7,
    category: 'active',
  },
};

export function StatusWorkflowTracker({
  currentStatus,
  onStatusClick,
  showHistory = false,
  history = [],
  compact = false,
}: StatusWorkflowTrackerProps) {
  const orderedStatuses = React.useMemo(() => {
    return Object.entries(statusConfig)
      .sort(([, a], [, b]) => a.order - b.order)
      .map(([status, config]) => ({ status: status as ApplicationStatus, config }));
  }, []);

  const currentOrder = statusConfig[currentStatus]?.order ?? 0;
  const currentCategory = statusConfig[currentStatus]?.category ?? 'neutral';

  const getStatusState = (status: ApplicationStatus) => {
    const order = statusConfig[status]?.order ?? 0;

    if (status === currentStatus) return 'current';
    if (order < currentOrder) return 'completed';
    if (status === 'rejected' && currentCategory === 'error') return 'error';
    return 'pending';
  };

  const getStatusIcon = (status: ApplicationStatus, state: string) => {
    const Icon = statusConfig[status]?.icon || Circle;

    if (state === 'completed') {
      return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    } else if (state === 'current') {
      return <Icon className="h-5 w-5 text-blue-600 animate-pulse" />;
    } else if (state === 'error') {
      return <XCircle className="h-5 w-5 text-red-600" />;
    } else {
      return <Circle className="h-5 w-5 text-gray-400" />;
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Badge className={statusConfig[currentStatus]?.color}>
          {getStatusIcon(currentStatus, 'current')}
          <span className="ml-1">{statusConfig[currentStatus]?.label}</span>
        </Badge>
      </div>
    );
  }

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">申请状态流程</h3>
        <p className="text-sm text-gray-600">
          跟踪您的申请进度和状态变更
        </p>
      </div>

      {/* Main Workflow */}
      <div className="relative">
        {/* Progress Line */}
        <div className="absolute left-4 top-8 bottom-8 w-0.5 bg-gray-200" />

        <div className="space-y-4">
          {orderedStatuses.map(({ status, config }) => {
            const state = getStatusState(status);
            const isClickable = onStatusClick && (state === 'completed' || state === 'pending');

            return (
              <TooltipProvider key={status}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className={`flex items-start gap-4 p-3 rounded-lg transition-all ${
                        state === 'current' ? 'bg-blue-50 border-2 border-blue-200' :
                        state === 'completed' ? 'bg-green-50' :
                        state === 'error' ? 'bg-red-50' :
                        'bg-gray-50 hover:bg-gray-100 cursor-pointer'
                      }`}
                      onClick={() => isClickable && onStatusClick(status)}
                    >
                      <div className="relative z-10">
                        {getStatusIcon(status, state)}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className={`font-medium ${
                            state === 'current' ? 'text-blue-900' :
                            state === 'completed' ? 'text-green-900' :
                            state === 'error' ? 'text-red-900' :
                            'text-gray-900'
                          }`}>
                            {config.label}
                          </h4>
                          {state === 'current' && (
                            <Badge variant="outline" className="text-xs">
                              当前状态
                            </Badge>
                          )}
                        </div>
                        <p className={`text-sm ${
                          state === 'current' ? 'text-blue-700' :
                          state === 'completed' ? 'text-green-700' :
                          state === 'error' ? 'text-red-700' :
                          'text-gray-600'
                        }`}>
                          {config.description}
                        </p>

                        {/* Show history timestamp if available */}
                        {showHistory && history.some(h => h.status === status) && (
                          <div className="mt-2 text-xs text-gray-500">
                            {new Date(history.find(h => h.status === status)!.timestamp).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{config.description}</p>
                    {isClickable && (
                      <p className="text-xs text-gray-500 mt-1">点击更改状态</p>
                    )}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </div>
      </div>

      {/* Quick Actions */}
      {onStatusClick && (
        <div className="mt-6 pt-6 border-t">
          <h4 className="text-sm font-medium text-gray-900 mb-3">快速操作</h4>
          <div className="flex flex-wrap gap-2">
            {orderedStatuses.map(({ status, config }) => {
              const state = getStatusState(status);
              if (state === 'current') return null;

              return (
                <Button
                  key={status}
                  variant="outline"
                  size="sm"
                  onClick={() => onStatusClick(status)}
                  className="text-xs"
                >
                  {config.label}
                </Button>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}

/**
 * Mini Status Tracker for compact display
 */
export function MiniStatusTracker({
  currentStatus,
  onClick,
}: {
  currentStatus: ApplicationStatus;
  onClick?: () => void;
}) {
  const config = statusConfig[currentStatus];
  const Icon = config?.icon || Circle;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            className={`${config?.color} cursor-pointer hover:opacity-80 transition-opacity`}
            onClick={onClick}
          >
            <Icon className="h-3 w-3 mr-1" />
            {config?.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{config?.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Status Progress Bar
 */
export function StatusProgressBar({
  currentStatus,
  showLabels = true,
}: {
  currentStatus: ApplicationStatus;
  showLabels?: boolean;
}) {
  const progressSteps = [
    { status: 'draft' as ApplicationStatus, label: '草稿' },
    { status: 'applied' as ApplicationStatus, label: '已申请' },
    { status: 'interview' as ApplicationStatus, label: '面试中' },
    { status: 'offer' as ApplicationStatus, label: '已录用' },
  ];

  const currentStepIndex = progressSteps.findIndex(step => step.status === currentStatus);
  const progress = ((currentStepIndex + 1) / progressSteps.length) * 100;

  return (
    <div className="space-y-2">
      <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="absolute h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {showLabels && (
        <div className="flex justify-between text-xs text-gray-600">
          {progressSteps.map((step, index) => {
            const isCompleted = index <= currentStepIndex;
            const isCurrent = index === currentStepIndex;

            return (
              <div
                key={step.status}
                className={`flex flex-col items-center ${
                  isCurrent ? 'text-blue-600 font-medium' :
                  isCompleted ? 'text-green-600' :
                  'text-gray-400'
                }`}
              >
                <span>{step.label}</span>
                {isCurrent && (
                  <div className="w-1 h-1 bg-blue-600 rounded-full mt-1 animate-pulse" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default StatusWorkflowTracker;
