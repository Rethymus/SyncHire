/**
 * Workflow Automation Component
 * Provides intelligent status suggestions, automation rules, and history tracking
 */

"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  getWorkflowEngine,
  createWorkflowContext,
  analyzeUserBehavior,
  getApplicationStatistics,
  StatusTransition,
  WorkflowRule,
  StatusHistoryEntry,
  ApplicationStatus,
} from '@/lib/workflow-engine';
import {
  getWorkflowNotificationService,
  useWorkflowNotifications,
} from '@/lib/workflow-notifications';
import { useAppStore } from '@/lib/store';
import { applicationAPI } from '@/lib/api-client';
import { logger, LogCategory } from '@/lib/logger';
import {
  Sparkles,
  History,
  Settings,
  TrendingUp,
  Bell,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  ChevronRight,
  Info,
  Zap,
  BarChart3,
  Mail,
  Filter,
} from 'lucide-react';

const statusConfig: Record<ApplicationStatus, { label: string; color: string; icon: any }> = {
  saved: { label: '已收藏', color: 'bg-muted text-gray-800', icon: Clock },
  targeted: { label: '已定位', color: 'bg-sky-100 text-sky-800', icon: Filter },
  materials_ready: { label: '材料就绪', color: 'bg-indigo-100 text-indigo-800', icon: TrendingUp },
  submitted: { label: '已递交', color: 'bg-blue-100 text-blue-800', icon: Mail },
  applied: { label: '已投递', color: 'bg-blue-100 text-blue-800', icon: Clock },
  screening: { label: '筛选中', color: 'bg-cyan-100 text-cyan-800', icon: Clock },
  interview: { label: '面试中', color: 'bg-purple-100 text-purple-800', icon: Bell },
  technical: { label: '技术面', color: 'bg-purple-100 text-purple-800', icon: Bell },
  offer: { label: 'Offer', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  hired: { label: '已入职', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  rejected: { label: '已拒绝', color: 'bg-red-100 text-red-800', icon: XCircle },
  withdrawn: { label: '已撤回', color: 'bg-muted text-gray-800', icon: XCircle },
};

interface WorkflowAutomationProps {
  applicationId?: string;
}

export function WorkflowAutomation({ applicationId }: WorkflowAutomationProps) {
  const { applications, updateApplication } = useAppStore();
  const [suggestions, setSuggestions] = useState<StatusTransition[]>([]);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [history, setHistory] = useState<StatusHistoryEntry[]>([]);
  const [rules, setRules] = useState<WorkflowRule[]>([]);
  const [statistics, setStatistics] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('suggestions');
  const [filterStatus, setFilterStatus] = useState<ApplicationStatus | 'all'>('all');

  const workflowEngine = getWorkflowEngine();
  const notificationService = getWorkflowNotificationService();
  const { notifications, unreadCount } = useWorkflowNotifications();

  // Load suggestions
  const loadSuggestions = useCallback(async () => {
    if (!applicationId) return;

    setLoading(true);
    try {
      const application = applications.find(app => app.id === applicationId);
      if (!application) return;

      const context = createWorkflowContext(
        analyzeUserBehavior(applications),
        getApplicationStatistics(applications)
      );

      const workflowSuggestions = workflowEngine.getSuggestions(application, context);
      setSuggestions(workflowSuggestions);
    } catch (error) {
      logger.error(LogCategory.WORKFLOW, 'Failed to load suggestions', error as Error);
    } finally {
      setLoading(false);
    }
  }, [applicationId, applications, workflowEngine]);

  // Load history
  const loadHistory = useCallback(() => {
    if (!applicationId) return;

    const appHistory = workflowEngine.getHistory(applicationId);
    setHistory(appHistory);
  }, [applicationId, workflowEngine]);

  // Load rules
  const loadRules = useCallback(() => {
    const workflowRules = workflowEngine.getRules();
    setRules(workflowRules);
  }, [workflowEngine]);

  // Load statistics
  const loadStatistics = useCallback(() => {
    const stats = workflowEngine.getStatistics();
    setStatistics(stats);
  }, [workflowEngine]);

  // Execute status transition
  const executeTransition = useCallback(async (transition: StatusTransition) => {
    if (!applicationId) return;

    setExecuting(true);
    try {
      const response = await applicationAPI.updateStatus(applicationId, {
        status: transition.to,
        notes: transition.reason,
      });

      if (response.success && response.data) {
        // Update local state
        updateApplication(applicationId, { status: transition.to });

        // Record in workflow history
        workflowEngine.recordHistory(applicationId, transition, 'user');

        // Create notification
        const application = applications.find(app => app.id === applicationId);
        if (application) {
          notificationService.createStatusTransitionNotification(
            applicationId,
            application.companyName || 'Unknown',
            transition
          );
        }

        // Reload suggestions and history
        await loadSuggestions();
        loadHistory();

        logger.info(LogCategory.WORKFLOW, `Status updated to ${transition.to}`, {
          applicationId,
          oldStatus: transition.from,
          newStatus: transition.to,
        });
      } else {
        throw new Error(response.error as string);
      }
    } catch (error) {
      logger.error(LogCategory.WORKFLOW, 'Failed to execute transition', error as Error);
    } finally {
      setExecuting(false);
    }
  }, [applicationId, applications, updateApplication, workflowEngine, notificationService, loadSuggestions, loadHistory]);

  // Toggle rule
  const toggleRule = useCallback((ruleId: string, enabled: boolean) => {
    workflowEngine.toggleRule(ruleId, enabled);
    loadRules();
  }, [workflowEngine, loadRules]);

  // Filter history by status
  const filteredHistory = useMemo(() => {
    if (filterStatus === 'all') return history;
    return history.filter(entry => entry.newStatus === filterStatus);
  }, [history, filterStatus]);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      await loadSuggestions();
      await loadHistory();
      await loadRules();
      loadStatistics();
    };
    loadInitialData();
  }, [loadSuggestions, loadHistory, loadRules, loadStatistics]);

  return (
    <div className="space-y-6">
      {/* Notifications Summary */}
      {unreadCount > 0 && (
        <Alert className="border-blue-200 bg-blue-50">
          <Bell className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            您有 {unreadCount} 条未读通知
          </AlertDescription>
        </Alert>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="suggestions">
            <Sparkles className="h-4 w-4 mr-2" />
            智能建议
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-2" />
            历史记录
          </TabsTrigger>
          <TabsTrigger value="rules">
            <Settings className="h-4 w-4 mr-2" />
            自动化规则
          </TabsTrigger>
          <TabsTrigger value="statistics">
            <BarChart3 className="h-4 w-4 mr-2" />
            统计分析
          </TabsTrigger>
        </TabsList>

        {/* Suggestions Tab */}
        <TabsContent value="suggestions" className="space-y-4">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">智能状态建议</h3>
                <p className="text-sm text-muted-foreground">基于您的行为模式和申请数据生成的个性化建议</p>
              </div>
              <Button
                onClick={loadSuggestions}
                variant="outline"
                size="sm"
                disabled={loading}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                刷新建议
              </Button>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <Clock className="h-8 w-8 text-muted-foreground/80 mx-auto mb-2 animate-spin" />
                <p className="text-muted-foreground">正在分析...</p>
              </div>
            ) : suggestions.length > 0 ? (
              <div className="space-y-3">
                {suggestions.map((suggestion, index) => {
                  const config = statusConfig[suggestion.to];
                  const StatusIcon = config.icon;

                  return (
                    <Card key={index} className="p-4 border-l-4 border-l-blue-500">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={config.color}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {config.label}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              置信度: {Math.round(suggestion.confidence * 100)}%
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{suggestion.reason}</p>
                        </div>
                        <Button
                          onClick={() => executeTransition(suggestion)}
                          disabled={executing || suggestion.autoExecute}
                          size="sm"
                        >
                          {executing ? (
                            <>
                              <Clock className="h-4 w-4 mr-2 animate-spin" />
                              处理中...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              应用建议
                            </>
                          )}
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Info className="h-12 w-12 text-muted-foreground/80 mx-auto mb-4" />
                <p className="text-muted-foreground">暂无建议</p>
                <p className="text-sm text-muted-foreground mt-2">
                  当有相关建议时，我们会在这里显示
                </p>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">状态变更历史</h3>
                <p className="text-sm text-muted-foreground">跟踪所有状态变更的完整记录</p>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="filter">筛选:</Label>
                <select
                  id="filter"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as ApplicationStatus | 'all')}
                  className="px-3 py-1 border rounded-md text-sm"
                >
                  <option value="all">全部</option>
                  {Object.entries(statusConfig).map(([key, value]) => (
                    <option key={key} value={key}>
                      {value.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <ScrollArea className="h-[400px]">
              {filteredHistory.length > 0 ? (
                <div className="space-y-3">
                  {filteredHistory.map((entry, index) => {
                    const config = statusConfig[entry.newStatus];
                    const StatusIcon = config.icon;

                    return (
                      <div key={index} className="flex items-start gap-3 p-3 bg-muted/40 rounded-lg">
                        <StatusIcon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-sm mb-1">
                            <Badge className={config.color} variant="secondary">
                              {config.label}
                            </Badge>
                            <span className="text-muted-foreground">
                              {new Date(entry.changedAt).toLocaleString()}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {entry.changedBy === 'user' ? '用户' :
                               entry.changedBy === 'system' ? '系统' : '自动化'}
                            </Badge>
                          </div>
                          {entry.notes && (
                            <p className="text-sm text-muted-foreground">{entry.notes}</p>
                          )}
                          {entry.trigger && (
                            <p className="text-xs text-muted-foreground mt-1">
                              触发原因: {entry.trigger}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <History className="h-12 w-12 text-muted-foreground/80 mx-auto mb-4" />
                  <p className="text-muted-foreground">暂无历史记录</p>
                </div>
              )}
            </ScrollArea>
          </Card>
        </TabsContent>

        {/* Rules Tab */}
        <TabsContent value="rules" className="space-y-4">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">自动化规则</h3>
                <p className="text-sm text-muted-foreground">配置和管理智能工作流规则</p>
              </div>
            </div>

            <div className="space-y-4">
              {rules.map((rule) => (
                <Card key={rule.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium text-foreground">{rule.name}</h4>
                        <Badge variant="outline" className="text-xs">
                          优先级: {rule.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{rule.description}</p>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={rule.enabled}
                          onCheckedChange={(checked) => toggleRule(rule.id, checked)}
                        />
                        <Label className="text-sm">
                          {rule.enabled ? '已启用' : '已禁用'}
                        </Label>
                      </div>
                    </div>
                    <Zap className={`h-5 w-5 ${rule.enabled ? 'text-yellow-500' : 'text-muted-foreground/80'}`} />
                  </div>
                </Card>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* Statistics Tab */}
        <TabsContent value="statistics" className="space-y-4">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">工作流统计分析</h3>
                <p className="text-sm text-muted-foreground">了解您的申请流程效率和趋势</p>
              </div>
            </div>

            {statistics && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                    <span className="text-sm text-muted-foreground">总状态变更</span>
                  </div>
                  <div className="text-2xl font-bold text-foreground">
                    {statistics.totalTransitions}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    自动化: {statistics.automatedTransitions} | 手动: {statistics.manualTransitions}
                  </p>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Zap className="h-5 w-5 text-yellow-600" />
                    <span className="text-sm text-muted-foreground">自动化率</span>
                  </div>
                  <div className="text-2xl font-bold text-foreground">
                    {statistics.totalTransitions > 0
                      ? Math.round((statistics.automatedTransitions / statistics.totalTransitions) * 100)
                      : 0}%
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    节省时间，提高效率
                  </p>
                </Card>

                <Card className="p-4 md:col-span-2">
                  <h4 className="font-medium text-foreground mb-3">状态分布</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {Object.entries(statistics.statusDistribution).map(([status, count]) => {
                      const config = statusConfig[status as ApplicationStatus];
                      return (
                        <div key={status} className="flex items-center gap-2">
                          <Badge className={config.color} variant="secondary">
                            {config.label}
                          </Badge>
                          <span className="text-sm font-medium">{String(count)}</span>
                        </div>
                      );
                    })}
                  </div>
                </Card>

                {statistics.mostCommonTransitions.length > 0 && (
                  <Card className="p-4 md:col-span-2">
                    <h4 className="font-medium text-foreground mb-3">常见转换路径</h4>
                    <div className="space-y-2">
                      {statistics.mostCommonTransitions.slice(0, 5).map((transition: any, index: number) => {
                        const fromConfig = statusConfig[transition.from as ApplicationStatus];
                        const toConfig = statusConfig[transition.to as ApplicationStatus];
                        return (
                          <div key={index} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <Badge className={fromConfig.color} variant="secondary">
                                {fromConfig.label}
                              </Badge>
                              <ChevronRight className="h-4 w-4 text-muted-foreground/80" />
                              <Badge className={toConfig.color} variant="secondary">
                                {toConfig.label}
                              </Badge>
                            </div>
                            <span className="font-medium">{transition.count} 次</span>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                )}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default WorkflowAutomation;
