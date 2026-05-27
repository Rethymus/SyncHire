/**
 * Status History Timeline Component
 * Displays comprehensive history of status changes for applications
 */

"use client";

import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StatusHistoryEntry } from '@/lib/workflow-engine';
import {
  Calendar,
  Clock,
  User,
  Bot,
  Settings,
  FileText,
  Briefcase,
  MessageSquare,
  Award,
  XCircle,
  TrendingUp,
  AlertCircle,
  Search,
  Filter,
  Download,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface StatusHistoryTimelineProps {
  history: StatusHistoryEntry[];
  applicationId?: string;
  showFilters?: boolean;
  showExport?: boolean;
}

const statusConfig: Record<string, { label: string; icon: any; color: string }> = {
  draft: {
    label: '草稿',
    icon: FileText,
    color: 'bg-gray-100 text-gray-800 border-gray-300',
  },
  applied: {
    label: '已申请',
    icon: Briefcase,
    color: 'bg-blue-100 text-blue-800 border-blue-300',
  },
  interview: {
    label: '面试中',
    icon: MessageSquare,
    color: 'bg-purple-100 text-purple-800 border-purple-300',
  },
  offer: {
    label: '已录用',
    icon: Award,
    color: 'bg-green-100 text-green-800 border-green-300',
  },
  rejected: {
    label: '已拒绝',
    icon: XCircle,
    color: 'bg-red-100 text-red-800 border-red-300',
  },
  optimized: {
    label: '已优化',
    icon: TrendingUp,
    color: 'bg-green-100 text-green-800 border-green-300',
  },
  pending: {
    label: '处理中',
    icon: AlertCircle,
    color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  },
};

const changedByConfig: Record<string, { label: string; icon: any; color: string }> = {
  user: {
    label: '用户',
    icon: User,
    color: 'bg-blue-100 text-blue-800',
  },
  system: {
    label: '系统',
    icon: Settings,
    color: 'bg-gray-100 text-gray-800',
  },
  automation: {
    label: '自动化',
    icon: Bot,
    color: 'bg-green-100 text-green-800',
  },
};

export function StatusHistoryTimeline({
  history,
  applicationId,
  showFilters = true,
  showExport = true,
}: StatusHistoryTimelineProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [changedByFilter, setChangedByFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());

  // Filter and sort history
  const filteredHistory = useMemo(() => {
    let filtered = [...history];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(entry =>
        entry.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.trigger?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(entry =>
        entry.oldStatus === statusFilter || entry.newStatus === statusFilter
      );
    }

    // Apply changed by filter
    if (changedByFilter !== 'all') {
      filtered = filtered.filter(entry => entry.changedBy === changedByFilter);
    }

    // Sort by date
    filtered.sort((a, b) => {
      const dateA = new Date(a.changedAt).getTime();
      const dateB = new Date(b.changedAt).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    return filtered;
  }, [history, searchTerm, statusFilter, changedByFilter, sortOrder]);

  // Calculate statistics
  const statistics = useMemo(() => {
    const statusChanges = history.reduce((acc, entry) => {
      const key = `${entry.oldStatus || 'initial'}→${entry.newStatus}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const changesByType = history.reduce((acc, entry) => {
      acc[entry.changedBy] = (acc[entry.changedBy] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const averageChangesPerDay = history.length > 0
      ? history.length / Math.max(1, getDaysSpan(history))
      : 0;

    return {
      totalChanges: history.length,
      uniqueStatuses: new Set(history.flatMap(e => [e.oldStatus, e.newStatus])).size,
      statusChanges,
      changesByType,
      averageChangesPerDay,
    };
  }, [history]);

  const toggleEntryExpanded = (entryId: string) => {
    setExpandedEntries(prev => {
      const newSet = new Set(prev);
      if (newSet.has(entryId)) {
        newSet.delete(entryId);
      } else {
        newSet.add(entryId);
      }
      return newSet;
    });
  };

  const exportHistory = () => {
    const data = filteredHistory.map(entry => ({
      时间: new Date(entry.changedAt).toLocaleString('zh-CN'),
      旧状态: entry.oldStatus || '初始',
      新状态: entry.newStatus,
      操作者: changedByConfig[entry.changedBy]?.label || entry.changedBy,
      备注: entry.notes || '',
      触发器: entry.trigger || '',
    }));

    const csv = [
      Object.keys(data[0]).join(','),
      ...data.map(row => Object.values(row).map(v => `"${v}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `status-history-${applicationId || 'all'}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const getDaysSpan = (entries: StatusHistoryEntry[]): number => {
    if (entries.length === 0) return 0;
    const dates = entries.map(e => new Date(e.changedAt).getTime());
    return Math.max(1, (Math.max(...dates) - Math.min(...dates)) / (1000 * 60 * 60 * 24));
  };

  if (history.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          暂无历史记录
        </h3>
        <p className="text-gray-600">
          状态变更记录将显示在这里
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">总变更次数</p>
              <p className="text-2xl font-bold text-gray-900">{statistics.totalChanges}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Briefcase className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">涉及状态</p>
              <p className="text-2xl font-bold text-gray-900">{statistics.uniqueStatuses}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <User className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">用户操作</p>
              <p className="text-2xl font-bold text-gray-900">
                {statistics.changesByType.user || 0}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Bot className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">自动化操作</p>
              <p className="text-2xl font-bold text-gray-900">
                {statistics.changesByType.automation || 0}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters and Controls */}
      {showFilters && (
        <Card className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="搜索备注或触发器..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="所有状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有状态</SelectItem>
                {Object.entries(statusConfig).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={changedByFilter} onValueChange={(value) => setChangedByFilter(value)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="所有操作者" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有操作者</SelectItem>
                {Object.entries(changedByConfig).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            >
              <Calendar className="h-4 w-4 mr-2" />
              {sortOrder === 'desc' ? '最新优先' : '最早优先'}
            </Button>

            {showExport && (
              <Button variant="outline" size="sm" onClick={exportHistory}>
                <Download className="h-4 w-4 mr-2" />
                导出
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Timeline */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">状态变更历史</h3>
            <p className="text-sm text-gray-600">
              显示 {filteredHistory.length} 条记录（共 {history.length} 条）
            </p>
          </div>
        </div>

        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

          <div className="space-y-4">
            {filteredHistory.map((entry, index) => {
              const oldConfig = entry.oldStatus ? statusConfig[entry.oldStatus] : null;
              const newConfig = statusConfig[entry.newStatus];
              const changedByInfo = changedByConfig[entry.changedBy];
              const ChangedByIcon = changedByInfo.icon;
              const NewIcon = newConfig.icon;

              const isExpanded = expandedEntries.has(entry.id);

              return (
                <div key={entry.id} className="relative pl-10">
                  {/* Timeline dot */}
                  <div className={`absolute left-2 top-4 w-5 h-5 rounded-full border-2 ${
                    entry.changedBy === 'user' ? 'bg-blue-500 border-blue-600' :
                    entry.changedBy === 'automation' ? 'bg-green-500 border-green-600' :
                    'bg-gray-500 border-gray-600'
                  }`} />

                  <div
                    className={`p-4 rounded-lg border transition-all ${
                      isExpanded ? 'bg-white border-gray-300 shadow-sm' : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3 flex-1">
                        {/* Status change */}
                        <div className="flex items-center gap-2">
                          {oldConfig && (
                            <>
                              <Badge variant="outline" className={`text-xs ${oldConfig.color}`}>
                                {oldConfig.label}
                              </Badge>
                              <span className="text-gray-400">→</span>
                            </>
                          )}
                          <Badge className={`text-xs ${newConfig.color}`}>
                            <NewIcon className="h-3 w-3 mr-1" />
                            {newConfig.label}
                          </Badge>
                        </div>

                        {/* Changed by */}
                        <Badge variant="outline" className={`text-xs ${changedByInfo.color}`}>
                          <ChangedByIcon className="h-3 w-3 mr-1" />
                          {changedByInfo.label}
                        </Badge>
                      </div>

                      {/* Timestamp and expand button */}
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">
                            {new Date(entry.changedAt).toLocaleDateString('zh-CN')}
                          </p>
                          <p className="text-xs text-gray-600">
                            {new Date(entry.changedAt).toLocaleTimeString('zh-CN')}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleEntryExpanded(entry.id)}
                          className="h-8 w-8 p-0"
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t space-y-3">
                        {entry.notes && (
                          <div>
                            <p className="text-xs text-gray-600 mb-1">备注</p>
                            <p className="text-sm text-gray-900">{entry.notes}</p>
                          </div>
                        )}

                        {entry.trigger && (
                          <div>
                            <p className="text-xs text-gray-600 mb-1">触发器</p>
                            <p className="text-sm text-gray-900">{entry.trigger}</p>
                          </div>
                        )}

                        <div className="flex items-center gap-4 text-xs text-gray-600">
                          <span>变更ID: {entry.id}</span>
                          {applicationId && <span>申请ID: {applicationId}</span>}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* No results */}
        {filteredHistory.length === 0 && (
          <div className="text-center py-8">
            <Filter className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">没有找到匹配的历史记录</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setChangedByFilter('all');
              }}
            >
              清除筛选条件
            </Button>
          </div>
        )}
      </Card>

      {/* Common transitions */}
      {Object.keys(statistics.statusChanges).length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">常见状态转换</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(statistics.statusChanges)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 6)
              .map(([transition, count]) => {
                const [from, to] = transition.split('→');
                const fromConfig = from !== 'initial' ? statusConfig[from] : null;
                const toConfig = statusConfig[to];

                return (
                  <div
                    key={transition}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      {fromConfig && (
                        <>
                          <Badge variant="outline" className="text-xs">
                            {fromConfig.label}
                          </Badge>
                          <span className="text-gray-400">→</span>
                        </>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {toConfig.label}
                      </Badge>
                    </div>
                    <Badge className="text-xs">{count} 次</Badge>
                  </div>
                );
              })}
          </div>
        </Card>
      )}
    </div>
  );
}

export default StatusHistoryTimeline;
