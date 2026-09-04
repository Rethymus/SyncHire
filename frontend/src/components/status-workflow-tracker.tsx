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
  // Canonical openapi pipeline: saved → targeted → materials_ready →
  // submitted → applied → screening → interview → technical → offer →
  // hired, with rejected/withdrawn as the two closed-out terminals.
  saved: {
    label: '已收藏',
    description: '记录感兴趣的职位',
    icon: FileText,
    color: 'bg-muted text-gray-800 border-input',
    order: 1,
    category: 'neutral',
  },
  targeted: {
    label: '已定位',
    description: '决定投递这个职位',
    icon: Briefcase,
    color: 'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950 dark:text-sky-200 dark:border-sky-800',
    order: 2,
    category: 'active',
  },
  materials_ready: {
    label: '材料就绪',
    description: '简历与材料已针对岗位准备',
    icon: FileText,
    color: 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950 dark:text-indigo-200 dark:border-indigo-800',
    order: 3,
    category: 'active',
  },
  submitted: {
    label: '已递交',
    description: '申请已经递交',
    icon: Clock,
    color: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-200 dark:border-blue-800',
    order: 4,
    category: 'active',
  },
  applied: {
    label: '已投递',
    description: '申请已提交',
    icon: Briefcase,
    color: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-200 dark:border-blue-800',
    order: 5,
    category: 'active',
  },
  screening: {
    label: '筛选中',
    description: '等待对方筛选反馈',
    icon: Clock,
    color: 'bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-950 dark:text-cyan-200 dark:border-cyan-800',
    order: 6,
    category: 'active',
  },
  interview: {
    label: '面试中',
    description: '面试安排中',
    icon: MessageSquare,
    color: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-200 dark:border-purple-800',
    order: 7,
    category: 'active',
  },
  technical: {
    label: '技术面',
    description: '技术面试环节',
    icon: MessageSquare,
    color: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-200 dark:border-purple-800',
    order: 8,
    category: 'active',
  },
  offer: {
    label: 'Offer',
    description: '收到录用通知',
    icon: CheckCircle2,
    color: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-950 dark:text-green-200 dark:border-green-800',
    order: 9,
    category: 'success',
  },
  hired: {
    label: '已入职',
    description: '已完成入职',
    icon: CheckCircle2,
    color: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-950 dark:text-green-200 dark:border-green-800',
    order: 10,
    category: 'success',
  },
  rejected: {
    label: '已拒绝',
    description: '申请未通过',
    icon: XCircle,
    color: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-200 dark:border-red-800',
    order: 11,
    category: 'error',
  },
  withdrawn: {
    label: '已撤回',
    description: '自己选择结束这条申请',
    icon: XCircle,
    color: 'bg-muted text-gray-800 border-input',
    order: 12,
    category: 'neutral',
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
      return <Circle className="h-5 w-5 text-muted-foreground/80" />;
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
        <h3 className="text-lg font-semibold text-foreground">申请状态流程</h3>
        <p className="text-sm text-muted-foreground">
          跟踪您的申请进度和状态变更
        </p>
      </div>

      {/* Main Workflow */}
      <div className="relative">
        {/* Progress Line */}
        <div className="absolute left-4 top-8 bottom-8 w-0.5 bg-border" />

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
                        state === 'current' ? 'bg-primary/10 border-2 border-primary/30' :
                        state === 'completed' ? 'bg-muted/60' :
                        state === 'error' ? 'bg-destructive/10' :
                        'bg-muted/40 hover:bg-muted cursor-pointer'
                      }`}
                      onClick={() => isClickable && onStatusClick(status)}
                    >
                      <div className="relative z-10">
                        {getStatusIcon(status, state)}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className={`font-medium ${
                            state === 'current' ? 'text-primary' :
                            state === 'completed' ? 'text-foreground' :
                            state === 'error' ? 'text-destructive' :
                            'text-foreground'
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
                          state === 'current' ? 'text-primary/80' :
                          state === 'completed' ? 'text-muted-foreground' :
                          state === 'error' ? 'text-destructive/80' :
                          'text-muted-foreground'
                        }`}>
                          {config.description}
                        </p>

                        {/* Show history timestamp if available */}
                        {showHistory && history.some(h => h.status === status) && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            {new Date(history.find(h => h.status === status)!.timestamp).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{config.description}</p>
                    {isClickable && (
                      <p className="text-xs text-muted-foreground mt-1">点击更改状态</p>
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
          <h4 className="text-sm font-medium text-foreground mb-3">快速操作</h4>
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
        <div className="flex justify-between text-xs text-muted-foreground">
          {progressSteps.map((step, index) => {
            const isCompleted = index <= currentStepIndex;
            const isCurrent = index === currentStepIndex;

            return (
              <div
                key={step.status}
                className={`flex flex-col items-center ${
                  isCurrent ? 'text-blue-600 font-medium' :
                  isCompleted ? 'text-green-600' :
                  'text-muted-foreground/80'
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
